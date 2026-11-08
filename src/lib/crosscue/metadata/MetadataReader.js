/**
 * MetadataReader — main metadata extraction module.
 *
 * Reads embedded metadata from audio files (ID3, Vorbis Comments, RIFF INFO).
 * Extracts technical audio information from file + AudioBuffer.
 * Falls back to filename parsing when tags are absent.
 *
 * CRITICAL: Metadata is INFORMATION only. It must NEVER influence
 * acoustic analysis (BPM detection, key detection, beat grid, etc.).
 * The metadata.tags.bpm and metadata.tags.key fields are REFERENCE
 * VALUES ONLY — they are displayed and stored but never fed into
 * detectBpm() or any acoustic scoring function.
 *
 * Architecture:
 *   - Tag parsing happens on the MAIN THREAD (not in the worker)
 *     to avoid unnecessary binary transfers. The File object is
 *     already available on the main thread; only PCM is sent to
 *     the worker for acoustic analysis.
 *   - Technical info is extracted from the decoded AudioBuffer
 *     (sample rate, channels, duration) and file properties (size,
 *     format, codec).
 *   - Artwork data is kept separate from the metadata record to
 *     avoid bloating IndexedDB. It is stored as a Blob in a
 *     dedicated artwork store.
 */

import { parseId3v2, parseId3v1 } from './Id3Parser';
import { parseFlac } from './VorbisParser';
import { parseFilename } from './FilenameParser';

const FORMAT_MAP = {
  mp3:  { format: 'MP3',  codec: 'MPEG-1 Layer III', tagParser: 'id3'  },
  flac: { format: 'FLAC', codec: 'FLAC',             tagParser: 'flac' },
  ogg:  { format: 'OGG',  codec: 'Vorbis',            tagParser: 'flac' },
  oga:  { format: 'OGG',  codec: 'Vorbis',            tagParser: 'flac' },
  opus: { format: 'OGG',  codec: 'Opus',              tagParser: 'flac' },
  m4a:  { format: 'MP4',  codec: 'AAC',               tagParser: null   },
  mp4:  { format: 'MP4',  codec: 'AAC',               tagParser: null   },
  wav:  { format: 'WAV',  codec: 'PCM',               tagParser: 'wav'  },
  aiff: { format: 'AIFF', codec: 'PCM',               tagParser: null   },
  aif:  { format: 'AIFF', codec: 'PCM',               tagParser: null   },
  aac:  { format: 'AAC',  codec: 'AAC',               tagParser: null   },
  wma:  { format: 'ASF',  codec: 'WMA',               tagParser: null   },
};

function getExtension(filename) {
  const match = filename.match(/\.([^/.]+)$/);
  return match ? match[1].toLowerCase() : '';
}

function detectFormat(file) {
  const ext = getExtension(file.name);
  return FORMAT_MAP[ext] || { format: ext.toUpperCase() || 'Unknown', codec: 'Unknown', tagParser: null };
}

// --- WAV RIFF INFO parser ---
function parseWavInfo(buffer) {
  const bytes = new Uint8Array(buffer);
  if (bytes.length < 12) return null;
  // Check "RIFF" header
  if (bytes[0] !== 0x52 || bytes[1] !== 0x49 || bytes[2] !== 0x46 || bytes[3] !== 0x46) return null;
  // Check "WAVE"
  if (bytes[8] !== 0x57 || bytes[9] !== 0x41 || bytes[10] !== 0x56 || bytes[11] !== 0x45) return null;

  const view = makeView(bytes);
  let offset = 12;

  const FIELD_MAP = {
    INAM: 'title', IART: 'artist', IARP: 'albumArtist',
    IPRD: 'album', IGNR: 'genre', ICRD: 'date',
    ITRK: 'track', ICMT: 'comment', ICOP: 'copyright',
    ISFT: 'encoder', ISRC: 'isrc',
  };

  const result = {
    tagFormat: 'RIFF INFO',
    tagVersion: '1',
    tags: {},
    artwork: { available: false, mimeType: null, type: null, description: null },
    customTags: [],
    rawTags: [],
    _artworkData: null,
  };

  while (offset + 8 <= bytes.length) {
    const chunkId = String.fromCharCode(
      bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3]
    );
    const chunkSize = view.getUint32(offset + 4, true);
    offset += 8;

    if (chunkId === 'INFO') {
      const endOffset = Math.min(offset + chunkSize, bytes.length);
      while (offset + 8 <= endOffset) {
        const subId = String.fromCharCode(
          bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3]
        );
        const subSize = view.getUint32(offset + 4, true);
        offset += 8;

        if (offset + subSize > bytes.length) break;
        const data = bytes.slice(offset, offset + subSize);
        const text = new TextDecoder('iso-8859-1').decode(data).replace(/\0+$/, '').trim();

        if (FIELD_MAP[subId]) {
          result.tags[FIELD_MAP[subId]] = text;
        } else {
          result.customTags.push({ id: subId, description: subId, value: text });
        }
        result.rawTags.push({ frame: subId, description: subId, value: text, size: subSize });

        // Chunks are word-aligned (pad to even)
        offset += subSize + (subSize % 2);
      }
      return result;
    }

    // Skip non-INFO chunks (word-aligned)
    offset += chunkSize + (chunkSize % 2);
  }

  return null;
}

