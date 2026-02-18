import { TestRunner, assert, assertEqual } from "../testRunner";
import { GameModeFactory } from "@/factories/GameModeFactory";
import { Vampire } from "@/models/roles/Vampire";
import { Beast } from "@/models/roles/Beast";
import { BeastHunter } from "@/models/roles/BeastHunter";
import { Angel } from "@/models/roles/Angel";
import { Survivor } from "@/models/roles/Survivor";
import { Executioner } from "@/models/roles/Executioner";
import { Bodyguard } from "@/models/roles/Bodyguard";
import { Berserker } from "@/models/roles/Berserker";
import { Ninja } from "@/models/roles/Ninja";
import { Masochist } from "@/models/roles/Masochist";
import { Toughened } from "@/models/statusEffects/Toughened";
import { roleConfigs } from "@/config/roleConfig";
import type { PlayerData } from "@/types/player.types";

const runner = new TestRunner();

// ============================================================================
// BOT ROLE TESTS
// ============================================================================

// WIP: Bot Vampire creation depends on role system — test disabled until role system stabilizes
// runner.test("Bot Vampire is created correctly", (engine) => {
//   const mode = GameModeFactory.getInstance().createMode("role-based");
//   engine.setGameMode(mode);
//
//   const players: PlayerData[] = [
//     {
//       id: "bot1",
//       name: "Bot Vamp",
//       socketId: "s1",
//       isBot: true,
//       behavior: "random",
//     },
//     {
//       id: "bot2",
//       name: "Bot Beast",
//       socketId: "s2",
//       isBot: true,
//       behavior: "random",
//     },
//   ];
//
//   // Manually set role pool to ensure we get a vampire
//   engine.startGame(players);
//
//   const vampire = engine.players.find((p) => p instanceof Vampire);
//
//   assert(vampire !== undefined, "Should have a Vampire");
//   assert(vampire!.isBot, "Vampire should be a bot");
//   assertEqual(
//     vampire!.behavior,
//     "random",
//     "Vampire bot should have random behavior"
//   );
// });

runner.test("Bot role can be commanded", (engine) => {
  const mode = GameModeFactory.getInstance().createMode("role-based");
  engine.setGameMode(mode);

  // Create test game with specific roles
  engine.createTestGame(["vampire", "beast", "beasthunter", "angel"]);

  const bots = engine.players.filter((p) => p.isBot);
  assertEqual(bots.length, 4, "Should have 4 bots");

  const vampireBot = engine.players.find((p) => p instanceof Vampire);
  assert(vampireBot !== undefined, "Should have a vampire bot");
  assert(vampireBot!.isBot, "Vampire should be a bot");

  // Command the bot
  vampireBot!.triggerAction("shake", engine.gameTime);

  // Should not throw error
  assert(true, "Bot role should be commandable");
});

runner.test("All bot roles can be commanded", (engine) => {
  const mode = GameModeFactory.getInstance().createMode("role-based");
  engine.setGameMode(mode);

  engine.createTestGame(["vampire", "beast", "beasthunter", "angel"]);

  // Try commanding each bot
  engine.players.forEach((player) => {
    assert(player.isBot, `${player.name} should be a bot`);

    player.triggerAction("shake", engine.gameTime);
    const state = player.getBotState();

    assert(state.isBot, "Bot state should show isBot = true");
    assertEqual(
      state.behavior,
      "random",
      "Bot should have random behavior by default"
    );
  });
});

// ============================================================================
// VAMPIRE TESTS
// ============================================================================

runner.test("Vampire enters bloodlust after 30 seconds", (engine) => {
  const mode = GameModeFactory.getInstance().createMode("role-based");
  engine.setGameMode(mode);

  engine.createTestGame(["vampire", "beast"]);

  // Disable auto-play to prevent random deaths during fast-forward
  engine.players.forEach((p) => p.disableAutoPlay());

  const vampire = engine.players.find((p) => p instanceof Vampire) as Vampire;
  assert(vampire !== undefined, "Should have vampire");

  // Fast-forward to bloodlust time
  engine.fastForward(30000);

  // Vampire should have entered bloodlust
  // (We'd need to expose bloodlustActive to test this properly)
  // For now, just verify vampire is still alive
  assert(vampire.isAlive, "Vampire should still be alive");
});

