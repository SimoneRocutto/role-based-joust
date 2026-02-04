/**
 * Priority levels for execution order.
 * Higher priority = executes first.
 *
 * Used by both status effects and roles to determine
 * the order in which their hooks are called.
 */
export enum Priority {
  // Critical priority - death prevention, invulnerability
  CRITICAL = 100,

  // Very high priority - major stat modifications, shields
  VERY_HIGH = 75,

  // High priority - protective effects, angel abilities
  HIGH = 50,

  // Medium-high priority - offensive role abilities
  MEDIUM_HIGH = 30,

  // Medium priority - standard role abilities (vampire, etc.)
  MEDIUM = 20,

  // Medium-low priority - reactive abilities
  MEDIUM_LOW = 10,

  // Low priority - score tracking, passive effects
  LOW = 5,

  // Very low priority - cosmetic or informational effects
  VERY_LOW = 1,
}

/**
 * Status effect priority guidelines
 */
export const STATUS_EFFECT_PRIORITIES = {
  INVULNERABILITY: Priority.CRITICAL, // 100 - Must block damage first
  BLESSED: Priority.VERY_HIGH, // 75  - Death prevention
  SHIELDED: Priority.VERY_HIGH, // 75  - Damage absorption
  STUNNED: Priority.VERY_HIGH, // 75  - Movement penalty
  STRENGTHENED: Priority.HIGH, // 50  - Stat boost
  WEAKENED: Priority.HIGH, // 50  - Stat reduction
  REGENERATING: Priority.MEDIUM, // 20  - Healing over time
  EXCITED: Priority.MEDIUM_LOW, // 10  - Movement requirement
} as const;

/**
 * Role priority guidelines
 */
export const ROLE_PRIORITIES = {
  ANGEL: Priority.HIGH, // 50 - Death prevention first
  ASSASSIN: Priority.MEDIUM_HIGH, // 30 - Offensive ability
  MEDIC: Priority.MEDIUM_HIGH, // 25 - Support ability
  VAMPIRE: Priority.MEDIUM, // 20 - Standard ability
  BERSERKER: Priority.MEDIUM_LOW, // 15 - Modified movement
  BEAST: Priority.MEDIUM_LOW, // 10 - Passive ability
  BEAST_HUNTER: Priority.LOW, // 5  - Reactive ability
  IRONCLAD: Priority.LOW, // 5  - Defensive ability (activated)
} as const;

/**
 * Get a human-readable description of a priority level
 */
export function getPriorityDescription(priority: number): string {
  if (priority >= Priority.CRITICAL) return "Critical";
  if (priority >= Priority.VERY_HIGH) return "Very High";
  if (priority >= Priority.HIGH) return "High";
  if (priority >= Priority.MEDIUM_HIGH) return "Medium-High";
  if (priority >= Priority.MEDIUM) return "Medium";
  if (priority >= Priority.MEDIUM_LOW) return "Medium-Low";
  if (priority >= Priority.LOW) return "Low";
  return "Very Low";
}
