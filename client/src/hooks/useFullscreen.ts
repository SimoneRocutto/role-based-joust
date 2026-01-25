import { useEffect, useState } from "react";
import {
  requestFullscreen,
  exitFullscreen,
  isFullscreen,
} from "@/utils/permissions";

export function useFullscreen(elementId?: string) {
  const [isFullscreenActive, setIsFullscreenActive] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    setIsSupported("requestFullscreen" in document.documentElement);
    setIsFullscreenActive(isFullscreen());

    // Listen for fullscreen changes
    const handleFullscreenChange = () => {
      setIsFullscreenActive(isFullscreen());
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const enter = async () => {
    if (!isSupported) {
      console.warn("Fullscreen API not supported");
      return false;
    }

    const element = elementId
      ? document.getElementById(elementId)
      : document.documentElement;

    if (!element) {
      console.error("Element not found:", elementId);
      return false;
    }

    return await requestFullscreen(element);
  };

  const exit = async () => {
    if (!isSupported) {
      console.warn("Fullscreen API not supported");
      return false;
    }

    return await exitFullscreen();
  };

  const toggle = async () => {
    if (isFullscreenActive) {
      return await exit();
    } else {
      return await enter();
    }
  };

  return {
    isFullscreenActive,
    isSupported,
    enter,
    exit,
    toggle,
  };
}
