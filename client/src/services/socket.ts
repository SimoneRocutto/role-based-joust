import { io, Socket } from "socket.io-client";
import type {
  PlayerJoinPayload,
  PlayerMovePayload,
  PlayerReconnectPayload,
  PlayerJoinedPayload,
  PlayerReconnectedPayload,
  GameTickPayload,
  PlayerDeathPayload,
  RoundStartPayload,
  RoundEndPayload,
  GameEndPayload,
  VampireBloodlustPayload,
  RoleAssignedPayload,
  SocketErrorPayload,
  PlayerReadyPayload,
  ReadyCountPayload,
  ModeEventPayload,
  ReadyEnabledPayload,
} from "@/types/socket.types";

// In development, use empty string to connect via Vite proxy (same origin)
// In production, use the API base URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

class SocketService {
  private socket: Socket | null = null;
  private isConnected = false;
  private listeners: Map<string, Set<Function>> = new Map();

  constructor() {
    this.connect();
  }

  connect() {
    if (this.socket?.connected) return;

    // When API_BASE_URL is empty, socket.io connects to same origin (works with Vite proxy)
    this.socket = io(API_BASE_URL || undefined, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    this.setupInternalListeners();
  }

  private setupInternalListeners() {
    if (!this.socket) return;

    this.socket.on("connect", () => {
      this.isConnected = true;
      console.log("Socket connected:", this.socket?.id);
      this.emit("connection:change", true);
    });

    this.socket.on("disconnect", (reason) => {
      this.isConnected = false;
      console.log("Socket disconnected:", reason);
      this.emit("connection:change", false);
    });

    this.socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
      this.emit("connection:error", error);
    });
  }

  // Connection status
  getConnectionStatus(): boolean {
    return (this.isConnected && this.socket?.connected) || false;
  }

  getSocketId(): string | undefined {
    return this.socket?.id;
  }

  // Client → Server events
  joinGame(payload: PlayerJoinPayload) {
    this.socket?.emit("player:join", payload);
  }

  sendMovement(payload: PlayerMovePayload) {
    this.socket?.emit("player:move", payload);
  }

  reconnect(payload: PlayerReconnectPayload) {
    this.socket?.emit("player:reconnect", payload);
  }

  sendPing() {
    this.socket?.emit("ping");
  }

  sendReady(playerId: string) {
    this.socket?.emit("player:ready", { playerId });
  }

  // Server → Client event listeners
  onPlayerJoined(callback: (data: PlayerJoinedPayload) => void) {
    this.on("player:joined", callback);
  }

  onPlayerReconnected(callback: (data: PlayerReconnectedPayload) => void) {
    this.on("player:reconnected", callback);
  }

  onGameTick(callback: (data: GameTickPayload) => void) {
    this.on("game:tick", callback);
  }

  onPlayerDeath(callback: (data: PlayerDeathPayload) => void) {
    this.on("player:death", callback);
  }

  onRoundStart(callback: (data: RoundStartPayload) => void) {
    this.on("round:start", callback);
  }

  onRoundEnd(callback: (data: RoundEndPayload) => void) {
    this.on("round:end", callback);
  }

  onGameEnd(callback: (data: GameEndPayload) => void) {
    this.on("game:end", callback);
  }

  onGameStopped(callback: () => void) {
    this.on("game:stopped", callback);
  }

  onVampireBloodlust(callback: (data: VampireBloodlustPayload) => void) {
    this.on("vampire:bloodlust", callback);
  }

  onRoleAssigned(callback: (data: RoleAssignedPayload) => void) {
    this.on("role:assigned", callback);
  }

  onPong(callback: () => void) {
    this.on("pong", callback);
  }

  onError(callback: (data: SocketErrorPayload) => void) {
    this.on("error", callback);
  }

  onLobbyUpdate(
    callback: (data: {
      players: Array<{ id: string; name: string; number: number; isAlive: boolean; isReady: boolean }>;
    }) => void
  ) {
    this.on("lobby:update", callback);
  }

  onCountdown(
    callback: (data: {
      secondsRemaining: number;
      totalSeconds: number;
      phase: "countdown" | "go";
      roundNumber: number;
      totalRounds: number;
    }) => void
  ) {
    this.on("game:countdown", callback);
  }

  onPlayerReady(callback: (data: PlayerReadyPayload) => void) {
    this.on("player:ready", callback);
  }

  onReadyCountUpdate(callback: (data: ReadyCountPayload) => void) {
    this.on("ready:update", callback);
  }

  onModeEvent(callback: (data: ModeEventPayload) => void) {
    this.on("mode:event", callback);
  }

  onReadyEnabled(callback: (data: ReadyEnabledPayload) => void) {
    this.on("ready:enabled", callback);
  }

  // Generic event listener management
  on(event: string, callback: Function) {
    if (!this.socket) return;

    this.socket.on(event, callback as any);

    // Track listeners for cleanup
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback?: Function) {
    if (!this.socket) return;

    if (callback) {
      this.socket.off(event, callback as any);
      this.listeners.get(event)?.delete(callback);
    } else {
      this.socket.off(event);
      this.listeners.delete(event);
    }
  }

  // Internal event emitter for connection status
  private emit(event: string, data: any) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((cb) => cb(data));
    }
  }

  // Cleanup
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.listeners.clear();
    }
  }
}

// Singleton instance
export const socketService = new SocketService();

// Expose for e2e test cleanup (graceful disconnect prevents Vite proxy EPIPE errors)
if (typeof window !== 'undefined') {
  (window as any).__socketService = socketService;
}
