import { ControllerState, VibrationPacket, TransportType, ConnectionStatus } from '../types';

export const INITIAL_CONTROLLER_STATE: ControllerState = {
  controllerId: 1,
  timestamp: 0,
  sequence: 0,
  leftStick: { x: 0, y: 0, active: false },
  rightStick: { x: 0, y: 0, active: false },
  leftTrigger: 0,
  rightTrigger: 0,
  l1: false,
  r1: false,
  dpadUp: false,
  dpadDown: false,
  dpadLeft: false,
  dpadRight: false,
  a: false,
  b: false,
  x: false,
  y: false,
  select: false,
  start: false,
  home: false,
  l3: false,
  r3: false,
  touchpad: {
    x: 0.5,
    y: 0.5,
    active: false,
    clicked: false,
  },
};

type PacketListener = (state: ControllerState) => void;
type VibrationListener = (packet: VibrationPacket) => void;
type ConnectionListener = (status: ConnectionStatus) => void;

class VcrltTransportService {
  private channel: BroadcastChannel | null = null;
  private packetListeners: Set<PacketListener> = new Set();
  private vibrationListeners: Set<VibrationListener> = new Set();
  private connectionListeners: Set<ConnectionListener> = new Set();

  private status: ConnectionStatus = 'connected';
  private transportType: TransportType = 'wifi';
  private pairCode: string = '482731';
  private pcName: string = 'DANIEL-PC';

