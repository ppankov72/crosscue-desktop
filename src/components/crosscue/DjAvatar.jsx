import { Disc, Music, Headphones, Radio, Sliders, AudioWaveform, Disc3, Zap } from 'lucide-react';
import { Image } from '@/components/ui/image';

// CROSSCUE thematic DJ Avatar — deterministic from seed.
// Renders an SVG icon based on avatar_type.
export default function DjAvatar({ type = 'auto', seed = '', url = '', size = 64, className = '' }) {
  // If upload URL is provided, show the image
  if (url && (url.startsWith('http') || url.startsWith('data:') || url.startsWith('blob:'))) {
    return (
      <Image
        src={url}
        alt="DJ Avatar"
        className={`rounded-full overflow-hidden object-cover ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  // Determine avatar type
  let avatarType = type;
  if (type === 'auto') {
    const types = ['vinyl', 'turntable', 'cassette', 'headphones', 'waveform', 'mixer', 'stylus', 'abstract'];
    let hash = 0;
    for (let i = 0; i < (seed || '').length; i++) {
      hash = ((hash << 5) - hash) + (seed || '').charCodeAt(i);
      hash = hash & hash;
    }
    avatarType = types[Math.abs(hash) % types.length];
  }

  const iconProps = { size: size * 0.5, className: 'dj-avatar-icon text-amber-400' };
  const Icon = {
    vinyl: Disc,
    turntable: Disc3,
    cassette: Music,
    headphones: Headphones,
    waveform: AudioWaveform,
    mixer: Sliders,
    stylus: Zap,
    abstract: Radio
  }[avatarType] || Disc;

  // Deterministic gradient from seed
  let hash = 0;
  for (let i = 0; i < (seed || '').length; i++) {
    hash = ((hash << 5) - hash) + (seed || '').charCodeAt(i);
    hash = hash & hash;
  }
  const hue = Math.abs(hash) % 360;
  const bgGradient = `linear-gradient(135deg, hsl(${hue}, 40%, 25%) 0%, hsl(${(hue + 40) % 360}, 50%, 15%) 100%)`;

  return (
    <div
      className={`dj-avatar-generated flex items-center justify-center rounded-full border-2 border-amber-600/40 ${className}`}
      style={{ width: size, height: size, background: bgGradient }}
    >
      <Icon {...iconProps} />
    </div>
  );
}