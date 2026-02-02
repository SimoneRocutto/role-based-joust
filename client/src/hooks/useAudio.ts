import { useEffect, useState } from "react";
import { audioManager } from "@/services/audio";
import { SOUND_FILES } from "@/utils/constants";

export function useAudio() {
  const [isPreloaded, setIsPreloaded] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPlayingMusic, setIsPlayingMusic] = useState(false);
  const [isAudioUnlocked, setIsAudioUnlocked] = useState(
    audioManager.isUnlocked
  );

  useEffect(() => {
    // Preload all sounds
    const soundFiles = Object.values(SOUND_FILES);
    audioManager.preload(soundFiles).then(() => {
      setIsPreloaded(true);
      console.log("All sounds preloaded");
    });

    // Listen for audio unlock
    audioManager.onUnlock(() => {
      setIsAudioUnlocked(true);
    });

    // Update status periodically
    const interval = setInterval(() => {
      const status = audioManager.getStatus();
      setIsMuted(status.isMuted);
      setIsSpeaking(status.isSpeaking);
      setIsPlayingMusic(status.isPlayingMusic);
    }, 500);

    return () => {
      clearInterval(interval);
    };
  }, []);

  const play = (
    soundName: string,
    options?: { volume?: number; noRepeatFor?: number }
  ) => {
    audioManager.play(soundName, options);
  };

  const loop = (soundName: string, options?: { volume?: number }) => {
    audioManager.loop(soundName, options);
  };

  const stop = (soundName: string) => {
    audioManager.stop(soundName);
  };

  const playMusic = (
    track: string,
    options?: { loop?: boolean; volume?: number }
  ) => {
    audioManager.playMusic(track, options);
  };

  const stopMusic = () => {
    audioManager.stopMusic();
  };

  const setMusicRate = (rate: number) => {
    audioManager.setMusicRate(rate);
  };

  const speak = (text: string) => {
    audioManager.speak(text);
  };

  const stopSpeaking = () => {
    audioManager.stopSpeaking();
  };

  const mute = () => {
    audioManager.mute();
    setIsMuted(true);
  };

  const unmute = () => {
    audioManager.unmute();
    setIsMuted(false);
  };

  const toggleMute = () => {
    if (isMuted) {
      unmute();
    } else {
      mute();
    }
  };

  return {
    isPreloaded,
    isMuted,
    isSpeaking,
    isPlayingMusic,
    isAudioUnlocked,
    play,
    loop,
    stop,
    playMusic,
    stopMusic,
    setMusicRate,
    speak,
    stopSpeaking,
    mute,
    unmute,
    toggleMute,
  };
}
