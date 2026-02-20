import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useGameStore } from "@/store/gameStore";

// Track registered event handlers - must be at module level for hoisting
const socketEventHandlers: Map<string, Function> = new Map();

// Mock socketService - factory must not reference variables defined after vi.mock
vi.mock("@/services/socket", () => ({
  socketService: {
    on: (event: string, callback: Function) => {
      socketEventHandlers.set(event, callback);
    },
    off: (event: string) => {
      socketEventHandlers.delete(event);
    },
    onPlayerJoined: (cb: Function) =>
      socketEventHandlers.set("player:joined", cb),
    onPlayerReconnected: (cb: Function) =>
      socketEventHandlers.set("player:reconnected", cb),
    onGameTick: (cb: Function) => socketEventHandlers.set("game:tick", cb),
    onPlayerDeath: (cb: Function) =>
      socketEventHandlers.set("player:death", cb),
    onRoundStart: (cb: Function) => socketEventHandlers.set("round:start", cb),
    onRoundEnd: (cb: Function) => socketEventHandlers.set("round:end", cb),
    onGameEnd: (cb: Function) => socketEventHandlers.set("game:end", cb),
    onGameStopped: (cb: Function) =>
      socketEventHandlers.set("game:stopped", cb),
    onVampireBloodlust: (cb: Function) =>
      socketEventHandlers.set("vampire:bloodlust", cb),
    onRoleAssigned: (cb: Function) =>
      socketEventHandlers.set("role:assigned", cb),
    onRoleUpdated: (cb: Function) =>
      socketEventHandlers.set("role:updated", cb),
    onLobbyUpdate: (cb: Function) =>
      socketEventHandlers.set("lobby:update", cb),
    onCountdown: (cb: Function) =>
      socketEventHandlers.set("game:countdown", cb),
    onGameStart: (cb: Function) =>
      socketEventHandlers.set("game:start", cb),
    onReadyEnabled: (cb: Function) =>
      socketEventHandlers.set("ready:enabled", cb),
    onPlayerRespawn: (cb: Function) =>
      socketEventHandlers.set("player:respawn", cb),
    onPlayerRespawnPending: (cb: Function) =>
      socketEventHandlers.set("player:respawn-pending", cb),
    onTeamUpdate: (cb: Function) =>
      socketEventHandlers.set("team:update", cb),
    onTeamSelection: (cb: Function) =>
      socketEventHandlers.set("team:selection", cb),
    onPlayerKicked: (cb: Function) =>
      socketEventHandlers.set("player:kicked", cb),
    onBaseRegistered: (cb: Function) =>
      socketEventHandlers.set("base:registered", cb),
    onBaseCaptured: (cb: Function) =>
      socketEventHandlers.set("base:captured", cb),
    onBasePoint: (cb: Function) =>
      socketEventHandlers.set("base:point", cb),
    onBaseStatus: (cb: Function) =>
      socketEventHandlers.set("base:status", cb),
    onDominationWin: (cb: Function) =>
      socketEventHandlers.set("domination:win", cb),
    onError: (cb: Function) => socketEventHandlers.set("error", cb),
    sendMovement: vi.fn(),
    joinGame: vi.fn(),
    reconnect: vi.fn(),
  },
}));

// Track audio calls
const audioPlayCalls: Array<{ sound: string; options?: any }> = [];
const audioPlaySfxCalls: Array<{ sound: string; options?: any }> = [];
const audioLoopCalls: Array<{ sound: string; options?: any }> = [];
const audioStopCalls: string[] = [];
const audioSpeakCalls: string[] = [];
const audioPlayMusicCalls: Array<{ track: string; options?: any }> = [];

// Mock audioManager
vi.mock("@/services/audio", () => ({
  audioManager: {
    play: (sound: string, options?: any) => {
      audioPlayCalls.push({ sound, options });
    },
    playSfx: (sound: string, options?: any) => {
      audioPlaySfxCalls.push({ sound, options });
    },
    playMusic: (track: string, options?: any) => {
      audioPlayMusicCalls.push({ track, options });
    },
    loop: (sound: string, options?: any) => {
      audioLoopCalls.push({ sound, options });
    },
    stop: (sound: string) => {
      audioStopCalls.push(sound);
    },
    speak: (text: string) => {
      audioSpeakCalls.push(text);
    },
  },
}));

// Import after mocks
import { useSocket } from "@/hooks/useSocket";

// Helper to trigger socket events
function triggerSocketEvent(event: string, data?: any) {
  const handler = socketEventHandlers.get(event);
  if (handler) {
    handler(data);
  }
}

