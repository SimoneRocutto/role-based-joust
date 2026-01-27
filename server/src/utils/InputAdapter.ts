// ============================================================================
// src/utils/InputAdapter.ts - Device Input Normalization
// ============================================================================

import type { MovementData } from "@/types/player.types";
import { Logger } from "@/utils/Logger";

const logger = Logger.getInstance();

/**
 * InputAdapter - Normalize input from different device types
 *
 * Purpose:
 * - Make system device-agnostic
 * - Convert various controller types to standard MovementData format
 * - Handle device-specific quirks (calibration, dead zones, etc.)
 *
 * Supported devices:
 * - Phone accelerometer (default)
 * - Joy-Con controllers (future)
 * - Other motion controllers (future)
 */
export class InputAdapter {
  private static instance: InputAdapter;

  private constructor() {
    logger.debug("INPUT", "Input adapter initialized");
  }

  static getInstance(): InputAdapter {
    if (!InputAdapter.instance) {
      InputAdapter.instance = new InputAdapter();
    }
    return InputAdapter.instance;
  }

  // ========================================================================
  // NORMALIZATION METHODS
  // ========================================================================

  /**
   * Normalize phone accelerometer data
   * Phones typically send acceleration in m/s² or g-forces
   */
  normalizePhoneInput(raw: {
    x: number;
    y: number;
    z: number;
    timestamp?: number;
  }): MovementData {
    const { x, y, z, timestamp } = raw;
    return {
      x,
      y,
      z,
      timestamp: timestamp || Date.now(),
    };
  }

  /**
   * Normalize Joy-Con input (future implementation)
   * Joy-Cons have different acceleration ranges
   */
  normalizeJoyConInput(raw: {
    x: number;
    y: number;
    z: number;
    timestamp?: number;
  }): MovementData {
    // Joy-Con accelerometer ranges might differ
    // This is a placeholder for future implementation
    logger.debug("INPUT", "Joy-Con input received (using phone normalization)");

    // For now, just use phone normalization
    // TODO: Implement Joy-Con specific normalization
    return this.normalizePhoneInput(raw);
  }

  /**
   * Auto-detect device type and normalize accordingly
   */
  normalizeInput(
    raw: {
      x: number;
      y: number;
      z: number;
      timestamp?: number;
      deviceType?: "phone" | "joycon" | "custom";
    },
    deviceType?: "phone" | "joycon" | "custom"
  ): MovementData {
    const type = deviceType || raw.deviceType || "phone";

    switch (type) {
      case "joycon":
        return this.normalizeJoyConInput(raw);

      case "custom":
        // For custom devices, assume data is already normalized
        logger.debug("INPUT", "Custom device input (no normalization)");
        return {
          x: raw.x,
          y: raw.y,
          z: raw.z,
          timestamp: raw.timestamp || Date.now(),
        };

      case "phone":
      default:
        return this.normalizePhoneInput(raw);
    }
  }

  // ========================================================================
  // CALIBRATION & FILTERING
  // ========================================================================

  /**
   * Apply dead zone to filter out tiny movements
   * Useful for noisy sensors
   */
  applyDeadZone(data: MovementData, deadZone: number = 0.1): MovementData {
    const magnitude = Math.sqrt(
      data.x * data.x + data.y * data.y + data.z * data.z
    );

    // If magnitude is below dead zone, return zero movement
    if (magnitude < deadZone) {
      return {
        ...data,
        x: 0,
        y: 0,
        z: 0,
      };
    }

    return data;
  }

  /**
   * Calibrate sensor (remove offset)
   * Useful if device has a constant bias
   */
  calibrate(
    data: MovementData,
    offset: { x: number; y: number; z: number }
  ): MovementData {
    return {
      ...data,
      x: data.x - offset.x,
      y: data.y - offset.y,
      z: data.z - offset.z,
    };
  }

  /**
   * Apply low-pass filter to smooth data
   * Reduces high-frequency noise
   */
  lowPassFilter(
    current: MovementData,
    previous: MovementData | null,
    alpha: number = 0.8
  ): MovementData {
    if (!previous) {
      return current;
    }

    return {
      ...current,
      x: alpha * current.x + (1 - alpha) * previous.x,
      y: alpha * current.y + (1 - alpha) * previous.y,
      z: alpha * current.z + (1 - alpha) * previous.z,
    };
  }

  // ========================================================================
  // UTILITY METHODS
  // ========================================================================

  /**
   * Clamp value between min and max
   */
  private clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }

  /**
   * Validate input data
   */
  validate(data: any): { valid: boolean; error?: string } {
    if (typeof data !== "object" || data === null) {
      return { valid: false, error: "Input must be an object" };
    }

    if (typeof data.x !== "number" || !isFinite(data.x)) {
      return { valid: false, error: "Invalid x coordinate" };
    }

    if (typeof data.y !== "number" || !isFinite(data.y)) {
      return { valid: false, error: "Invalid y coordinate" };
    }

    if (typeof data.z !== "number" || !isFinite(data.z)) {
      return { valid: false, error: "Invalid z coordinate" };
    }

    return { valid: true };
  }

  /**
   * Get recommended settings for device type
   */
  getRecommendedSettings(deviceType: "phone" | "joycon" | "custom"): {
    deadZone: number;
    smoothing: boolean;
    maxRange: number;
  } {
    switch (deviceType) {
      case "joycon":
        return {
          deadZone: 0.15,
          smoothing: true,
          maxRange: 10,
        };

      case "custom":
        return {
          deadZone: 0,
          smoothing: false,
          maxRange: 10,
        };

      case "phone":
      default:
        return {
          deadZone: 0.1,
          smoothing: true,
          maxRange: 10,
        };
    }
  }
}
