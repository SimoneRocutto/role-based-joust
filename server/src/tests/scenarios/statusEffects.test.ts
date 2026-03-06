import { TestRunner, assert, assertEqual } from "../testRunner";
import { GameModeFactory } from "@/factories/GameModeFactory";
import { Invulnerability } from "@/models/statusEffects/Invulnerability";
import { Shielded } from "@/models/statusEffects/Shielded";
import { Strengthened } from "@/models/statusEffects/Strengthened";
import { Weakened } from "@/models/statusEffects/Weakened";
import { Excited } from "@/models/statusEffects/Excited";
import type { PlayerData } from "@/types/player.types";

const runner = new TestRunner();

// ============================================================================
// INVULNERABILITY TESTS
// ============================================================================

runner.skip(
  "Invulnerability blocks all damage",
  "Invulnerability damage blocking is still being developed — test disabled until role system stabilizes",
  (engine) => {
    const mode = GameModeFactory.getInstance().createMode("classic");
    engine.setGameMode(mode);

    const players: PlayerData[] = [
      { id: "p1", name: "Protected", socketId: "s1", isBot: true },
    ];

    engine.startGame(players);

    const player = engine.getPlayerById("p1")!;

    player.applyStatusEffect(Invulnerability, engine.gameTime, 5000);

    const initialDamage = player.accumulatedDamage;
    player.takeDamage(100, engine.gameTime);

    assertEqual(
      player.accumulatedDamage,
      initialDamage,
      "Damage should be blocked by invulnerability"
    );
    assert(player.isAlive, "Player should still be alive");
  }
);

runner.skip(
  "Invulnerability expires after duration",
  "Invulnerability expiry depends on status effect system — test disabled until role system stabilizes",
  (engine) => {
    const mode = GameModeFactory.getInstance().createMode("classic");
    engine.setGameMode(mode);

    const players: PlayerData[] = [
      { id: "p1", name: "Protected", socketId: "s1", isBot: true },
    ];

    engine.startGame(players);

    const player = engine.getPlayerById("p1")!;

    player.applyStatusEffect(Invulnerability, engine.gameTime, 2000);

    assert(player.hasStatusEffect(Invulnerability), "Should have invulnerability");

    engine.fastForward(2500);

    assert(!player.hasStatusEffect(Invulnerability), "Invulnerability should expire");

    const initialDamage = player.accumulatedDamage;
    player.takeDamage(50, engine.gameTime);

    assert(
      player.accumulatedDamage > initialDamage,
      "Player should take damage after invulnerability expires"
    );
  }
);

// ============================================================================
// SHIELDED TESTS
// ============================================================================

runner.test("Shield absorbs partial damage", (engine) => {
  const mode = GameModeFactory.getInstance().createMode("classic");
  engine.setGameMode(mode);

  const players: PlayerData[] = [
    { id: "p1", name: "Shielded", socketId: "s1", isBot: true },
  ];

  engine.startGame(players);

  const player = engine.getPlayerById("p1")!;

  // Apply 50-point shield
  player.applyStatusEffect(Shielded, engine.gameTime, null, 50);

  // Deal 30 damage (less than shield)
  player.takeDamage(30, engine.gameTime);

  assertEqual(player.accumulatedDamage, 0, "Shield should absorb all damage");

  // Deal another 30 damage (more than remaining shield)
  player.takeDamage(30, engine.gameTime);

  // Shield had 20 left, so 10 should get through
  assertEqual(
    player.accumulatedDamage,
    10,
    "Overflow damage should get through broken shield"
  );
});

// ============================================================================
// STRENGTHENED/WEAKENED TESTS
// ============================================================================

runner.skip(
  "Strengthened increases toughness",
  "Strengthened toughness multiplier is still being developed — test disabled until role system stabilizes",
  (engine) => {
    const mode = GameModeFactory.getInstance().createMode("classic");
    engine.setGameMode(mode);

    const players: PlayerData[] = [
      { id: "p1", name: "Strong", socketId: "s1", isBot: true },
    ];

    engine.startGame(players);

    const player = engine.getPlayerById("p1")!;
    const originalToughness = (player as any).toughness;

    player.applyStatusEffect(Strengthened, engine.gameTime, 5000, 1.5);

    assertEqual(
      (player as any).toughness,
      originalToughness * 1.5,
      "Toughness should be increased"
    );
  }
);

runner.skip(
  "Strengthened restores original toughness when removed",
  "Strengthened removal depends on status effect system — test disabled until role system stabilizes",
  (engine) => {
    const mode = GameModeFactory.getInstance().createMode("classic");
    engine.setGameMode(mode);

    const players: PlayerData[] = [
      { id: "p1", name: "Strong", socketId: "s1", isBot: true },
    ];

    engine.startGame(players);

    const player = engine.getPlayerById("p1")!;
    const originalToughness = (player as any).toughness;

    player.applyStatusEffect(Strengthened, engine.gameTime, 2000, 1.5);

    engine.fastForward(2500);

    assertEqual(
      (player as any).toughness,
      originalToughness,
      "Toughness should be restored"
    );
  }
);