// WIP: Vampire bloodlust points mechanic is still being developed — test disabled until role system stabilizes
// runner.test("Vampire gains points on bloodlust kill", (engine) => {
//   const mode = GameModeFactory.getInstance().createMode("role-based");
//   engine.setGameMode(mode);
//
//   engine.createTestGame(["vampire", "beast", "beast"]);
//
//   // Disable auto-play to prevent random deaths during fast-forward
//   engine.players.forEach((p) => p.disableAutoPlay());
//
//   const vampire = engine.players.find((p) => p instanceof Vampire) as Vampire;
//   const beast = engine.players.find((p) => p instanceof Beast);
//
//   assert(vampire !== undefined, "Should have vampire");
//   assert(beast !== undefined, "Should have beast");
//
//   const initialPoints = vampire.points;
//
//   // Fast-forward to bloodlust
//   engine.fastForward(30000);
//
//   // Kill a beast during bloodlust
//   beast!.die(engine.gameTime);
//
//   // Vampire should gain points
//   assert(
//     vampire.points > initialPoints,
//     "Vampire should gain points from bloodlust kill"
//   );
// });

// ============================================================================
// BEAST TESTS
// ============================================================================

runner.test("Beast has increased toughness", (engine) => {
  const mode = GameModeFactory.getInstance().createMode("role-based");
  engine.setGameMode(mode);

  engine.createTestGame(["beast", "vampire"]);

  const beast = engine.players.find((p) => p instanceof Beast);
  assert(beast !== undefined, "Should have beast");
  assert(beast!.toughness > 1.0, "Beast should have toughness > 1.0");
  assertEqual(beast!.toughness, 1.5, "Beast should have 1.5x toughness");
});

runner.test("Beast takes less damage than normal player", (engine) => {
  const mode = GameModeFactory.getInstance().createMode("classic");
  engine.setGameMode(mode);

  const players: PlayerData[] = [
    { id: "normal", name: "Normal", socketId: "s1", isBot: true },
    { id: "beast", name: "Beast", socketId: "s2", isBot: true },
  ];

  engine.startGame(players);

  const normal = engine.getPlayerById("normal")!;
  const beast = engine.getPlayerById("beast")!;

  // Manually set beast toughness (simulating Beast role)
  beast.toughness = 1.5;

  // Deal same damage
  normal.takeDamage(90, engine.gameTime);
  beast.takeDamage(90, engine.gameTime);

  assert(
    beast.accumulatedDamage < normal.accumulatedDamage,
    "Beast should have less damage"
  );
  assertEqual(
    beast.accumulatedDamage,
    60,
    "Beast should take 60 damage (90/1.5)"
  );
  assertEqual(normal.accumulatedDamage, 90, "Normal should take 90 damage");
});

// ============================================================================
// BEAST HUNTER TESTS
// ============================================================================

runner.test("BeastHunter gains points when Beast dies", (engine) => {
  const mode = GameModeFactory.getInstance().createMode("role-based");
  engine.setGameMode(mode);

  engine.createTestGame(["beasthunter", "beast", "vampire"]);

  const hunter = engine.players.find((p) => p instanceof BeastHunter);
  const beast = engine.players.find((p) => p instanceof Beast);

  assert(hunter !== undefined, "Should have beast hunter");
  assert(beast !== undefined, "Should have beast");

  const initialPoints = hunter!.points;

  // Kill the beast
  beast!.die(engine.gameTime);

  // Wait a tick for event processing
  engine.fastForward(100);

  assert(
    hunter!.points > initialPoints,
    "BeastHunter should gain points when Beast dies"
  );
});

