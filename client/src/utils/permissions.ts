export async function requestMotionPermission(): Promise<boolean> {
  // iOS 13+ requires user gesture + permission
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

export async function requestWakeLock(): Promise<WakeLockSentinel | null> {
  if (!("wakeLock" in navigator)) {
    console.warn("Wake Lock API not supported");
    return null;
  }

  try {
    const wakeLock = await (navigator as any).wakeLock.request("screen");
    console.log("Wake Lock acquired");
    return wakeLock;
  } catch (error) {
    console.error("Wake Lock failed:", error);
    return null;
  }
}

export async function requestFullscreen(
  element: HTMLElement
): Promise<boolean> {
  if (!element.requestFullscreen) {
    console.warn("Fullscreen API not supported");
    return false;
  }

  try {
    await element.requestFullscreen();
    return true;
  } catch (error) {
    console.error("Fullscreen failed:", error);
    return false;
  }
}

export async function exitFullscreen(): Promise<boolean> {
  if (!document.exitFullscreen) {
    console.warn("Fullscreen API not supported");
    return false;
  }

  try {
    await document.exitFullscreen();
    return true;
  } catch (error) {
    console.error("Exit fullscreen failed:", error);
    return false;
  }
}

export function isFullscreen(): boolean {
  return !!document.fullscreenElement;
}

export type MotionValidationResult = {
  success: boolean;
  error?: string;
};

/**
 * Validates that motion access is working.
 * Requests permission and tests that motion data flows for up to 2 seconds.
 */
export async function validateMotionAccess(): Promise<MotionValidationResult> {
  // First, check if DeviceMotionEvent is supported
  if (typeof DeviceMotionEvent === "undefined") {
    return {
      success: false,
      error: "Motion sensors not supported on this device",
    };
  }

  // Request permission (iOS 13+)
  const permissionGranted = await requestMotionPermission();
  if (!permissionGranted) {
    return {
      success: false,
      error: "Motion permission denied. Please allow motion access.",
    };
  }

  // Test that motion data actually flows (for 2 seconds max)
  return new Promise((resolve) => {
    let dataReceived = false;
    let timeoutId: ReturnType<typeof setTimeout>;

    const handleMotion = (event: DeviceMotionEvent) => {
      // Check if we got actual data
      const acc = event.accelerationIncludingGravity;
      if (acc && (acc.x !== null || acc.y !== null || acc.z !== null)) {
        dataReceived = true;
        cleanup();
        resolve({ success: true });
      }
    };

    const cleanup = () => {
      window.removeEventListener("devicemotion", handleMotion);
      if (timeoutId) clearTimeout(timeoutId);
    };

    window.addEventListener("devicemotion", handleMotion);

    // Timeout after 2 seconds
    timeoutId = setTimeout(() => {
      cleanup();
      if (!dataReceived) {
        resolve({
          success: false,
          error: "No motion data received. Try moving your device.",
        });
      }
    }, 2000);
  });
}
