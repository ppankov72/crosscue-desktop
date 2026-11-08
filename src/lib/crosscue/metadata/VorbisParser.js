/**
 * VorbisParser — reads Vorbis Comments from FLAC files.
 *
 * Vorbis Comment format:
 *   vendor_length (4 bytes, little-endian uint32)
 *   vendor_string (vendor_length bytes, UTF-8)
 *   comment_count (4 bytes, little-endian uint32)
 *   [comment_length (4 bytes) + comment_string (comment_length bytes)] × count
 *
 * Each comment is "KEY=VALUE" (UTF-8, case-insensitive key).
 *
 * FLAC file structure:
 *   "fLaC" (4 bytes)
 *   metadata blocks: [is_last(1bit) + block_type(7bits) + length(3 bytes)] × N
 *   Block type 4 = VORBIS_COMMENT
 */

const FIELD_MAP = {
  title: 'title', artist: 'artist', album: 'album',
  albumartist: 'albumArtist', composer: 'composer', genre: 'genre',
  date: 'date', year: 'year', tracknumber: 'track', tracktotal: 'trackTotal',
  discnumber: 'disc', disctotal: 'discTotal', comment: 'comment',
  copyright: 'copyright', publisher: 'publisher', encoder: 'encoder',
  encodedby: 'encodedBy', language: 'language', isrc: 'isrc',
  bpm: 'bpm', initialkey: 'key', key: 'key', rating: 'rating',
  remixer: 'remixer', mixer: 'remixer',
};

function makeView(bytes) {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}

export function parseVorbisComments(bytes) {
  const view = makeView(bytes);
  if (bytes.length < 8) return null;

  let offset = 0;

  // Vendor string
  const vendorLen = view.getUint32(offset, true);
  offset += 4;
  if (offset + vendorLen > bytes.length) return null;
  const vendor = new TextDecoder('utf-8').decode(bytes.slice(offset, offset + vendorLen));
  offset += vendorLen;

  // Comment count
  const commentCount = view.getUint32(offset, true);
  offset += 4;

  const result = {
    tagFormat: 'Vorbis Comments',
    tagVersion: vendor,
    tags: {},
    artwork: { available: false, mimeType: null, type: null, description: null },
    customTags: [],
    rawTags: [],
    _artworkData: null,
  };

  for (let i = 0; i < commentCount && offset < bytes.length; i++) {
    if (offset + 4 > bytes.length) break;
    const commentLen = view.getUint32(offset, true);
    offset += 4;
    if (offset + commentLen > bytes.length) break;

    const comment = new TextDecoder('utf-8').decode(bytes.slice(offset, offset + commentLen));
    offset += commentLen;

    const eqIdx = comment.indexOf('=');
    if (eqIdx < 0) continue;

    const key = comment.slice(0, eqIdx).toLowerCase();
    const value = comment.slice(eqIdx + 1);

    const fieldName = FIELD_MAP[key];
    if (fieldName) {
      result.tags[fieldName] = value;
    } else {
      result.customTags.push({ id: 'VORBIS', description: key, value });
    }

    result.rawTags.push({
      frame: key.toUpperCase(),
      description: key,
      value: value.length > 200 ? value.substring(0, 200) + '...' : value,
      size: commentLen,
    });
  }

  return result;
}

/**
 * Parse FLAC file metadata blocks.
 * FLAC starts with "fLaC" followed by metadata blocks.
 * Block type 4 is VORBIS_COMMENT.
 */
export function parseFlac(buffer) {
  const bytes = new Uint8Array(buffer);
  if (bytes.length < 4) return null;
  // "fLaC"
  if (bytes[0] !== 0x66 || bytes[1] !== 0x4C || bytes[2] !== 0x61 || bytes[3] !== 0x43) return null;

  let offset = 4;

  while (offset + 4 <= bytes.length) {
    const blockType = bytes[offset] & 0x7F;
    const isLast = (bytes[offset] & 0x80) !== 0;
    const blockLen = (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3];
    offset += 4;

    if (blockType === 4) {
      // VORBIS_COMMENT block
      const blockData = bytes.slice(offset, offset + blockLen);
      return parseVorbisComments(blockData);
    }

    offset += blockLen;
    if (isLast) break;
  }

  return null; // No Vorbis Comment block found
}