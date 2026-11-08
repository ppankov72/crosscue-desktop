/**
 * CrossCue Analysis Infrastructure — Phase 1
 *
 * Barrel export for the offline analysis layer.
 * This module is intentionally NOT imported by any existing file yet.
 * It runs in parallel and invisibly — no existing component depends on it.
 *
 * Phase 1: fingerprinting + queue + progress + cancel + IndexedDB + duration + waveform overview peaks
 * Phase 2: BPM + beat grid (consumed by TEMPO, LOOP, CUE, QUANTIZE, SYNC) — NOT YET
 * Phase 3: Key detection (consumed by Smart Playlists) — NOT YET
 */

export { analysisService, default } from './AnalysisService';
export { MetadataStore } from './MetadataStore';
export { readMetadata } from '../metadata/MetadataReader';