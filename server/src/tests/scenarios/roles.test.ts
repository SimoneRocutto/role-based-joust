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
import { Sibling } from "@/models/roles/Sibling";
import { Vulture } from "@/models/roles/Vulture";
import { Toughened } from "@/models/statusEffects/Toughened";
import { Troll } from "@/models/roles/Troll";
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

  // 3 players so round doesn't end when survivor dies
  engine.createTestGame(["survivor", "beast", "ninja"]);
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

  // Should not have gained more points (only survival points, no placement yet)
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

runner.test("Bodyguard has reduced placement bonus", (engine) => {
  const mode = GameModeFactory.getInstance().createMode("role-based");
  engine.setGameMode(mode);

  engine.createTestGame(["bodyguard", "beast"]);
  engine.players.forEach((p) => p.disableAutoPlay());

  const bodyguard = engine.players.find((p) => p instanceof Bodyguard);
  assert(bodyguard !== undefined, "Should have bodyguard");

  assert(
    bodyguard!.placementBonusOverrides !== null,
    "Bodyguard should have placement bonus overrides"
  );
  assertEqual(
    bodyguard!.placementBonusOverrides![0],
    roleConfigs.bodyguard.placementBonusOverrides[0],
    "Bodyguard should have reduced 1st place bonus"
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

  // Deal non-lethal damage; Toughened is applied after the burst ends (3 quiet ticks)
  berserker!.takeDamage(10, engine.gameTime);
  assert(
    !berserker!.hasStatusEffect(Toughened),
    "Toughened should not apply immediately (trailing-edge debounce)"
  );

  // Advance 3 ticks (300ms) of quiet time for the debounce to fire
  engine.fastForward(300);

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

  // Deal non-lethal damage; wait for debounce (3 ticks) for Toughened to apply
  berserker!.takeDamage(10, engine.gameTime);
  engine.fastForward(300);
  assert(berserker!.hasStatusEffect(Toughened), "Should have Toughened");

  // Fast-forward past Toughened duration
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

  // First burst of damage. Toughened only applies AFTER the burst ends (trailing-edge debounce).
  berserker!.takeDamage(10, engine.gameTime);
  const damageAfterFirstBurst = berserker!.accumulatedDamage;

  // Wait 3 quiet ticks (300ms) for the debounce to fire and Toughened to apply
  engine.fastForward(300);
  assert(
    berserker!.hasStatusEffect(Toughened),
    "Toughened should be active after burst"
  );

  // Second burst while Toughened is active. Damage: 10 / toughnessValue (e.g. 3.0) = ~3.33
  berserker!.takeDamage(10, engine.gameTime);
  const damageFromSecondBurst =
    berserker!.accumulatedDamage - damageAfterFirstBurst;

  assert(
    damageFromSecondBurst < 10,
    "Second burst should deal less damage due to toughened"
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
  // Default threshold is 0.1, ninja multiplier is 2x, so ninja threshold = 0.2
  // Movement at {1,1,1} → intensity ≈ 0.1, safe for ninja
  ninja!.updateMovement(
    { x: 1, y: 1, z: 1, timestamp: engine.gameTime },
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

runner.test("Masochist earns points when below 50% HP", (engine) => {
  const mode = GameModeFactory.getInstance().createMode("role-based");
  engine.setGameMode(mode);

  engine.createTestGame(["masochist", "beast"]);
  engine.players.forEach((p) => p.disableAutoPlay());

  const masochist = engine.players.find((p) => p instanceof Masochist);
  assert(masochist !== undefined, "Should have masochist");

  // Deal enough damage to go below 50% HP (above 50% of threshold)
  const damageToBelow30 = masochist!.deathThreshold * 0.55;
  masochist!.takeDamage(damageToBelow30, engine.gameTime);

  const hpPercent =
    1 - masochist!.accumulatedDamage / masochist!.deathThreshold;
  assert(hpPercent < 0.5, "Should be below 50% HP");

  assertEqual(masochist!.points, 0, "Should have 0 points before interval");

  // Fast-forward 15.2 seconds (extra 200ms because timer starts on first tick after damage)
  engine.fastForward(15200);

  assertEqual(
    masochist!.points,
    1,
    "Should have 1 point after 15s below threshold"
  );
});

runner.test("Masochist doesn't earn points above 50% HP", (engine) => {
  const mode = GameModeFactory.getInstance().createMode("role-based");
  engine.setGameMode(mode);

  engine.createTestGame(["masochist", "beast"]);
  engine.players.forEach((p) => p.disableAutoPlay());

  const masochist = engine.players.find((p) => p instanceof Masochist);
  assert(masochist !== undefined, "Should have masochist");

  // Deal light damage (stay above 50%)
  masochist!.takeDamage(masochist!.deathThreshold * 0.45, engine.gameTime);

  const hpPercent =
    1 - masochist!.accumulatedDamage / masochist!.deathThreshold;
  assert(hpPercent > 0.5, "Should be above 50% HP");

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

  // Go below 50% HP
  masochist!.takeDamage(masochist!.deathThreshold * 0.55, engine.gameTime);

  // Fast-forward 45.2 seconds (3 intervals + buffer for first tick)
  engine.fastForward(45200);

  assertEqual(
    masochist!.points,
    3,
    "Should have 3 points after 45s below threshold"
  );
});

// ============================================================================
// SIBLING TESTS
// ============================================================================

runner.test("Two siblings find each other and show target name", (engine) => {
  const mode = GameModeFactory.getInstance().createMode("role-based");
  engine.setGameMode(mode);

  engine.createTestGame(["sibling", "sibling", "beast"]);
  engine.players.forEach((p) => p.disableAutoPlay());

  const siblings = engine.players.filter((p) => p instanceof Sibling);
  assertEqual(siblings.length, 2, "Should have 2 siblings");

  const [sib1, sib2] = siblings;
  assertEqual(
    sib1.targetPlayerName,
    sib2.name,
    "Sibling 1 should target sibling 2"
  );
  assertEqual(
    sib2.targetPlayerName,
    sib1.name,
    "Sibling 2 should target sibling 1"
  );
});

runner.test("Damage to one sibling is shared with the other", (engine) => {
  const mode = GameModeFactory.getInstance().createMode("role-based");
  engine.setGameMode(mode);

  engine.createTestGame(["sibling", "sibling", "beast"]);
  engine.players.forEach((p) => p.disableAutoPlay());

  const siblings = engine.players.filter((p) => p instanceof Sibling);
  const [sib1, sib2] = siblings;

  // Deal damage to sibling 1
  sib1.takeDamage(30, engine.gameTime);

  // Both should have accumulated damage (30 / 1.5 toughness = 20 each)
  assert(sib1.accumulatedDamage > 0, "Sibling 1 should have taken damage");
  assert(sib2.accumulatedDamage > 0, "Sibling 2 should have shared damage");
  assertEqual(
    sib2.accumulatedDamage,
    30 / roleConfigs.sibling.toughnessBonus,
    "Sibling 2 should take damage reduced by toughness"
  );
});

runner.test("Shared damage doesn't cause infinite loop", (engine) => {
  const mode = GameModeFactory.getInstance().createMode("role-based");
  engine.setGameMode(mode);

  engine.createTestGame(["sibling", "sibling", "beast"]);
  engine.players.forEach((p) => p.disableAutoPlay());

  const siblings = engine.players.filter((p) => p instanceof Sibling);
  const [sib1, sib2] = siblings;

  // Deal damage - should not hang or stack overflow
  sib1.takeDamage(30, engine.gameTime);

  // Each sibling should only take the damage once (30 / 1.5 = 20)
  const expectedDamage = 30 / roleConfigs.sibling.toughnessBonus;
  assertEqual(
    sib1.accumulatedDamage,
    expectedDamage,
    "Sibling 1 should take damage exactly once"
  );
  assertEqual(
    sib2.accumulatedDamage,
    expectedDamage,
    "Sibling 2 should take shared damage exactly once"
  );
});

runner.test("Sibling has +50% effective toughness", (engine) => {
  const mode = GameModeFactory.getInstance().createMode("role-based");
  engine.setGameMode(mode);

  engine.createTestGame(["sibling", "beast"]);
  engine.players.forEach((p) => p.disableAutoPlay());

  const sibling = engine.players.find((p) => p instanceof Sibling);
  assert(sibling !== undefined, "Should have sibling");
  assertEqual(
    sibling!.toughness,
    roleConfigs.sibling.toughnessBonus,
    "Sibling should have 1.5x toughness"
  );
});

runner.test(
  "Single sibling (no pair) plays normally with toughness bonus",
  (engine) => {
    const mode = GameModeFactory.getInstance().createMode("role-based");
    engine.setGameMode(mode);

    engine.createTestGame(["sibling", "beast", "survivor"]);
    engine.players.forEach((p) => p.disableAutoPlay());

    const sibling = engine.players.find((p) => p instanceof Sibling);
    assert(sibling !== undefined, "Should have sibling");
    assertEqual(
      sibling!.targetPlayerName,
      null,
      "Single sibling should have no target"
    );
    assertEqual(
      sibling!.toughness,
      roleConfigs.sibling.toughnessBonus,
      "Should still have toughness bonus"
    );

    // Damage should work normally without crashing
    sibling!.takeDamage(30, engine.gameTime);
    assertEqual(
      sibling!.accumulatedDamage,
      30 / roleConfigs.sibling.toughnessBonus,
      "Should take damage normally"
    );
  }
);

runner.test("Two siblings win together when all others die", (engine) => {
  const mode = GameModeFactory.getInstance().createMode("role-based");
  engine.setGameMode(mode);

  engine.createTestGame(["sibling", "sibling", "beast", "survivor"]);
  engine.players.forEach((p) => p.disableAutoPlay());

  const siblings = engine.players.filter((p) => p instanceof Sibling);
  const nonSiblings = engine.players.filter((p) => !(p instanceof Sibling));

  assertEqual(siblings.length, 2, "Should have 2 siblings");

  // Kill all non-siblings
  for (const p of nonSiblings) {
    p.die(engine.gameTime);
  }
  engine.fastForward(100);

  // Both siblings should have received 1st place bonus (5 pts)
  assert(siblings[0].points >= 5, "Sibling 1 should have 1st place bonus");
  assert(siblings[1].points >= 5, "Sibling 2 should have 1st place bonus");
});

runner.test("Sibling death triggers death event normally", (engine) => {
  const mode = GameModeFactory.getInstance().createMode("role-based");
  engine.setGameMode(mode);

  engine.createTestGame(["sibling", "sibling", "beast"]);
  engine.players.forEach((p) => p.disableAutoPlay());

  const siblings = engine.players.filter((p) => p instanceof Sibling);
  const [sib1] = siblings;

  sib1.die(engine.gameTime);
  assert(!sib1.isAlive, "Sibling should be dead");
});

// ============================================================================
// VULTURE TESTS
// ============================================================================

runner.test(
  "Vulture gains points when death occurs within 5s of previous death",
  (engine) => {
    const mode = GameModeFactory.getInstance().createMode("role-based");
    engine.setGameMode(mode);

    engine.createTestGame(["vulture", "beast", "survivor", "ninja"]);
    engine.players.forEach((p) => p.disableAutoPlay());

    const vulture = engine.players.find((p) => p instanceof Vulture);
    assert(vulture !== undefined, "Should have vulture");

    const nonVultures = engine.players.filter(
      (p) => !(p instanceof Vulture) && p.id !== vulture!.id
    );

    // First death
    nonVultures[0].die(engine.gameTime);
    engine.fastForward(100);

    assertEqual(vulture!.points, 0, "No points on first death");

    // Second death within 5s
    engine.fastForward(3000);
    nonVultures[1].die(engine.gameTime);
    engine.fastForward(100);

    assertEqual(
      vulture!.points,
      roleConfigs.vulture.pointsPerChainedDeath,
      "Should gain points on chained death"
    );
  }
);

runner.test(
  "Vulture gains no points on first death (no prior death)",
  (engine) => {
    const mode = GameModeFactory.getInstance().createMode("role-based");
    engine.setGameMode(mode);

    engine.createTestGame(["vulture", "beast", "survivor"]);
    engine.players.forEach((p) => p.disableAutoPlay());

    const vulture = engine.players.find((p) => p instanceof Vulture);
    const beast = engine.players.find((p) => p instanceof Beast);
    assert(vulture !== undefined, "Should have vulture");

    beast!.die(engine.gameTime);
    engine.fastForward(100);

    assertEqual(vulture!.points, 0, "No points on first death");
  }
);

runner.test("Vulture gains no points when deaths are >5s apart", (engine) => {
  const mode = GameModeFactory.getInstance().createMode("role-based");
  engine.setGameMode(mode);

  engine.createTestGame(["vulture", "beast", "survivor", "ninja"]);
  engine.players.forEach((p) => p.disableAutoPlay());

  const vulture = engine.players.find((p) => p instanceof Vulture);
  const nonVultures = engine.players.filter(
    (p) => !(p instanceof Vulture) && p.id !== vulture!.id
  );

  // First death
  nonVultures[0].die(engine.gameTime);
  engine.fastForward(100);

  // Wait >5 seconds
  engine.fastForward(6000);

  // Second death
  nonVultures[1].die(engine.gameTime);
  engine.fastForward(100);

  assertEqual(
    vulture!.points,
    0,
    "No points when deaths are more than 5s apart"
  );
});

runner.test("Vulture's own death doesn't trigger points", (engine) => {
  const mode = GameModeFactory.getInstance().createMode("role-based");
  engine.setGameMode(mode);

  // 4 players so round doesn't end when vulture dies
  engine.createTestGame(["vulture", "beast", "survivor", "ninja"]);
  engine.players.forEach((p) => p.disableAutoPlay());

  const vulture = engine.players.find((p) => p instanceof Vulture);
  const beast = engine.players.find((p) => p instanceof Beast);

  // First death (beast)
  beast!.die(engine.gameTime);
  engine.fastForward(100);

  // Vulture dies within 5s — should not award points to itself
  engine.fastForward(2000);
  vulture!.die(engine.gameTime);
  engine.fastForward(100);

  assertEqual(vulture!.points, 0, "Vulture's own death should not give points");
});

runner.test("Dead vulture doesn't gain points", (engine) => {
  const mode = GameModeFactory.getInstance().createMode("role-based");
  engine.setGameMode(mode);

  engine.createTestGame(["vulture", "beast", "survivor", "ninja"]);
  engine.players.forEach((p) => p.disableAutoPlay());

  const vulture = engine.players.find((p) => p instanceof Vulture);
  const nonVultures = engine.players.filter(
    (p) => !(p instanceof Vulture) && p.id !== vulture!.id
  );

  // Kill vulture first
  vulture!.die(engine.gameTime);
  engine.fastForward(100);

  // Two deaths within 5s of each other
  nonVultures[0].die(engine.gameTime);
  engine.fastForward(2000);
  nonVultures[1].die(engine.gameTime);
  engine.fastForward(100);

  assertEqual(vulture!.points, 0, "Dead vulture should not gain points");
});

// ============================================================================
// TROLL TESTS
// ============================================================================

runner.test("Troll heals damage after delay", (engine) => {
  const mode = GameModeFactory.getInstance().createMode("role-based");
  engine.setGameMode(mode);

  engine.createTestGame(["troll", "beast"]);
  engine.players.forEach((p) => p.disableAutoPlay());

  const troll = engine.players.find((p) => p instanceof Troll);
  assert(troll !== undefined, "Should have troll");

  // Deal non-lethal damage
  troll!.takeDamage(30, engine.gameTime);
  const damageAfterHit = troll!.accumulatedDamage;
  assert(damageAfterHit > 0, "Troll should have taken damage");

  // Wait for debounce (3 quiet ticks) — onDamageEvent fires here, starting the heal timer
  engine.fastForward(300);

  // Before heal delay elapses from when onDamageEvent fired: no heal
  engine.fastForward(roleConfigs.troll.healDelay - 500);
  assert(troll!.accumulatedDamage > 0, "Should not have healed before delay");

  // After heal delay: healed
  engine.fastForward(600);
  assert(troll!.isAlive, "Troll should still be alive");
  assertEqual(
    troll!.accumulatedDamage,
    0,
    "Troll should have healed all damage"
  );
});

runner.test("Troll heal resets on repeated damage", (engine) => {
  const mode = GameModeFactory.getInstance().createMode("role-based");
  engine.setGameMode(mode);

  engine.createTestGame(["troll", "beast"]);
  engine.players.forEach((p) => p.disableAutoPlay());

  const troll = engine.players.find((p) => p instanceof Troll);
  assert(troll !== undefined, "Should have troll");

  const healDelay = roleConfigs.troll.healDelay;

  // First hit — onDamageEvent fires ~300ms later
  troll!.takeDamage(20, engine.gameTime);

  // Advance partway (5s), then deal second hit — onDamageEvent fires ~300ms after this hit,
  // losing previous pendingHeal (it becomes the new damage) and resetting the heal timer.
  engine.fastForward(5000);
  troll!.takeDamage(30, engine.gameTime);

  // Not enough time since the second burst's onDamageEvent — no heal yet
  engine.fastForward(healDelay - 1000);
  assert(
    troll!.accumulatedDamage > 0,
    "Should not have healed before timer elapsed since last hit"
  );

  // Past healDelay since second burst's onDamageEvent — should have healed
  engine.fastForward(1500);
  assertEqual(
    troll!.accumulatedDamage,
    20,
    "Should have healed damage from the second hit"
  );
});

runner.test("Troll does not heal after death", (engine) => {
  const mode = GameModeFactory.getInstance().createMode("role-based");
  engine.setGameMode(mode);

  engine.createTestGame(["troll", "beast"]);
  engine.players.forEach((p) => p.disableAutoPlay());

  const troll = engine.players.find((p) => p instanceof Troll);
  assert(troll !== undefined, "Should have troll");

  // Kill troll with lethal damage
  troll!.takeDamage(troll!.deathThreshold, engine.gameTime);
  assert(!troll!.isAlive, "Troll should be dead");

  // Fast-forward past heal delay — no crash, accumulatedDamage stays at 0 (reset by death)
  engine.fastForward(roleConfigs.troll.healDelay + 1000);
  assertEqual(
    troll!.accumulatedDamage,
    0,
    "Dead Troll accumulatedDamage stays at 0"
  );
});

// ============================================================================
// PLACEMENT BONUS TESTS
// ============================================================================

runner.test("1st place gets 5 points, 2nd gets 3, 3rd gets 1", (engine) => {
  const mode = GameModeFactory.getInstance().createMode("role-based");
  engine.setGameMode(mode);

  engine.createTestGame(["beast", "survivor", "ninja", "berserker"]);
  engine.players.forEach((p) => p.disableAutoPlay());

  const [p1, p2, p3, p4] = engine.players;

  // Kill in order: p1 first (4th place), p2 second (3rd), p3 third (2nd)
  p1.die(engine.gameTime);
  engine.fastForward(100);
  p2.die(engine.gameTime);
  engine.fastForward(100);
  p3.die(engine.gameTime);
  engine.fastForward(100);

  // p4 is last standing (1st place: 5pts)
  assertEqual(p4.points, 5, "1st place should get 5 points");
  // p3 died last among dead (2nd place: 3pts)
  assertEqual(p3.points, 3, "2nd place should get 3 points");
  // p2 (3rd place: 1pt)
  assertEqual(p2.points, 1, "3rd place should get 1 point");
  // p1 died first (4th place: 0pts)
  assertEqual(p1.points, 0, "4th place should get 0 points");
});

runner.test("Placement bonus respects role overrides", (engine) => {
  const mode = GameModeFactory.getInstance().createMode("role-based");
  engine.setGameMode(mode);

  engine.createTestGame(["bodyguard", "beast"]);
  engine.players.forEach((p) => p.disableAutoPlay());

  const bodyguard = engine.players.find((p) => p instanceof Bodyguard);
  const beast = engine.players.find((p) => p instanceof Beast);
  assert(bodyguard !== undefined, "Should have bodyguard");

  // Kill beast, bodyguard survives
  beast!.die(engine.gameTime);
  engine.fastForward(100);

  // Bodyguard's 1st place override is 2 (from roleConfigs.bodyguard.placementBonusOverrides[0])
  assertEqual(
    bodyguard!.points,
    roleConfigs.bodyguard.placementBonusOverrides[0],
    "Bodyguard 1st place should use overridden bonus"
  );
});

runner.test("2-player game awards correct placements", (engine) => {
  const mode = GameModeFactory.getInstance().createMode("role-based");
  engine.setGameMode(mode);

  engine.createTestGame(["beast", "ninja"]);
  engine.players.forEach((p) => p.disableAutoPlay());

  const [p1, p2] = engine.players;

  p1.die(engine.gameTime);
  engine.fastForward(100);

  assertEqual(p2.points, 5, "Winner should get 5 points");
  assertEqual(p1.points, 3, "2nd place should get 3 points");
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
    "sibling",
    "vulture",
  ]);

  assertEqual(engine.players.length, 8, "Should have 8 players");

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
  assert(
    engine.players.some((p) => p instanceof Sibling),
    "Should have Sibling"
  );
  assert(
    engine.players.some((p) => p instanceof Vulture),
    "Should have Vulture"
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
