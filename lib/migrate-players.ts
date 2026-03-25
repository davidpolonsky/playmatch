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

  // Simple heuristics based on common knowledge
  // In production, you'd want to call Gemini API to analyze stored card images
  const name = player.name.toLowerCase();

  let skinTone: Player['skinTone'] = 'medium';
  let hairColor: Player['hairColor'] = 'brown';
  let hairStyle: Player['hairStyle'] = 'short';

  // Very basic defaults - in real implementation, this should call Gemini
  // with the stored card image to get accurate appearance data

  // For now, use reasonable defaults
  if (player.isHistorical) {
    // Historical players often have varied styles
    hairStyle = Math.random() > 0.5 ? 'short' : 'long';
  }

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
