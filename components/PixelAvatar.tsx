interface PixelAvatarProps {
  skinTone?: 'light' | 'medium' | 'tan' | 'dark';
  hairColor?: 'blonde' | 'brown' | 'black' | 'red' | 'gray' | 'none';
  hairStyle?: 'short' | 'long' | 'bald' | 'curly';
  size?: number;
}

const SKIN_COLORS = {
  light: '#ffd7b5',
  medium: '#d4a574',
  tan: '#b08968',
  dark: '#8d5524',
};

const HAIR_COLORS = {
  blonde: '#f4e04d',
  brown: '#6f4e37',
  black: '#1a1a1a',
  red: '#a52a2a',
  gray: '#808080',
  none: 'transparent',
};

export default function PixelAvatar({
  skinTone = 'medium',
  hairColor = 'brown',
  hairStyle = 'short',
  size = 32,
}: PixelAvatarProps) {
  const skin = SKIN_COLORS[skinTone];
  const hair = HAIR_COLORS[hairColor];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      style={{ imageRendering: 'pixelated' }}
      className="flex-shrink-0"
    >
      {/* Head - oval shape */}
      <rect x="5" y="4" width="6" height="8" fill={skin} />
      <rect x="4" y="5" width="8" height="6" fill={skin} />
      <rect x="6" y="3" width="4" height="1" fill={skin} />
      <rect x="6" y="12" width="4" height="1" fill={skin} />

      {/* Hair based on style */}
      {hairStyle === 'short' && hairColor !== 'none' && (
        <>
          <rect x="5" y="2" width="6" height="2" fill={hair} />
          <rect x="4" y="3" width="8" height="2" fill={hair} />
        </>
      )}

      {hairStyle === 'long' && hairColor !== 'none' && (
        <>
          <rect x="5" y="2" width="6" height="3" fill={hair} />
          <rect x="4" y="3" width="8" height="4" fill={hair} />
          <rect x="3" y="5" width="2" height="4" fill={hair} />
          <rect x="11" y="5" width="2" height="4" fill={hair} />
        </>
      )}

      {hairStyle === 'curly' && hairColor !== 'none' && (
        <>
          <rect x="4" y="2" width="2" height="2" fill={hair} />
          <rect x="6" y="1" width="4" height="2" fill={hair} />
          <rect x="10" y="2" width="2" height="2" fill={hair} />
          <rect x="3" y="4" width="2" height="2" fill={hair} />
          <rect x="11" y="4" width="2" height="2" fill={hair} />
        </>
      )}

      {/* Eyes */}
      <rect x="6" y="6" width="1" height="1" fill="#1a1a1a" />
      <rect x="9" y="6" width="1" height="1" fill="#1a1a1a" />

      {/* Nose */}
      <rect x="8" y="8" width="1" height="1" fill="#000000" opacity="0.2" />

      {/* Mouth */}
      <rect x="7" y="10" width="3" height="1" fill="#000000" opacity="0.3" />

      {/* Jersey/body */}
      <rect x="5" y="13" width="6" height="3" fill="#0066cc" />
      <rect x="3" y="14" width="10" height="2" fill="#0066cc" />
    </svg>
  );
}
