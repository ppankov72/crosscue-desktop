import { themeNames } from '@/lib/crosscue/theme';

export default function ThemePanel({ theme, onChange }) {
  return <div className="mt-4 space-y-3 text-sm text-[#c8bda6]"><p>Choose the workstation finish. Switching themes never interrupts playback.</p><div className="grid gap-2 sm:grid-cols-2">{Object.keys(themeNames).map(id => <button key={id} onClick={() => onChange(id)} className={`border p-3 text-left ${theme === id ? 'border-[#a5813a] bg-[#25231e] text-[#e8dec5]' : 'border-[#4c4636] text-[#a49778]'}`}><b className="block tracking-[.15em]">{themeNames[id]}</b><span className="mt-1 block text-[10px]">{id === 'decksmith' ? 'Legacy black and gold' : 'Graphite precision hardware'}</span></button>)}</div></div>;
}