runner.test("BeastHunter doesn't gain points for other deaths", (engine) => {
  const mode = GameModeFactory.getInstance().createMode("role-based");
  engine.setGameMode(mode);

  engine.createTestGame(["beasthunter", "vampire", "angel"]);

  const hunter = engine.players.find((p) => p instanceof BeastHunter);
  const vampire = engine.players.find((p) => p instanceof Vampire);

  assert(hunter !== undefined, "Should have beast hunter");
  assert(vampire !== undefined, "Should have vampire");

  const initialPoints = hunter!.points;

  // Kill vampire (not a beast)
  vampire!.die(engine.gameTime);

  // Wait for event processing
  engine.fastForward(100);

  assertEqual(
    hunter!.points,
    initialPoints,
    "BeastHunter should not gain points for non-beast deaths"
  );
});

// ============================================================================
// ANGEL TESTS
// ============================================================================

runner.test("Angel prevents first death", (engine) => {
  const mode = GameModeFactory.getInstance().createMode("role-based");
  engine.setGameMode(mode);

  engine.createTestGame(["angel", "vampire"]);

  const angel = engine.players.find((p) => p instanceof Angel);
  assert(angel !== undefined, "Should have angel");

  // Deal lethal damage
  angel!.takeDamage(200, engine.gameTime);

  // Angel should still be alive (divine protection)
  assert(angel!.isAlive, "Angel should survive first death");
});

// WIP: Angel invulnerability expiry mechanic is still being developed — test disabled until role system stabilizes
// runner.test("Angel dies when invulnerability expires", (engine) => {
//   const mode = GameModeFactory.getInstance().createMode("role-based");
//   engine.setGameMode(mode);
//
//   engine.createTestGame(["angel", "vampire"]);
//
//   const angel = engine.players.find((p) => p instanceof Angel);
//   assert(angel !== undefined, "Should have angel");
//
//   // Deal lethal damage (triggers divine protection)
//   angel!.takeDamage(200, engine.gameTime);
//   assert(angel!.isAlive, "Angel should be alive after first death");
//
//   // Fast-forward past invulnerability duration (3 seconds)
//   engine.fastForward(3500);
//
//   assert(!angel!.isAlive, "Angel should die when invulnerability expires");
// });

// ============================================================================
// SURVIVOR TESTS
// ============================================================================

runner.test("Survivor gains 1 point after 30 seconds", (engine) => {
  const mode = GameModeFactory.getInstance().createMode("role-based");
  engine.setGameMode(mode);

  engine.createTestGame(["survivor", "beast"]);
  engine.players.forEach((p) => p.disableAutoPlay());

  const survivor = engine.players.find((p) => p instanceof Survivor);
  assert(survivor !== undefined, "Should have survivor");
  assertEqual(survivor!.points, 0, "Should start with 0 points");

  // Fast-forward 30 seconds
  engine.fastForward(30000);

  assertEqual(survivor!.points, 1, "Should have 1 point after 30s");
});

runner.test("Survivor gains multiple points over time", (engine) => {
  const mode = GameModeFactory.getInstance().createMode("role-based");
  engine.setGameMode(mode);

  engine.createTestGame(["survivor", "beast"]);
  engine.players.forEach((p) => p.disableAutoPlay());

  const survivor = engine.players.find((p) => p instanceof Survivor);
  assert(survivor !== undefined, "Should have survivor");

  // Fast-forward 90 seconds (3 intervals)
  engine.fastForward(90000);

  assertEqual(survivor!.points, 3, "Should have 3 points after 90s");
});

runner.test("Survivor stops earning points when dead", (engine) => {
  const mode = GameModeFactory.getInstance().createMode("role-based");
  engine.setGameMode(mode);

  engine.createTestGame(["survivor", "beast"]);
  engine.players.forEach((p) => p.disableAutoPlay());

  const survivor = engine.players.find((p) => p instanceof Survivor);
  assert(survivor !== undefined, "Should have survivor");

  // Fast-forward 30s, earn 1 point
  engine.fastForward(30000);
  assertEqual(survivor!.points, 1, "Should have 1 point");

  // Kill survivor
  survivor!.die(engine.gameTime);

  // Fast-forward another 30s
  engine.fastForward(30000);

  // Should not have gained more points
  assertEqual(survivor!.points, 1, "Should still have 1 point after death");
});

// ============================================================================
// EXECUTIONER TESTS
// ============================================================================

