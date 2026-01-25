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
