export const dbToGain=db=>db<=-60?0:10**(db/20);
export const gainToDb=gain=>gain<=0.001?-Infinity:20*Math.log10(gain);
export const dbLabel=db=>!Number.isFinite(db)||db<=-60?'−∞':`${db>=0?'+':''}${db.toFixed(1)} dB`;
export const effectiveBpm=deck=>deck?.bpm?(deck.playbackRate??(deck.syncRate??1)*(1+(deck.pitch??0)/100))*deck.bpm:0;

// DDJ-200 / standard DJ asymmetric EQ curve:
// MIDI value 0..127:
// 0..64  -> -26 dB .. 0 dB (center = 64 -> 0 dB)
// 64..127 -> 0 dB .. +6 dB
export const midiToEqDb = normalizedOrValue => {
  const norm = Math.max(0, Math.min(1, Number(normalizedOrValue) || 0));
  if (norm <= 0.5) {
    // 0 -> -26, 0.5 -> 0
    return -26 + (norm / 0.5) * 26;
  }
  // 0.5 -> 0, 1.0 -> +6
  return ((norm - 0.5) / 0.5) * 6;
};

export const eqDbToSliderVal = db => {
  const val = Number(db);
  if (!Number.isFinite(val)) return 0;
  return Math.max(-26, Math.min(6, val));
};

export const formatEqDb = db => {
  const val = Number(db);
  if (!Number.isFinite(val)) return '0';
  const rounded = Math.round(val);
  return `${rounded >= 0 ? '+' : '−'}${Math.abs(rounded)}`;
};