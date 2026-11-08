import { useState, useEffect } from 'react';
import { midiManager } from './MidiManager';

// Shared hook for subscribing to the MIDI manager.
// Used by the Mapping Manager and MIDI Monitor.
export function useMidiState() {
  const [devices, setDevices] = useState([]);
  const [status, setStatus] = useState('off');
  const [lastMessage, setLastMessage] = useState(null);

  useEffect(() => {
    return midiManager.subscribe(event => {
      if (event.devices) setDevices(event.devices);
      if (event.status) setStatus(event.status);
      if (event.message) setLastMessage(event.message);
    });
  }, []);

  return { devices, status, lastMessage };
}