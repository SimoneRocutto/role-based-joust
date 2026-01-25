import type { MovementData } from "@/types/player.types";
import { ACCELEROMETER_CONFIG } from "@/utils/constants";

type AccelerometerCallback = (data: MovementData) => void;

class AccelerometerService {
  private isActive = false;
  private lastSendTime = 0;
  private callback: AccelerometerCallback | null = null;

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
    if (!this.callback || !this.isActive) return;

    // Throttle to 10Hz (100ms interval)
    const now = Date.now();
    if (now - this.lastSendTime < ACCELEROMETER_CONFIG.SEND_INTERVAL) {
      return;
    }
    this.lastSendTime = now;

    // Get acceleration data (including gravity)
    const acc = event.accelerationIncludingGravity;
    if (!acc || acc.x === null || acc.y === null || acc.z === null) {
      return;
    }

    // Normalize to -10 to +10 range and clamp
    const data: MovementData = {
      x: this.clamp(
        acc.x,
        ACCELEROMETER_CONFIG.MIN_VALUE,
        ACCELEROMETER_CONFIG.MAX_VALUE
      ),
      y: this.clamp(
        acc.y,
        ACCELEROMETER_CONFIG.MIN_VALUE,
        ACCELEROMETER_CONFIG.MAX_VALUE
      ),
      z: this.clamp(
        acc.z,
        ACCELEROMETER_CONFIG.MIN_VALUE,
        ACCELEROMETER_CONFIG.MAX_VALUE
      ),
      timestamp: now,
    };

    this.callback(data);
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
}

// Singleton instance
export const accelerometerService = new AccelerometerService();
