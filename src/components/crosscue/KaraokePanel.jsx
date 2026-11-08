import { Mic, MicOff, Headphones, X } from 'lucide-react';

// Karaoke panel — architectural foundation.
// Microphone input, gain, mute, VU meter, monitoring toggle.
// Lyrics synchronization, microphone effects, and fullscreen lyrics are future phases.
export default function KaraokePanel({ karaoke, onClose }) {
  const {
    micReady, micError,
    micGain, setMicGain,
    muted, setMuted,
    monitoring, setMonitoring,
    micLevel,
    deviceId, setDeviceId,
    devices,
    start, stop,
  } = karaoke;

  return (
    <div className="equipment-panel fixed bottom-4 right-4 z-50 w-72 p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mic size={16} className="text-[#d5ad58]" />
          <span className="text-sm font-bold tracking-widest text-[#d5ad58]">KARAOKE</span>
        </div>
        <button className="mini-button" onClick={onClose}><X size={14} /></button>
      </div>

      {micError && <p className="mb-2 text-xs text-red-400">{micError}</p>}

      {!micReady ? (
        <button className="metal-button w-full" onClick={start}>
          <Mic size={14} /> ENABLE MICROPHONE
        </button>
      ) : (
        <div className="space-y-3">
          {/* Device selector */}
          <div>
            <label className="text-xs font-bold tracking-wider text-[#a49778]">MIC DEVICE</label>
            <select
              className="source-input mt-1 w-full"
              value={deviceId}
              onChange={e => { setDeviceId(e.target.value); stop(); setTimeout(start, 100); }}
            >
              <option value="default">Default</option>
              {devices.map(d => (
                <option key={d.deviceId} value={d.deviceId}>{d.label || 'Microphone'}</option>
              ))}
            </select>
          </div>

          {/* Gain */}
          <div>
            <label className="text-xs font-bold tracking-wider text-[#a49778]">GAIN</label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.05"
              value={micGain}
              onChange={e => setMicGain(Number(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Mute + Monitoring */}
          <div className="flex gap-2">
            <button className={`mini-button flex-1 ${muted ? 'vinyl-active' : ''}`} onClick={() => setMuted(!muted)}>
              {muted ? <MicOff size={14} /> : <Mic size={14} />} {muted ? 'UNMUTE' : 'MUTE'}
            </button>
            <button className={`mini-button flex-1 ${monitoring ? 'vinyl-active' : ''}`} onClick={() => setMonitoring(!monitoring)}>
              <Headphones size={14} /> MONITOR
            </button>
          </div>

          {/* VU meter */}
          <div>
            <label className="text-xs font-bold tracking-wider text-[#a49778]">MIC LEVEL</label>
            <div className="mt-1 h-3 w-full overflow-hidden rounded bg-[#10100f]">
              <div
                className="h-full transition-all"
                style={{
                  width: `${Math.min(100, micLevel * 100)}%`,
                  background: micLevel > 0.85 ? '#ff2800' : micLevel > 0.6 ? '#d5ad58' : '#7a8c4a',
                }}
              />
            </div>
          </div>

          {/* Future features placeholder */}
          <div className="border-t border-[#6d6045] pt-2">
            <p className="text-xs text-[#a49778]">Lyrics sync, mic effects, fullscreen — coming soon</p>
          </div>

          <button className="mini-button w-full" onClick={stop}>
            <MicOff size={14} /> DISABLE MIC
          </button>
        </div>
      )}
    </div>
  );
}