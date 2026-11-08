/**
 * AnalysisService — public API for offline track analysis.
 *
 * NON-INVASIVE: does not import or touch audioEngine, mixer, MIDI, recording,
 * sampler, vinyl, loop, cue, sync, tempo, or any playback module. It runs as
 * an independent metadata infrastructure layer.
 *
 * COMPATIBILITY: Audio decoding happens on the main thread using a private
 * OfflineAudioContext (separate from audioEngine's AudioContext). Only
 * CPU-heavy fingerprint + waveform computation runs in the Web Worker.
 * This avoids relying on OfflineAudioContext-in-Worker support (which is
 * unreliable in Safari) while still keeping heavy math off the main thread.
 *
 * API:
 *   analyze(file, { priority })      → Promise<TrackAnalysis>
 *   getAnalysis(file)                → Promise<TrackAnalysis | null>  (no trigger)
 *   hasAnalysis(file)                → Promise<boolean>
 *   invalidate(file)                  → Promise<void>
 *   reanalyze(file, { priority })    → Promise<TrackAnalysis>
 *   getStatus(fileKey)               → 'queued' | 'analyzing' | 'ready' | 'failed' | 'cancelled' | 'unknown'
 *   cancel(fileKey)                  → void
 *   onProgress(fileKey, cb)          → unsubscribe
 *   onStatusChange(cb)                → unsubscribe
 *   inspect()                        → debug snapshot
 */

import { MetadataStore } from './MetadataStore';
import { readMetadata, createArtworkBlob } from '../metadata/MetadataReader';

const workerUrl = new URL('./AnalysisWorker.js', import.meta.url);
const CURRENT_ALGORITHM_VERSION = '2.4.1'; // 2.4.1: FFT butterfly fix in KeyDetector — invalidates all pre-fix cached keyAnalysis

class AnalysisService {
  constructor() {
    this.worker = null;
    this.decodeCtx = null;         // Private OfflineAudioContext for decoding (NOT audioEngine's)
    this.queue = [];
    this.current = null;
    this.jobs = new Map();         // id → { resolve, reject, fileKey, file, priority, promise }
    this.statusMap = new Map();    // fileKey → status
    this.progressCbs = new Map();  // fileKey → Set<(progress, status) => void>
    this.statusCbs = new Set();    // Set<(fileKey, status, progress?) => void>
    this.jobCounter = 0;
    this.workerReady = false;
    this.workerReadyPromise = null;
    this._workerReadyResolve = null;
    this.workerInitError = null;
    this.workerEventCbs = new Set();
  }

  // --- Lazy worker init (only when first analysis is requested) ---
  ensureWorker() {
    if (this.worker) return;
    this.workerReady = false;
    this.workerInitError = null;
    this.workerReadyPromise = new Promise((resolve) => { this._workerReadyResolve = resolve; });
    this._emitWorkerEvent({ type: 'worker-created' });
    this.worker = new Worker(workerUrl, { type: 'module' });
    this.worker.onmessage = (event) => this._handleMessage(event.data);
    this.worker.onerror = (error) => {
      const parts = [];
      if (error.message) parts.push(error.message);
      if (error.filename) parts.push(`at ${error.filename}:${error.lineno || 0}:${error.colno || 0}`);
      if (error.error?.stack) parts.push(error.error.stack);
      else if (error.error?.name) parts.push(`${error.error.name}: ${error.error.message || ''}`);
      const errorMsg = parts.join('\n') || 'Worker crashed (no details available)';
      console.error('[AnalysisService] Worker error:', errorMsg, error);
      if (!this.workerReady) {
        this.workerInitError = errorMsg;
        this._workerReadyResolve?.();
      }
      this._emitWorkerEvent({ type: 'worker-error', error: errorMsg });
      if (this.current) this._failJob(this.current.id, errorMsg);
      this.current = null;
      this._processQueue();
    };
    this._workerReadyTimeout = setTimeout(() => {
      if (!this.workerReady) {
        this.workerInitError = 'Worker initialization timeout (10s) — worker module may have failed to load';
        this._workerReadyResolve?.();
        this._emitWorkerEvent({ type: 'worker-error', error: this.workerInitError });
      }
    }, 10000);
  }

  // --- Private decode context (separate from audioEngine) ---
  _ensureDecodeContext() {
    if (this.decodeCtx) return this.decodeCtx;
    // OfflineAudioContext on the main thread is universally supported.
    // Fallback to AudioContext only if OfflineAudioContext is unavailable.
    const OfflineCtx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (OfflineCtx) {
      this.decodeCtx = new OfflineCtx(1, 44100, 44100);
    } else {
      const ACtx = window.AudioContext || window.webkitAudioContext;
      this.decodeCtx = new ACtx();
    }
    return this.decodeCtx;
  }

