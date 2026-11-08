/**
 * CrossCue Metadata Layer — barrel export.
 *
 * Reads embedded metadata from audio files (ID3, Vorbis Comments, RIFF INFO).
 * Metadata is INFORMATION only — it never influences acoustic analysis.
 */

export { readMetadata, createArtworkBlob } from './MetadataReader';
export { parseId3v2, parseId3v1 } from './Id3Parser';
export { parseFlac, parseVorbisComments } from './VorbisParser';
export { parseFilename } from './FilenameParser';