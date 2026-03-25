import { Player } from './types';

/**
 * Generate appearance data for players that don't have it yet
 * This uses a simple heuristic based on player names (not perfect but works for migration)
 */
export function generateAppearanceForPlayer(player: Player): Player {
  // If player already has appearance data, return as-is
  if (player.skinTone && player.hairColor && player.hairStyle) {
    return player;
  }

  // Generate varied appearance based on player ID for consistency
  // In production, you'd want to call Gemini API to analyze stored card images
  const hash = player.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

  const skinTones: Player['skinTone'][] = ['light', 'medium', 'tan', 'dark', 'brown', 'ebony', 'pale', 'olive'];
  const hairColors: Player['hairColor'][] = ['blonde', 'lightbrown', 'brown', 'darkbrown', 'black', 'red', 'auburn', 'gray'];
  const hairStyles: Player['hairStyle'][] = ['short', 'long', 'bald', 'curly'];

  const skinTone = skinTones[hash % skinTones.length];
  const hairColor = hairColors[(hash * 7) % hairColors.length];
  const hairStyle = hairStyles[(hash * 13) % hairStyles.length];

  return {
    ...player,
    skinTone,
    hairColor,
    hairStyle,
  };
}

/**
 * Migrate an entire roster to have appearance data
 */
export function migrateRosterAppearance(players: Player[]): Player[] {
  return players.map(generateAppearanceForPlayer);
}