  // --- Fast lookup key: SHA-256(name + size + lastModified) ---
  // Includes filename for speed but is NOT the permanent identity.
  async _computeFileKey(file) {
    const data = new TextEncoder().encode(`${file.name}|${file.size}|${file.lastModified}`);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  // --- Public API ---

  async analyze(file, { priority = false, existingBpm = 0 } = {}) {
    const fileKey = await this._computeFileKey(file);

    // 1. Fast lookup by fileKey (no decoding needed)
    const mapping = await MetadataStore.getFileKey(fileKey);
    if (mapping) {
      const cached = await MetadataStore.getAnalysis(mapping.trackFingerprint);
      if (cached && cached.state?.status === 'ready' && cached.algorithmVersion === CURRENT_ALGORITHM_VERSION) {
        this._setStatus(fileKey, 'ready');
        const metadata = await MetadataStore.getMetadata(mapping.trackFingerprint);
        return { ...cached, metadata };
      }
    }

    // 2. Already queued?
    const existing = this._findJob(fileKey);
    if (existing) {
      if (priority && !existing.priority) {
        existing.priority = true;
        this._reorderQueue();
      }
      return existing.promise;
    }

    // 3. Create new job
    const id = `job-${++this.jobCounter}`;
    let resolveRef, rejectRef;
    const promise = new Promise((resolve, reject) => { resolveRef = resolve; rejectRef = reject; });
    const job = { id, fileKey, file, priority, existingBpm, resolve: resolveRef, reject: rejectRef, promise };

    this.jobs.set(id, job);
    this.queue.push(job);
    this._setStatus(fileKey, 'queued');
    this._reorderQueue();
    this._processQueue();

    return promise;
  }

  async getAnalysis(file) {
    const fileKey = await this._computeFileKey(file);
    const mapping = await MetadataStore.getFileKey(fileKey);
    if (!mapping) return null;
    const analysis = await MetadataStore.getAnalysis(mapping.trackFingerprint);
    if (analysis && analysis.algorithmVersion !== CURRENT_ALGORITHM_VERSION) return null;
    return analysis;
  }

  async hasAnalysis(file) {
    const fileKey = await this._computeFileKey(file);
    const mapping = await MetadataStore.getFileKey(fileKey);
    if (!mapping) return false;
    const analysis = await MetadataStore.getAnalysis(mapping.trackFingerprint);
    return Boolean(analysis && analysis.state?.status === 'ready' && analysis.algorithmVersion === CURRENT_ALGORITHM_VERSION);
  }

  async invalidate(file) {
    const fileKey = await this._computeFileKey(file);
    const mapping = await MetadataStore.getFileKey(fileKey);
    if (mapping) {
      await MetadataStore.deleteAnalysis(mapping.trackFingerprint);
      await MetadataStore.deleteFileKey(fileKey);
    }
    this._setStatus(fileKey, 'unknown');
  }

  async reanalyze(file, { priority = false } = {}) {
    await this.invalidate(file);
    return this.analyze(file, { priority });
  }

  getStatus(fileKey) {
    return this.statusMap.get(fileKey) || 'unknown';
  }

  cancel(fileKey) {
    const job = this._findJob(fileKey);
    if (!job) return;
    this.queue = this.queue.filter(j => j.id !== job.id);
    if (this.current && this.current.id === job.id) {
      this.worker?.postMessage({ type: 'CANCEL', id: job.id });
    }
    this.jobs.delete(job.id);
    this._setStatus(fileKey, 'cancelled');
    job.reject(new Error('Analysis cancelled'));
  }

  onProgress(fileKey, callback) {
    if (!this.progressCbs.has(fileKey)) this.progressCbs.set(fileKey, new Set());
    this.progressCbs.get(fileKey).add(callback);
    return () => this.progressCbs.get(fileKey)?.delete(callback);
  }

  onStatusChange(callback) {
    this.statusCbs.add(callback);
    return () => this.statusCbs.delete(callback);
  }

  onWorkerEvent(callback) {
    this.workerEventCbs.add(callback);
    return () => this.workerEventCbs.delete(callback);
  }

  _emitWorkerEvent(event) {
    this.workerEventCbs.forEach(cb => cb(event));
  }

  inspect() {
    return {
      queueLength: this.queue.length,
      currentJobId: this.current?.id || null,
      currentFileKey: this.current?.fileKey || null,
      queuedFileKeys: this.queue.map(j => j.fileKey),
      knownStatuses: Object.fromEntries(this.statusMap),
      workerActive: Boolean(this.worker),
    };
  }

  // --- Internal: queue processing ---

  _findJob(fileKey) {
    for (const job of this.jobs.values()) if (job.fileKey === fileKey) return job;
    return null;
  }

  _reorderQueue() {
    // Priority jobs first, preserving insertion order within each group
    this.queue.sort((a, b) => (b.priority ? 1 : 0) - (a.priority ? 1 : 0));
  }

  async _processQueue() {
    if (this.current || !this.queue.length) return;
    this.ensureWorker();
    if (this.workerReadyPromise) {
      await this.workerReadyPromise;
      if (!this.workerReady) {
        const error = this.workerInitError || 'Worker initialization failed';
        while (this.queue.length) {
          const job = this.queue.shift();
          this._failJob(job.id, error);
        }
        return;
      }
      if (this.current || !this.queue.length) return;
    }
    this.current = this.queue.shift();
    const { id, file, fileKey, existingBpm } = this.current;
    this._setStatus(fileKey, 'analyzing');

    try {
      // Decode on main thread using private OfflineAudioContext (NOT audioEngine's)
      const arrayBuffer = await file.arrayBuffer();
      const ctx = this._ensureDecodeContext();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

      // Read metadata on main thread (no binary transfer to worker).
      // Metadata is INFORMATION only — it never influences acoustic analysis.
      try {
        const metadata = await readMetadata(file, audioBuffer);
        this.current.metadata = metadata;
      } catch (e) {
        console.warn('[AnalysisService] Metadata reading failed:', e.message);
      }

      // Extract channel 0 PCM and transfer to worker (zero-copy)
      const pcm = audioBuffer.getChannelData(0);

      this.worker.postMessage(
        {
          type: 'ANALYZE',
          id,
          pcm,
          sampleRate: audioBuffer.sampleRate,
          duration: audioBuffer.duration,
          fileSize: file.size,
          fileKey,
          existingBpm,
        },
        [pcm.buffer] // transferable — zero-copy, detaches on main thread
      );
    } catch (error) {
      this._failJob(id, error.message || 'Decode failed');
      this.current = null;
      this._processQueue();
    }
  }

  _handleMessage(data) {
    const { type, id } = data;

    if (type === 'worker-ready') {
      clearTimeout(this._workerReadyTimeout);
      this.workerReady = true;
      this._workerReadyResolve?.();
      this._emitWorkerEvent({ type: 'worker-ready', algorithmVersion: data.algorithmVersion });
      this._processQueue();
      return;
    }

    if (type === 'PROGRESS') {
      const job = this.jobs.get(id);
      if (job) this._emitProgress(job.fileKey, data.progress, 'analyzing');
      return;
    }

    if (type === 'COMPLETE') {
      const job = this.jobs.get(id);
      this.current = null;
      if (job) {
        // Persist metadata + artwork alongside the analysis record.
        // Metadata is stored SEPARATELY from analysis (different IndexedDB store)
        // so that re-analysis never overwrites metadata and vice versa.
        const persistMetadata = async (fingerprint) => {
          if (!job.metadata) return null;
          const meta = { ...job.metadata };
          const artworkData = meta._artworkData;
          delete meta._artworkData; // Don't store raw bytes in metadata record
          await MetadataStore.putMetadata(fingerprint, meta);
          if (artworkData) {
            const blob = createArtworkBlob(artworkData, meta.artwork?.mimeType);
            await MetadataStore.putArtwork(fingerprint, blob);
          }
          return meta;
        };
        MetadataStore.getAnalysis(data.result.trackFingerprint)
          .then(async existing => {
            if (existing && existing.state?.status === 'ready' && existing.algorithmVersion === data.result.algorithmVersion) {
              // Renamed file: reuse existing analysis, register new fileKey + metadata
              await MetadataStore.putFileKey(job.fileKey, data.result.trackFingerprint);
              const meta = await persistMetadata(data.result.trackFingerprint);
              this._setStatus(job.fileKey, 'ready');
              job.resolve({ ...existing, metadata: meta });
              this.jobs.delete(id);
            } else {
              // New analysis: persist analysis + fileKey + metadata + artwork
              await MetadataStore.putAnalysis(data.result);
              await MetadataStore.putFileKey(job.fileKey, data.result.trackFingerprint);
              const meta = await persistMetadata(data.result.trackFingerprint);
              this._setStatus(job.fileKey, 'ready');
              job.resolve({ ...data.result, metadata: meta });
              this.jobs.delete(id);
            }
          })
          .catch(err => this._failJob(id, err.message));
      }
      this._processQueue();
      return;
    }

    if (type === 'ERROR') {
      this._failJob(id, data.error);
      this.current = null;
      this._processQueue();
      return;
    }

    if (type === 'CANCELLED') {
      this.current = null;
      this._processQueue();
      return;
    }
  }

  _failJob(id, error) {
    const job = this.jobs.get(id);
    if (job) {
      this._setStatus(job.fileKey, 'failed');
      job.reject(new Error(error));
      this.jobs.delete(id);
    }
  }

  _setStatus(fileKey, status) {
    this.statusMap.set(fileKey, status);
    this.statusCbs.forEach(cb => cb(fileKey, status));
  }

  _emitProgress(fileKey, progress, status) {
    this.statusCbs.forEach(cb => cb(fileKey, status, progress));
    this.progressCbs.get(fileKey)?.forEach(cb => cb(progress, status));
  }
}

export const analysisService = new AnalysisService();
export default analysisService;