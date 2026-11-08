/**
 * Id3Parser — comprehensive ID3v2.2/v2.3/v2.4 + ID3v1 tag parser.
 * Runs on the main thread. No external dependencies.
 *
 * This is an extension of the existing decksmith/id3Metadata parser,
 * expanded to support all standard text frames, artwork (APIC),
 * custom frames (TXXX), raw frame diagnostics, and ID3v1 fallback.
 *
 * Returns a structured metadata object with:
 *   tags         — standard metadata fields (title, artist, album, etc.)
 *   artwork      — embedded artwork info (data stored separately via _artworkData)
 *   customTags   — TXXX custom frames
 *   rawTags      — all recognized frames for diagnostics
 *   tagFormat    — 'ID3' or 'ID3v1'
 *   tagVersion   — e.g. '2.3.0' or '1.0'
 *   _artworkData — raw artwork bytes (Uint8Array), NOT stored in IndexedDB metadata
 */

import { TEXT_FRAMES, FRAME_DESCRIPTIONS, PICTURE_TYPES, ID3V1_GENRES } from './Id3Frames';

// --- Helpers ---

function makeView(bytes) {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}

// Decode text based on ID3 encoding byte (0=ISO-8859-1, 1=UTF-16, 2=UTF-16BE, 3=UTF-8)
function decodeText(bytes, encoding) {
  if (!bytes || bytes.length === 0) return '';
  const enc = ['iso-8859-1', 'utf-16', 'utf-16be', 'utf-8'][encoding] || 'iso-8859-1';

  // Handle UTF-16 BOM
  if (enc === 'utf-16' && bytes.length >= 2) {
    if (bytes[0] === 0xFF && bytes[1] === 0xFE) {
      return new TextDecoder('utf-16le').decode(bytes.slice(2)).replace(/\0+$/, '').trim();
    }
    if (bytes[0] === 0xFE && bytes[1] === 0xFF) {
      return new TextDecoder('utf-16be').decode(bytes.slice(2)).replace(/\0+$/, '').trim();
    }
  }

  try {
    return new TextDecoder(enc).decode(bytes).replace(/\0+$/, '').trim();
  } catch {
    return new TextDecoder('iso-8859-1').decode(bytes).replace(/\0+$/, '').trim();
  }
}

// Find null terminator position (handles UTF-16 double-null)
function findNull(bytes, start, encoding) {
  if (encoding === 1 || encoding === 2) {
    // UTF-16: double-null terminator
    let i = start;
    while (i + 1 < bytes.length) {
      if (bytes[i] === 0 && bytes[i + 1] === 0) return i;
      i += 2;
    }
    return bytes.length;
  }
  // Single-byte encoding (ISO-8859-1 or UTF-8)
  for (let i = start; i < bytes.length; i++) {
    if (bytes[i] === 0) return i;
  }
  return bytes.length;
}

// --- Frame parsers ---

function parseTextFrame(data, encoding) {
  return decodeText(data.slice(1), encoding);
}

function parseTxxxFrame(data, encoding) {
  const content = data.slice(1);
  const nullPos = findNull(content, 0, encoding);
  const skip = encoding === 1 || encoding === 2 ? 2 : 1;
  return {
    description: decodeText(content.slice(0, nullPos), encoding),
    value: decodeText(content.slice(nullPos + skip), encoding),
  };
}

function parseCommFrame(data, encoding) {
  if (data.length < 5) return null;
  const lang = String.fromCharCode(data[1], data[2], data[3]);
  const rest = data.slice(4);
  const nullPos = findNull(rest, 0, encoding);
  const skip = encoding === 1 || encoding === 2 ? 2 : 1;
  return {
    language: lang,
    description: decodeText(rest.slice(0, nullPos), encoding),
    text: decodeText(rest.slice(nullPos + skip), encoding),
  };
}

function parseApicFrame(data) {
  if (data.length < 4) return null;
  const encoding = data[0];
  let offset = 1;

  // MIME type (null-terminated ISO-8859-1)
  const mimeEnd = findNull(data, offset, 0);
  const mimeType = new TextDecoder('iso-8859-1').decode(data.slice(offset, mimeEnd));
  offset = mimeEnd + 1;
  if (offset >= data.length) return null;

  // Picture type (1 byte)
  const pictureType = data[offset];
  offset++;

  // Description (null-terminated, encoding-dependent)
  const descEnd = findNull(data, offset, encoding);
  const description = decodeText(data.slice(offset, descEnd), encoding);
  offset = encoding === 1 || encoding === 2 ? descEnd + 2 : descEnd + 1;

  // Rest is image data
  const imageData = data.slice(offset);
  if (imageData.length === 0) return null;

  return { mimeType, pictureType, description, data: imageData };
}

function parsePopmFrame(data) {
  if (data.length < 2) return null;
  const emailEnd = findNull(data, 0, 0);
  const email = new TextDecoder('iso-8859-1').decode(data.slice(0, emailEnd));
  const rating = data[emailEnd + 1] || 0;
  return { email, rating };
}

// --- Main ID3v2 parser ---

