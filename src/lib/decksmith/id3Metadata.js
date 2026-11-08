const text = (bytes, encoding = 0) => {
  const content = bytes.slice(1);
  if (encoding === 1 || encoding === 2) return new TextDecoder('utf-16').decode(content).replace(/\0/g, '').trim();
  return new TextDecoder(encoding === 3 ? 'utf-8' : 'iso-8859-1').decode(content).replace(/\0/g, '').trim();
};

const frameSize = (view, offset, version) => version === 4
  ? ((view.getUint8(offset) << 21) | (view.getUint8(offset + 1) << 14) | (view.getUint8(offset + 2) << 7) | view.getUint8(offset + 3))
  : view.getUint32(offset);

export async function readId3Metadata(file) {
  const header = new DataView(await file.slice(0, 10).arrayBuffer());
  if (header.getUint8(0) !== 73 || header.getUint8(1) !== 68 || header.getUint8(2) !== 51) return {};
  const version = header.getUint8(3);
  const tagSize = ((header.getUint8(6) & 127) << 21) | ((header.getUint8(7) & 127) << 14) | ((header.getUint8(8) & 127) << 7) | (header.getUint8(9) & 127);
  const bytes = new Uint8Array(await file.slice(10, Math.min(file.size, tagSize + 10)).arrayBuffer());
  const view = new DataView(bytes.buffer);
  const fields = { TIT2: 'name', TPE1: 'artist', TALB: 'album', TCON: 'genre', TBPM: 'bpm', TKEY: 'key', TT2: 'name', TP1: 'artist', TAL: 'album', TCO: 'genre', TBP: 'bpm', TKE: 'key' };
  const metadata = {};
  let offset = 0;
  const idLength = version === 2 ? 3 : 4;
  const headerLength = version === 2 ? 6 : 10;
  while (offset + headerLength <= bytes.length) {
    const id = new TextDecoder().decode(bytes.slice(offset, offset + idLength));
    if (!id.trim()) break;
    const size = version === 2 ? ((view.getUint8(offset + 3) << 16) | (view.getUint8(offset + 4) << 8) | view.getUint8(offset + 5)) : frameSize(view, offset + 4, version);
    if (!size || offset + headerLength + size > bytes.length) break;
    const field = fields[id];
    if (field) metadata[field] = text(bytes.slice(offset + headerLength, offset + headerLength + size), bytes[offset + headerLength]);
    offset += headerLength + size;
  }
  return metadata;
}