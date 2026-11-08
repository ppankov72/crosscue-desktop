export const sourceProviders = {
  local: { label: 'LOCAL FILE', supports: { mixer: true, waveform: true, pitch: true }, create: file => ({ type:'local', name:file.name.replace(/\.[^/.]+$/, ''), url:URL.createObjectURL(file), file }) },
  library: { label: 'LIBRARY', supports: { mixer: true, waveform: true, pitch: true } },
  youtube: { label: 'YOUTUBE URL', supports: { mixer: false, waveform: false, pitch: false }, create: url => ({ type:'youtube', name:'YouTube source', url }) }
};
export const supportedAudio = ['audio/mpeg','audio/wav','audio/ogg','audio/flac','audio/aac','audio/mp4'];