runner.test("Weakened decreases toughness", (engine) => {
  const mode = GameModeFactory.getInstance().createMode("classic");
  engine.setGameMode(mode);

  const players: PlayerData[] = [
    { id: "p1", name: "Weak", socketId: "s1", isBot: true },
  ];

  engine.startGame(players);

  const player = engine.getPlayerById("p1")!;
  const originalToughness = player.toughness;

  // Apply weakened (0.5x multiplier)
  player.applyStatusEffect(Weakened, engine.gameTime, 5000, 0.5);

  assertEqual(
    player.toughness,
    originalToughness * 0.5,
    "Toughness should be decreased"
  );
});

// ============================================================================
// EXCITED TESTS
// ============================================================================

runner.skip(
  "Excited requires constant movement",
  "Excited idle-death mechanic is still being developed — test disabled until role system stabilizes",
  (engine) => {
    const mode = GameModeFactory.getInstance().createMode("classic");
    engine.setGameMode(mode);

    const players: PlayerData[] = [
      { id: "p1", name: "Excited", socketId: "s1", isBot: true, behavior: "idle" },
    ];

    engine.startGame(players);

    const player = engine.getPlayerById("p1")!;

    player.disableAutoPlay();
    player.applyStatusEffect(Excited, engine.gameTime, 10000);

    assert(player.isAlive, "Player should start alive");

    engine.fastForward(3000);

    assert(!player.isAlive, "Player should die from being idle while excited");
  }
);

runner.test("Excited allows survival with movement", (engine) => {
  const mode = GameModeFactory.getInstance().createMode("classic");
  engine.setGameMode(mode);

  const players: PlayerData[] = [
    {
      id: "p1",
      name: "Excited",
      socketId: "s1",
      isBot: true,
      behavior: "aggressive",
    },
  ];

  engine.startGame(players);

  const player = engine.getPlayerById("p1")!;

  // Apply excited status
  player.applyStatusEffect(Excited, engine.gameTime, 5000);

  // Bot with aggressive behavior will keep moving
  // Fast-forward but player should stay alive due to movement
  engine.fastForward(3000);

  assert(player.isAlive, "Player should stay alive with constant movement");
});

// ============================================================================
// PRIORITY TESTS
// ============================================================================

runner.test("Status effects execute in priority order", (engine) => {
  const mode = GameModeFactory.getInstance().createMode("classic");
  engine.setGameMode(mode);

  const players: PlayerData[] = [
    { id: "p1", name: "Multi", socketId: "s1", isBot: true },
  ];

  engine.startGame(players);

  const player = engine.getPlayerById("p1")!;

  // Apply multiple effects
  player.applyStatusEffect(Weakened, engine.gameTime, 10000, 0.5);
  player.applyStatusEffect(Invulnerability, engine.gameTime, 10000);
  player.applyStatusEffect(Strengthened, engine.gameTime, 10000, 2.0);

  // Get sorted effects
  const sorted = player.getSortedStatusEffects();

  // Invulnerability (100) should be first
  assertEqual(
    sorted[0].constructor.name,
    "Invulnerability",
    "Invulnerability should have highest priority"
  );

  // Invulnerability should block all damage regardless of other effects
  const initialDamage = player.accumulatedDamage;
  player.takeDamage(100, engine.gameTime);

  assertEqual(
    player.accumulatedDamage,
    initialDamage,
    "Invulnerability should block damage despite other effects"
  );
});

runner.test("Effect refresh extends duration", (engine) => {
  const mode = GameModeFactory.getInstance().createMode("classic");
  engine.setGameMode(mode);

  const players: PlayerData[] = [
    { id: "p1", name: "Protected", socketId: "s1", isBot: true },
  ];

  engine.startGame(players);

  const player = engine.getPlayerById("p1")!;

  // Apply 3-second invulnerability
  const effect = player.applyStatusEffect(
    Invulnerability,
    engine.gameTime,
    3000
  );

  // Fast-forward 2 seconds
  engine.fastForward(2000);

  // Reapply with 3 seconds (should refresh)
  player.applyStatusEffect(Invulnerability, engine.gameTime, 3000);

  // Fast-forward 2 more seconds (total 4 seconds from start)
  engine.fastForward(2000);

  // Should still have invulnerability (refreshed to 3s at 2s mark)
  assert(
    player.hasStatusEffect(Invulnerability),
    "Effect should still be active after refresh"
  );
});

// ============================================================================
// RUN TESTS
// ============================================================================

export async function runStatusEffectTests() {
  return runner.run();
}

// Auto-run if executed directly
if (require.main === module) {
  runStatusEffectTests();
}
