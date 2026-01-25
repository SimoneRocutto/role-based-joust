export type TestFunction = (
  engine: import("../managers/GameEngine").GameEngine,
  logger: import("../utils/Logger").Logger
) => void | Promise<void>;

export interface TestCase {
  name: string;
  fn: TestFunction;
}

export interface TestResult {
  passed: number;
  failed: number;
  total: number;
}
