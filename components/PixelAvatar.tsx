interface PixelAvatarProps {
  skinTone?: 'light' | 'medium' | 'tan' | 'dark' | 'brown' | 'ebony' | 'pale' | 'olive';
  hairColor?: 'blonde' | 'lightbrown' | 'brown' | 'darkbrown' | 'black' | 'red' | 'auburn' | 'gray' | 'platinum' | 'none';
  hairStyle?: 'short' | 'long' | 'bald' | 'curly';
  size?: number;
}

const SKIN_COLORS = {
  light: '#ffe0c4',
  medium: '#daa876',
  tan: '#c18a5e',
  dark: '#8d5524',
  brown: '#6d4c3d',
  ebony: '#4a342a',
  pale: '#f5e6d8',
  olive: '#c9a677',
};

const HAIR_COLORS = {
  blonde: '#f4e04d',
  lightbrown: '#9d6d3a',
  brown: '#6f4e37',
  darkbrown: '#4a3228',
  black: '#1a1a1a',
  red: '#a52a2a',
  auburn: '#8b4513',
  gray: '#808080',
  platinum: '#e4e4e4',
  none: 'transparent',
};

export default function PixelAvatar({
  skinTone = 'medium',
  hairColor = 'brown',
  hairStyle = 'short',
  size = 32,
}: PixelAvatarProps) {
  const skin = SKIN_COLORS[skinTone] || SKIN_COLORS.medium;
  const hair = HAIR_COLORS[hairColor] || HAIR_COLORS.brown;

  // Generate some variation based on skin/hair combination for consistency
  const hash = (skinTone || '').length + (hairColor || '').length;
  const hasBeard = hash % 4 === 0;
  const hasBushyEyebrows = hash % 3 === 0;
  const smiling = hash % 2 === 0;

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

      {/* Eyebrows */}
      {hasBushyEyebrows ? (
        <>
          <rect x="5" y="5" width="2" height="1" fill="#000000" opacity="0.6" />
          <rect x="9" y="5" width="2" height="1" fill="#000000" opacity="0.6" />
        </>
      ) : (
        <>
          <rect x="6" y="5" width="1" height="1" fill="#000000" opacity="0.4" />
          <rect x="9" y="5" width="1" height="1" fill="#000000" opacity="0.4" />
        </>
      )}

      {/* Eyes */}
      <rect x="6" y="6" width="1" height="1" fill="#1a1a1a" />
      <rect x="9" y="6" width="1" height="1" fill="#1a1a1a" />

      {/* Nose */}
      <rect x="8" y="8" width="1" height="1" fill="#000000" opacity="0.2" />

      {/* Mouth */}
      {smiling ? (
        <>
          <rect x="6" y="10" width="1" height="1" fill="#000000" opacity="0.3" />
          <rect x="7" y="10" width="2" height="1" fill="#000000" opacity="0.3" />
          <rect x="9" y="10" width="1" height="1" fill="#000000" opacity="0.3" />
        </>
      ) : (
        <rect x="7" y="10" width="2" height="1" fill="#000000" opacity="0.3" />
      )}

      {/* Beard (some players) */}
      {hasBeard && hairColor !== 'none' && (
        <>
          <rect x="6" y="11" width="4" height="1" fill={hair} opacity="0.7" />
          <rect x="7" y="12" width="2" height="1" fill={hair} opacity="0.7" />
        </>
      )}

      {/* Jersey/body */}
      <rect x="5" y="13" width="6" height="3" fill="#0066cc" />
      <rect x="3" y="14" width="10" height="2" fill="#0066cc" />
    </svg>
  );
}