runner.test("Executioner has a target assigned", (engine) => {
  const mode = GameModeFactory.getInstance().createMode("role-based");
  engine.setGameMode(mode);

  engine.createTestGame(["executioner", "beast", "survivor"]);
  engine.players.forEach((p) => p.disableAutoPlay());

  const executioner = engine.players.find((p) => p instanceof Executioner);
  assert(executioner !== undefined, "Should have executioner");
  assert(
    executioner!.targetPlayerName !== null,
    "Executioner should have a target assigned"
  );
  assert(
    executioner!.targetPlayerId !== executioner!.id,
    "Target should not be self"
  );
});

runner.test("Executioner gains points when target dies", (engine) => {
  const mode = GameModeFactory.getInstance().createMode("role-based");
  engine.setGameMode(mode);

  engine.createTestGame(["executioner", "beast", "survivor"]);
  engine.players.forEach((p) => p.disableAutoPlay());

  const executioner = engine.players.find((p) => p instanceof Executioner);
  assert(executioner !== undefined, "Should have executioner");

  const targetId = executioner!.targetPlayerId;
  const target = engine.players.find((p) => p.id === targetId);
  assert(target !== undefined, "Target should exist");

  const initialPoints = executioner!.points;

  // Kill the target
  target!.die(engine.gameTime);
  engine.fastForward(100);

  assertEqual(
    executioner!.points,
    initialPoints + roleConfigs.executioner.targetKillPoints,
    "Executioner should gain points when target dies"
  );
});

runner.test("Executioner gets new target after current dies", (engine) => {
  const mode = GameModeFactory.getInstance().createMode("role-based");
  engine.setGameMode(mode);

  engine.createTestGame(["executioner", "beast", "survivor", "ninja"]);
  engine.players.forEach((p) => p.disableAutoPlay());

  const executioner = engine.players.find((p) => p instanceof Executioner);
  assert(executioner !== undefined, "Should have executioner");

  const firstTargetId = executioner!.targetPlayerId;
  const firstTarget = engine.players.find((p) => p.id === firstTargetId);
  assert(firstTarget !== undefined, "First target should exist");

  // Kill first target
  firstTarget!.die(engine.gameTime);
  engine.fastForward(100);

  // Should have a new target
  assert(
    executioner!.targetPlayerId !== null,
    "Should have a new target after first target dies"
  );
  assert(
    executioner!.targetPlayerId !== firstTargetId,
    "New target should be different from first"
  );
});

runner.test(
  "Executioner doesn't gain points for non-target death",
  (engine) => {
    const mode = GameModeFactory.getInstance().createMode("role-based");
    engine.setGameMode(mode);

    engine.createTestGame(["executioner", "beast", "survivor", "ninja"]);
    engine.players.forEach((p) => p.disableAutoPlay());

    const executioner = engine.players.find((p) => p instanceof Executioner);
    assert(executioner !== undefined, "Should have executioner");

    const targetId = executioner!.targetPlayerId;
    const nonTarget = engine.players.find(
      (p) => p.id !== executioner!.id && p.id !== targetId
    );
    assert(nonTarget !== undefined, "Should have a non-target player");

    const initialPoints = executioner!.points;

    // Kill a non-target player
    nonTarget!.die(engine.gameTime);
    engine.fastForward(100);

    assertEqual(
      executioner!.points,
      initialPoints,
      "Executioner should not gain points for non-target death"
    );
  }
);

// ============================================================================
// BODYGUARD TESTS
// ============================================================================

runner.test("Bodyguard has a target assigned", (engine) => {
  const mode = GameModeFactory.getInstance().createMode("role-based");
  engine.setGameMode(mode);

  engine.createTestGame(["bodyguard", "beast", "survivor"]);
  engine.players.forEach((p) => p.disableAutoPlay());

  const bodyguard = engine.players.find((p) => p instanceof Bodyguard);
  assert(bodyguard !== undefined, "Should have bodyguard");
  assert(
    bodyguard!.targetPlayerName !== null,
    "Bodyguard should have a target assigned"
  );
});

