export type TransportType = 'wifi' | 'usb' | 'bluetooth' | 'hotspot';

export type ConnectionMode = 'wifi' | 'hotspot' | 'usb' | 'bluetooth';

export type DaniModelType = 'stealth_black' | 'cyber_neon';

export type ConnectionStatus = 'disconnected' | 'searching' | 'pairing' | 'connected';

export type ControllerLayoutFamily =
  | 'dani.x240_pro'
  | 'dani.x240_classic'
  | 'dani.x240_fps'
  | 'dani.x240_racing'
  | 'dani.x240_compact'
  | 'dani.x240_custom';

export type InputMode = 'gamepad' | 'keyboard_mapper' | 'mouse_mapper' | 'hybrid';

export interface StickCoordinate {
  x: number; // -1.0 to 1.0
  y: number; // -1.0 to 1.0
  active: boolean;
}

export interface ControllerState {
  controllerId: number; // 1 to 4
  timestamp: number;
  sequence: number;
  
  // Analog sticks (normalized -1.0 to 1.0)
  leftStick: StickCoordinate;
  rightStick: StickCoordinate;
  
  // Triggers (normalized 0.0 to 1.0)
  leftTrigger: number; // L2
  rightTrigger: number; // R2
  
  // Bumpers
  l1: boolean;
  r1: boolean;
  
  // D-Pad
  dpadUp: boolean;
  dpadDown: boolean;
  dpadLeft: boolean;
  dpadRight: boolean;
  
  // Action buttons
  a: boolean; // Cross / A
  b: boolean; // Circle / B
  x: boolean; // Square / X
  y: boolean; // Triangle / Y
  
  // Special buttons
  select: boolean; // View / Share
  start: boolean; // Menu / Options
  home: boolean; // VCRLT guide button
  l3: boolean; // Left stick click
  r3: boolean; // Right stick click
  
  // Touchpad
  touchpad: {
    x: number; // 0.0 to 1.0
    y: number; // 0.0 to 1.0
    active: boolean;
    clicked: boolean;
  };
}

export interface ControllerSettings {
  deadZone: number; // 0.05 to 0.30 (5% to 30%)
  stickSensitivity: number; // 0.5 to 2.0
  vibrationStrength: number; // 0.0 to 1.0
  vibrationEnabled: boolean;
  audioFeedback: boolean;
  buttonOpacity: number; // 0.4 to 1.0
  buttonScale: number; // 0.8 to 1.3
  theme: 'dark_console' | 'midnight_stealth' | 'cyber_indigo' | 'dual_tone';
  buttonStyle: 'abxy' | 'playstation_symbols';
  showDebugCoordinates: boolean;
}

export interface GameProfile {
  id: string;
  name: string;
  genre: string;
  coverUrl: string;
  description: string;
  mode: InputMode;
  mapping: Record<string, string>;
  recommendedLayout: ControllerLayoutFamily;
}

export interface VibrationPacket {
  duration: number; // ms
  intensity: 'light' | 'medium' | 'heavy';
  source: string;
  timestamp: number;
}
