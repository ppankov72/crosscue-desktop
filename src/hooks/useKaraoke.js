import { useState, useRef, useCallback, useEffect } from 'react';

// Karaoke mode — architectural foundation.
// Provides microphone input access, gain control, mute, VU metering, monitoring.
// Does NOT implement lyrics synchronization or microphone effects yet.
// Designed to coexist with DJ mode without interfering with the audio engine.
export default function useKaraoke() {
  const [enabled, setEnabled] = useState(false);
  const [micReady, setMicReady] = useState(false);
  const [micError, setMicError] = useState('');
  const [micGain, setMicGain] = useState(1);
  const [muted, setMuted] = useState(false);
  const [monitoring, setMonitoring] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [deviceId, setDeviceId] = useState('default');
  const [devices, setDevices] = useState([]);

  const audioContextRef = useRef(null);
  const streamRef = useRef(null);
  const sourceRef = useRef(null);
  const gainRef = useRef(null);
  const analyserRef = useRef(null);
  const monitorDestRef = useRef(null);
  const rafRef = useRef(null);

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
    }
    audioContextRef.current = null;
    sourceRef.current = null;
    gainRef.current = null;
    analyserRef.current = null;
    monitorDestRef.current = null;
    setMicReady(false);
    setMicLevel(0);
  }, []);

  const start = useCallback(async () => {
    setMicError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: deviceId !== 'default' ? { exact: deviceId } : undefined,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      streamRef.current = stream;

      const ctx = new AudioContext();
      audioContextRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      sourceRef.current = source;

      const gain = ctx.createGain();
      gain.gain.value = muted ? 0 : micGain;
      gainRef.current = gain;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      source.connect(gain);
      gain.connect(analyser);

      if (monitoring) {
        gain.connect(ctx.destination);
        monitorDestRef.current = ctx.destination;
      }

      setMicReady(true);

      // VU meter loop
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        if (!analyserRef.current) return;
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          const v = (data[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / data.length);
        setMicLevel(Math.min(1, rms * 3));
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();

      // Enumerate devices after permission is granted
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      setDevices(allDevices.filter(d => d.kind === 'audioinput'));
    } catch (e) {
      setMicError(e.message || 'Microphone access denied');
      setMicReady(false);
    }
  }, [deviceId, micGain, muted, monitoring]);

  // Update gain in real-time
  useEffect(() => {
    if (gainRef.current && audioContextRef.current) {
      gainRef.current.gain.value = muted ? 0 : micGain;
    }
  }, [micGain, muted]);

  // Update monitoring connection
  useEffect(() => {
    if (!audioContextRef.current || !gainRef.current) return;
    try {
      if (monitoring && !monitorDestRef.current) {
        gainRef.current.connect(audioContextRef.current.destination);
        monitorDestRef.current = audioContextRef.current.destination;
      } else if (!monitoring && monitorDestRef.current) {
        try { gainRef.current.disconnect(monitorDestRef.current); } catch {}
        monitorDestRef.current = null;
      }
    } catch {}
  }, [monitoring, micReady]);

  // Cleanup on unmount
  useEffect(() => () => stop(), [stop]);

  return {
    enabled, setEnabled,
    micReady, micError,
    micGain, setMicGain,
    muted, setMuted,
    monitoring, setMonitoring,
    micLevel,
    deviceId, setDeviceId,
    devices,
    start, stop,
  };
}