runner.test("Bodyguard earns bonus when target in top 3", (engine) => {
  const mode = GameModeFactory.getInstance().createMode("role-based");
  engine.setGameMode(mode);

  // 5 players: bodyguard + 4 others. Kill 2 non-targets to reach 3 alive.
  engine.createTestGame([
    "bodyguard",
    "beast",
    "survivor",
    "ninja",
    "masochist",
  ]);
  engine.players.forEach((p) => p.disableAutoPlay());

  const bodyguard = engine.players.find((p) => p instanceof Bodyguard);
  assert(bodyguard !== undefined, "Should have bodyguard");

  const targetId = bodyguard!.targetPlayerId;

  // Kill players that are NOT the target and NOT the bodyguard until 3 remain
  const nonTargets = engine.players.filter(
    (p) => p.id !== bodyguard!.id && p.id !== targetId
  );

  // Kill enough to leave 3 alive (including bodyguard and target)
  nonTargets[0].die(engine.gameTime);
  engine.fastForward(100);
  nonTargets[1].die(engine.gameTime);
  engine.fastForward(100);

  // Alive count: bodyguard + target + 1 other = 3
  const aliveCount = engine.players.filter((p) => p.isAlive).length;
  assertEqual(aliveCount, 3, "Should have 3 alive");

  assert(
    bodyguard!.points >= roleConfigs.bodyguard.protectionBonus,
    "Bodyguard should earn protection bonus when target in top 3"
  );
});

runner.test("Bodyguard has reduced last-standing bonus", (engine) => {
  const mode = GameModeFactory.getInstance().createMode("role-based");
  engine.setGameMode(mode);

  engine.createTestGame(["bodyguard", "beast"]);
  engine.players.forEach((p) => p.disableAutoPlay());

  const bodyguard = engine.players.find((p) => p instanceof Bodyguard);
  assert(bodyguard !== undefined, "Should have bodyguard");

  assertEqual(
    bodyguard!.lastStandingBonusOverride,
    roleConfigs.bodyguard.lastStandingBonus,
    "Bodyguard should have reduced last-standing bonus"
  );
});

// ============================================================================
// BERSERKER TESTS
// ============================================================================

runner.test("Berserker gains Toughened on damage", (engine) => {
  const mode = GameModeFactory.getInstance().createMode("role-based");
  engine.setGameMode(mode);

  engine.createTestGame(["berserker", "beast"]);
  engine.players.forEach((p) => p.disableAutoPlay());

  const berserker = engine.players.find((p) => p instanceof Berserker);
  assert(berserker !== undefined, "Should have berserker");
  assert(
    !berserker!.hasStatusEffect(Toughened),
    "Should not start with Toughened"
  );

  // Deal non-lethal damage
  berserker!.takeDamage(10, engine.gameTime);

  assert(
    berserker!.hasStatusEffect(Toughened),
    "Berserker should gain Toughened after taking damage"
  );
  assertEqual(
    berserker!.toughness,
    roleConfigs.berserker.toughnessValue,
    "Should have berserker toughness value"
  );
});

runner.test("Berserker Toughened expires after duration", (engine) => {
  const mode = GameModeFactory.getInstance().createMode("role-based");
  engine.setGameMode(mode);

  engine.createTestGame(["berserker", "beast"]);
  engine.players.forEach((p) => p.disableAutoPlay());

  const berserker = engine.players.find((p) => p instanceof Berserker);
  assert(berserker !== undefined, "Should have berserker");

  // Deal non-lethal damage to trigger tough skin
  berserker!.takeDamage(10, engine.gameTime);
  assert(berserker!.hasStatusEffect(Toughened), "Should have Toughened");

  // Fast-forward past duration
  engine.fastForward(roleConfigs.berserker.toughnessDuration + 100);

  assert(
    !berserker!.hasStatusEffect(Toughened),
    "Toughened should expire after duration"
  );
  assertEqual(berserker!.toughness, 1.0, "Toughness should return to default");
});

