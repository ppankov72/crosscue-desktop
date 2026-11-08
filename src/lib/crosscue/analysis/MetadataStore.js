/**
 * MetadataStore — IndexedDB persistence layer for TrackAnalysis records.
 * Pure key-value storage. No knowledge of audio, playback, or decoding.
 *
 * IndexedDB structure:
 *   Database: crosscue-analysis (version 1)
 *
 *   Store 1: analysis  (keyPath: trackFingerprint)
 *     Holds full TrackAnalysis records. trackFingerprint is the permanent
 *     audio identity (SHA-256 of file size + PCM segments). Only 'ready'
 *     records are persisted here — failed/cancelled are runtime-only.
 *
 *   Store 2: fileKeys  (keyPath: fileKey)
 *     Maps fast-lookup hash → trackFingerprint.
 *     fileKey = SHA-256(name + size + lastModified) — includes filename
 *     for speed but is NOT the permanent identity. When a file is renamed,
 *     fileKey changes but trackFingerprint stays the same, so the existing
 *     analysis is still found after a decode + fingerprint check.
 */

const DB_NAME = 'crosscue-analysis';
const DB_VERSION = 3;
const STORE_ANALYSIS = 'analysis';
const STORE_FILE_KEYS = 'fileKeys';
const STORE_METADATA = 'metadata';
const STORE_ARTWORK = 'artwork';
const STORE_OVERRIDES = 'libraryOverrides';

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_ANALYSIS)) {
        db.createObjectStore(STORE_ANALYSIS, { keyPath: 'trackFingerprint' });
      }
      if (!db.objectStoreNames.contains(STORE_FILE_KEYS)) {
        db.createObjectStore(STORE_FILE_KEYS, { keyPath: 'fileKey' });
      }
      if (!db.objectStoreNames.contains(STORE_METADATA)) {
        db.createObjectStore(STORE_METADATA, { keyPath: 'trackFingerprint' });
      }
      if (!db.objectStoreNames.contains(STORE_ARTWORK)) {
        db.createObjectStore(STORE_ARTWORK, { keyPath: 'trackFingerprint' });
      }
      if (!db.objectStoreNames.contains(STORE_OVERRIDES)) {
        db.createObjectStore(STORE_OVERRIDES, { keyPath: 'trackFingerprint' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

function txGet(storeName, key) {
  return openDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).get(key);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  }));
}

function txPut(storeName, value) {
  return openDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).put(value);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  }));
}

function txDelete(storeName, key) {
  return openDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  }));
}

export const MetadataStore = {
  getAnalysis: (trackFingerprint) => txGet(STORE_ANALYSIS, trackFingerprint),
  putAnalysis: (analysis) => txPut(STORE_ANALYSIS, analysis),
  deleteAnalysis: (trackFingerprint) => txDelete(STORE_ANALYSIS, trackFingerprint),

  getFileKey: (fileKey) => txGet(STORE_FILE_KEYS, fileKey),
  putFileKey: (fileKey, trackFingerprint) => txPut(STORE_FILE_KEYS, { fileKey, trackFingerprint }),
  deleteFileKey: (fileKey) => txDelete(STORE_FILE_KEYS, fileKey),

  getMetadata: (trackFingerprint) => txGet(STORE_METADATA, trackFingerprint),
  putMetadata: (trackFingerprint, metadata) => txPut(STORE_METADATA, { trackFingerprint, ...metadata }),
  getArtwork: (trackFingerprint) => txGet(STORE_ARTWORK, trackFingerprint),
  putArtwork: (trackFingerprint, blob) => txPut(STORE_ARTWORK, { trackFingerprint, blob }),

  getOverrides: (trackFingerprint) => txGet(STORE_OVERRIDES, trackFingerprint),
  putOverrides: (trackFingerprint, overrides) => txPut(STORE_OVERRIDES, { trackFingerprint, ...overrides }),
  deleteOverrides: (trackFingerprint) => txDelete(STORE_OVERRIDES, trackFingerprint),
};