export function parseId3v2(buffer) {
  const bytes = new Uint8Array(buffer);
  if (bytes.length < 10) return null;
  if (bytes[0] !== 0x49 || bytes[1] !== 0x44 || bytes[2] !== 0x33) return null; // "ID3"

  const version = bytes[3]; // 2, 3, or 4
  const revision = bytes[4];
  const tagSize = ((bytes[6] & 0x7F) << 21) | ((bytes[7] & 0x7F) << 14) |
                   ((bytes[8] & 0x7F) << 7) | (bytes[9] & 0x7F);

  const tagBytes = bytes.slice(10, Math.min(bytes.length, tagSize + 10));
  const tagView = makeView(tagBytes);

  const result = {
    tagFormat: 'ID3',
    tagVersion: `2.${version}.${revision}`,
    tags: {},
    artwork: { available: false, mimeType: null, type: null, description: null },
    customTags: [],
    rawTags: [],
    _artworkData: null,
  };

  const idLength = version === 2 ? 3 : 4;
  const headerLength = version === 2 ? 6 : 10;
  let offset = 0;

  while (offset + headerLength <= tagBytes.length) {
    const idBytes = tagBytes.slice(offset, offset + idLength);
    if (idBytes[0] === 0) break; // Padding

    const id = new TextDecoder('ascii').decode(idBytes);

    // Frame size
    let size;
    if (version === 2) {
      size = (tagView.getUint8(offset + 3) << 16) | (tagView.getUint8(offset + 4) << 8) | tagView.getUint8(offset + 5);
    } else if (version === 4) {
      size = (tagView.getUint8(offset + 4) << 21) | (tagView.getUint8(offset + 5) << 14) |
             (tagView.getUint8(offset + 6) << 7) | tagView.getUint8(offset + 7);
    } else {
      size = tagView.getUint32(offset + 4);
    }

    if (size === 0 || offset + headerLength + size > tagBytes.length) break;

    const frameData = tagBytes.slice(offset + headerLength, offset + headerLength + size);
    const encoding = frameData[0] || 0;

    let rawValue = '';

    if (id === 'APIC' || id === 'PIC') {
      const pic = parseApicFrame(frameData);
      if (pic) {
        result.artwork = {
          available: true,
          mimeType: pic.mimeType,
          type: PICTURE_TYPES[pic.pictureType] || `Type ${pic.pictureType}`,
          description: pic.description,
        };
        result._artworkData = pic.data;
      }
      rawValue = `[image: ${pic?.mimeType || 'unknown'}, ${pic?.data?.length || 0} bytes]`;
    } else if (id === 'TXXX' || id === 'TXX') {
      const custom = parseTxxxFrame(frameData, encoding);
      if (custom) {
        result.customTags.push({ id: 'TXXX', description: custom.description, value: custom.value });
        rawValue = `${custom.description} = ${custom.value}`;
      }
    } else if (id === 'COMM' || id === 'COM') {
      const comm = parseCommFrame(frameData, encoding);
      if (comm) {
        result.tags.comment = comm.text;
        rawValue = `[${comm.language}] ${comm.text}`;
      }
    } else if (id === 'POPM') {
      const popm = parsePopmFrame(frameData);
      if (popm) {
        result.tags.rating = popm.rating;
        rawValue = `[${popm.email}] ${popm.rating}/255`;
      }
    } else if (id === 'USLT') {
      if (frameData.length >= 5) {
        const lang = String.fromCharCode(frameData[1], frameData[2], frameData[3]);
        const rest = frameData.slice(4);
        const nullPos = findNull(rest, 0, encoding);
        const skip = encoding === 1 || encoding === 2 ? 2 : 1;
        const text = decodeText(rest.slice(nullPos + skip), encoding);
        result.tags.lyrics = text;
        rawValue = `[${lang}] ${text.substring(0, 80)}${text.length > 80 ? '...' : ''}`;
      }
    } else if (TEXT_FRAMES[id]) {
      const text = parseTextFrame(frameData, encoding);
      result.tags[TEXT_FRAMES[id]] = text;
      rawValue = text;
    } else {
      rawValue = `[${size} bytes]`;
    }

    result.rawTags.push({
      frame: id,
      description: FRAME_DESCRIPTIONS[id] || 'Unknown',
      value: rawValue,
      size,
    });

    offset += headerLength + size;
  }

  return result;
}

// --- ID3v1 parser (last 128 bytes) ---

export function parseId3v1(buffer) {
  const bytes = new Uint8Array(buffer);
  if (bytes.length < 128) return null;

  const tag = bytes.slice(bytes.length - 128);
  if (tag[0] !== 0x54 || tag[1] !== 0x41 || tag[2] !== 0x47) return null; // "TAG"

  const decode = (arr) => {
    const text = new TextDecoder('iso-8859-1').decode(arr).replace(/\0+$/, '').trim();
    return text || null;
  };

  return {
    tagFormat: 'ID3v1',
    tagVersion: '1.0',
    tags: {
      title: decode(tag.slice(3, 33)),
      artist: decode(tag.slice(33, 63)),
      album: decode(tag.slice(63, 93)),
      year: decode(tag.slice(93, 97)),
      comment: decode(tag.slice(97, 127)),
      genre: ID3V1_GENRES[tag[127]] || null,
    },
    artwork: { available: false, mimeType: null, type: null, description: null },
    customTags: [],
    rawTags: [],
  };
}