import React, { useState, useEffect } from 'react';
import {
  Monitor,
  Gamepad2,
  CheckCircle2,
  Vibrate,
  Wifi,
} from 'lucide-react';
import { ControllerState } from '../types';
import { vcrltTransport, INITIAL_CONTROLLER_STATE } from '../services/transport';

export const PcReceiver: React.FC = () => {
  const [controllerState, setControllerState] = useState<ControllerState>({
    ...INITIAL_CONTROLLER_STATE,
    timestamp: Date.now(),
  });

  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [vibrationActive, setVibrationActive] = useState<boolean>(false);

  useEffect(() => {
    const unsubPacket = vcrltTransport.onPacket((state) => {
      setControllerState(state);
      setIsConnected(true);
    });

    const unsubConn = vcrltTransport.onConnection((status) => {
      setIsConnected(status === 'connected');
    });

    const unsubVib = vcrltTransport.onVibration(() => {
      setVibrationActive(true);
      setTimeout(() => setVibrationActive(false), 300);
    });

    return () => {
      unsubPacket();
      unsubConn();
      unsubVib();
    };
  }, []);

  const triggerRumble = () => {
    vcrltTransport.sendVibrationRequest('heavy', 200, 'PC Gamepad Rumble Test');
  };

  return (
    <div id="vcrlt-pc-receiver-screen" className="w-full h-full bg-[#0a0c12] text-slate-100 flex flex-col justify-between overflow-hidden select-none p-4 md:p-6">
      {/* Top Header: Simple & Direct */}
      <div className="w-full bg-[#11141e] border border-slate-800/90 rounded-2xl px-5 py-3.5 flex items-center justify-between shrink-0 shadow-lg">
        <div className="flex items-center gap-3">
          <img
            src="/app_icon.jpg"
            alt="PC Receiver Logo"
            referrerPolicy="no-referrer"
            className="w-10 h-10 rounded-xl object-cover border border-blue-500/40 shadow-md shadow-blue-500/25 shrink-0"
          />
          <div>
            <h2 className="font-bold text-base tracking-wide text-white">PC Gamepad Receiver</h2>
            <p className="text-xs text-slate-400">
              {isConnected ? 'Phone connected — Virtual controller active' : 'Searching for your phone...'}
            </p>
          </div>
        </div>

        {/* Big Clear Connection Status Badge */}
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1.5 rounded-full font-bold text-xs flex items-center gap-2 border ${
            isConnected
              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
              : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span>{isConnected ? 'CONNECTED' : 'WAITING FOR PHONE'}</span>
          </span>
        </div>
      </div>

      {/* Main Area: Simple PS5 Pad Visualizer (Shows buttons working when pressed) */}
      <div className="flex-1 my-auto flex flex-col items-center justify-center py-4">
        {/* PS5 Controller Body */}
        <div className="w-full max-w-xl bg-[#121623] border border-slate-800 rounded-3xl p-5 shadow-2xl relative">
          
          {/* Top Triggers & Bumpers */}
          <div className="flex items-start justify-between gap-4 mb-4">
            {/* L2 / L1 */}
            <div className="flex flex-col gap-1.5 w-24">
              <div className={`py-1.5 rounded-lg border text-center font-bold text-xs transition ${
                controllerState.leftTrigger > 0
                  ? 'bg-blue-600 border-blue-400 text-white shadow-md'
                  : 'bg-slate-800/80 border-slate-700/80 text-slate-400'
              }`}>
                L2
              </div>
              <div className={`py-1.5 rounded-lg border text-center font-bold text-xs transition ${
                controllerState.l1
                  ? 'bg-blue-600 border-blue-400 text-white shadow-md'
                  : 'bg-slate-800/80 border-slate-700/80 text-slate-400'
              }`}>
                L1
              </div>
            </div>

            {/* Center Touchpad */}
            <div className={`flex-1 h-16 rounded-2xl border flex flex-col items-center justify-center transition relative overflow-hidden ${
              controllerState.touchpad.active || controllerState.touchpad.clicked
                ? 'bg-blue-950/70 border-blue-400 text-blue-200'
                : 'bg-slate-900/90 border-slate-800 text-slate-400'
            }`}>
              <span className="text-xs font-bold tracking-wider">TOUCHPAD</span>
              <span className="text-[10px] text-slate-400">
                {controllerState.touchpad.clicked ? 'Pressed' : 'Touch to Click'}
              </span>
              {controllerState.touchpad.active && (
                <div
                  className="absolute w-3.5 h-3.5 rounded-full bg-blue-400 border border-white pointer-events-none transform -translate-x-1/2 -translate-y-1/2"
                  style={{
                    left: `${controllerState.touchpad.x * 100}%`,
                    top: `${controllerState.touchpad.y * 100}%`,
                  }}
                />
              )}
            </div>

            {/* R2 / R1 */}
            <div className="flex flex-col gap-1.5 w-24 items-end">
              <div className={`w-full py-1.5 rounded-lg border text-center font-bold text-xs transition ${
                controllerState.rightTrigger > 0
                  ? 'bg-blue-600 border-blue-400 text-white shadow-md'
                  : 'bg-slate-800/80 border-slate-700/80 text-slate-400'
              }`}>
                R2
              </div>
              <div className={`w-full py-1.5 rounded-lg border text-center font-bold text-xs transition ${
                controllerState.r1
                  ? 'bg-blue-600 border-blue-400 text-white shadow-md'
                  : 'bg-slate-800/80 border-slate-700/80 text-slate-400'
              }`}>
                R1
              </div>
            </div>
          </div>

          {/* D-Pad, Center Buttons, Action Buttons */}
          <div className="flex items-center justify-between px-3 py-2">
            {/* D-Pad */}
            <div className="w-24 h-24 relative flex items-center justify-center">
              <div className={`absolute top-0 w-7 h-8 rounded-t-md border flex items-center justify-center font-bold text-xs transition ${
                controllerState.dpadUp ? 'bg-blue-600 border-blue-400 text-white shadow' : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}>▲</div>
              <div className={`absolute bottom-0 w-7 h-8 rounded-b-md border flex items-center justify-center font-bold text-xs transition ${
                controllerState.dpadDown ? 'bg-blue-600 border-blue-400 text-white shadow' : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}>▼</div>
              <div className={`absolute left-0 w-8 h-7 rounded-l-md border flex items-center justify-center font-bold text-xs transition ${
                controllerState.dpadLeft ? 'bg-blue-600 border-blue-400 text-white shadow' : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}>◀</div>
              <div className={`absolute right-0 w-8 h-7 rounded-r-md border flex items-center justify-center font-bold text-xs transition ${
                controllerState.dpadRight ? 'bg-blue-600 border-blue-400 text-white shadow' : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}>▶</div>
              <div className="w-6 h-6 rounded-sm bg-slate-900 border border-slate-800" />
            </div>

            {/* Center Buttons: Share, PS, Options */}
            <div className="flex items-center gap-5">
              <div className={`px-2 py-1 rounded text-[10px] font-bold border transition ${
                controllerState.select ? 'bg-blue-600 border-blue-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}>
                SHARE
              </div>
              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-black text-[10px] transition ${
                controllerState.home ? 'bg-blue-600 border-white text-white shadow-lg' : 'bg-slate-800 border-slate-700 text-slate-300'
              }`}>
                PS
              </div>
              <div className={`px-2 py-1 rounded text-[10px] font-bold border transition ${
                controllerState.start ? 'bg-blue-600 border-blue-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}>
                OPTIONS
              </div>
            </div>

            {/* Action Buttons: Triangle, Circle, Cross, Square */}
            <div className="w-24 h-24 relative flex items-center justify-center">
              {/* Triangle (Top) */}
              <div className={`absolute top-0 w-8 h-8 rounded-full border flex items-center justify-center font-bold text-xs transition ${
                controllerState.y ? 'bg-teal-500 border-teal-300 text-white shadow' : 'bg-slate-800 border-slate-700 text-teal-400'
              }`}>▲</div>
              {/* Circle (Right) */}
              <div className={`absolute right-0 w-8 h-8 rounded-full border flex items-center justify-center font-bold text-xs transition ${
                controllerState.b ? 'bg-rose-500 border-rose-300 text-white shadow' : 'bg-slate-800 border-slate-700 text-rose-400'
              }`}>●</div>
              {/* Cross (Bottom) */}
              <div className={`absolute bottom-0 w-8 h-8 rounded-full border flex items-center justify-center font-bold text-xs transition ${
                controllerState.a ? 'bg-blue-500 border-blue-300 text-white shadow' : 'bg-slate-800 border-slate-700 text-blue-400'
              }`}>✕</div>
              {/* Square (Left) */}
              <div className={`absolute left-0 w-8 h-8 rounded-full border flex items-center justify-center font-bold text-xs transition ${
                controllerState.x ? 'bg-pink-500 border-pink-300 text-white shadow' : 'bg-slate-800 border-slate-700 text-pink-400'
              }`}>■</div>
            </div>
          </div>

          {/* Analog Sticks + L3 / R3 */}
          <div className="flex items-center justify-around pt-3">
            {/* Left Stick */}
            <div className="flex flex-col items-center gap-1.5">
              <div className="relative w-18 h-18 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center shadow-inner">
                <div
                  className="w-9 h-9 rounded-full bg-slate-700 border border-slate-500 shadow transition-transform"
                  style={{
                    transform: `translate(${controllerState.leftStick.x * 12}px, ${controllerState.leftStick.y * 12}px)`,
                  }}
                />
              </div>
              <div className={`px-2 py-0.5 rounded text-[10px] font-bold border transition ${
                controllerState.l3 ? 'bg-emerald-600 border-emerald-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}>
                L3 {controllerState.l3 ? '●' : ''}
              </div>
            </div>

            {/* Center Rumble Indicator */}
            <div className="flex flex-col items-center gap-1">
              <div className={`p-2 rounded-full border transition ${
                vibrationActive ? 'bg-amber-500 border-amber-300 text-white scale-110' : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}>
                <Vibrate className="w-4 h-4" />
              </div>
              <span className="text-[10px] text-slate-400">Rumble</span>
            </div>

            {/* Right Stick */}
            <div className="flex flex-col items-center gap-1.5">
              <div className="relative w-18 h-18 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center shadow-inner">
                <div
                  className="w-9 h-9 rounded-full bg-slate-700 border border-slate-500 shadow transition-transform"
                  style={{
                    transform: `translate(${controllerState.rightStick.x * 12}px, ${controllerState.rightStick.y * 12}px)`,
                  }}
                />
              </div>
              <div className={`px-2 py-0.5 rounded text-[10px] font-bold border transition ${
                controllerState.r3 ? 'bg-emerald-600 border-emerald-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}>
                R3 {controllerState.r3 ? '●' : ''}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Message: Simple & Straight to the Point */}
      <div className="w-full bg-[#11141e] border border-slate-800/90 rounded-2xl px-5 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5 text-xs text-slate-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            Connects via <strong>Wi-Fi</strong>, <strong>Phone Hotspot</strong>, <strong>USB Cable</strong>, or <strong>Bluetooth</strong>.
          </span>
        </div>

        <button
          id="btn-test-rumble"
          onClick={triggerRumble}
          className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white transition flex items-center gap-1.5 shadow"
        >
          <Vibrate className="w-3.5 h-3.5" />
          <span>Test Rumble</span>
        </button>
      </div>
    </div>
  );
};