function makeView(bytes) {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}

/**
 * Read metadata from an audio file.
 *
 * @param {File} file - The audio file
 * @param {AudioBuffer} [audioBuffer] - Decoded audio buffer for technical info
 * @returns {Promise<object>} Metadata object:
 *   { tags, technical, artwork, customTags, rawTags, tagFormat, tagVersion, _artworkData? }
 */
export async function readMetadata(file, audioBuffer) {
  const formatInfo = detectFormat(file);

  // --- Read embedded tags (main thread, no binary transfer to worker) ---
  let tagData = null;

  try {
    if (formatInfo.tagParser === 'id3') {
      // ID3v2: tags are at the start of the file. Read up to 256KB.
      const headerSize = Math.min(file.size, 262144);
      const headerBuffer = await file.slice(0, headerSize).arrayBuffer();
      tagData = parseId3v2(headerBuffer);

      // ID3v1 fallback: last 128 bytes
      if (!tagData && file.size >= 128) {
        const tailBuffer = await file.slice(file.size - 128).arrayBuffer();
        tagData = parseId3v1(tailBuffer);
      }
    } else if (formatInfo.tagParser === 'flac') {
      // FLAC: metadata blocks are at the start. Read up to 64KB.
      const headerSize = Math.min(file.size, 65536);
      const headerBuffer = await file.slice(0, headerSize).arrayBuffer();
      tagData = parseFlac(headerBuffer);
    } else if (formatInfo.tagParser === 'wav') {
      // WAV: INFO chunk is usually near the start. Read up to 4KB.
      const headerSize = Math.min(file.size, 4096);
      const headerBuffer = await file.slice(0, headerSize).arrayBuffer();
      tagData = parseWavInfo(headerBuffer);
    }
  } catch (e) {
    // Tag parsing failed — continue without tags
    console.warn('[MetadataReader] Tag parsing failed:', e.message);
  }

  // --- Build metadata structure ---
  const metadata = {
    tags: {},
    technical: {
      format: formatInfo.format,
      codec: formatInfo.codec,
      duration: audioBuffer?.duration || 0,
      bitrate: 0,
      sampleRate: audioBuffer?.sampleRate || 0,
      channels: audioBuffer?.numberOfChannels || 0,
      bitsPerSample: null, // Not available from AudioBuffer (always 32-bit float)
      fileSize: file.size,
    },
    artwork: { available: false, mimeType: null, type: null, description: null },
    customTags: [],
    rawTags: [],
    tagFormat: null,
    tagVersion: null,
  };

  // Merge tag data
  if (tagData) {
    metadata.tags = tagData.tags || {};
    metadata.artwork = tagData.artwork || metadata.artwork;
    metadata.customTags = tagData.customTags || [];
    metadata.rawTags = tagData.rawTags || [];
    metadata.tagFormat = tagData.tagFormat;
    metadata.tagVersion = tagData.tagVersion;
    if (tagData._artworkData) {
      metadata._artworkData = tagData._artworkData;
    }
  }

  // Compute bitrate from duration and file size
  if (metadata.technical.duration > 0) {
    metadata.technical.bitrate = Math.round((file.size * 8) / metadata.technical.duration);
  }

  // --- Filename fallback (ONLY when tags are absent) ---
  const hasTags = metadata.tags.title || metadata.tags.artist || metadata.tags.album;
  if (!hasTags) {
    const filenameData = parseFilename(file.name);
    // Only fill in missing fields — never overwrite embedded tags
    if (!metadata.tags.title && filenameData.tags.title) {
      metadata.tags.title = filenameData.tags.title;
      metadata.tags._titleInferred = true;
    }
    if (!metadata.tags.artist && filenameData.tags.artist) {
      metadata.tags.artist = filenameData.tags.artist;
      metadata.tags._artistInferred = true;
    }
    if (!metadata.tagFormat) {
      metadata.tagFormat = 'Filename';
      metadata.tagVersion = null;
    }
  }

  return metadata;
}

/**
 * Create a Blob from artwork data for IndexedDB storage.
 * @param {Uint8Array} artworkData - Raw artwork bytes
 * @param {string} mimeType - MIME type (e.g. 'image/jpeg')
 * @returns {Blob}
 */
export function createArtworkBlob(artworkData, mimeType) {
  return new Blob([artworkData], { type: mimeType || 'image/jpeg' });
}