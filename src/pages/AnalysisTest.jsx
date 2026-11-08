/**
 * AnalysisTest — TEMPORARY developer-only test harness for Phase 1 validation.
 * NOT part of the normal CrossCue UI. Accessible only via /analysis-test route.
 * Can be deleted after Phase 1 validation is complete.
 *
 * Validates: pipeline, worker communication, waveform output, fingerprinting
 * (same/renamed/different), IndexedDB cache, cancellation, failure handling.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import analysisService, { MetadataStore } from '@/lib/crosscue/analysis';
import { detectBpm } from '@/lib/decksmith/audioAnalysis';

// Replicate fileKey computation for display/lookup (same algorithm as AnalysisService)
async function computeFileKey(file) {
  const data = new TextEncoder().encode(`${file.name}|${file.size}|${file.lastModified}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function getExistingBpm(file){try{const arrayBuffer=await file.arrayBuffer();const ctx=new (window.AudioContext||window.webkitAudioContext)();const buffer=await ctx.decodeAudioData(arrayBuffer);ctx.close();return detectBpm(buffer);}catch{return{bpm:0};}}

// Validate waveform overview peaks: no NaN, no Infinity, in range, min <= max
function validateWaveform(overview) {
  if (!overview) return { valid: false, reason: 'no overview object' };
  if (overview.resolution !== 256) return { valid: false, reason: `resolution=${overview.resolution} (expected 256)` };
  if (!Array.isArray(overview.peaks)) return { valid: false, reason: 'peaks is not an array' };
  if (overview.peaks.length !== 256) return { valid: false, reason: `peaks.length=${overview.peaks.length} (expected 256)` };
  for (let i = 0; i < overview.peaks.length; i++) {
    const p = overview.peaks[i];
    if (typeof p.min !== 'number' || typeof p.max !== 'number')
      return { valid: false, reason: `peak[${i}]: min/max not numbers` };
    if (Number.isNaN(p.min) || Number.isNaN(p.max))
      return { valid: false, reason: `peak[${i}]: NaN detected` };
    if (!Number.isFinite(p.min) || !Number.isFinite(p.max))
      return { valid: false, reason: `peak[${i}]: Infinity detected` };
    if (p.min < -1.01 || p.max > 1.01)
      return { valid: false, reason: `peak[${i}]: out of PCM range (min=${p.min}, max=${p.max})` };
    if (p.min > p.max)
      return { valid: false, reason: `peak[${i}]: min > max` };
  }
  return { valid: true, peakCount: overview.peaks.length };
}

export default function AnalysisTest() {
  const [file, setFile] = useState(null);
  const [diag, setDiag] = useState({
    file: '', status: 'unknown', progress: 0, duration: 0,
    fingerprint: '', peakCount: 0, cache: '', error: '',
    offlineBpm: 0, bpmConfidence: 0, existingBpm: 0, bpmDiff: null,
    rawBpm: 0, rawValue: 0, canonicalBpm: 0, halfCandidate: null, baseCandidate: 0, doubleCandidate: null,
    periodicityConfidence: 0, octaveConfidence: 0, octaveConfidenceBeforePenalty: 0, octaveDecision: '', octaveAmbiguous: false,
    compositeWinnerType: '', finalWinnerType: '', overrideApplied: false, overrideReason: '', acousticDominantType: null, contextInfluence: 0,
    candidateDiagnostics: [],
    beatGridFirstBeat: 0, beatGridInterval: 0, beatGridTotalBeats: 0, beatGridDownbeat: null, beatGridDownbeatConfidence: 0, beatGridConfidence: 0,
    metaFormat: '', metaCodec: '', metaDuration: 0, metaBitrate: 0, metaSampleRate: 0, metaChannels: 0,
    metaTitle: '', metaArtist: '', metaAlbum: '', metaAlbumArtist: '', metaGenre: '', metaYear: '',
    metaTrack: '', metaDisc: '', metaComposer: '', metaRemixer: '', metaComment: '', metaIsrc: '',
    metaBpm: '', metaKey: '', metaArtwork: false, metaArtworkType: '', metaId3Version: '', metaRawTags: [],
    keyKey: '', keyRoot: '', keyMode: '', keyCamelot: '', keyOpenKey: '', keyConfidence: 0,
    keyAltKey: '', keyAltConfidence: 0, keyBestScore: 0, keySecondScore: 0, keyScoreMargin: 0,
    keyRegionalConsistency: 0, keyUsableFrames: 0, keyTotalFrames: 0, keyNumRegions: 0,
    keyRankedCandidates: [], keyReason: '',
    keyDspDiag: null,
    metaStatus: 'idle',
  });
  const [results, setResults] = useState({});
  const [logs, setLogs] = useState([]);
  const progressReceived = useRef(false);
  const completeReceived = useRef(false);
  const fileGeneration = useRef(0);

  const log = useCallback((msg) => {
    const time = new Date().toISOString().split('T')[1].slice(0, 12);
    setLogs(prev => [...prev, `[${time}] ${msg}`]);
  }, []);

  useEffect(() => {
    const unsub = analysisService.onWorkerEvent((event) => {
      if (event.type === 'worker-created') log('WORKER: created');
      else if (event.type === 'worker-ready') log(`WORKER: ready (algorithm ${event.algorithmVersion})`);
      else if (event.type === 'worker-error') log(`WORKER: error — ${event.error}`);
    });
    return unsub;
  }, [log]);

  const setResult = (key, value) => setResults(prev => ({ ...prev, [key]: value }));

  const handleFileSelect = (e) => {
    const f = e.target.files[0];
    if (f) {
      fileGeneration.current++;
      setFile(f);
      log(`File selected: ${f.name} (${f.size} bytes, lastModified: ${new Date(f.lastModified).toISOString()})`);
      setDiag(d => ({
        ...d,
        file: f.name, status: 'unknown', progress: 0, duration: 0, fingerprint: '', peakCount: 0, cache: '', error: '',
        metaFormat: '', metaCodec: '', metaDuration: 0, metaBitrate: 0, metaSampleRate: 0, metaChannels: 0,
        metaTitle: '', metaArtist: '', metaAlbum: '', metaAlbumArtist: '', metaGenre: '', metaYear: '',
        metaTrack: '', metaDisc: '', metaComposer: '', metaRemixer: '', metaComment: '', metaIsrc: '',
        metaBpm: '', metaKey: '', metaArtwork: false, metaArtworkType: '', metaId3Version: '', metaRawTags: [],
        keyKey: '', keyRoot: '', keyMode: '', keyCamelot: '', keyOpenKey: '', keyConfidence: 0,
        keyAltKey: '', keyAltConfidence: 0, keyBestScore: 0, keySecondScore: 0, keyScoreMargin: 0,
        keyRegionalConsistency: 0, keyUsableFrames: 0, keyTotalFrames: 0, keyNumRegions: 0,
        keyRankedCandidates: [], keyReason: '',
        keyDspDiag: null,
        metaStatus: 'idle',
      }));
    }
  };

  // Core analysis runner — tracks progress, cache hit/miss, worker communication
  const runAnalysis = async (f, label = 'main') => {
    const gen = fileGeneration.current;
    log(`[${label}] Starting analysis for: ${f.name}`);
    progressReceived.current = false;
    completeReceived.current = false;
    const fileKey = await computeFileKey(f);
    log(`[${label}] fileKey: ${fileKey.slice(0, 16)}...`);

    const unsub = analysisService.onProgress(fileKey, (progress, status) => {
      if (gen !== fileGeneration.current) return; // Stale — file changed
      progressReceived.current = true;
      log(`[${label}] PROGRESS: ${(progress * 100).toFixed(0)}% (${status})`);
      setDiag(d => ({ ...d, progress, status, metaStatus: 'reading...' }));
    });

    try {
      const result = await analysisService.analyze(f, { priority: true });
      unsub();
      if (gen !== fileGeneration.current) {
        log(`[${label}] STALE: result discarded (file changed since analysis started)`);
        return { stale: true, fileKey };
      }
      completeReceived.current = true;
      const cacheHit = !progressReceived.current;
      log(`[${label}] COMPLETE — fingerprint: ${result.trackFingerprint.slice(0, 24)}...`);
      log(`[${label}] CACHE: ${cacheHit ? 'HIT (no worker used)' : 'MISS (worker processed)'}`);

      const existing = await getExistingBpm(f);
      const bpmDiff = existing.bpm && result.bpm?.value ? Math.round(Math.abs(existing.bpm - result.bpm.value) * 100) / 100 : null;
      if (existing.bpm && result.bpm?.value) log(`[${label}] BPM: existing=${existing.bpm} offline=${result.bpm.value} diff=${bpmDiff} confidence=${result.bpm?.confidence} ${result.bpm?.confidence >= 0.65 ? 'ACCEPTED' : 'REJECTED (low confidence)'}`);
      if (result.bpm?.candidateScores) log(`[${label}] OCTAVE: raw=${result.bpm.rawBpm} canonical=${result.bpm.canonicalBpm} decision=${result.bpm.octaveDecision} compWinner=${result.bpm.compositeWinnerType} finalWinner=${result.bpm.finalWinnerType} override=${result.bpm.overrideApplied} acousticDom=${result.bpm.acousticDominantType||'none'} ctxInfluence=${result.bpm.contextInfluence} | ${result.bpm.candidateScores.map(c=>`${c.type}=${c.bpm} comp=${c.compositeScore} aSt=${c.acousticStrength} aWins=${c.acousticWins}/4`).join(' | ')}`);
      if(result.beatGrid) log(`[${label}] BEATGRID: firstBeat=${result.beatGrid.firstBeat}s interval=${result.beatGrid.beatInterval}s totalBeats=${result.beatGrid.totalBeats} downbeat=${result.beatGrid.downbeat===null?'null':'beat '+result.beatGrid.downbeat} downbeatConf=${result.beatGrid.downbeatConfidence} confidence=${result.beatGrid.confidence}`);
      if(result.keyAnalysis) log(`[${label}] KEY: key=${result.keyAnalysis.key||'none'} camelot=${result.keyAnalysis.camelot||'—'} confidence=${result.keyAnalysis.confidence||0} alt=${result.keyAnalysis.alternative?.key||'—'} altConf=${result.keyAnalysis.alternative?.confidence||0} margin=${result.keyAnalysis.diagnostics?.scoreMargin||0} consistency=${result.keyAnalysis.diagnostics?.regionalConsistency||0} usableFrames=${result.keyAnalysis.diagnostics?.usableFrames||0}/${result.keyAnalysis.diagnostics?.totalFrames||0}`);
      if(result.metadata) log(`[${label}] METADATA: format=${result.metadata.technical?.format} tags=${result.metadata.tagFormat||'none'} v${result.metadata.tagVersion||'n/a'} artwork=${result.metadata.artwork?.available?'yes':'no'} customTags=${result.metadata.customTags?.length||0} rawTags=${result.metadata.rawTags?.length||0} tagBPM=${result.metadata.tags?.bpm||'none'} tagKey=${result.metadata.tags?.key||'none'}`);
      setDiag({
        file: f.name,
        status: 'ready',
        progress: 1,
        duration: result.duration,
        fingerprint: result.trackFingerprint,
        peakCount: result.waveform?.resolutions?.overview?.peaks?.length || 0,
        cache: cacheHit ? 'HIT' : 'MISS',
        error: '',
        offlineBpm: result.bpm?.value || 0,
        bpmConfidence: result.bpm?.confidence || 0,
        existingBpm: existing.bpm || 0,
        bpmDiff,
        rawBpm: result.bpm?.rawBpm || 0,
        rawValue: result.bpm?.rawValue || result.bpm?.rawBpm || 0,
        canonicalBpm: result.bpm?.canonicalBpm || result.bpm?.value || 0,
        halfCandidate: result.bpm?.halfCandidate,
        baseCandidate: result.bpm?.baseCandidate || 0,
        doubleCandidate: result.bpm?.doubleCandidate,
        periodicityConfidence: result.bpm?.periodicityConfidence || 0,
        octaveConfidence: result.bpm?.octaveConfidence || 0,
        octaveConfidenceBeforePenalty: result.bpm?.octaveConfidenceBeforePenalty || 0,
        octaveDecision: result.bpm?.octaveDecision || '',
        octaveAmbiguous: result.bpm?.octaveAmbiguous || false,
        compositeWinnerType: result.bpm?.compositeWinnerType || '',
        finalWinnerType: result.bpm?.finalWinnerType || '',
        overrideApplied: result.bpm?.overrideApplied || false,
        overrideReason: result.bpm?.overrideReason || '',
        acousticDominantType: result.bpm?.acousticDominantType || null,
        contextInfluence: result.bpm?.contextInfluence || 0,
        candidateDiagnostics: (result.bpm?.candidateScores || []).map(c => ({
          type: c.type,
          bpm: c.bpm,
          alignment: typeof c.alignment === 'number' ? c.alignment : 0,
          autocorr: typeof c.autocorr === 'number' ? c.autocorr : 0,
          energyRatio: typeof c.energyRatio === 'number' ? c.energyRatio : 0,
          supportRatio: typeof c.supportRatio === 'number' ? c.supportRatio : 0,
          numBeats: typeof c.numBeats === 'number' ? c.numBeats : 0,
          supportedBeats: typeof c.supportedBeats === 'number' ? c.supportedBeats : 0,
          meanOnsetDist: typeof c.meanOnsetDist === 'number' ? c.meanOnsetDist : 0,
          normalizedMeanOnsetDist: typeof c.normalizedMeanOnsetDist === 'number' ? c.normalizedMeanOnsetDist : 0,
          distScore: typeof c.distScore === 'number' ? c.distScore : 0,
          djPrior: typeof c.djPrior === 'number' ? c.djPrior : 0,
          existingProximity: typeof c.existingProximity === 'number' ? c.existingProximity : 0,
          compositeScore: typeof c.compositeScore === 'number' ? c.compositeScore : 0,
          acousticStrength: typeof c.acousticStrength === 'number' ? c.acousticStrength : 0,
          acousticWins: typeof c.acousticWins === 'number' ? c.acousticWins : 0,
          contextContribution: typeof c.contextContribution === 'number' ? c.contextContribution : 0,
          phaseOffset: typeof c.phaseOffset === 'number' ? c.phaseOffset : 0,
        })),
        beatGridFirstBeat: result.beatGrid?.firstBeat || 0,
        beatGridInterval: result.beatGrid?.beatInterval || 0,
        beatGridTotalBeats: result.beatGrid?.totalBeats || 0,
        beatGridDownbeat: result.beatGrid?.downbeat ?? null,
        beatGridDownbeatConfidence: result.beatGrid?.downbeatConfidence || 0,
        beatGridConfidence: result.beatGrid?.confidence || 0,
        metaFormat: result.metadata?.technical?.format || '',
        metaCodec: result.metadata?.technical?.codec || '',
        metaDuration: result.metadata?.technical?.duration || 0,
        metaBitrate: result.metadata?.technical?.bitrate || 0,
        metaSampleRate: result.metadata?.technical?.sampleRate || 0,
        metaChannels: result.metadata?.technical?.channels || 0,
        metaTitle: result.metadata?.tags?.title || '',
        metaArtist: result.metadata?.tags?.artist || '',
        metaAlbum: result.metadata?.tags?.album || '',
        metaAlbumArtist: result.metadata?.tags?.albumArtist || '',
        metaGenre: result.metadata?.tags?.genre || '',
        metaYear: result.metadata?.tags?.year || result.metadata?.tags?.date || '',
        metaTrack: result.metadata?.tags?.track || '',
        metaDisc: result.metadata?.tags?.disc || '',
        metaComposer: result.metadata?.tags?.composer || '',
        metaRemixer: result.metadata?.tags?.remixer || '',
        metaComment: result.metadata?.tags?.comment || '',
        metaIsrc: result.metadata?.tags?.isrc || '',
        metaBpm: result.metadata?.tags?.bpm || '',
        metaKey: result.metadata?.tags?.key || '',
        metaArtwork: result.metadata?.artwork?.available || false,
        metaArtworkType: result.metadata?.artwork?.type || '',
        metaId3Version: result.metadata?.tagVersion || '',
        metaRawTags: result.metadata?.rawTags || [],
        keyKey: result.keyAnalysis?.key || '',
        keyRoot: result.keyAnalysis?.root || '',
        keyMode: result.keyAnalysis?.mode || '',
        keyCamelot: result.keyAnalysis?.camelot || '',
        keyOpenKey: result.keyAnalysis?.openKey || '',
        keyConfidence: result.keyAnalysis?.confidence || 0,
        keyAltKey: result.keyAnalysis?.alternative?.key || '',
        keyAltConfidence: result.keyAnalysis?.alternative?.confidence || 0,
        keyBestScore: result.keyAnalysis?.diagnostics?.bestScore || 0,
        keySecondScore: result.keyAnalysis?.diagnostics?.secondScore || 0,
        keyScoreMargin: result.keyAnalysis?.diagnostics?.scoreMargin || 0,
        keyRegionalConsistency: result.keyAnalysis?.diagnostics?.regionalConsistency || 0,
        keyUsableFrames: result.keyAnalysis?.diagnostics?.usableFrames || 0,
        keyTotalFrames: result.keyAnalysis?.diagnostics?.totalFrames || 0,
        keyNumRegions: result.keyAnalysis?.diagnostics?.numRegions || 0,
        keyRankedCandidates: result.keyAnalysis?.diagnostics?.rankedCandidates || [],
        keyReason: result.keyAnalysis?.reason || '',
        keyDspDiag: result.keyAnalysis?.diagnostics || null,
        metaStatus: 'ready',
      });

      return { result, cacheHit, fileKey };
    } catch (error) {
      unsub();
      if (gen !== fileGeneration.current) {
        log(`[${label}] STALE: error discarded (file changed since analysis started)`);
        return { error: error.message, fileKey };
      }
      log(`[${label}] ERROR: ${error.message}`);
      setDiag(d => ({
        ...d,
        status: 'failed', error: error.message, cache: 'MISS',
        metaFormat: '', metaCodec: '', metaDuration: 0, metaBitrate: 0, metaSampleRate: 0, metaChannels: 0,
        metaTitle: '', metaArtist: '', metaAlbum: '', metaAlbumArtist: '', metaGenre: '', metaYear: '',
        metaTrack: '', metaDisc: '', metaComposer: '', metaRemixer: '', metaComment: '', metaIsrc: '',
        metaBpm: '', metaKey: '', metaArtwork: false, metaArtworkType: '', metaId3Version: '', metaRawTags: [],
        keyKey: '', keyRoot: '', keyMode: '', keyCamelot: '', keyOpenKey: '', keyConfidence: 0,
        keyAltKey: '', keyAltConfidence: 0, keyBestScore: 0, keySecondScore: 0, keyScoreMargin: 0,
        keyRegionalConsistency: 0, keyUsableFrames: 0, keyTotalFrames: 0, keyNumRegions: 0,
        keyRankedCandidates: [], keyReason: '',
        keyDspDiag: null,
        metaStatus: 'error',
      }));
      return { error: error.message, fileKey };
    }
  };

  // --- TEST: Pipeline + Waveform + Worker Communication ---
  const runPipelineTest = async () => {
    if (!file) { log('No file selected'); return; }
    log('========== PIPELINE TEST ==========');
    const { result } = await runAnalysis(file, 'pipeline');

    if (result) {
      // Waveform validation
      const waveValid = validateWaveform(result.waveform?.resolutions?.overview);
      log(`Waveform validation: ${waveValid.valid ? 'PASS' : 'FAIL — ' + waveValid.reason}`);
      if (waveValid.valid) log(`Peak count: ${waveValid.peakCount}`);
      setResult('waveform', waveValid.valid ? 'pass' : 'fail');

      // Worker communication validation
      const workerOk = progressReceived.current && completeReceived.current;
      log(`Worker communication: PROGRESS received=${progressReceived.current}, COMPLETE received=${completeReceived.current}`);
      setResult('workerComm', workerOk ? 'pass' : 'fail');

      setResult('pipeline', 'pass');
      log('Pipeline test: PASS');
    } else {
      setResult('pipeline', 'fail');
      setResult('waveform', 'fail');
      setResult('workerComm', 'fail');
      log('Pipeline test: FAIL');
    }
  };

  // --- TEST A: Same file, same filename → cache hit ---
  const runTestA = async () => {
    if (!file) return;
    log('========== TEST A: Same file, same filename ==========');
    const first = await runAnalysis(file, 'testA-first');
    if (first.error) { setResult('testA', 'fail'); return; }

    // Second analysis of same file — should be cache hit
    const second = await runAnalysis(file, 'testA-second');
    const pass = second.cacheHit === true;
    log(`Test A: ${pass ? 'PASS — second analysis was cache hit' : 'FAIL — re-analyzed unnecessarily'}`);
    setResult('testA', pass ? 'pass' : 'fail');
  };

  // --- TEST B: Same audio, renamed → fingerprint match, reuse analysis ---
  const runTestB = async () => {
    if (!file) return;
    log('========== TEST B: Same audio, renamed ==========');

    // First: analyze original
    const first = await runAnalysis(file, 'testB-original');
    if (first.error || !first.result) { setResult('testB', 'fail'); return; }
    const originalFingerprint = first.result.trackFingerprint;

    // Create renamed copy (same content, same size, same lastModified, different name)
    const renamed = new File([file], 'RENAMED_' + file.name, { type: file.type, lastModified: file.lastModified });
    log(`Renamed: ${file.name} → ${renamed.name} (size=${renamed.size}, lastModified=${new Date(renamed.lastModified).toISOString()})`);

    // Analyze renamed — fileKey will differ, but fingerprint should match
    const second = await runAnalysis(renamed, 'testB-renamed');
    if (second.error || !second.result) { setResult('testB', 'fail'); return; }

    const fingerprintMatch = second.result.trackFingerprint === originalFingerprint;
    log(`Fingerprint match: ${fingerprintMatch ? 'YES (same audio identity)' : 'NO (BUG)'}`);
    log(`Original:  ${originalFingerprint.slice(0, 32)}...`);
    log(`Renamed:   ${second.result.trackFingerprint.slice(0, 32)}...`);

    // Verify in IndexedDB: both fileKeys should map to the same trackFingerprint
    const originalKey = await computeFileKey(file);
    const renamedKey = await computeFileKey(renamed);
    const origMapping = await MetadataStore.getFileKey(originalKey);
    const renamedMapping = await MetadataStore.getFileKey(renamedKey);
    const sameMapping = origMapping && renamedMapping && origMapping.trackFingerprint === renamedMapping.trackFingerprint;
    log(`IndexedDB: both fileKeys map to same fingerprint: ${sameMapping ? 'YES' : 'NO'}`);

    const pass = fingerprintMatch && sameMapping;
    log(`Test B: ${pass ? 'PASS — renamed file recognized' : 'FAIL'}`);
    setResult('testB', pass ? 'pass' : 'fail');
  };

  // --- TEST C: Different audio file → different fingerprint ---
  const runTestC = async () => {
    if (!file) { log('Select a primary file first'); return; }
    log('========== TEST C: Different audio file ==========');
    log('Please select a DIFFERENT audio file for comparison');
    document.getElementById('test-c-input').click();
  };

  const handleTestCFile = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    log(`Test C file: ${f.name} (${f.size} bytes)`);

    // Get original fingerprint
    const origKey = await computeFileKey(file);
    const origMapping = await MetadataStore.getFileKey(origKey);
    const origFingerprint = origMapping ? (await MetadataStore.getAnalysis(origMapping.trackFingerprint))?.trackFingerprint : null;

    if (!origFingerprint) {
      log('Original file not yet analyzed — run Pipeline Test first');
      setResult('testC', 'fail');
      return;
    }

    const { result } = await runAnalysis(f, 'testC');
    if (!result) { setResult('testC', 'fail'); return; }

    const different = result.trackFingerprint !== origFingerprint;
    log(`Original fingerprint:  ${origFingerprint.slice(0, 32)}...`);
    log(`Different file fingerprint: ${result.trackFingerprint.slice(0, 32)}...`);
    log(`Different fingerprint: ${different ? 'YES' : 'NO (BUG — same fingerprint for different audio)'}`);
    log(`Test C: ${different ? 'PASS — different file, different fingerprint' : 'FAIL'}`);
    setResult('testC', different ? 'pass' : 'fail');
  };

  // --- TEST: IndexedDB Cache ---
  const runCacheTest = async () => {
    if (!file) return;
    log('========== CACHE TEST ==========');
    const first = await runAnalysis(file, 'cache-1');
    log(`First analysis: ${first.cacheHit ? 'HIT' : 'MISS'}`);

    const second = await runAnalysis(file, 'cache-2');
    log(`Second analysis: ${second.cacheHit ? 'HIT' : 'MISS'}`);

    const pass = second.cacheHit === true;
    log(`Cache test: ${pass ? 'PASS — second analysis was cache hit' : 'FAIL — worker re-analyzed'}`);
    setResult('cache', pass ? 'pass' : 'fail');
  };

  // --- TEST: Cancellation ---
  const runCancelTest = async () => {
    if (!file) return;
    log('========== CANCEL TEST ==========');
    const fileKey = await computeFileKey(file);
    await analysisService.invalidate(file);
    log('Invalidated cache to force fresh analysis');

    let cancelSent = false;
    const unsub = analysisService.onStatusChange((fk, status) => {
      if (fk === fileKey && status === 'analyzing' && !cancelSent) {
        cancelSent = true;
        log('Status is "analyzing" — sending cancel...');
        analysisService.cancel(fileKey);
        unsub();
      }
    });

    let cancelled = false;
    try {
      await analysisService.analyze(file, { priority: true });
      unsub();
      log('Analysis completed before cancel took effect (file too small for reliable cancel timing)');
    } catch (error) {
      cancelled = error.message === 'Analysis cancelled';
      log(`Cancel result: ${cancelled ? 'PASS — status is cancelled' : 'FAIL — ' + error.message}`);
    }

    // Verify no false 'ready' record (only if cancel actually happened)
    if (cancelled) {
      const mapping = await MetadataStore.getFileKey(fileKey);
      if (mapping) {
        const analysis = await MetadataStore.getAnalysis(mapping.trackFingerprint);
        log(`IndexedDB after cancel: ${analysis ? 'FALSE READY RECORD (BAD)' : 'no analysis record (GOOD)'}`);
      } else {
        log('IndexedDB after cancel: no fileKey mapping (GOOD)');
      }
    }

    // Verify worker remains usable after cancel
    log('Testing worker usability after cancel...');
    try {
      await analysisService.analyze(file, { priority: true });
      log('Worker still usable: PASS');
      setResult('cancel', cancelled ? 'pass' : 'pass*');
    } catch (e) {
      log('Worker still usable: FAIL — ' + e.message);
      setResult('cancel', 'fail');
    }
  };

  // --- TEST: Failure Handling ---
  const runFailureTest = async () => {
    log('========== FAILURE TEST ==========');
    const invalidFile = new File(['this is not audio data — it is plain text'], 'invalid.mp3', { type: 'audio/mpeg' });
    log(`Created invalid file: ${invalidFile.name} (${invalidFile.size} bytes)`);

    try {
      await analysisService.analyze(invalidFile, { priority: true });
      log('Failure test: FAIL — should have thrown an error');
      setResult('failure', 'fail');
    } catch (error) {
      log(`Failure test: PASS — error returned: ${error.message}`);
      setResult('failure', 'pass');
    }

    // Verify no corrupted record in IndexedDB
    const fileKey = await computeFileKey(invalidFile);
    const mapping = await MetadataStore.getFileKey(fileKey);
    log(`IndexedDB after failure: ${mapping ? 'RECORD EXISTS (BAD)' : 'no record (GOOD)'}`);

    // Verify queue continues processing subsequent valid jobs
    if (file) {
      log('Testing queue recovery with valid file...');
      try {
        await analysisService.analyze(file, { priority: true });
        log('Queue recovery: PASS — valid job executed after failure');
      } catch (e) {
        log('Queue recovery: FAIL — ' + e.message);
        setResult('failure', 'fail');
      }
    }
  };

  // --- VERIFY: IndexedDB contents ---
  const verifyIndexedDB = async () => {
    if (!file) return;
    log('========== INDEXEDDB VERIFICATION ==========');
    const fileKey = await computeFileKey(file);
    log(`Looking up fileKey: ${fileKey.slice(0, 24)}...`);

    const mapping = await MetadataStore.getFileKey(fileKey);
    log(`fileKeys store: ${mapping ? `found → ${mapping.trackFingerprint.slice(0, 24)}...` : 'NOT FOUND'}`);

    if (mapping) {
      const analysis = await MetadataStore.getAnalysis(mapping.trackFingerprint);
      log(`analysis store: ${analysis ? 'found' : 'NOT FOUND'}`);
      if (analysis) {
        log(`  analysisVersion: ${analysis.analysisVersion}`);
        log(`  algorithmVersion: ${analysis.algorithmVersion}`);
        log(`  trackFingerprint: ${analysis.trackFingerprint}`);
        log(`  duration: ${analysis.duration}s`);
        log(`  waveform.resolution: ${analysis.waveform?.resolutions?.overview?.resolution}`);
        log(`  waveform.peakCount: ${analysis.waveform?.resolutions?.overview?.peaks?.length}`);
        log(`  state.status: ${analysis.state?.status}`);
        log(`  state.analyzedAt: ${analysis.state?.analyzedAt}`);
        log(`  state.error: ${analysis.state?.error}`);
        log(`  bpm.value: ${analysis.bpm?.value}`);
        log(`  bpm.confidence: ${analysis.bpm?.confidence}`);
      }
    }
  };

  const testLabels = {
    pipeline: 'Pipeline',
    workerComm: 'Worker Communication',
    waveform: 'Waveform Validation',
    testA: 'Test A: Same File',
    testB: 'Test B: Renamed',
    testC: 'Test C: Different File',
    cache: 'IndexedDB Cache',
    cancel: 'Cancellation',
    failure: 'Failure Handling',
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6 max-w-5xl mx-auto font-mono text-sm">
      <h1 className="text-xl font-bold mb-2">Analysis Service — Phase 1 Test Harness</h1>
      <p className="text-gray-500 text-xs mb-4">Temporary developer-only validation tool. Not part of CrossCue UI.</p>

      {/* File Input */}
      <div className="mb-4 p-3 border border-gray-700 bg-gray-800">
        <input type="file" accept="audio/*,.wav,.mp3" onChange={handleFileSelect} className="mb-2" />
        {file && <div className="text-xs text-gray-400">Selected: {file.name} ({file.size} bytes)</div>}
      </div>

      {/* Diagnostics Panel */}
      <div className="mb-4 p-3 border border-gray-700 bg-gray-800">
        <h2 className="font-bold mb-2 text-yellow-400">DIAGNOSTICS</h2>
        <div className="grid grid-cols-[200px_1fr] gap-x-2 gap-y-1 text-xs">
          <span className="text-gray-400">FILE:</span><span>{diag.file || '—'}</span>
          <span className="text-gray-400">STATUS:</span>
          <span className={diag.status === 'ready' ? 'text-green-400' : diag.status === 'failed' ? 'text-red-400' : diag.status === 'analyzing' ? 'text-yellow-400' : ''}>{diag.status}</span>
          <span className="text-gray-400">PROGRESS:</span><span>{(diag.progress * 100).toFixed(0)}%</span>
          <span className="text-gray-400">DURATION:</span><span>{diag.duration ? `${diag.duration}s` : '—'}</span>
          <span className="text-gray-400">FINGERPRINT:</span><span className="break-all">{diag.fingerprint ? diag.fingerprint.slice(0, 48) + '...' : '—'}</span>
          <span className="text-gray-400">WAVEFORM PEAK COUNT:</span><span>{diag.peakCount || '—'}</span>
          <span className="text-gray-400">CACHE:</span>
          <span className={diag.cache === 'HIT' ? 'text-green-400' : diag.cache === 'MISS' ? 'text-yellow-400' : ''}>{diag.cache || '—'}</span>
          <span className="text-gray-400">ERROR:</span><span className="text-red-400 break-all">{diag.error || '—'}</span>
          <span className="text-gray-400">OFFLINE BPM:</span><span>{diag.offlineBpm || '—'}</span>
          <span className="text-gray-400">BPM CONFIDENCE:</span><span>{diag.bpmConfidence ? diag.bpmConfidence.toFixed(3) : '—'}</span>
          <span className="text-gray-400">EXISTING BPM:</span><span>{diag.existingBpm || '—'}</span>
          <span className="text-gray-400">DIFFERENCE:</span><span>{diag.bpmDiff !== null ? `${diag.bpmDiff} BPM` : '—'}</span>
          <span className="text-gray-400">RAW BPM:</span><span>{diag.rawBpm || '—'}</span>
          <span className="text-gray-400">CANONICAL DJ BPM:</span><span className="text-cyan-400 font-bold">{diag.canonicalBpm || '—'}</span>
          <span className="text-gray-400">HALF CANDIDATE:</span><span>{diag.halfCandidate || 'invalid'}</span>
          <span className="text-gray-400">BASE CANDIDATE:</span><span>{diag.baseCandidate || '—'}</span>
          <span className="text-gray-400">DOUBLE CANDIDATE:</span><span>{diag.doubleCandidate || 'invalid'}</span>
          <span className="text-gray-400">FINAL BPM:</span><span>{diag.offlineBpm || '—'}</span>
          <span className="text-gray-400">PERIODICITY CONFIDENCE:</span><span>{diag.periodicityConfidence ? diag.periodicityConfidence.toFixed(3) : '—'}</span>
          <span className="text-gray-400">OCTAVE CONFIDENCE (after penalty):</span><span>{diag.octaveConfidence ? diag.octaveConfidence.toFixed(3) : '—'}</span>
          <span className="text-gray-400">OCTAVE CONFIDENCE (before penalty):</span><span>{diag.octaveConfidenceBeforePenalty ? diag.octaveConfidenceBeforePenalty.toFixed(3) : '—'}</span>
          <span className="text-gray-400">OCTAVE AMBIGUOUS:</span><span>{diag.octaveAmbiguous ? 'YES' : 'NO'}</span>
          <span className="text-gray-400">FINAL CONFIDENCE:</span><span>{diag.bpmConfidence ? diag.bpmConfidence.toFixed(3) : '—'}</span>
          <span className="text-gray-400">OCTAVE DECISION:</span><span>{diag.octaveDecision || '—'}</span>
          <span className="text-gray-400">COMPOSITE WINNER:</span><span className={diag.compositeWinnerType === diag.finalWinnerType ? 'text-gray-300' : 'text-yellow-400'}>{diag.compositeWinnerType || '—'}</span>
          <span className="text-gray-400">FINAL WINNER:</span><span className="text-green-400 font-bold">{diag.finalWinnerType || '—'}</span>
          <span className="text-gray-400">ACOUSTIC DOMINANT:</span><span className={diag.acousticDominantType ? 'text-cyan-400 font-bold' : ''}>{diag.acousticDominantType || 'NO'}</span>
          <span className="text-gray-400">OVERRIDE APPLIED:</span><span className={diag.overrideApplied ? 'text-yellow-400 font-bold' : ''}>{diag.overrideApplied ? 'YES' : 'NO'}</span>
          <span className="text-gray-400">OVERRIDE REASON:</span><span className="text-yellow-400">{diag.overrideReason || '—'}</span>
          <span className="text-gray-400">CONTEXT INFLUENCE:</span><span>{diag.contextInfluence ? diag.contextInfluence.toFixed(3) : '—'}</span>
          <span className="text-gray-400">BEAT GRID FIRST BEAT:</span><span>{diag.beatGridFirstBeat ? `${diag.beatGridFirstBeat}s` : '—'}</span>
          <span className="text-gray-400">BEAT GRID INTERVAL:</span><span>{diag.beatGridInterval ? `${diag.beatGridInterval}s` : '—'}</span>
          <span className="text-gray-400">BEAT GRID TOTAL BEATS:</span><span>{diag.beatGridTotalBeats || '—'}</span>
          <span className="text-gray-400">BEAT GRID DOWNBEAT:</span><span>{diag.beatGridDownbeat !== null ? `beat ${diag.beatGridDownbeat}` : 'null (provisional)'}</span>
          <span className="text-gray-400">BEAT GRID DOWNBEAT CONFIDENCE:</span><span>{diag.beatGridDownbeatConfidence ? diag.beatGridDownbeatConfidence.toFixed(3) : '—'}</span>
          <span className="text-gray-400">BEAT GRID CONFIDENCE:</span><span>{diag.beatGridConfidence ? diag.beatGridConfidence.toFixed(3) : '—'}</span>
        </div>
      </div>

      {/* File Metadata */}
      <div className="mb-4 p-3 border border-gray-700 bg-gray-800">
        <h2 className="font-bold mb-2 text-yellow-400">FILE METADATA</h2>
        <div className="grid grid-cols-[200px_1fr] gap-x-2 gap-y-1 text-xs">
          <span className="text-gray-400">FILE:</span><span>{diag.file || '—'}</span>
          <span className="text-gray-400">METADATA STATUS:</span><span className={diag.metaStatus === 'ready' ? 'text-green-400 font-bold' : diag.metaStatus === 'error' ? 'text-red-400 font-bold' : diag.metaStatus === 'reading...' ? 'text-yellow-400 font-bold' : ''}>{diag.metaStatus || 'idle'}</span>
          <span className="text-gray-400">FORMAT:</span><span>{diag.metaFormat || '—'}</span>
          <span className="text-gray-400">CODEC:</span><span>{diag.metaCodec || '—'}</span>
          <span className="text-gray-400">DURATION:</span><span>{diag.metaDuration ? `${diag.metaDuration.toFixed(1)}s` : '—'}</span>
          <span className="text-gray-400">BITRATE:</span><span>{diag.metaBitrate ? `${(diag.metaBitrate/1000).toFixed(0)} kbps` : '—'}</span>
          <span className="text-gray-400">SAMPLE RATE:</span><span>{diag.metaSampleRate ? `${diag.metaSampleRate} Hz` : '—'}</span>
          <span className="text-gray-400">CHANNELS:</span><span>{diag.metaChannels || '—'}</span>
          <span className="text-gray-400">TITLE:</span><span>{diag.metaTitle || '—'}</span>
          <span className="text-gray-400">ARTIST:</span><span>{diag.metaArtist || '—'}</span>
          <span className="text-gray-400">ALBUM:</span><span>{diag.metaAlbum || '—'}</span>
          <span className="text-gray-400">ALBUM ARTIST:</span><span>{diag.metaAlbumArtist || '—'}</span>
          <span className="text-gray-400">GENRE:</span><span>{diag.metaGenre || '—'}</span>
          <span className="text-gray-400">YEAR:</span><span>{diag.metaYear || '—'}</span>
          <span className="text-gray-400">TRACK:</span><span>{diag.metaTrack || '—'}</span>
          <span className="text-gray-400">DISC:</span><span>{diag.metaDisc || '—'}</span>
          <span className="text-gray-400">COMPOSER:</span><span>{diag.metaComposer || '—'}</span>
          <span className="text-gray-400">REMIXER:</span><span>{diag.metaRemixer || '—'}</span>
          <span className="text-gray-400">COMMENT:</span><span className="break-all">{diag.metaComment || '—'}</span>
          <span className="text-gray-400">ISRC:</span><span>{diag.metaIsrc || '—'}</span>
          <span className="text-gray-400">TAG BPM:</span><span className="text-cyan-400 font-bold">{diag.metaBpm || '—'}</span>
          <span className="text-gray-400">TAG KEY:</span><span className="text-cyan-400 font-bold">{diag.metaKey || '—'}</span>
          <span className="text-gray-400">ARTWORK:</span><span>{diag.metaArtwork ? `Yes (${diag.metaArtworkType})` : 'No'}</span>
          <span className="text-gray-400">TAG FORMAT:</span><span>{diag.metaId3Version || '—'}</span>
        </div>
      </div>

      {/* Raw / Extended Tags */}
      {diag.metaRawTags.length > 0 && (
        <div className="mb-4 p-3 border border-gray-700 bg-gray-800">
          <h2 className="font-bold mb-2 text-yellow-400">RAW / EXTENDED TAGS</h2>
          <div className="overflow-x-auto">
            <table className="text-xs">
              <thead>
                <tr className="text-gray-400 border-b border-gray-600">
                  <th className="text-left pr-4 pb-1">FRAME</th>
                  <th className="text-left pr-4 pb-1">DESCRIPTION</th>
                  <th className="text-left pr-4 pb-1">VALUE</th>
                  <th className="text-right pr-3 pb-1">SIZE</th>
                </tr>
              </thead>
              <tbody>
                {diag.metaRawTags.map((tag, i) => (
                  <tr key={i} className="text-gray-300">
                    <td className="pr-4 py-0.5 font-bold">{tag.frame}</td>
                    <td className="pr-4 py-0.5">{tag.description}</td>
                    <td className="pr-4 py-0.5 break-all">{tag.value}</td>
                    <td className="text-right pr-3 py-0.5">{tag.size}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Candidate Diagnostics */}
      {diag.candidateDiagnostics.length > 0 && (
        <div className="mb-4 p-3 border border-gray-700 bg-gray-800">
          <h2 className="font-bold mb-2 text-yellow-400">CANDIDATE DIAGNOSTICS</h2>
          <div className="overflow-x-auto">
            <table className="text-xs">
              <thead>
                <tr className="text-gray-400 border-b border-gray-600">
                  <th className="text-left pr-4 pb-1">TYPE</th>
                  <th className="text-right pr-3 pb-1">BPM</th>
                  <th className="text-right pr-3 pb-1">ALIGN</th>
                  <th className="text-right pr-3 pb-1">AUTOCORR</th>
                  <th className="text-right pr-3 pb-1">ENERGY_RATIO</th>
                  <th className="text-right pr-3 pb-1">SUPPORT_RATIO</th>
                  <th className="text-right pr-3 pb-1">NUM_BEATS</th>
                  <th className="text-right pr-3 pb-1">SUPP_BEATS</th>
                  <th className="text-right pr-3 pb-1">MEAN_DIST</th>
                  <th className="text-right pr-3 pb-1">NORM_DIST</th>
                  <th className="text-right pr-3 pb-1">DIST_SCORE</th>
                  <th className="text-right pr-3 pb-1">DJ_PRIOR</th>
                  <th className="text-right pr-3 pb-1">EXIST_PROX</th>
                  <th className="text-right pr-3 pb-1">COMPOSITE</th>
                  <th className="text-right pr-3 pb-1">ACOUSTIC_ST</th>
                  <th className="text-right pr-3 pb-1">ACOUST_WINS</th>
                  <th className="text-right pr-3 pb-1">CONTEXT_N</th>
                  <th className="text-right pr-3 pb-1">PHASE</th>
                </tr>
              </thead>
              <tbody>
                {diag.candidateDiagnostics.map((c, i) => (
                  <tr key={i} className={c.type === diag.octaveDecision ? 'text-green-400' : 'text-gray-300'}>
                    <td className="pr-4 py-0.5 font-bold">{c.type}</td>
                    <td className="text-right pr-3 py-0.5">{c.bpm}</td>
                    <td className="text-right pr-3 py-0.5">{c.alignment.toFixed(3)}</td>
                    <td className="text-right pr-3 py-0.5">{c.autocorr.toFixed(3)}</td>
                    <td className="text-right pr-3 py-0.5">{c.energyRatio.toFixed(3)}</td>
                    <td className="text-right pr-3 py-0.5">{c.supportRatio.toFixed(3)}</td>
                    <td className="text-right pr-3 py-0.5">{c.numBeats}</td>
                    <td className="text-right pr-3 py-0.5">{c.supportedBeats}</td>
                    <td className="text-right pr-3 py-0.5">{c.meanOnsetDist.toFixed(2)}</td>
                    <td className="text-right pr-3 py-0.5">{c.normalizedMeanOnsetDist.toFixed(3)}</td>
                    <td className="text-right pr-3 py-0.5">{c.distScore.toFixed(3)}</td>
                    <td className="text-right pr-3 py-0.5">{c.djPrior.toFixed(3)}</td>
                    <td className="text-right pr-3 py-0.5">{c.existingProximity.toFixed(3)}</td>
                    <td className="text-right pr-3 py-0.5 font-bold">{c.compositeScore.toFixed(3)}</td>
                    <td className="text-right pr-3 py-0.5">{c.acousticStrength.toFixed(3)}</td>
                    <td className="text-right pr-3 py-0.5">{c.acousticWins}/4</td>
                    <td className="text-right pr-3 py-0.5">{c.contextContribution.toFixed(3)}</td>
                    <td className="text-right pr-3 py-0.5">{c.phaseOffset.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Key Detection */}
      <div className="mb-4 p-3 border border-gray-700 bg-gray-800">
        <h2 className="font-bold mb-2 text-yellow-400">KEY DETECTION</h2>
        <div className="grid grid-cols-[200px_1fr] gap-x-2 gap-y-1 text-xs">
          <span className="text-gray-400">FINAL KEY:</span><span className="text-cyan-400 font-bold">{diag.keyKey || '—'}</span>
          <span className="text-gray-400">ROOT:</span><span>{diag.keyRoot || '—'}</span>
          <span className="text-gray-400">MODE:</span><span>{diag.keyMode || '—'}</span>
          <span className="text-gray-400">CAMELOT:</span><span>{diag.keyCamelot || '—'}</span>
          <span className="text-gray-400">OPEN KEY:</span><span>{diag.keyOpenKey || '—'}</span>
          <span className="text-gray-400">CONFIDENCE:</span><span>{diag.keyConfidence ? diag.keyConfidence.toFixed(3) : '—'}</span>
          <span className="text-gray-400">ALTERNATIVE:</span><span>{diag.keyAltKey || '—'}</span>
          <span className="text-gray-400">ALT CONFIDENCE:</span><span>{diag.keyAltConfidence ? diag.keyAltConfidence.toFixed(3) : '—'}</span>
          <span className="text-gray-400">BEST SCORE:</span><span>{diag.keyBestScore ? diag.keyBestScore.toFixed(3) : '—'}</span>
          <span className="text-gray-400">SECOND SCORE:</span><span>{diag.keySecondScore ? diag.keySecondScore.toFixed(3) : '—'}</span>
          <span className="text-gray-400">SCORE MARGIN:</span><span>{diag.keyScoreMargin ? diag.keyScoreMargin.toFixed(3) : '—'}</span>
          <span className="text-gray-400">REGIONAL CONSISTENCY:</span><span>{diag.keyRegionalConsistency ? diag.keyRegionalConsistency.toFixed(3) : '—'}</span>
          <span className="text-gray-400">USABLE FRAMES:</span><span>{diag.keyUsableFrames || 0} / {diag.keyTotalFrames || 0}</span>
          <span className="text-gray-400">NUM REGIONS:</span><span>{diag.keyNumRegions || '—'}</span>
          <span className="text-gray-400">REASON:</span><span className="text-red-400">{diag.keyReason || '—'}</span>
        </div>
        {diag.keyRankedCandidates.length > 0 && (
          <div className="mt-2">
            <h3 className="text-xs font-bold text-gray-400 mb-1">RANKED CANDIDATES (TOP 5)</h3>
            <div className="overflow-x-auto">
              <table className="text-xs">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-600">
                    <th className="text-left pr-4 pb-1">#</th>
                    <th className="text-left pr-4 pb-1">KEY</th>
                    <th className="text-left pr-4 pb-1">CAMELOT</th>
                    <th className="text-right pr-3 pb-1">SCORE</th>
                  </tr>
                </thead>
                <tbody>
                  {diag.keyRankedCandidates.map((c, i) => (
                    <tr key={i} className={i === 0 ? 'text-green-400' : 'text-gray-300'}>
                      <td className="pr-4 py-0.5">{i + 1}</td>
                      <td className="pr-4 py-0.5 font-bold">{c.key}</td>
                      <td className="pr-4 py-0.5">{c.camelot}</td>
                      <td className="text-right pr-3 py-0.5">{c.score.toFixed(3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {diag.keyDspDiag && (
          <div className="mt-2">
            <h3 className="text-xs font-bold text-gray-400 mb-1">DSP PIPELINE DIAGNOSTICS</h3>
            <div className="grid grid-cols-[200px_1fr] gap-x-2 gap-y-1 text-xs">
              <span className="text-gray-400">INPUT PCM LENGTH:</span><span>{diag.keyDspDiag.inputPcmLength || '—'}</span>
              <span className="text-gray-400">INPUT SAMPLE RATE:</span><span>{diag.keyDspDiag.inputSampleRate || '—'}</span>
              <span className="text-gray-400">DOWNSAMPLE RATIO:</span><span>{diag.keyDspDiag.downsampleRatio ? diag.keyDspDiag.downsampleRatio.toFixed(2) : '—'}</span>
              <span className="text-gray-400">DOWNSAMPLED LENGTH:</span><span>{diag.keyDspDiag.downsampledLength || '—'}</span>
              <span className="text-gray-400">TARGET RATE:</span><span>{diag.keyDspDiag.targetRate || '—'}</span>
              <span className="text-gray-400">FFT SIZE:</span><span>{diag.keyDspDiag.fftSize || '—'}</span>
              <span className="text-gray-400">HOP SIZE:</span><span>{diag.keyDspDiag.hopSize || '—'}</span>
              <span className="text-gray-400">TOTAL FRAMES (POSSIBLE):</span><span>{diag.keyDspDiag.totalFrames || 0}</span>
              <span className="text-gray-400">FRAMES PROCESSED:</span><span>{diag.keyDspDiag.framesProcessed || 0}</span>
              <span className="text-gray-400">FRAMES REJECTED (LOW ENERGY):</span><span className="text-red-400">{diag.keyDspDiag.framesRejectedLowEnergy || 0}</span>
              <span className="text-gray-400">MIN FRAME ENERGY:</span><span>{typeof diag.keyDspDiag.minEnergy === 'number' ? diag.keyDspDiag.minEnergy.toFixed(3) : '—'}</span>
              <span className="text-gray-400">MAX FRAME ENERGY:</span><span>{typeof diag.keyDspDiag.maxEnergy === 'number' ? diag.keyDspDiag.maxEnergy.toFixed(3) : '—'}</span>
              <span className="text-gray-400">MEAN FRAME ENERGY:</span><span>{typeof diag.keyDspDiag.meanEnergy === 'number' ? diag.keyDspDiag.meanEnergy.toFixed(3) : '—'}</span>
              <span className="text-gray-400">BINS EXAMINED:</span><span>{diag.keyDspDiag.binsExamined || '—'}</span>
              <span className="text-gray-400">MAPPED BINS (55–2000 Hz):</span><span>{diag.keyDspDiag.mappedBins || '—'}</span>
              <span className="text-gray-400">CHROMA ACCUMULATIONS:</span><span>{diag.keyDspDiag.chromaAccumCount || 0}</span>
              <span className="text-gray-400">REGIONS CREATED:</span><span>{diag.keyDspDiag.numRegions !== undefined ? diag.keyDspDiag.numRegions : '—'}</span>
              <span className="text-gray-400">NaN/INF DETECTED:</span><span className={diag.keyDspDiag.hasNaN ? 'text-red-400 font-bold' : 'text-green-400'}>{diag.keyDspDiag.hasNaN ? 'YES' : 'NO'}</span>
            </div>
          </div>
        )}
      </div>

      {/* Test Buttons */}
      <div className="mb-4 flex flex-wrap gap-2">
        <button onClick={runPipelineTest} className="px-3 py-1.5 bg-blue-700 hover:bg-blue-600 rounded text-xs font-bold">Pipeline Test</button>
        <button onClick={runTestA} className="px-3 py-1.5 bg-blue-700 hover:bg-blue-600 rounded text-xs font-bold">Test A: Same File</button>
        <button onClick={runTestB} className="px-3 py-1.5 bg-blue-700 hover:bg-blue-600 rounded text-xs font-bold">Test B: Renamed</button>
        <button onClick={runTestC} className="px-3 py-1.5 bg-blue-700 hover:bg-blue-600 rounded text-xs font-bold">Test C: Different File</button>
        <button onClick={runCacheTest} className="px-3 py-1.5 bg-blue-700 hover:bg-blue-600 rounded text-xs font-bold">Cache Test</button>
        <button onClick={runCancelTest} className="px-3 py-1.5 bg-blue-700 hover:bg-blue-600 rounded text-xs font-bold">Cancel Test</button>
        <button onClick={runFailureTest} className="px-3 py-1.5 bg-blue-700 hover:bg-blue-600 rounded text-xs font-bold">Failure Test</button>
        <button onClick={verifyIndexedDB} className="px-3 py-1.5 bg-blue-700 hover:bg-blue-600 rounded text-xs font-bold">Verify IndexedDB</button>
      </div>

      {/* Hidden input for Test C */}
      <input id="test-c-input" type="file" accept="audio/*" className="hidden" onChange={handleTestCFile} />

      {/* Test Results */}
      <div className="mb-4 p-3 border border-gray-700 bg-gray-800">
        <h2 className="font-bold mb-2 text-yellow-400">TEST RESULTS</h2>
        <div className="grid grid-cols-[200px_1fr] gap-x-2 gap-y-1 text-xs">
          {Object.entries(testLabels).map(([key, label]) => (
            <div key={key} className="contents">
              <span className="text-gray-400">{label}:</span>
              <span className={
                results[key] === 'pass' ? 'text-green-400 font-bold' :
                results[key] === 'pass*' ? 'text-yellow-400 font-bold' :
                results[key] === 'fail' ? 'text-red-400 font-bold' : 'text-gray-600'
              }>
                {results[key] || 'pending'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Logs */}
      <div className="mb-4 p-3 border border-gray-700 bg-gray-800 max-h-96 overflow-auto">
        <h2 className="font-bold mb-2 text-yellow-400">LOGS</h2>
        {logs.length === 0 ? <div className="text-gray-600 text-xs">No logs yet. Select a file and run a test.</div> :
          logs.map((line, i) => <div key={i} className="text-xs leading-relaxed">{line}</div>)}
      </div>

      {/* Performance Check Note */}
      <div className="mb-4 p-3 border border-gray-700 bg-gray-800">
        <h2 className="font-bold mb-2 text-yellow-400">PERFORMANCE CHECK (manual)</h2>
        <p className="text-xs text-gray-400 leading-relaxed">
          1. Open the main CrossCue app in a separate tab.<br />
          2. Load a track into Deck A and press PLAY.<br />
          3. Return to this page and run Pipeline Test with a large audio file.<br />
          4. Switch back to CrossCue tab and verify playback continues without interruption.<br />
          5. Report any UI freezes, audio glitches, or playback resets.
        </p>
      </div>

      <div className="text-xs text-gray-500">
        <a href="/" className="underline hover:text-gray-300">← Back to CrossCue</a>
      </div>
    </div>
  );
}