  private sequenceCounter: number = 0;
  private lastReceivedTimestamp: number = Date.now();
  private disconnectWatchdogTimer: ReturnType<typeof setInterval> | null = null;
  private packetCountInSecond: number = 0;
  private currentPps: number = 120;
  private estimatedLatencyMs: number = 2.4;

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.channel = new BroadcastChannel('vcrlt_gamepad_channel');
      this.channel.onmessage = (event) => {
        this.handleIncomingMessage(event.data);
      };
    }

    // Start disconnect protection watchdog (checks every 300ms)
    this.startWatchdog();

    // Packet rate counter
    setInterval(() => {
      this.currentPps = this.packetCountInSecond;
      this.packetCountInSecond = 0;
    }, 1000);
  }

  private startWatchdog() {
    if (this.disconnectWatchdogTimer) clearInterval(this.disconnectWatchdogTimer);
    this.disconnectWatchdogTimer = setInterval(() => {
      if (this.status === 'connected') {
        const timeSinceLast = Date.now() - this.lastReceivedTimestamp;
        // If no packet received for more than 1500ms while supposed to be connected
        if (timeSinceLast > 2500) {
          // Trigger disconnect safety protection: zero out inputs to prevent stuck character movement
          this.notifyPacketListeners({
            ...INITIAL_CONTROLLER_STATE,
            timestamp: Date.now(),
            sequence: ++this.sequenceCounter,
          });
        }
      }
    }, 500);
  }

  private handleIncomingMessage(data: unknown) {
    if (!data || typeof data !== 'object') return;
    const msg = data as { type: string; payload: unknown };

    if (msg.type === 'CONTROLLER_PACKET') {
      const state = msg.payload as ControllerState;
      this.lastReceivedTimestamp = Date.now();
      this.packetCountInSecond++;
      
      // Calculate realistic dynamic latency jitter (1.5ms - 3.8ms on Wi-Fi, 0.8ms on USB)
      const baseLatency = this.transportType === 'usb' ? 0.9 : this.transportType === 'bluetooth' ? 4.2 : 2.1;
      this.estimatedLatencyMs = parseFloat((baseLatency + Math.random() * 0.8).toFixed(1));

      this.notifyPacketListeners(state);
    } else if (msg.type === 'VIBRATION_REQUEST') {
      const vib = msg.payload as VibrationPacket;
      this.notifyVibrationListeners(vib);
    } else if (msg.type === 'CONNECTION_STATUS') {
      const st = msg.payload as ConnectionStatus;
      this.status = st;
      this.notifyConnectionListeners(st);
    }
  }

  // Send packet from Phone to PC Receiver
  public sendControllerPacket(state: Omit<ControllerState, 'sequence' | 'timestamp'>) {
    this.sequenceCounter++;
    const fullPacket: ControllerState = {
      ...state,
      sequence: this.sequenceCounter,
      timestamp: Date.now(),
    };

    // Notify local listeners (for in-page dual view)
    this.notifyPacketListeners(fullPacket);
    this.lastReceivedTimestamp = Date.now();
    this.packetCountInSecond++;

    // Broadcast cross-tab or to receiver
    if (this.channel) {
      try {
        this.channel.postMessage({
          type: 'CONTROLLER_PACKET',
          payload: fullPacket,
        });
      } catch {
        // Ignored
      }
    }
  }

  // Send vibration rumble from PC Receiver to Phone
  public sendVibrationRequest(intensity: 'light' | 'medium' | 'heavy', duration: number = 120, source: string = 'Game Event') {
    const packet: VibrationPacket = {
      duration,
      intensity,
      source,
      timestamp: Date.now(),
    };

    this.notifyVibrationListeners(packet);

    if (this.channel) {
      try {
        this.channel.postMessage({
          type: 'VIBRATION_REQUEST',
          payload: packet,
        });
      } catch {
        // Ignored
      }
    }
  }

  public setConnectionStatus(status: ConnectionStatus) {
    this.status = status;
    this.notifyConnectionListeners(status);
    if (this.channel) {
      try {
        this.channel.postMessage({
          type: 'CONNECTION_STATUS',
          payload: status,
        });
      } catch {
        // Ignored
      }
    }
  }

  public setTransport(transport: TransportType) {
    this.transportType = transport;
  }

  public getTransport(): TransportType {
    return this.transportType;
  }

  public getPairCode(): string {
    return this.pairCode;
  }

  public getPcName(): string {
    return this.pcName;
  }

  public getTelemetry() {
    return {
      pps: this.currentPps,
      latency: this.estimatedLatencyMs,
      transport: this.transportType,
      status: this.status,
      sequence: this.sequenceCounter,
    };
  }

  // Listeners
  public onPacket(cb: PacketListener): () => void {
    this.packetListeners.add(cb);
    return () => this.packetListeners.delete(cb);
  }

  public onVibration(cb: VibrationListener): () => void {
    this.vibrationListeners.add(cb);
    return () => this.vibrationListeners.delete(cb);
  }

  public onConnection(cb: ConnectionListener): () => void {
    this.connectionListeners.add(cb);
    return () => this.connectionListeners.delete(cb);
  }

  private notifyPacketListeners(state: ControllerState) {
    if (typeof queueMicrotask === 'function') {
      queueMicrotask(() => {
        this.packetListeners.forEach((fn) => {
          try {
            fn(state);
          } catch (e) {
            console.error('Error in packet listener', e);
          }
        });
      });
    } else {
      setTimeout(() => {
        this.packetListeners.forEach((fn) => {
          try {
            fn(state);
          } catch (e) {
            console.error('Error in packet listener', e);
          }
        });
      }, 0);
    }
  }

  private notifyVibrationListeners(packet: VibrationPacket) {
    if (typeof queueMicrotask === 'function') {
      queueMicrotask(() => {
        this.vibrationListeners.forEach((fn) => {
          try {
            fn(packet);
          } catch (e) {
            console.error('Error in vibration listener', e);
          }
        });
      });
    } else {
      setTimeout(() => {
        this.vibrationListeners.forEach((fn) => {
          try {
            fn(packet);
          } catch (e) {
            console.error('Error in vibration listener', e);
          }
        });
      }, 0);
    }
  }

  private notifyConnectionListeners(status: ConnectionStatus) {
    if (typeof queueMicrotask === 'function') {
      queueMicrotask(() => {
        this.connectionListeners.forEach((fn) => {
          try {
            fn(status);
          } catch (e) {
            console.error('Error in connection listener', e);
          }
        });
      });
    } else {
      setTimeout(() => {
        this.connectionListeners.forEach((fn) => {
          try {
            fn(status);
          } catch (e) {
            console.error('Error in connection listener', e);
          }
        });
      }, 0);
    }
  }
}

export const vcrltTransport = new VcrltTransportService();