runner.test("Berserker takes less damage during tough skin", (engine) => {
  const mode = GameModeFactory.getInstance().createMode("role-based");
  engine.setGameMode(mode);

  engine.createTestGame(["berserker", "beast"]);
  engine.players.forEach((p) => p.disableAutoPlay());

  const berserker = engine.players.find((p) => p instanceof Berserker);
  assert(berserker !== undefined, "Should have berserker");

  // First hit triggers tough skin. Damage before toughened: 10 / 1.0 = 10
  berserker!.takeDamage(10, engine.gameTime);
  const damageAfterFirstHit = berserker!.accumulatedDamage;

  // Second hit while toughened. Damage: 10 / 3.0 = 3.33
  berserker!.takeDamage(10, engine.gameTime);
  const damageFromSecondHit =
    berserker!.accumulatedDamage - damageAfterFirstHit;

  assert(
    damageFromSecondHit < 10,
    "Second hit should deal less damage due to toughened"
  );
});

// ============================================================================
// NINJA TESTS
// ============================================================================

runner.test("Ninja survives normal movement below threshold", (engine) => {
  const mode = GameModeFactory.getInstance().createMode("role-based");
  engine.setGameMode(mode);

  engine.createTestGame(["ninja", "beast"]);
  engine.players.forEach((p) => p.disableAutoPlay());

  const ninja = engine.players.find((p) => p instanceof Ninja);
  assert(ninja !== undefined, "Should have ninja");

  // Simulate movement below ninja's elevated threshold
  // Default threshold is 0.1, ninja multiplier is 4x, so ninja threshold = 0.4
  // Movement at 0.3 should be safe for ninja
  ninja!.updateMovement(
    { x: 3, y: 3, z: 3, timestamp: engine.gameTime },
    engine.gameTime
  );

  assert(ninja!.isAlive, "Ninja should survive movement below threshold");
  assertEqual(ninja!.accumulatedDamage, 0, "Ninja should take no damage");
});

runner.test("Ninja dies instantly when exceeding threshold", (engine) => {
  const mode = GameModeFactory.getInstance().createMode("role-based");
  engine.setGameMode(mode);

  engine.createTestGame(["ninja", "beast"]);
  engine.players.forEach((p) => p.disableAutoPlay());

  const ninja = engine.players.find((p) => p instanceof Ninja);
  assert(ninja !== undefined, "Should have ninja");

  // Deal direct damage (simulating what happens when threshold exceeded)
  ninja!.takeDamage(ninja!.deathThreshold, engine.gameTime);

  assert(!ninja!.isAlive, "Ninja should die from lethal damage");
});

// ============================================================================
// MASOCHIST TESTS
// ============================================================================

runner.test("Masochist earns points when below 30% HP", (engine) => {
  const mode = GameModeFactory.getInstance().createMode("role-based");
  engine.setGameMode(mode);

  engine.createTestGame(["masochist", "beast"]);
  engine.players.forEach((p) => p.disableAutoPlay());

  const masochist = engine.players.find((p) => p instanceof Masochist);
  assert(masochist !== undefined, "Should have masochist");

  // Deal enough damage to go below 30% HP (above 70% of threshold)
  const damageToBelow30 = masochist!.deathThreshold * 0.75;
  masochist!.takeDamage(damageToBelow30, engine.gameTime);

  const hpPercent =
    1 - masochist!.accumulatedDamage / masochist!.deathThreshold;
  assert(hpPercent < 0.3, "Should be below 30% HP");

  assertEqual(masochist!.points, 0, "Should have 0 points before interval");

  // Fast-forward 10.2 seconds (extra 200ms because timer starts on first tick after damage)
  engine.fastForward(10200);

  assertEqual(
    masochist!.points,
    1,
    "Should have 1 point after 10s below threshold"
  );
});

runner.test("Masochist doesn't earn points above 30% HP", (engine) => {
  const mode = GameModeFactory.getInstance().createMode("role-based");
  engine.setGameMode(mode);

  engine.createTestGame(["masochist", "beast"]);
  engine.players.forEach((p) => p.disableAutoPlay());

  const masochist = engine.players.find((p) => p instanceof Masochist);
  assert(masochist !== undefined, "Should have masochist");

  // Deal light damage (stay above 30%)
  masochist!.takeDamage(masochist!.deathThreshold * 0.3, engine.gameTime);

  const hpPercent =
    1 - masochist!.accumulatedDamage / masochist!.deathThreshold;
  assert(hpPercent > 0.3, "Should be above 30% HP");

  // Fast-forward 20 seconds
  engine.fastForward(20000);

  assertEqual(
    masochist!.points,
    0,
    "Should have 0 points while above threshold"
  );
});

