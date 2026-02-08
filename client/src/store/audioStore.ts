import { create } from "zustand";

interface AudioState {
  isPreloaded: boolean;
  isMuted: boolean;
  isSpeaking: boolean;
  isPlayingMusic: boolean;
  isAudioUnlocked: boolean;

  setPreloaded: (value: boolean) => void;
  setMuted: (value: boolean) => void;
  setSpeaking: (value: boolean) => void;
  setPlayingMusic: (value: boolean) => void;
  setAudioUnlocked: (value: boolean) => void;
}

export const useAudioStore = create<AudioState>((set) => ({
  isPreloaded: false,
  isMuted: false,
  isSpeaking: false,
  isPlayingMusic: false,
  isAudioUnlocked: false,

  setPreloaded: (value) => set({ isPreloaded: value }),
  setMuted: (value) => set({ isMuted: value }),
  setSpeaking: (value) => set({ isSpeaking: value }),
  setPlayingMusic: (value) => set({ isPlayingMusic: value }),
  setAudioUnlocked: (value) => set({ isAudioUnlocked: value }),
}));
