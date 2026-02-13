import type { MovementData } from "@/types/player.types";
import { ACCELEROMETER_CONFIG } from "@/utils/constants";

type AccelerometerCallback = (data: MovementData) => void;

class AccelerometerService {
  private isActive = false;
  private lastSendTime = 0;
  private callback: AccelerometerCallback | null = null;
  private subscribers: Set<AccelerometerCallback> = new Set();

  async requestPermission(): Promise<boolean> {
    // iOS 13+ requires explicit permission
    if (
      typeof DeviceMotionEvent !== "undefined" &&
      typeof (DeviceMotionEvent as any).requestPermission === "function"
    ) {
      try {
        const permission = await (DeviceMotionEvent as any).requestPermission();
        return permission === "granted";
      } catch (error) {
        console.error("Motion permission denied:", error);
        return false;
      }
    }

    // Android and older iOS: no permission needed
    return true;
  }

  start(callback: AccelerometerCallback) {
    if (this.isActive) {
      console.warn("Accelerometer already active");
      return;
    }

    this.callback = callback;
    this.isActive = true;
    this.lastSendTime = 0;

    window.addEventListener("devicemotion", this.handleMotion);
    console.log("Accelerometer started");
  }

  stop() {
    if (!this.isActive) return;

    window.removeEventListener("devicemotion", this.handleMotion);
    this.isActive = false;
    this.callback = null;
    console.log("Accelerometer stopped");
  }

  private handleMotion = (event: DeviceMotionEvent) => {
    // Skip if no listeners at all
    if (!this.callback && !this.isActive && this.subscribers.size === 0) return;

    // Throttle to 10Hz (100ms interval)
    const now = Date.now();
    if (now - this.lastSendTime < ACCELEROMETER_CONFIG.SEND_INTERVAL) {
      return;
    }
    this.lastSendTime = now;

    const acc = event.acceleration;
    if (!acc || acc.x === null || acc.y === null || acc.z === null) {
      return;
    }

    // Normalize to -10 to +10 range and clamp
    const x = this.clamp(
      acc.x,
      ACCELEROMETER_CONFIG.MIN_VALUE,
      ACCELEROMETER_CONFIG.MAX_VALUE
    );
    const y = this.clamp(
      acc.y,
      ACCELEROMETER_CONFIG.MIN_VALUE,
      ACCELEROMETER_CONFIG.MAX_VALUE
    );
    const z = this.clamp(
      acc.z,
      ACCELEROMETER_CONFIG.MIN_VALUE,
      ACCELEROMETER_CONFIG.MAX_VALUE
    );

    // Calculate intensity as normalized magnitude (0-1 range)
    const magnitude = Math.sqrt(x * x + y * y + z * z);
    const intensity = Math.min(1.0, Math.max(0, magnitude / ACCELEROMETER_CONFIG.MAX_MAGNITUDE));

    const data: MovementData = {
      x,
      y,
      z,
      intensity,
      timestamp: now,
    };

    // Call main callback if active
    if (this.callback && this.isActive) {
      this.callback(data);
    }

    // Notify all subscribers
    for (const subscriber of this.subscribers) {
      subscriber(data);
    }
  };

  private clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }

  isSupported(): boolean {
    return "DeviceMotionEvent" in window;
  }

  getStatus(): {
    isActive: boolean;
    isSupported: boolean;
  } {
    return {
      isActive: this.isActive,
      isSupported: this.isSupported(),
    };
  }

  /**
   * Subscribe to accelerometer data. Returns an unsubscribe function.
   * Subscribers receive data even when the main callback is not set.
   */
  subscribe(callback: AccelerometerCallback): () => void {
    this.subscribers.add(callback);

    // Auto-start listening if not already active and this is the first subscriber
    if (!this.isActive && this.subscribers.size === 1 && !this.callback) {
      window.addEventListener("devicemotion", this.handleMotion);
    }

    // Return unsubscribe function
    return () => {
      this.subscribers.delete(callback);

      // Auto-stop if no more subscribers and no main callback
      if (this.subscribers.size === 0 && !this.callback && !this.isActive) {
        window.removeEventListener("devicemotion", this.handleMotion);
      }
    };
  }
}

// Singleton instance
export const accelerometerService = new AccelerometerService();
