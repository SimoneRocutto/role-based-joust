import { runCoreTests } from "./scenarios/core.test";
import { runRoleTests } from "./scenarios/roles.test";
import { runStatusEffectTests } from "./scenarios/statusEffects.test";
import { runReadyStateTests } from "./scenarios/readyState.test";
import { runSettingsTests } from "./scenarios/settings.test";
import { runClassicModeTests } from "./scenarios/classicMode.test";
import { runGameEventTests } from "./scenarios/gameEvents.test";
import { runPersistenceTests } from "./scenarios/persistence.test";
import { runAbilityTests } from "./scenarios/ability.test";
import { runDeathCountModeTests } from "./scenarios/deathCountMode.test";
import { runTeamManagerTests } from "./scenarios/teamManager.test";
import { runRoundSetupTests } from "./scenarios/roundSetup.test";
import { runReadyStateManagerTests } from "./scenarios/readyStateManager.test";
import { runPreGameTests } from "./scenarios/preGame.test";
import { runRespawnManagerTests } from "./scenarios/respawnManager.test";
import { runDominationModeTests } from "./scenarios/dominationMode.test";
import { runTargetScoreTests } from "./scenarios/targetScore.test";

/**
 * Run all test suites
 */
async function runAllTests() {
  console.log("\n");
  console.log("╔═══════════════════════════════════════════════════════════════╗");
  console.log("║                                                               ║");
  console.log("║                EXTENDED JOUST - Test Suite                    ║");
  console.log("║                                                               ║");
  console.log("╚═══════════════════════════════════════════════════════════════╝");
  console.log("\n");

  const results = {
    core: { passed: 0, failed: 0, total: 0 },
    roles: { passed: 0, failed: 0, total: 0 },
    statusEffects: { passed: 0, failed: 0, total: 0 },
    readyState: { passed: 0, failed: 0, total: 0 },
    settings: { passed: 0, failed: 0, total: 0 },
    classicMode: { passed: 0, failed: 0, total: 0 },
    deathCountMode: { passed: 0, failed: 0, total: 0 },
    gameEvents: { passed: 0, failed: 0, total: 0 },
    persistence: { passed: 0, failed: 0, total: 0 },
    ability: { passed: 0, failed: 0, total: 0 },
    teamManager: { passed: 0, failed: 0, total: 0 },
    roundSetup: { passed: 0, failed: 0, total: 0 },
    readyStateManager: { passed: 0, failed: 0, total: 0 },
    preGame: { passed: 0, failed: 0, total: 0 },
    respawnManager: { passed: 0, failed: 0, total: 0 },
    dominationMode: { passed: 0, failed: 0, total: 0 },
    targetScore: { passed: 0, failed: 0, total: 0 },
  };

  // Run core tests
  console.log("📦 Running Core Tests...\n");
  results.core = await runCoreTests();

  // Run role tests
  console.log("\n🎭 Running Role Tests...\n");
  results.roles = await runRoleTests();

  // Run status effect tests
  console.log("\n✨ Running Status Effect Tests...\n");
  results.statusEffects = await runStatusEffectTests();

  // Run ready state tests
  console.log("\n🤝 Running Ready State Tests...\n");
  results.readyState = await runReadyStateTests();

  // Run settings tests
  console.log("\n⚙️ Running Settings Tests...\n");
  results.settings = await runSettingsTests();

  // Run classic mode tests
  console.log("\n🎮 Running Classic Mode Tests...\n");
  results.classicMode = await runClassicModeTests();

  // Run death count mode tests
  console.log("\n💀 Running Death Count Mode Tests...\n");
  results.deathCountMode = await runDeathCountModeTests();

  // Run game event tests
  console.log("\n🎲 Running Game Event Tests...\n");
  results.gameEvents = await runGameEventTests();

  // Run persistence tests
  console.log("\n💾 Running Persistence Tests...\n");
  results.persistence = await runPersistenceTests();

  // Run ability tests
  console.log("\n⚡ Running Ability Tests...\n");
  results.ability = await runAbilityTests();

  // Run team manager tests
  console.log("\n👥 Running Team Manager Tests...\n");
  results.teamManager = await runTeamManagerTests();

  // Run round setup manager tests
  console.log("\n🔄 Running Round Setup Manager Tests...\n");
  results.roundSetup = await runRoundSetupTests();

  // Run ready state manager tests
  console.log("\n✋ Running Ready State Manager Tests...\n");
  results.readyStateManager = await runReadyStateManagerTests();

  // Run pre-game tests
  console.log("\n🎬 Running Pre-Game Tests...\n");
  results.preGame = await runPreGameTests();

  // Run respawn manager tests
  console.log("\n🔄 Running Respawn Manager Tests...\n");
  results.respawnManager = await runRespawnManagerTests();

  // Run domination mode tests
  console.log("\n🏰 Running Domination Mode Tests...\n");
  results.dominationMode = await runDominationModeTests();

  // Run target score tests
  console.log("\n🎯 Running Target Score Tests...\n");
  results.targetScore = await runTargetScoreTests();

  // Print overall summary
  console.log("\n");
  console.log("╔═══════════════════════════════════════════════════════════════╗");
  console.log("║                      OVERALL SUMMARY                          ║");
  console.log("╚═══════════════════════════════════════════════════════════════╝");
  console.log("\n");

  const allResults = Object.values(results);
  const totalPassed = allResults.reduce((sum, r) => sum + r.passed, 0);
  const totalFailed = allResults.reduce((sum, r) => sum + r.failed, 0);
  const totalTests = allResults.reduce((sum, r) => sum + r.total, 0);

  console.log(`Core Tests:          ${results.core.passed}/${results.core.total} passed`);
  console.log(`Role Tests:          ${results.roles.passed}/${results.roles.total} passed`);
  console.log(
    `Status Effect Tests: ${results.statusEffects.passed}/${results.statusEffects.total} passed`
  );
  console.log(`Ready State Tests:   ${results.readyState.passed}/${results.readyState.total} passed`);
  console.log(`Settings Tests:      ${results.settings.passed}/${results.settings.total} passed`);
  console.log(`Classic Mode Tests:  ${results.classicMode.passed}/${results.classicMode.total} passed`);
  console.log(`Death Count Tests:   ${results.deathCountMode.passed}/${results.deathCountMode.total} passed`);
  console.log(`Game Event Tests:    ${results.gameEvents.passed}/${results.gameEvents.total} passed`);
  console.log(`Persistence Tests:   ${results.persistence.passed}/${results.persistence.total} passed`);
  console.log(`Ability Tests:       ${results.ability.passed}/${results.ability.total} passed`);
  console.log(`Team Manager Tests:  ${results.teamManager.passed}/${results.teamManager.total} passed`);
  console.log(`Round Setup Tests:   ${results.roundSetup.passed}/${results.roundSetup.total} passed`);
  console.log(`Ready State Mgr:     ${results.readyStateManager.passed}/${results.readyStateManager.total} passed`);
  console.log(`Pre-Game Tests:      ${results.preGame.passed}/${results.preGame.total} passed`);
  console.log(`Respawn Manager:     ${results.respawnManager.passed}/${results.respawnManager.total} passed`);
  console.log(`Domination Mode:     ${results.dominationMode.passed}/${results.dominationMode.total} passed`);
  console.log(`Target Score Tests:  ${results.targetScore.passed}/${results.targetScore.total} passed`);
  console.log("\n" + "─".repeat(65) + "\n");
  console.log(`TOTAL:               ${totalPassed}/${totalTests} passed`);

  if (totalFailed === 0) {
    console.log("\n🎉 ALL TESTS PASSED! 🎉\n");
  } else {
    console.log(`\n⚠️  ${totalFailed} TEST(S) FAILED ⚠️\n`);
  }

  console.log("═".repeat(65) + "\n");

  // Exit with appropriate code
  process.exit(totalFailed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch((error) => {
  console.error("❌ Test runner crashed:", error);
  process.exit(1);
});