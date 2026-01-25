export function formatTime(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
}

export function formatHealth(
  accumulatedDamage: number,
  maxHealth = 100
): string {
  const health = maxHealth - accumulatedDamage;
  const percentage = Math.max(0, Math.min(100, (health / maxHealth) * 100));
  return `${Math.round(percentage)}%`;
}

export function getHealthPercentage(
  accumulatedDamage: number,
  maxHealth = 100
): number {
  const health = maxHealth - accumulatedDamage;
  return Math.max(0, Math.min(1, health / maxHealth));
}

export function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getPlayerNumberSize(screenWidth: number): string {
  if (screenWidth < 375) return "180px";
  if (screenWidth < 768) return "220px";
  return "280px";
}