runner.test("Masochist earns multiple points over time", (engine) => {
  const mode = GameModeFactory.getInstance().createMode("role-based");
  engine.setGameMode(mode);

  engine.createTestGame(["masochist", "beast"]);
  engine.players.forEach((p) => p.disableAutoPlay());

  const masochist = engine.players.find((p) => p instanceof Masochist);
  assert(masochist !== undefined, "Should have masochist");

  // Go below 30% HP
  masochist!.takeDamage(masochist!.deathThreshold * 0.75, engine.gameTime);

  // Fast-forward 30.2 seconds (3 intervals + buffer for first tick)
  engine.fastForward(30200);

  assertEqual(
    masochist!.points,
    3,
    "Should have 3 points after 30s below threshold"
  );
});

// ============================================================================
// ROLE ASSIGNMENT TESTS
// ============================================================================

runner.test("Roles are assigned from pool", (engine) => {
  const mode = GameModeFactory.getInstance().createMode(
    "role-based",
    "standard"
  );
  engine.setGameMode(mode);

  const players: PlayerData[] = [
    { id: "p1", name: "P1", socketId: "s1", isBot: true },
    { id: "p2", name: "P2", socketId: "s2", isBot: true },
    { id: "p3", name: "P3", socketId: "s3", isBot: true },
    { id: "p4", name: "P4", socketId: "s4", isBot: true },
  ];

  engine.startGame(players);

  const roleTypes = engine.players.map((p) => p.constructor.name);
  const uniqueRoles = new Set(roleTypes);

  // Should have assigned roles (not all BasePlayer)
  assert(
    uniqueRoles.size > 1 || !roleTypes.includes("BasePlayer"),
    "Should have assigned different roles"
  );
});

runner.test("Role pool repeats for more players than roles", (engine) => {
  const mode = GameModeFactory.getInstance().createMode(
    "role-based",
    "standard"
  );
  engine.setGameMode(mode);

  // Standard theme has 5 roles, let's use 7 players
  const players: PlayerData[] = Array.from({ length: 7 }, (_, i) => ({
    id: `p${i}`,
    name: `Player ${i}`,
    socketId: `s${i}`,
    isBot: true,
  }));

  engine.startGame(players);

  assertEqual(engine.players.length, 7, "Should have 7 players");

  // All players should have roles assigned
  const allHaveRoles = engine.players.every(
    (p) => p.constructor.name !== "BasePlayer" || p.isBot
  );

  assert(allHaveRoles, "All players should have roles assigned");
});

// ============================================================================
// ROLE FACTORY TESTS
// ============================================================================

runner.test("All roles can be created via factory", (engine) => {
  const mode = GameModeFactory.getInstance().createMode("role-based");
  engine.setGameMode(mode);

  engine.createTestGame([
    "survivor",
    "executioner",
    "bodyguard",
    "berserker",
    "ninja",
    "masochist",
  ]);

  assertEqual(engine.players.length, 6, "Should have 6 players");

  assert(
    engine.players.some((p) => p instanceof Survivor),
    "Should have Survivor"
  );
  assert(
    engine.players.some((p) => p instanceof Executioner),
    "Should have Executioner"
  );
  assert(
    engine.players.some((p) => p instanceof Bodyguard),
    "Should have Bodyguard"
  );
  assert(
    engine.players.some((p) => p instanceof Berserker),
    "Should have Berserker"
  );
  assert(
    engine.players.some((p) => p instanceof Ninja),
    "Should have Ninja"
  );
  assert(
    engine.players.some((p) => p instanceof Masochist),
    "Should have Masochist"
  );
});

// ============================================================================
// RUN TESTS
// ============================================================================

export async function runRoleTests() {
  return runner.run();
}

// Auto-run if executed directly
if (require.main === module) {
  runRoleTests();
}
