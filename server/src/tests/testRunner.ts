import { GameEngine } from "@/managers/GameEngine";
import { Logger } from "@/utils/Logger";
import type { TestCase, TestResult } from "@/types/test.types";

const logger = Logger.getInstance();

/**
 * TestRunner - Simple test harness for game logic
 *
 * Usage:
 *   const runner = new TestRunner();
 *   runner.test("My test", (engine, log) => {
 *     // test code
 *   });
 *   runner.run();
 */
export class TestRunner {
  private tests: TestCase[] = [];
  private results: TestResult = {
    passed: 0,
    failed: 0,
    total: 0,
  };

  /**
   * Register a test
   */
  test(name: string, fn: TestCase["fn"]): void {
    this.tests.push({ name, fn });
  }

  /**
   * Run all registered tests
   */
  async run(): Promise<TestResult> {
    console.log("\n========================================");
    console.log("🧪 Running Tests");
    console.log("========================================\n");

    this.results = { passed: 0, failed: 0, total: this.tests.length };

    for (const test of this.tests) {
      await this.runTest(test);
    }

    this.printSummary();
    return this.results;
  }

  /**
   * Run a single test
   */
  private async runTest(test: TestCase): Promise<void> {
    const engine = new GameEngine();
    engine.testMode = true; // Enable test mode to bypass validations
    const testLogger = Logger.getInstance();

    try {
      console.log(`▶️  ${test.name}`);

      // Clear logs before test
      testLogger.clear();

      // Run test
      await test.fn(engine, testLogger);

      // Test passed
      console.log(`✅ PASS: ${test.name}\n`);
      this.results.passed++;
    } catch (error) {
      // Test failed
      console.log(`❌ FAIL: ${test.name}`);
      console.log(`   Error: ${(error as Error).message}`);
      if ((error as Error).stack) {
        console.log(`   Stack: ${(error as Error).stack}\n`);
      }
      this.results.failed++;
    } finally {
      // Stop engine if running
      engine.stopGame();
    }
  }

  /**
   * Print test summary
   */
  private printSummary(): void {
    console.log("========================================");
    console.log("📊 Test Results");
    console.log("========================================");
    console.log(`Total:  ${this.results.total}`);
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log("========================================\n");

    if (this.results.failed === 0) {
      console.log("🎉 All tests passed!\n");
    } else {
      console.log("⚠️  Some tests failed.\n");
    }
  }

  /**
   * Assert helper - throw if condition is false
   */
  static assert(condition: boolean, message: string): void {
    if (!condition) {
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  /**
   * Assert equal helper
   */
  static assertEqual<T>(actual: T, expected: T, message?: string): void {
    if (actual !== expected) {
      throw new Error(
        `Assertion failed: ${message || "Values not equal"}\n` +
          `  Expected: ${expected}\n` +
          `  Actual:   ${actual}`
      );
    }
  }

  /**
   * Assert array contains
   */
  static assertContains<T>(array: T[], value: T, message?: string): void {
    if (!array.includes(value)) {
      throw new Error(
        `Assertion failed: ${message || "Array does not contain value"}\n` +
          `  Array: ${JSON.stringify(array)}\n` +
          `  Value: ${value}`
      );
    }
  }
}

// Helper function to create test runner
export function createTestRunner(): TestRunner {
  return new TestRunner();
}

// Export assert helpers as standalone functions
export const assert = TestRunner.assert;
export const assertEqual = TestRunner.assertEqual;
export const assertContains = TestRunner.assertContains;
