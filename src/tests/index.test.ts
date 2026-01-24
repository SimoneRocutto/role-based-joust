import { runCoreTests } from "./scenarios/core.test";
import { runRoleTests } from "./scenarios/roles.test";
import { runStatusEffectTests } from "./scenarios/statusEffects.test";

/**
 * Run all test suites
 */
async function runAllTests() {
  console.log("\n");
  console.log("╔═══════════════════════════════════════════════════════════════╗");
  console.log("║                                                               ║");
  console.log("║          Johann Sebastian Joust - Test Suite                 ║");
  console.log("║                                                               ║");
  console.log("╚═══════════════════════════════════════════════════════════════╝");
  console.log("\n");

  const results = {
    core: { passed: 0, failed: 0, total: 0 },
    roles: { passed: 0, failed: 0, total: 0 },
    statusEffects: { passed: 0, failed: 0, total: 0 },
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

  // Print overall summary
  console.log("\n");
  console.log("╔═══════════════════════════════════════════════════════════════╗");
  console.log("║                      OVERALL SUMMARY                          ║");
  console.log("╚═══════════════════════════════════════════════════════════════╝");
  console.log("\n");

  const totalPassed =
    results.core.passed + results.roles.passed + results.statusEffects.passed;
  const totalFailed =
    results.core.failed + results.roles.failed + results.statusEffects.failed;
  const totalTests =
    results.core.total + results.roles.total + results.statusEffects.total;

  console.log(`Core Tests:          ${results.core.passed}/${results.core.total} passed`);
  console.log(`Role Tests:          ${results.roles.passed}/${results.roles.total} passed`);
  console.log(
    `Status Effect Tests: ${results.statusEffects.passed}/${results.statusEffects.total} passed`
  );
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