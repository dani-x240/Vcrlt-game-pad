import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Share2,
  Menu,
  Mic,
  MicOff,
  Maximize2,
  Minimize2,
  Wifi,
  Radio,
  Cable,
  Bluetooth,
  Power,
  Settings,
  X,
  Volume2,
  VolumeX,
  Vibrate,
  Sliders,
  Sparkles,
  Download,
} from 'lucide-react';
import {
  ControllerState,
  VibrationPacket,
  ConnectionMode,
  DaniModelType,
} from '../types';
import { vcrltTransport, INITIAL_CONTROLLER_STATE } from '../services/transport';
import { audioHaptics } from '../services/audio';

interface PhoneControllerProps {
  compact?: boolean;
}

export const PhoneController: React.FC<PhoneControllerProps> = ({ compact = false }) => {
  const [isConnected, setIsConnected] = useState<boolean>(compact);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [connectionType, setConnectionType] = useState<ConnectionMode>('wifi');
  const [selectedModel, setSelectedModel] = useState<DaniModelType>('stealth_black');
  const [showSettings, setShowSettings] = useState<boolean>(false);

  // Customizer preferences
  const [vibrationEnabled, setVibrationEnabled] = useState<boolean>(true);
  const [vibrationStrength, setVibrationStrength] = useState<'light' | 'medium' | 'heavy'>('heavy');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [deadzone, setDeadzone] = useState<number>(0.08);

  const [micMuted, setMicMuted] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Controller state
  const [controllerState, setControllerState] = useState<ControllerState>({
    ...INITIAL_CONTROLLER_STATE,
    timestamp: Date.now(),
  });

  const leftStickRef = useRef<HTMLDivElement>(null);
  const rightStickRef = useRef<HTMLDivElement>(null);
  const touchpadRef = useRef<HTMLDivElement>(null);
  const phoneContainerRef = useRef<HTMLDivElement>(null);

  const stateRef = useRef<ControllerState>(controllerState);

  // Synchronize transport
  useEffect(() => {
    const unsubConn = vcrltTransport.onConnection((st) => {
      setIsConnected(st === 'connected');
    });

    const unsubVib = vcrltTransport.onVibration((packet: VibrationPacket) => {
      if (vibrationEnabled) {
        audioHaptics.playHapticRumble(packet.intensity, packet.duration);
        if ('vibrate' in navigator) {
          navigator.vibrate(packet.duration);
        }
      }
    });

    return () => {
      unsubConn();
      unsubVib();
    };
  }, [vibrationEnabled]);

  // Transmit inputs cleanly without calling external listeners inside React setState reducers
  const updateState = useCallback(
    (updater: (prev: ControllerState) => ControllerState) => {
      const next = updater(stateRef.current);
      stateRef.current = next;
      setControllerState(next);
      vcrltTransport.sendControllerPacket(next);
    },
    []
  );

  // Button handler
  const handleButton = useCallback(
    (buttonKey: keyof ControllerState, isPressed: boolean) => {
      if (isPressed) {
        if (soundEnabled) audioHaptics.playButtonClick();
        if (vibrationEnabled && 'vibrate' in navigator) {
          navigator.vibrate(vibrationStrength === 'light' ? 12 : vibrationStrength === 'medium' ? 20 : 30);
        }
      }
      updateState((prev) => ({
        ...prev,
        [buttonKey]: isPressed,
      }));
    },
    [updateState, soundEnabled, vibrationEnabled, vibrationStrength]
  );

  // Trigger handler (L2/R2)
  const handleTrigger = useCallback(
    (triggerKey: 'leftTrigger' | 'rightTrigger', val: number) => {
      if (val > 0) {
        if (soundEnabled) audioHaptics.playTriggerClick();
        if (vibrationEnabled && 'vibrate' in navigator) {
          navigator.vibrate(22);
        }
      }
      updateState((prev) => ({
        ...prev,
        [triggerKey]: val,
      }));
    },
    [updateState, soundEnabled, vibrationEnabled]
  );

  // Deadzone filter
  const applyDeadZone = (val: number, dz: number): number => {
    if (Math.abs(val) < dz) return 0;
    const sign = Math.sign(val);
    return sign * ((Math.abs(val) - dz) / (1 - dz));
  };

  // Analog stick pointer tracking
  const handleStickPointer = (
    e: React.PointerEvent<HTMLDivElement>,
    isLeft: boolean
  ) => {
    const container = isLeft ? leftStickRef.current : rightStickRef.current;
    if (!container) return;

    try {
      container.setPointerCapture(e.pointerId);
    } catch {
      // Ignored
    }

    const rect = container.getBoundingClientRect();
    const radius = rect.width / 2;
    const centerX = rect.left + radius;
    const centerY = rect.top + radius;

    const dx = e.clientX - centerX;
    const dy = e.clientY - centerY;
    const dist = Math.hypot(dx, dy);

    let rawX = dx / radius;
    let rawY = dy / radius;

    if (dist > radius) {
      rawX = dx / dist;
      rawY = dy / dist;
    }

    const clampedX = Math.max(-1, Math.min(1, rawX));
    const clampedY = Math.max(-1, Math.min(1, rawY));

    const finalX = applyDeadZone(clampedX, deadzone);
    const finalY = applyDeadZone(clampedY, deadzone);

    const stickKey = isLeft ? 'leftStick' : 'rightStick';
    updateState((prev) => ({
      ...prev,
      [stickKey]: {
        x: parseFloat(finalX.toFixed(3)),
        y: parseFloat(finalY.toFixed(3)),
        active: true,
      },
    }));
  };

  const handleStickRelease = (
    e: React.PointerEvent<HTMLDivElement>,
    isLeft: boolean
  ) => {
    const container = isLeft ? leftStickRef.current : rightStickRef.current;
    if (container) {
      try {
        if (container.hasPointerCapture(e.pointerId)) {
          container.releasePointerCapture(e.pointerId);
        }
      } catch {
        // Ignored
      }
    }

    if (soundEnabled) audioHaptics.playStickClick();
    const stickKey = isLeft ? 'leftStick' : 'rightStick';
    updateState((prev) => ({
      ...prev,
      [stickKey]: { x: 0, y: 0, active: false },
    }));
  };

  // Touchpad pointer tracking & click
  const handleTouchpadPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    const container = touchpadRef.current;
    if (!container) return;

    try {
      container.setPointerCapture(e.pointerId);
    } catch {
      // Ignored
    }

    const rect = container.getBoundingClientRect();
    const nx = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const ny = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

    if (soundEnabled) audioHaptics.playButtonClick();

    updateState((prev) => ({
      ...prev,
      touchpad: {
        x: parseFloat(nx.toFixed(3)),
        y: parseFloat(ny.toFixed(3)),
        active: true,
        clicked: true,
      },
    }));
  };

  const handleTouchpadRelease = (e: React.PointerEvent<HTMLDivElement>) => {
    const container = touchpadRef.current;
    if (container) {
      try {
        if (container.hasPointerCapture(e.pointerId)) {
          container.releasePointerCapture(e.pointerId);
        }
      } catch {
        // Ignored
      }
    }

    updateState((prev) => ({
      ...prev,
      touchpad: {
        ...prev.touchpad,
        active: false,
        clicked: false,
      },
    }));
  };

  // Connect flow
  const handleConnect = () => {
    setIsConnecting(true);
    if (soundEnabled) audioHaptics.playButtonClick();
    setTimeout(() => {
      setIsConnecting(false);
      setIsConnected(true);
      vcrltTransport.setConnectionStatus('connected');
      if (soundEnabled) audioHaptics.playConnectChime();
    }, 250);
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    vcrltTransport.setConnectionStatus('disconnected');
    if (soundEnabled) audioHaptics.playButtonClick();
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      phoneContainerRef.current?.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const isNeon = selectedModel === 'cyber_neon';

  return (
    <div
      ref={phoneContainerRef}
      id="phone-controller-viewport"
      className="w-full h-full bg-[#05070a] flex items-center justify-center select-none overflow-hidden touch-none"
    >
      {/* Outer Phone Bezel - Auto-fits edge to edge */}
      <div
        id="phone-device-chassis"
        className={`w-full h-full relative overflow-hidden select-none touch-none flex flex-col justify-between transition-colors duration-300 ${
          isNeon
            ? 'bg-[#060b18]'
            : 'bg-[#0d0f14]'
        }`}
      >
        {/* ======================================================== */}
        {/* 1. CONNECTION SCREEN (Minimalist & Direct)               */}
        {/* ======================================================== */}
        {!isConnected ? (
          <div
            id="vcrlt-connect-screen"
            className="w-full h-full flex flex-col items-center justify-center bg-[#080b12] p-4 text-center z-50"
          >
            <div className="relative mb-3">
              <img
                src="/app_icon.jpg"
                alt="VCRLT Logo"
                referrerPolicy="no-referrer"
                className="w-20 h-20 rounded-2xl object-cover border-2 border-blue-500/50 shadow-xl shadow-blue-500/30"
              />
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide">
              VCRLT Game Pad
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Choose connection method and connect to PC
            </p>

            {/* 4 Connection Options */}
            <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2 max-w-md w-full">
              {/* Wi-Fi */}
              <button
                id="mode-wifi"
                onClick={() => setConnectionType('wifi')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition ${
                  connectionType === 'wifi'
                    ? 'bg-blue-600 border-blue-400 text-white shadow-md'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                <Wifi className="w-4 h-4" />
                <span>Wi-Fi</span>
              </button>

              {/* Hotspot */}
              <button
                id="mode-hotspot"
                onClick={() => setConnectionType('hotspot')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition ${
                  connectionType === 'hotspot'
                    ? 'bg-amber-600 border-amber-400 text-white shadow-md'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                <Radio className="w-4 h-4" />
                <span>Hotspot</span>
              </button>

              {/* USB Cable */}
              <button
                id="mode-usb"
                onClick={() => setConnectionType('usb')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition ${
                  connectionType === 'usb'
                    ? 'bg-emerald-600 border-emerald-400 text-white shadow-md'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                <Cable className="w-4 h-4" />
                <span>USB Cable</span>
              </button>

              {/* Bluetooth */}
              <button
                id="mode-bluetooth"
                onClick={() => setConnectionType('bluetooth')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition ${
                  connectionType === 'bluetooth'
                    ? 'bg-indigo-600 border-indigo-400 text-white shadow-md'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                <Bluetooth className="w-4 h-4" />
                <span>Bluetooth</span>
              </button>
            </div>

            {/* Quick Helper Note */}
            <div className="mt-3 text-[11px] text-neutral-400 max-w-xs font-medium">
              {connectionType === 'wifi' && 'PC & phone connected to your home Wi-Fi.'}
              {connectionType === 'hotspot' && 'Turn on phone hotspot, connect PC to it, then tap Connect.'}
              {connectionType === 'usb' && 'Direct USB cable connected to PC (0ms ping).'}
              {connectionType === 'bluetooth' && 'Direct Bluetooth paired to Windows.'}
            </div>

            {/* Big Connect Button */}
            <button
              id="btn-connect-pc"
              onClick={handleConnect}
              disabled={isConnecting}
              className="mt-5 px-10 py-3 rounded-full bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-black text-sm tracking-wider shadow-lg shadow-blue-500/35 transition flex items-center gap-2"
            >
              {isConnecting ? (
                <>
                  <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <Power className="w-4 h-4" />
                  <span>CONNECT TO PC</span>
                </>
              )}
            </button>

            {/* Direct Mobile Download ZIP Button */}
            <a
              href="/vcrlt-gamepad-complete-project.zip"
              download="vcrlt-gamepad-complete-project.zip"
              id="btn-phone-screen-download-zip"
              className="mt-4 px-6 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-extrabold text-xs tracking-wider shadow-lg shadow-emerald-500/30 transition flex items-center gap-2 border border-emerald-400/40"
            >
              <Download className="w-4 h-4 animate-bounce" />
              <span>DOWNLOAD 100% PROJECT ZIP (1.1 MB)</span>
            </a>
          </div>
        ) : (
          /* ======================================================== */
          /* 2. AUTO-FITTING GAMEPAD SURFACE (Matches Images 1 & 2)  */
          /* ======================================================== */
          <div
            id="vcrlt-gamepad-surface"
            className="w-full h-full relative flex flex-col justify-between p-2 sm:p-3 overflow-hidden select-none touch-none"
          >
            {/* Top Bar: Connection, Model Switcher, Settings, Fullscreen */}
            <div className="w-full flex items-center justify-between px-2 pt-1 z-30 shrink-0">
              <div className="flex items-center gap-2 text-[11px] font-mono font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-emerald-400 uppercase">
                  {connectionType} (CONNECTED)
                </span>
                <a
                  href="/vcrlt-gamepad-complete-project.zip"
                  download="vcrlt-gamepad-complete-project.zip"
                  id="btn-phone-top-download"
                  className="ml-1 px-2 py-0.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] flex items-center gap-1 shadow"
                  title="Download Project ZIP"
                >
                  <Download className="w-2.5 h-2.5" />
                  <span>ZIP</span>
                </a>
              </div>

              {/* 1-Tap Model Switcher Pill */}
              <div className="flex items-center bg-black/60 border border-white/10 rounded-full p-0.5 shadow-md">
                <button
                  id="switch-model-stealth"
                  onClick={() => setSelectedModel('stealth_black')}
                  className={`px-3 py-1 rounded-full text-[10px] font-black transition ${
                    !isNeon
                      ? 'bg-neutral-800 text-white shadow'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  dani.x240 Stealth
                </button>
                <button
                  id="switch-model-neon"
                  onClick={() => setSelectedModel('cyber_neon')}
                  className={`px-3 py-1 rounded-full text-[10px] font-black transition flex items-center gap-1 ${
                    isNeon
                      ? 'bg-blue-600 text-white shadow shadow-blue-500/60'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <Sparkles className="w-2.5 h-2.5" />
                  <span>dani.x240 Neon</span>
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  id="btn-open-settings"
                  onClick={() => setShowSettings(true)}
                  className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-neutral-300"
                  title="Settings"
                >
                  <Settings className="w-3.5 h-3.5" />
                </button>
                <button
                  id="btn-toggle-fullscreen"
                  onClick={toggleFullscreen}
                  className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-neutral-300"
                  title="Fullscreen"
                >
                  {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                </button>
                <button
                  id="btn-disconnect-pad"
                  onClick={handleDisconnect}
                  className="p-1.5 rounded-full bg-white/5 hover:bg-red-500/20 text-neutral-300 hover:text-red-400"
                  title="Disconnect"
                >
                  <Power className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* ======================================================== */}
            {/* TOP CORNERS & TOUCHPAD (Exact Angled Triggers from photos)*/}
            {/* ======================================================== */}
            <div className="w-full flex items-start justify-between px-2 pt-1 z-20 shrink-0">
              {/* Top-Left: Angled L2 & L1 (Corner placement from photo 1 & 2) */}
              <div className="flex items-center gap-2 transform -rotate-6 origin-top-left">
                {/* L2 (Angled outer) */}
                <button
                  id="btn-l2"
                  onPointerDown={(e) => {
                    try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
                    handleTrigger('leftTrigger', 1.0);
                  }}
                  onPointerUp={(e) => {
                    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
                    handleTrigger('leftTrigger', 0.0);
                  }}
                  className={`w-14 sm:w-18 h-9 sm:h-11 rounded-2xl border flex flex-col items-center justify-center font-black text-xs tracking-wider transition-all select-none touch-none shadow-md ${
                    controllerState.leftTrigger > 0
                      ? isNeon
                        ? 'bg-blue-600 border-white text-white shadow-blue-500/80 scale-95'
                        : 'bg-blue-600 border-blue-400 text-white scale-95'
                      : isNeon
                      ? 'bg-white/20 border-white/60 text-white font-black'
                      : 'bg-neutral-800 border-neutral-600 text-neutral-200'
                  }`}
                >
                  <span>L2</span>
                  <span className="text-[8px] opacity-70">LT</span>
                </button>

                {/* L1 (Angled inner) */}
                <button
                  id="btn-l1"
                  onPointerDown={() => handleButton('l1', true)}
                  onPointerUp={() => handleButton('l1', false)}
                  className={`w-14 sm:w-18 h-9 sm:h-11 rounded-2xl border flex flex-col items-center justify-center font-black text-xs tracking-wider transition-all select-none touch-none shadow-md ${
                    controllerState.l1
                      ? isNeon
                        ? 'bg-blue-600 border-white text-white shadow-blue-500/80 scale-95'
                        : 'bg-blue-600 border-blue-400 text-white scale-95'
                      : isNeon
                      ? 'bg-white/20 border-white/60 text-white font-black'
                      : 'bg-neutral-800 border-neutral-600 text-neutral-200'
                  }`}
                >
                  <span>L1</span>
                  <span className="text-[8px] opacity-70">LB</span>
                </button>
              </div>

              {/* Center: Wide Trapezoidal PS Touchpad (Directly from photos) */}
              <div
                id="gamepad-touchpad"
                ref={touchpadRef}
                onPointerDown={handleTouchpadPointer}
                onPointerMove={(e) => {
                  if (controllerState.touchpad.active) handleTouchpadPointer(e);
                }}
                onPointerUp={handleTouchpadRelease}
                onPointerCancel={handleTouchpadRelease}
                className={`flex-1 max-w-sm sm:max-w-md h-12 sm:h-16 mx-3 rounded-2xl border transition-all relative overflow-hidden flex flex-col items-center justify-center cursor-pointer select-none touch-none ${
                  controllerState.touchpad.active || controllerState.touchpad.clicked
                    ? isNeon
                      ? 'bg-blue-950/80 border-cyan-400 shadow-lg shadow-cyan-400/40'
                      : 'bg-blue-950/70 border-blue-400 shadow-md'
                    : isNeon
                    ? 'bg-[#091530] border-blue-500/50 hover:border-blue-400'
                    : 'bg-[#141722] border-neutral-700/80 hover:border-neutral-600 shadow-inner'
                }`}
              >
                <span className={`text-[10px] sm:text-xs font-black tracking-widest ${isNeon ? 'text-cyan-300' : 'text-neutral-300'}`}>
                  TOUCHPAD
                </span>
                <span className="text-[8px] text-neutral-400 uppercase tracking-wider">
                  {controllerState.touchpad.clicked ? 'PRESSED' : 'CLICK / MAP'}
                </span>

                {controllerState.touchpad.active && (
                  <div
                    className="absolute w-5 h-5 rounded-full bg-cyan-400 border border-white pointer-events-none transform -translate-x-1/2 -translate-y-1/2 shadow-md shadow-cyan-400/60"
                    style={{
                      left: `${controllerState.touchpad.x * 100}%`,
                      top: `${controllerState.touchpad.y * 100}%`,
                    }}
                  />
                )}
              </div>

              {/* Top-Right: Angled R1 & R2 (Corner placement from photo 1 & 2) */}
              <div className="flex items-center gap-2 transform rotate-6 origin-top-right">
                {/* R1 (Angled inner) */}
                <button
                  id="btn-r1"
                  onPointerDown={() => handleButton('r1', true)}
                  onPointerUp={() => handleButton('r1', false)}
                  className={`w-14 sm:w-18 h-9 sm:h-11 rounded-2xl border flex flex-col items-center justify-center font-black text-xs tracking-wider transition-all select-none touch-none shadow-md ${
                    controllerState.r1
                      ? isNeon
                        ? 'bg-blue-600 border-white text-white shadow-blue-500/80 scale-95'
                        : 'bg-blue-600 border-blue-400 text-white scale-95'
                      : isNeon
                      ? 'bg-white/20 border-white/60 text-white font-black'
                      : 'bg-neutral-800 border-neutral-600 text-neutral-200'
                  }`}
                >
                  <span>R1</span>
                  <span className="text-[8px] opacity-70">RB</span>
                </button>

                {/* R2 (Angled outer) */}
                <button
                  id="btn-r2"
                  onPointerDown={(e) => {
                    try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
                    handleTrigger('rightTrigger', 1.0);
                  }}
                  onPointerUp={(e) => {
                    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
                    handleTrigger('rightTrigger', 0.0);
                  }}
                  className={`w-14 sm:w-18 h-9 sm:h-11 rounded-2xl border flex flex-col items-center justify-center font-black text-xs tracking-wider transition-all select-none touch-none shadow-md ${
                    controllerState.rightTrigger > 0
                      ? isNeon
                        ? 'bg-blue-600 border-white text-white shadow-blue-500/80 scale-95'
                        : 'bg-blue-600 border-blue-400 text-white scale-95'
                      : isNeon
                      ? 'bg-white/20 border-white/60 text-white font-black'
                      : 'bg-neutral-800 border-neutral-600 text-neutral-200'
                  }`}
                >
                  <span>R2</span>
                  <span className="text-[8px] opacity-70">RT</span>
                </button>
              </div>
            </div>

            {/* ======================================================== */}
            {/* MAIN HAND AREA: D-Pad (Left), Action Buttons (Right)     */}
            {/* ======================================================== */}
            <div className="w-full flex items-center justify-between px-3 sm:px-8 my-auto z-20">
              {/* D-PAD (Left) - Recessed Dish with 4 directional arrows */}
              <div
                id="dpad-cluster"
                className={`relative w-34 h-34 sm:w-40 sm:h-40 rounded-full flex items-center justify-center border shadow-2xl ${
                  isNeon
                    ? 'bg-[#0a142c] border-blue-500/50 shadow-[0_0_20px_rgba(37,99,235,0.25)]'
                    : 'bg-[#151824] border-neutral-700/80 shadow-[inset_0_2px_10px_rgba(0,0,0,0.8)]'
                }`}
              >
                {/* D-Pad Up */}
                <button
                  id="btn-dpad-up"
                  onPointerDown={() => handleButton('dpadUp', true)}
                  onPointerUp={() => handleButton('dpadUp', false)}
                  className={`absolute top-1.5 w-11 sm:w-13 h-11 sm:h-13 rounded-t-2xl border flex items-center justify-center transition-all select-none touch-none shadow-md ${
                    controllerState.dpadUp
                      ? isNeon
                        ? 'bg-cyan-400 border-white text-blue-950 scale-95'
                        : 'bg-blue-600 border-blue-400 text-white scale-95'
                      : isNeon
                      ? 'bg-white border-white text-blue-950 font-black'
                      : 'bg-neutral-800 border-neutral-700 text-neutral-200'
                  }`}
                >
                  <span className="text-sm font-black">▲</span>
                </button>

                {/* D-Pad Down */}
                <button
                  id="btn-dpad-down"
                  onPointerDown={() => handleButton('dpadDown', true)}
                  onPointerUp={() => handleButton('dpadDown', false)}
                  className={`absolute bottom-1.5 w-11 sm:w-13 h-11 sm:h-13 rounded-b-2xl border flex items-center justify-center transition-all select-none touch-none shadow-md ${
                    controllerState.dpadDown
                      ? isNeon
                        ? 'bg-cyan-400 border-white text-blue-950 scale-95'
                        : 'bg-blue-600 border-blue-400 text-white scale-95'
                      : isNeon
                      ? 'bg-white border-white text-blue-950 font-black'
                      : 'bg-neutral-800 border-neutral-700 text-neutral-200'
                  }`}
                >
                  <span className="text-sm font-black">▼</span>
                </button>

                {/* D-Pad Left */}
                <button
                  id="btn-dpad-left"
                  onPointerDown={() => handleButton('dpadLeft', true)}
                  onPointerUp={() => handleButton('dpadLeft', false)}
                  className={`absolute left-1.5 w-11 sm:w-13 h-11 sm:h-13 rounded-l-2xl border flex items-center justify-center transition-all select-none touch-none shadow-md ${
                    controllerState.dpadLeft
                      ? isNeon
                        ? 'bg-cyan-400 border-white text-blue-950 scale-95'
                        : 'bg-blue-600 border-blue-400 text-white scale-95'
                      : isNeon
                      ? 'bg-white border-white text-blue-950 font-black'
                      : 'bg-neutral-800 border-neutral-700 text-neutral-200'
                  }`}
                >
                  <span className="text-sm font-black">◀</span>
                </button>

                {/* D-Pad Right */}
                <button
                  id="btn-dpad-right"
                  onPointerDown={() => handleButton('dpadRight', true)}
                  onPointerUp={() => handleButton('dpadRight', false)}
                  className={`absolute right-1.5 w-11 sm:w-13 h-11 sm:h-13 rounded-r-2xl border flex items-center justify-center transition-all select-none touch-none shadow-md ${
                    controllerState.dpadRight
                      ? isNeon
                        ? 'bg-cyan-400 border-white text-blue-950 scale-95'
                        : 'bg-blue-600 border-blue-400 text-white scale-95'
                      : isNeon
                      ? 'bg-white border-white text-blue-950 font-black'
                      : 'bg-neutral-800 border-neutral-700 text-neutral-200'
                  }`}
                >
                  <span className="text-sm font-black">▶</span>
                </button>

                {/* Center Core */}
                <div className={`w-8 h-8 rounded-full border pointer-events-none ${
                  isNeon ? 'bg-[#060e20] border-blue-500/40' : 'bg-[#0e1017] border-neutral-800'
                }`} />
              </div>

              {/* ACTION BUTTONS (Right) - Triangle, Circle, Cross, Square */}
              <div
                id="action-buttons-cluster"
                className={`relative w-34 h-34 sm:w-40 sm:h-40 rounded-full flex items-center justify-center border shadow-2xl ${
                  isNeon
                    ? 'bg-[#0a142c] border-blue-500/50 shadow-[0_0_20px_rgba(37,99,235,0.25)]'
                    : 'bg-[#151824] border-neutral-700/80 shadow-[inset_0_2px_10px_rgba(0,0,0,0.8)]'
                }`}
              >
                {/* Triangle (▲) - Top */}
                <button
                  id="btn-action-triangle"
                  onPointerDown={() => handleButton('y', true)}
                  onPointerUp={() => handleButton('y', false)}
                  className={`absolute top-1.5 w-11 h-11 sm:w-13 sm:h-13 rounded-full border flex items-center justify-center transition-all select-none touch-none shadow-md ${
                    controllerState.y
                      ? isNeon
                        ? 'bg-cyan-400 border-white text-blue-950 scale-95'
                        : 'bg-emerald-500 border-emerald-300 text-white scale-95'
                      : isNeon
                      ? 'bg-white border-white text-blue-950 font-black'
                      : 'bg-neutral-800 border-neutral-700 text-[#00e5a3] font-black'
                  }`}
                >
                  <span className="text-base font-black">▲</span>
                </button>

                {/* Circle (●) - Right */}
                <button
                  id="btn-action-circle"
                  onPointerDown={() => handleButton('b', true)}
                  onPointerUp={() => handleButton('b', false)}
                  className={`absolute right-1.5 w-11 h-11 sm:w-13 sm:h-13 rounded-full border flex items-center justify-center transition-all select-none touch-none shadow-md ${
                    controllerState.b
                      ? isNeon
                        ? 'bg-cyan-400 border-white text-blue-950 scale-95'
                        : 'bg-rose-500 border-rose-300 text-white scale-95'
                      : isNeon
                      ? 'bg-white border-white text-blue-950 font-black'
                      : 'bg-neutral-800 border-neutral-700 text-[#ff3b5c] font-black'
                  }`}
                >
                  <span className="text-base font-black">●</span>
                </button>

                {/* Cross (✕) - Bottom */}
                <button
                  id="btn-action-cross"
                  onPointerDown={() => handleButton('a', true)}
                  onPointerUp={() => handleButton('a', false)}
                  className={`absolute bottom-1.5 w-11 h-11 sm:w-13 sm:h-13 rounded-full border flex items-center justify-center transition-all select-none touch-none shadow-md ${
                    controllerState.a
                      ? isNeon
                        ? 'bg-cyan-400 border-white text-blue-950 scale-95'
                        : 'bg-blue-500 border-blue-300 text-white scale-95'
                      : isNeon
                      ? 'bg-white border-white text-blue-950 font-black'
                      : 'bg-neutral-800 border-neutral-700 text-[#3882ff] font-black'
                  }`}
                >
                  <span className="text-base font-black">✕</span>
                </button>

                {/* Square (■) - Left */}
                <button
                  id="btn-action-square"
                  onPointerDown={() => handleButton('x', true)}
                  onPointerUp={() => handleButton('x', false)}
                  className={`absolute left-1.5 w-11 h-11 sm:w-13 sm:h-13 rounded-full border flex items-center justify-center transition-all select-none touch-none shadow-md ${
                    controllerState.x
                      ? isNeon
                        ? 'bg-cyan-400 border-white text-blue-950 scale-95'
                        : 'bg-pink-500 border-pink-300 text-white scale-95'
                      : isNeon
                      ? 'bg-white border-white text-blue-950 font-black'
                      : 'bg-neutral-800 border-neutral-700 text-[#ff54b0] font-black'
                  }`}
                >
                  <span className="text-base font-black">■</span>
                </button>

                {/* Center Core */}
                <div className={`w-8 h-8 rounded-full border pointer-events-none ${
                  isNeon ? 'bg-[#060e20] border-blue-500/40' : 'bg-[#0e1017] border-neutral-800'
                }`} />
              </div>
            </div>

            {/* ======================================================== */}
            {/* BOTTOM SECTION: Dual Sticks, Share, PS, Option, L3/R3    */}
            {/* ======================================================== */}
            <div className="w-full flex items-end justify-between px-3 sm:px-8 pb-2 z-20 shrink-0">
              {/* Left Thumbstick + Corner L3 Button */}
              <div className="flex items-center gap-2">
                {/* Dedicated Corner L3 Trigger (From photo 2) */}
                <button
                  id="btn-corner-l3"
                  onPointerDown={() => handleButton('l3', true)}
                  onPointerUp={() => handleButton('l3', false)}
                  className={`w-10 h-10 rounded-2xl border text-[10px] font-black tracking-wider transition select-none touch-none shadow-md flex items-center justify-center ${
                    controllerState.l3
                      ? 'bg-emerald-600 border-emerald-400 text-white scale-95'
                      : isNeon
                      ? 'bg-white/20 border-white/60 text-white'
                      : 'bg-neutral-800 border-neutral-700 text-neutral-300'
                  }`}
                >
                  L3
                </button>

                {/* Left Analog Stick */}
                <div
                  id="stick-left-base"
                  ref={leftStickRef}
                  onPointerDown={(e) => handleStickPointer(e, true)}
                  onPointerMove={(e) => {
                    if (controllerState.leftStick.active) handleStickPointer(e, true);
                  }}
                  onPointerUp={(e) => handleStickRelease(e, true)}
                  onPointerCancel={(e) => handleStickRelease(e, true)}
                  className={`relative w-22 h-22 sm:w-26 sm:h-26 rounded-full border flex items-center justify-center cursor-grab active:cursor-grabbing touch-none select-none shadow-xl ${
                    isNeon
                      ? 'bg-[#071024] border-2 border-[#38bdf8] shadow-[0_0_15px_rgba(56,189,248,0.4)]'
                      : 'bg-gradient-to-b from-[#161a26] to-[#0a0d14] border-neutral-700 shadow-inner'
                  }`}
                >
                  {/* Thumb Knob: Solid pure white for Cyber Neon (Image 2) or Textured dark for Stealth (Image 1) */}
                  <div
                    id="stick-left-knob"
                    className={`absolute w-12 h-12 sm:w-14 sm:h-14 rounded-full border flex items-center justify-center pointer-events-none transition-transform duration-75 shadow-2xl ${
                      isNeon
                        ? 'bg-white border-white text-blue-950 font-black'
                        : 'bg-gradient-to-b from-neutral-700 to-neutral-900 border-neutral-600 text-neutral-300 font-bold'
                    }`}
                    style={{
                      transform: `translate(${controllerState.leftStick.x * 20}px, ${controllerState.leftStick.y * 20}px)`,
                    }}
                  >
                    <span className="text-[10px] font-black">L</span>
                  </div>
                </div>
              </div>

              {/* Center Controls: Share, PS, Option, Mic (Identical to Photo 1 & 2) */}
              <div className="flex flex-col items-center gap-1 pb-1">
                <div className="flex items-center gap-3 sm:gap-4">
                  {/* Share button with text */}
                  <button
                    id="btn-share"
                    onPointerDown={() => handleButton('select', true)}
                    onPointerUp={() => handleButton('select', false)}
                    className={`px-2.5 py-1.5 rounded-xl border text-[10px] font-black flex flex-col items-center gap-0.5 transition select-none touch-none shadow ${
                      controllerState.select
                        ? 'bg-blue-600 border-blue-400 text-white scale-95'
                        : isNeon
                        ? 'bg-white/10 border-white/30 text-white'
                        : 'bg-neutral-800 border-neutral-700 text-neutral-300'
                    }`}
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span className="text-[8px] tracking-wider">SHARE</span>
                  </button>

                  {/* PS Home Button (Prominent center emblem) */}
                  <button
                    id="btn-ps-home"
                    onPointerDown={() => handleButton('home', true)}
                    onPointerUp={() => handleButton('home', false)}
                    className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full border-2 transition flex items-center justify-center select-none touch-none shadow-lg ${
                      controllerState.home
                        ? 'bg-blue-600 border-white text-white shadow-blue-500/80 scale-95'
                        : isNeon
                        ? 'bg-blue-950 border-white text-white shadow-[0_0_12px_rgba(255,255,255,0.4)]'
                        : 'bg-neutral-800 border-neutral-600 text-white'
                    }`}
                  >
                    <span className="font-black text-xs tracking-tighter">PS</span>
                  </button>

                  {/* Option button with text */}
                  <button
                    id="btn-options"
                    onPointerDown={() => handleButton('start', true)}
                    onPointerUp={() => handleButton('start', false)}
                    className={`px-2.5 py-1.5 rounded-xl border text-[10px] font-black flex flex-col items-center gap-0.5 transition select-none touch-none shadow ${
                      controllerState.start
                        ? 'bg-blue-600 border-blue-400 text-white scale-95'
                        : isNeon
                        ? 'bg-white/10 border-white/30 text-white'
                        : 'bg-neutral-800 border-neutral-700 text-neutral-300'
                    }`}
                  >
                    <Menu className="w-3.5 h-3.5" />
                    <span className="text-[8px] tracking-wider">OPTION</span>
                  </button>
                </div>

                {/* Mic Mute Indicator */}
                <button
                  id="btn-mic-toggle"
                  onClick={() => setMicMuted(!micMuted)}
                  className={`px-2.5 py-0.5 rounded-full border text-[9px] flex items-center gap-1 transition ${
                    micMuted
                      ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                      : 'bg-black/40 border-white/10 text-neutral-400'
                  }`}
                >
                  {micMuted ? <MicOff className="w-2.5 h-2.5" /> : <Mic className="w-2.5 h-2.5" />}
                  <span>{micMuted ? 'MUTED' : 'MIC'}</span>
                </button>
              </div>

              {/* Right Thumbstick + Corner R3 Button */}
              <div className="flex items-center gap-2">
                {/* Right Analog Stick */}
                <div
                  id="stick-right-base"
                  ref={rightStickRef}
                  onPointerDown={(e) => handleStickPointer(e, false)}
                  onPointerMove={(e) => {
                    if (controllerState.rightStick.active) handleStickPointer(e, false);
                  }}
                  onPointerUp={(e) => handleStickRelease(e, false)}
                  onPointerCancel={(e) => handleStickRelease(e, false)}
                  className={`relative w-22 h-22 sm:w-26 sm:h-26 rounded-full border flex items-center justify-center cursor-grab active:cursor-grabbing touch-none select-none shadow-xl ${
                    isNeon
                      ? 'bg-[#071024] border-2 border-[#38bdf8] shadow-[0_0_15px_rgba(56,189,248,0.4)]'
                      : 'bg-gradient-to-b from-[#161a26] to-[#0a0d14] border-neutral-700 shadow-inner'
                  }`}
                >
                  {/* Thumb Knob: Solid pure white for Cyber Neon (Image 2) or Textured dark for Stealth (Image 1) */}
                  <div
                    id="stick-right-knob"
                    className={`absolute w-12 h-12 sm:w-14 sm:h-14 rounded-full border flex items-center justify-center pointer-events-none transition-transform duration-75 shadow-2xl ${
                      isNeon
                        ? 'bg-white border-white text-blue-950 font-black'
                        : 'bg-gradient-to-b from-neutral-700 to-neutral-900 border-neutral-600 text-neutral-300 font-bold'
                    }`}
                    style={{
                      transform: `translate(${controllerState.rightStick.x * 20}px, ${controllerState.rightStick.y * 20}px)`,
                    }}
                  >
                    <span className="text-[10px] font-black">R</span>
                  </div>
                </div>

                {/* Dedicated Corner R3 Trigger (From photo 2) */}
                <button
                  id="btn-corner-r3"
                  onPointerDown={() => handleButton('r3', true)}
                  onPointerUp={() => handleButton('r3', false)}
                  className={`w-10 h-10 rounded-2xl border text-[10px] font-black tracking-wider transition select-none touch-none shadow-md flex items-center justify-center ${
                    controllerState.r3
                      ? 'bg-emerald-600 border-emerald-400 text-white scale-95'
                      : isNeon
                      ? 'bg-white/20 border-white/60 text-white'
                      : 'bg-neutral-800 border-neutral-700 text-neutral-300'
                  }`}
                >
                  R3
                </button>
              </div>
            </div>

            {/* ======================================================== */}
            {/* QUICK SETTINGS POPUP                                     */}
            {/* ======================================================== */}
            {showSettings && (
              <div
                id="modal-controller-settings"
                className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in"
              >
                <div className="bg-[#11141e] border border-neutral-800 rounded-3xl p-5 max-w-sm w-full text-slate-100 shadow-2xl">
                  <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                    <div className="flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-blue-400" />
                      <h3 className="font-bold text-sm">Gamepad Settings</h3>
                    </div>
                    <button
                      onClick={() => setShowSettings(false)}
                      className="p-1 rounded-full bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="py-4 space-y-3 text-xs">
                    {/* Model Switcher */}
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-neutral-300">Model:</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setSelectedModel('stealth_black')}
                          className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold ${
                            !isNeon ? 'bg-blue-600 border-blue-400 text-white' : 'bg-neutral-800 text-neutral-400 border-neutral-700'
                          }`}
                        >
                          Stealth Black
                        </button>
                        <button
                          onClick={() => setSelectedModel('cyber_neon')}
                          className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold ${
                            isNeon ? 'bg-blue-600 border-blue-400 text-white' : 'bg-neutral-800 text-neutral-400 border-neutral-700'
                          }`}
                        >
                          Cyber Neon
                        </button>
                      </div>
                    </div>

                    {/* Rumble / Vibration */}
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-neutral-300">Vibration:</span>
                      <button
                        onClick={() => {
                          setVibrationEnabled(!vibrationEnabled);
                          if ('vibrate' in navigator && !vibrationEnabled) navigator.vibrate(50);
                        }}
                        className={`px-3 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1.5 ${
                          vibrationEnabled
                            ? 'bg-emerald-600 border-emerald-400 text-white'
                            : 'bg-neutral-800 border-neutral-700 text-neutral-400'
                        }`}
                      >
                        <Vibrate className="w-3 h-3" />
                        <span>{vibrationEnabled ? 'ON' : 'OFF'}</span>
                      </button>
                    </div>

                    {/* Vibration Intensity */}
                    {vibrationEnabled && (
                      <div className="flex items-center justify-between pl-2">
                        <span className="text-neutral-400">Strength:</span>
                        <div className="flex items-center gap-1">
                          {(['light', 'medium', 'heavy'] as const).map((lvl) => (
                            <button
                              key={lvl}
                              onClick={() => {
                                setVibrationStrength(lvl);
                                if ('vibrate' in navigator) navigator.vibrate(lvl === 'light' ? 15 : lvl === 'medium' ? 30 : 60);
                              }}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                                vibrationStrength === lvl
                                  ? 'bg-blue-600 border-blue-400 text-white'
                                  : 'bg-neutral-800 border-neutral-700 text-neutral-400'
                              }`}
                            >
                              {lvl}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Sound clicks */}
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-neutral-300">Sound:</span>
                      <button
                        onClick={() => setSoundEnabled(!soundEnabled)}
                        className={`px-3 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1.5 ${
                          soundEnabled
                            ? 'bg-blue-600 border-blue-400 text-white'
                            : 'bg-neutral-800 border-neutral-700 text-neutral-400'
                        }`}
                      >
                        {soundEnabled ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
                        <span>{soundEnabled ? 'ON' : 'OFF'}</span>
                      </button>
                    </div>

                    {/* Stick Deadzone */}
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-neutral-300">Deadzone:</span>
                      <div className="flex items-center gap-1">
                        {[0.05, 0.08, 0.15].map((dz) => (
                          <button
                            key={dz}
                            onClick={() => setDeadzone(dz)}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              deadzone === dz
                                ? 'bg-blue-600 border-blue-400 text-white'
                                : 'bg-neutral-800 border-neutral-700 text-neutral-400'
                            }`}
                          >
                            {Math.round(dz * 100)}%
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowSettings(false)}
                    className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-xs text-white transition mt-1"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
