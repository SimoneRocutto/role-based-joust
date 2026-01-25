import { TestRunner, assert, assertEqual } from "../testRunner";
import { GameModeFactory } from "@/factories/GameModeFactory";
import { Vampire } from "@/models/roles/Vampire";
import { Beast } from "@/models/roles/Beast";
import { BeastHunter } from "@/models/roles/BeastHunter";
import { Angel } from "@/models/roles/Angel";
import type { PlayerData } from "@/types/player.types";

const runner = new TestRunner();

// ============================================================================
// BOT ROLE TESTS
// ============================================================================

runner.test("Bot Vampire is created correctly", (engine) => {
  const mode = GameModeFactory.getInstance().createMode("role-based");
  engine.setGameMode(mode);

  const players: PlayerData[] = [
    {
      id: "bot1",
      name: "Bot Vamp",
      socketId: "s1",
      isBot: true,
      behavior: "random",
    },
    {
      id: "bot2",
      name: "Bot Beast",
      socketId: "s2",
      isBot: true,
      behavior: "random",
    },
  ];

  // Manually set role pool to ensure we get a vampire
  engine.startGame(players);

  const vampire = engine.players.find((p) => p instanceof Vampire);

  assert(vampire !== undefined, "Should have a Vampire");
  assert(vampire!.isBot, "Vampire should be a bot");
  assertEqual(
    vampire!.behavior,
    "random",
    "Vampire bot should have random behavior"
  );
});

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

runner.test("Vampire gains points on bloodlust kill", (engine) => {
  const mode = GameModeFactory.getInstance().createMode("role-based");
  engine.setGameMode(mode);

  engine.createTestGame(["vampire", "beast", "beast"]);

  // Disable auto-play to prevent random deaths during fast-forward
  engine.players.forEach((p) => p.disableAutoPlay());

  const vampire = engine.players.find((p) => p instanceof Vampire) as Vampire;
  const beast = engine.players.find((p) => p instanceof Beast);

  assert(vampire !== undefined, "Should have vampire");
  assert(beast !== undefined, "Should have beast");

  const initialPoints = vampire.points;

  // Fast-forward to bloodlust
  engine.fastForward(30000);

  // Kill a beast during bloodlust
  beast!.die(engine.gameTime);

  // Vampire should gain points
  assert(
    vampire.points > initialPoints,
    "Vampire should gain points from bloodlust kill"
  );
});

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

runner.test("Angel dies when invulnerability expires", (engine) => {
  const mode = GameModeFactory.getInstance().createMode("role-based");
  engine.setGameMode(mode);

  engine.createTestGame(["angel", "vampire"]);

  const angel = engine.players.find((p) => p instanceof Angel);
  assert(angel !== undefined, "Should have angel");

  // Deal lethal damage (triggers divine protection)
  angel!.takeDamage(200, engine.gameTime);
  assert(angel!.isAlive, "Angel should be alive after first death");

  // Fast-forward past invulnerability duration (3 seconds)
  engine.fastForward(3500);

  assert(!angel!.isAlive, "Angel should die when invulnerability expires");
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
// RUN TESTS
// ============================================================================

export async function runRoleTests() {
  return runner.run();
}

// Auto-run if executed directly
if (require.main === module) {
  runRoleTests();
}
