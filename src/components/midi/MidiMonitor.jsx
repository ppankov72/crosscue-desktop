import { matchesMapping } from '@/lib/midi/mappings';
import { getRuntimeMappings } from '@/lib/midi/mappingProfile';
import { useMidiTranslations } from '@/lib/i18n/midiTranslations';

// Lightweight MIDI Monitor — observes the existing MIDI pipeline.
// Shows incoming messages, matched mappings, and resolved CROSSCUE actions.
// Does NOT create a second MIDI processing engine.
export default function MidiMonitor({ lastMessage, library, language }) {
  const { t } = useMidiTranslations(language);
  const mappings = getRuntimeMappings(library);
  const matched = lastMessage
    ? mappings.filter(m => matchesMapping(m, lastMessage))
    : [];

  return (
    <div className="border-t border-[#515a63] bg-[#101216] p-3 text-xs font-mono">
      <b className="deck-label">{t.monitor.title}</b>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
        {lastMessage ? (
          <>
            <span>DEV: {lastMessage.device.name}</span>
            <span>CH: {lastMessage.channel}</span>
            <span>TYPE: {lastMessage.type.toUpperCase()}</span>
            <span>NUM: {lastMessage.number}</span>
            <span>VAL: {lastMessage.value}</span>
            {matched.length > 0 ? (
              <span className="text-[#d5ad58]">→ {matched.map(m => m.target).join(', ')}</span>
            ) : (
              <span className="text-[#a49778]">→ {t.monitor.noMatch}</span>
            )}
          </>
        ) : (
          <span className="text-[#a49778]">{t.monitor.waitingInput}</span>
        )}
      </div>
    </div>
  );
}