describe("useSocket", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    socketEventHandlers.clear();
    useGameStore.getState().reset();
    vi.mocked(localStorage.setItem).mockClear();

    // Clear audio tracking arrays
    audioPlayCalls.length = 0;
    audioPlaySfxCalls.length = 0;
    audioLoopCalls.length = 0;
    audioStopCalls.length = 0;
    audioSpeakCalls.length = 0;
    audioPlayMusicCalls.length = 0;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("initialization", () => {
    it("registers all socket event listeners on mount", () => {
      renderHook(() => useSocket());

      expect(socketEventHandlers.has("connection:change")).toBe(true);
      expect(socketEventHandlers.has("player:joined")).toBe(true);
      expect(socketEventHandlers.has("player:reconnected")).toBe(true);
      expect(socketEventHandlers.has("game:tick")).toBe(true);
      expect(socketEventHandlers.has("player:death")).toBe(true);
      expect(socketEventHandlers.has("round:start")).toBe(true);
      expect(socketEventHandlers.has("round:end")).toBe(true);
      expect(socketEventHandlers.has("game:start")).toBe(true);
      expect(socketEventHandlers.has("game:end")).toBe(true);
      expect(socketEventHandlers.has("vampire:bloodlust")).toBe(true);
      expect(socketEventHandlers.has("role:assigned")).toBe(true);
      expect(socketEventHandlers.has("role:updated")).toBe(true);
      expect(socketEventHandlers.has("lobby:update")).toBe(true);
      expect(socketEventHandlers.has("game:countdown")).toBe(true);
      expect(socketEventHandlers.has("ready:enabled")).toBe(true);
      expect(socketEventHandlers.has("game:stopped")).toBe(true);
      expect(socketEventHandlers.has("error")).toBe(true);
    });

    it("cleans up all event listeners on unmount", () => {
      const { unmount } = renderHook(() => useSocket());

      unmount();

      expect(socketEventHandlers.has("connection:change")).toBe(false);
      expect(socketEventHandlers.has("player:joined")).toBe(false);
      expect(socketEventHandlers.has("game:tick")).toBe(false);
    });

    it("returns socket methods", () => {
      const { result } = renderHook(() => useSocket());

      expect(result.current.sendMovement).toBeDefined();
      expect(result.current.joinGame).toBeDefined();
      expect(result.current.reconnect).toBeDefined();
    });
  });

  describe("connection:change event", () => {
    it("updates store connected state", () => {
      renderHook(() => useSocket());

      act(() => {
        triggerSocketEvent("connection:change", true);
      });

      expect(useGameStore.getState().isConnected).toBe(true);

      act(() => {
        triggerSocketEvent("connection:change", false);
      });

      expect(useGameStore.getState().isConnected).toBe(false);
    });
  });

  describe("player:joined event", () => {
    it("stores session data in localStorage on success", () => {
      renderHook(() => useSocket());

      act(() => {
        triggerSocketEvent("player:joined", {
          success: true,
          sessionToken: "test-token",
          playerId: "player-123",
          playerNumber: 5,
        });
      });

      expect(localStorage.setItem).toHaveBeenCalledWith(
        "sessionToken",
        "test-token"
      );
      expect(localStorage.setItem).toHaveBeenCalledWith(
        "playerId",
        "player-123"
      );
      expect(localStorage.setItem).toHaveBeenCalledWith("playerNumber", "5");
    });

    it("does not store data on failure", () => {
      renderHook(() => useSocket());

      act(() => {
        triggerSocketEvent("player:joined", {
          success: false,
        });
      });

      expect(localStorage.setItem).not.toHaveBeenCalled();
    });
  });

  describe("player:reconnected event", () => {
    it("updates player state on success", () => {
      renderHook(() => useSocket());

      const player = {
        id: "player-1",
        name: "Test Player",
        number: 1,
        isAlive: true,
        accumulatedDamage: 25,
      };

      // First set up players in store
      act(() => {
        useGameStore.getState().updatePlayers([
          {
            id: "player-1",
            name: "Test Player",
            number: 1,
            role: "Civilian",
            isAlive: true,
            points: 0,
            totalPoints: 0,
            toughness: 100,
            accumulatedDamage: 0,
            statusEffects: [],
          },
        ]);
      });

      act(() => {
        triggerSocketEvent("player:reconnected", {
          success: true,
          player,
        });
      });

      // Player should be updated
      expect(useGameStore.getState().players[0].accumulatedDamage).toBe(25);
    });
  });

  describe("game:tick event", () => {
    it("updates game time", () => {
      renderHook(() => useSocket());

      act(() => {
        triggerSocketEvent("game:tick", {
          gameTime: 5000,
          players: [],
        });
      });

      expect(useGameStore.getState().gameTime).toBe(5000);
    });

    it("merges player data with existing state", () => {
      renderHook(() => useSocket());

      // Set up existing players with full data
      act(() => {
        useGameStore.getState().updatePlayers([
          {
            id: "p1",
            name: "Player 1",
            number: 1,
            role: "Vampire",
            isAlive: true,
            points: 10,
            totalPoints: 10,
            toughness: 100,
            accumulatedDamage: 0,
            statusEffects: [
              { type: "OldEffect", priority: 50, timeLeft: 5000 },
            ],
          },
        ]);
      });

      // Tick now provides authoritative status effects
      act(() => {
        triggerSocketEvent("game:tick", {
          gameTime: 1000,
          players: [
            {
              id: "p1",
              name: "Player 1",
              isAlive: true,
              accumulatedDamage: 15,
              points: 10,
              totalPoints: 10,
              toughness: 100,
              statusEffects: [{ type: "Toughened", priority: 30, timeLeft: 2000 }],
            },
          ],
        });
      });

      const player = useGameStore.getState().players[0];
      // Should have updated damage
      expect(player.accumulatedDamage).toBe(15);
      // Should preserve non-tick fields
      expect(player.number).toBe(1);
      expect(player.role).toBe("Vampire");
      // Status effects come from tick, not stale state
      expect(player.statusEffects).toHaveLength(1);
      expect(player.statusEffects[0].type).toBe("Toughened");
    });
  });

  describe("player:death event", () => {
    it("sets latest event with death message", () => {
      renderHook(() => useSocket());

      act(() => {
        triggerSocketEvent("player:death", {
          victimId: "p1",
          victimNumber: 3,
          victimName: "Alice",
        });
      });

      expect(useGameStore.getState().latestEvent).toBe(
        "Player #3 Alice eliminated!"
      );
    });

    it("plays death sound when victim is current player", () => {
      // Set up current player
      act(() => {
        useGameStore.getState().setMyPlayer("my-player", 1);
      });

      renderHook(() => useSocket());

      act(() => {
        triggerSocketEvent("player:death", {
          victimId: "my-player",
          victimNumber: 1,
          victimName: "Me",
        });
      });

      expect(audioPlaySfxCalls).toContainEqual({
        sound: "death",
        options: { volume: 0.5 },
      });
    });

    it("does not play death sound for other players", () => {
      act(() => {
        useGameStore.getState().setMyPlayer("my-player", 1);
      });

      renderHook(() => useSocket());

      act(() => {
        triggerSocketEvent("player:death", {
          victimId: "other-player",
          victimNumber: 2,
          victimName: "Other",
        });
      });

      expect(audioPlaySfxCalls.find((c) => c.sound === "death")).toBeUndefined();
    });
  });

  describe("round:start event", () => {
    it("updates round info and game state", () => {
      renderHook(() => useSocket());

      act(() => {
        triggerSocketEvent("round:start", {
          roundNumber: 2,
          totalRounds: 5,
        });
      });

      const state = useGameStore.getState();
      expect(state.currentRound).toBe(2);
      expect(state.totalRounds).toBe(5);
      expect(state.gameState).toBe("active");
    });
  });

  describe("round:end event", () => {
    it("sets scores and game state to round-ended", () => {
      renderHook(() => useSocket());

      const scores = [
        {
          playerId: "p1",
          playerName: "Player 1",
          playerNumber: 1,
          score: 100,
          rank: 1,
          status: "winner",
        },
      ];

      act(() => {
        triggerSocketEvent("round:end", { scores });
      });

      const state = useGameStore.getState();
      expect(state.scores).toEqual(scores);
      expect(state.gameState).toBe("round-ended");
    });

    it("updates player points from scores", () => {
      renderHook(() => useSocket());

      // Set up players
      act(() => {
        useGameStore.getState().updatePlayers([
          {
            id: "p1",
            name: "Player 1",
            number: 1,
            role: "",
            isAlive: true,
            points: 0,
            totalPoints: 0,
            toughness: 100,
            accumulatedDamage: 0,
            statusEffects: [],
          },
        ]);
      });

      act(() => {
        triggerSocketEvent("round:end", {
          scores: [
            {
              playerId: "p1",
              playerName: "Player 1",
              playerNumber: 1,
              score: 50,
              rank: 1,
              status: "winner",
            },
          ],
        });
      });

      const player = useGameStore.getState().players[0];
      expect(player.points).toBe(50);
      expect(player.totalPoints).toBe(50);
    });
  });

  describe("game:end event", () => {
    it("sets final scores and finished state", () => {
      renderHook(() => useSocket());

      const scores = [
        {
          playerId: "p1",
          playerName: "Winner",
          playerNumber: 1,
          score: 100,
          rank: 1,
          status: "champion",
        },
      ];

      act(() => {
        triggerSocketEvent("game:end", {
          scores,
          winner: { id: "p1", name: "Winner", number: 1 },
        });
      });

      const state = useGameStore.getState();
      expect(state.scores).toEqual(scores);
      expect(state.gameState).toBe("finished");
      expect(state.latestEvent).toBe("Winner is the champion!");
    });
  });

  describe("game:countdown event", () => {
    it("updates countdown state", () => {
      renderHook(() => useSocket());

      act(() => {
        triggerSocketEvent("game:countdown", {
          secondsRemaining: 5,
          totalSeconds: 10,
          phase: "countdown",
        });
      });

      const state = useGameStore.getState();
      expect(state.countdownSeconds).toBe(5);
      expect(state.countdownPhase).toBe("countdown");
      expect(state.gameState).toBe("countdown");
    });

    it("resets player ready state on countdown start", () => {
      renderHook(() => useSocket());

      // Set up players with ready state
      act(() => {
        useGameStore.getState().updatePlayers([
          {
            id: "p1",
            name: "Player 1",
            number: 1,
            role: "",
            isAlive: true,
            isReady: true,
            points: 0,
            totalPoints: 0,
            toughness: 100,
            accumulatedDamage: 0,
            statusEffects: [],
          },
        ]);
      });

      act(() => {
        triggerSocketEvent("game:countdown", {
          secondsRemaining: 5,
          phase: "countdown",
        });
      });

      expect(useGameStore.getState().players[0].isReady).toBe(false);
    });

  });

  describe("lobby:update event", () => {
    it("updates players in waiting state", () => {
      renderHook(() => useSocket());

      // Make sure we're in waiting state
      expect(useGameStore.getState().gameState).toBe("waiting");

      act(() => {
        triggerSocketEvent("lobby:update", {
          players: [
            {
              id: "p1",
              name: "Player 1",
              number: 1,
              isAlive: true,
              isReady: false,
            },
            {
              id: "p2",
              name: "Player 2",
              number: 2,
              isAlive: true,
              isReady: true,
            },
          ],
        });
      });

      const players = useGameStore.getState().players;
      expect(players).toHaveLength(2);
      expect(players[0].name).toBe("Player 1");
      expect(players[1].isReady).toBe(true);
    });

    it("ignores lobby updates during active gameplay", () => {
      renderHook(() => useSocket());

      // Set up initial players
      act(() => {
        useGameStore.getState().updatePlayers([
          {
            id: "p1",
            name: "Player 1",
            number: 1,
            role: "Vampire",
            isAlive: true,
            points: 50,
            totalPoints: 50,
            toughness: 100,
            accumulatedDamage: 0,
            statusEffects: [],
          },
        ]);
        useGameStore.getState().setGameState("active");
      });

      // Lobby update should be ignored
      act(() => {
        triggerSocketEvent("lobby:update", {
          players: [
            {
              id: "p1",
              name: "Player 1",
              number: 1,
              isAlive: true,
              isReady: false,
            },
          ],
        });
      });

      // Should still have original points
      expect(useGameStore.getState().players[0].points).toBe(50);
    });
  });

  describe("game:stopped event", () => {
    it("resets game state to waiting", () => {
      renderHook(() => useSocket());

      act(() => {
        useGameStore.getState().setGameState("active");
      });

      act(() => {
        triggerSocketEvent("game:stopped");
      });

      expect(useGameStore.getState().gameState).toBe("waiting");
      expect(useGameStore.getState().latestEvent).toBe("Game stopped");
    });

    it("resets ready state when game is stopped", () => {
      renderHook(() => useSocket());

      // Set player as ready (simulating being ready on winner screen)
      act(() => {
        useGameStore.getState().setGameState("finished");
        useGameStore.getState().setMyReady(true);
        useGameStore.getState().setReadyCount({ ready: 1, total: 2 });
      });

      expect(useGameStore.getState().myIsReady).toBe(true);

      // Admin stops game / returns to lobby
      act(() => {
        triggerSocketEvent("game:stopped");
      });

      // Ready state should be reset
      expect(useGameStore.getState().myIsReady).toBe(false);
      expect(useGameStore.getState().readyCount).toEqual({ ready: 0, total: 0 });
    });
  });

  describe("error event", () => {
    it("sets latest event with error message", () => {
      renderHook(() => useSocket());

      act(() => {
        triggerSocketEvent("error", {
          message: "Connection failed",
          code: "CONN_ERR",
        });
      });

      expect(useGameStore.getState().latestEvent).toBe(
        "Error: Connection failed"
      );
    });
  });

  describe("role:assigned event", () => {
    it("stores role in game store", () => {
      renderHook(() => useSocket());

      act(() => {
        triggerSocketEvent("role:assigned", {
          name: "Vampire",
          displayName: "Vampire",
          description: "Drain others to heal",
          difficulty: "Medium",
          targetNumber: 3,
          targetName: "Target Player",
        });
      });

      const role = useGameStore.getState().myRole;
      expect(role?.name).toBe("Vampire");
      expect(role?.displayName).toBe("Vampire");
      expect(role?.targetNumber).toBe(3);
    });

    it("populates myTarget when target info is present", () => {
      renderHook(() => useSocket());

      act(() => {
        triggerSocketEvent("role:assigned", {
          name: "Executioner",
          displayName: "Executioner",
          description: "Hunt your target",
          difficulty: "Medium",
          targetNumber: 5,
          targetName: "Prey",
        });
      });

      const target = useGameStore.getState().myTarget;
      expect(target).toEqual({ number: 5, name: "Prey" });
    });

    it("clears myTarget when no target info", () => {
      // Set an existing target first
      act(() => {
        useGameStore.getState().setMyTarget({ number: 3, name: "Old Target" });
      });

      renderHook(() => useSocket());

      act(() => {
        triggerSocketEvent("role:assigned", {
          name: "Vampire",
          displayName: "Vampire",
          description: "Drain others",
          difficulty: "Medium",
        });
      });

      expect(useGameStore.getState().myTarget).toBeNull();
    });

    it("speaks role description after delay", () => {
      renderHook(() => useSocket());

      act(() => {
        triggerSocketEvent("role:assigned", {
          name: "Civilian",
          displayName: "Civilian",
          description: "Survive to win",
          difficulty: "Easy",
        });
      });

      // Speech happens after 500ms delay
      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(
        audioSpeakCalls.some((s) => s.includes("You are the Civilian"))
      ).toBe(true);
    });

    it("includes target info in speech when available", () => {
      renderHook(() => useSocket());

      act(() => {
        triggerSocketEvent("role:assigned", {
          name: "Hunter",
          displayName: "Hunter",
          description: "Hunt your target",
          difficulty: "Medium",
          targetNumber: 5,
          targetName: "Prey",
        });
      });

      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(
        audioSpeakCalls.some((s) =>
          s.includes("Your target is Player number 5")
        )
      ).toBe(true);
    });
  });

  describe("role:updated event", () => {
    it("updates role in game store", () => {
      renderHook(() => useSocket());

      act(() => {
        triggerSocketEvent("role:updated", {
          name: "executioner",
          displayName: "Executioner",
          description: "Hunt your target",
          difficulty: "normal",
          targetNumber: 7,
          targetName: "New Target",
        });
      });

      const role = useGameStore.getState().myRole;
      expect(role?.name).toBe("executioner");
      expect(role?.targetNumber).toBe(7);
      expect(role?.targetName).toBe("New Target");
    });

    it("updates myTarget", () => {
      renderHook(() => useSocket());

      act(() => {
        triggerSocketEvent("role:updated", {
          name: "executioner",
          displayName: "Executioner",
          description: "Hunt your target",
          difficulty: "normal",
          targetNumber: 4,
          targetName: "Alice",
        });
      });

      const target = useGameStore.getState().myTarget;
      expect(target).toEqual({ number: 4, name: "Alice" });
    });

    it("speaks new target via TTS when target changes", () => {
      renderHook(() => useSocket());

      act(() => {
        triggerSocketEvent("role:updated", {
          name: "executioner",
          displayName: "Executioner",
          description: "Hunt your target",
          difficulty: "normal",
          targetNumber: 6,
          targetName: "Bob",
        });
      });

      expect(
        audioSpeakCalls.some((s) => s.includes("New target: number 6"))
      ).toBe(true);
    });

    it("does not speak when target is unchanged", () => {
      // Set initial target
      act(() => {
        useGameStore.getState().setMyTarget({ number: 4, name: "Alice" });
      });

      renderHook(() => useSocket());

      act(() => {
        triggerSocketEvent("role:updated", {
          name: "executioner",
          displayName: "Executioner",
          description: "Hunt your target",
          difficulty: "normal",
          targetNumber: 4,
          targetName: "Alice",
        });
      });

      expect(audioSpeakCalls).toHaveLength(0);
    });
  });
});
