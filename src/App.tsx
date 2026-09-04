import React, { useState } from 'react';
import {
  Smartphone,
  Monitor,
  Columns,
  FolderGit2,
  Wifi,
  Sparkles,
  Sliders,
  Volume2,
  VolumeX,
  Vibrate,
  Info,
  Maximize2,
  Download,
} from 'lucide-react';
import { PhoneController } from './components/PhoneController';
import { PcReceiver } from './components/PcReceiver';
import { FlutterActionsStudio } from './components/FlutterActionsStudio';
import { audioHaptics } from './services/audio';
import { downloadProjectZip } from './services/zipExporter';

type ActiveViewMode = 'phone_pad' | 'pc_receiver' | 'split_simulator' | 'flutter_studio';

export default function App() {
  const [viewMode, setViewMode] = useState<ActiveViewMode>('split_simulator');
  const [audioEnabled, setAudioEnabled] = useState(true);

  const toggleAudio = () => {
    const next = !audioEnabled;
    setAudioEnabled(next);
    audioHaptics.setEnabled(next);
  };

  return (
    <div id="vcrlt-root-app" className="w-screen h-screen bg-neutral-950 text-neutral-100 flex flex-col overflow-hidden font-sans select-none">
      {/* Mobile Top Unmissable Download Strip */}
      <div className="w-full bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 text-white px-3 py-2 flex items-center justify-between shrink-0 shadow-md z-50">
        <div className="flex items-center gap-2 min-w-0">
          <Download className="w-4 h-4 shrink-0 animate-bounce text-emerald-100" />
          <div className="flex flex-col min-w-0">
            <span className="font-black text-xs sm:text-sm text-white leading-tight truncate">
              VCRLT 100% COMPLETE PROJECT ZIP
            </span>
            <span className="text-[10px] text-emerald-100/90 leading-tight truncate">
              Android APK + Windows EXE Workflows + Flutter code (1.1 MB)
            </span>
          </div>
        </div>
        <a
          href="/vcrlt-gamepad-complete-project.zip"
          download="vcrlt-gamepad-complete-project.zip"
          id="btn-mobile-top-download-zip"
          className="bg-white text-emerald-950 hover:bg-neutral-100 font-black text-xs px-3.5 py-1.5 rounded-lg shadow-md shrink-0 active:scale-95 transition flex items-center gap-1.5 border border-emerald-300"
        >
          <Download className="w-3.5 h-3.5 text-emerald-700" />
          <span>DOWNLOAD</span>
        </a>
      </div>

      {/* Universal Top Console Navigation Bar */}
      <header
        id="vcrlt-global-header"
        className="w-full min-h-[48px] bg-slate-900/90 border-b border-slate-800 px-3 flex items-center justify-between gap-2 shrink-0 z-40 backdrop-blur-md overflow-x-auto"
      >
        {/* Brand & Ecosystem Status */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="flex items-center gap-2">
            <img
              src="/app_icon.jpg"
              alt="VCRLT Logo"
              referrerPolicy="no-referrer"
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg object-cover border border-blue-500/40 shadow-md shadow-blue-500/30"
            />
            <div className="flex flex-col">
              <div className="flex items-center gap-1">
                <span className="font-extrabold text-xs sm:text-sm tracking-wider text-white">VCRLT</span>
                <span className="text-[9px] px-1 py-0.2 rounded bg-blue-500/20 text-blue-300 font-mono font-bold">
                  dani.x240
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Central View Mode Switcher */}
        <div className="flex items-center bg-slate-950/80 p-0.5 rounded-xl border border-slate-800 shadow-inner shrink-0">
          <button
            id="nav-split-simulator"
            onClick={() => {
              setViewMode('split_simulator');
              audioHaptics.playButtonClick();
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
              viewMode === 'split_simulator'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Side-by-side Phone Controller & PC Receiver interactive simulation"
          >
            <Columns className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Dual Live Simulator</span>
            <span className="sm:hidden text-[11px]">Dual</span>
          </button>

          <button
            id="nav-phone-pad"
            onClick={() => {
              setViewMode('phone_pad');
              audioHaptics.playButtonClick();
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
              viewMode === 'phone_pad'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Full-screen landscape dani.x240 phone controller"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Phone APK Pad</span>
            <span className="sm:hidden text-[11px]">Phone</span>
          </button>

          <button
            id="nav-pc-receiver"
            onClick={() => {
              setViewMode('pc_receiver');
              audioHaptics.playButtonClick();
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
              viewMode === 'pc_receiver'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Windows PC Receiver, Game Center, and XInput visualizer"
          >
            <Monitor className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">PC Receiver</span>
            <span className="sm:hidden text-[11px]">PC</span>
          </button>

          <button
            id="nav-flutter-studio"
            onClick={() => {
              setViewMode('flutter_studio');
              audioHaptics.playButtonClick();
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
              viewMode === 'flutter_studio'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Flutter Codebase & GitHub Actions APK/EXE Builder"
          >
            <FolderGit2 className="w-3.5 h-3.5" />
            <span className="hidden md:inline font-semibold text-indigo-300">Flutter & GitHub Actions</span>
            <span className="md:hidden text-[11px] text-indigo-300">Code/Actions</span>
          </button>
        </div>

        {/* Utility Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          <a
            href="/vcrlt-gamepad-complete-project.zip"
            download="vcrlt-gamepad-complete-project.zip"
            id="btn-download-project-zip"
            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-md shadow-emerald-500/25 transition flex items-center gap-1"
            title="Download Full Project ZIP (Workflows + Flutter Source + Configs)"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Download ZIP</span>
          </a>

          <button
            id="btn-toggle-sound"
            onClick={toggleAudio}
            className={`p-1.5 rounded-lg border text-xs transition ${
              audioEnabled
                ? 'bg-blue-900/30 border-blue-500/40 text-blue-400'
                : 'bg-slate-800 border-slate-700 text-slate-500'
            }`}
            title="Toggle Tactile Mechanical Sound Feedback"
          >
            {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Floating Download Button for Phones */}
      <a
        href="/vcrlt-gamepad-complete-project.zip"
        download="vcrlt-gamepad-complete-project.zip"
        id="floating-mobile-zip-download"
        className="sm:hidden fixed bottom-4 right-4 z-50 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs py-3 px-4 rounded-full shadow-2xl flex items-center gap-2 border-2 border-white/60 active:scale-95 transition"
      >
        <Download className="w-4 h-4 animate-bounce" />
        <span>DOWNLOAD ZIP</span>
      </a>

      {/* Main Workspace Area */}
      <main className="flex-1 w-full h-[calc(100vh-48px)] overflow-hidden relative">
        {/* VIEW 1: Dual Interactive Live Simulator */}
        {viewMode === 'split_simulator' && (
          <div className="w-full h-full flex flex-col md:flex-row overflow-hidden bg-slate-950">
            {/* Left Screen: Android Phone in Handheld Landscape Container */}
            <div className="w-full md:w-1/2 h-1/2 md:h-full border-b md:border-b-0 md:border-r border-slate-800 flex flex-col overflow-hidden relative">
              <div className="px-4 py-2 bg-slate-900/90 border-b border-slate-800 text-xs font-bold flex items-center justify-between text-slate-300">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-blue-400" />
                  <span>ANDROID PHONE: dani.x240 CONTROLLER</span>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/30">
                  LIVE INTERACTION
                </span>
              </div>
              <div className="flex-1 overflow-hidden">
                <PhoneController compact />
              </div>
            </div>

            {/* Right Screen: Windows PC Receiver with Real-Time XInput Reactivity */}
            <div className="w-full md:w-1/2 h-1/2 md:h-full flex flex-col overflow-hidden">
              <div className="px-4 py-2 bg-slate-900/90 border-b border-slate-800 text-xs font-bold flex items-center justify-between text-slate-300">
                <div className="flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-emerald-400" />
                  <span>WINDOWS PC: VCRLT RECEIVER & GAME CENTER</span>
                </div>
                <span className="text-[10px] font-mono text-blue-400 bg-blue-950 px-2 py-0.5 rounded border border-blue-500/30">
                  XINPUT VIRTUAL DRIVER
                </span>
              </div>
              <div className="flex-1 overflow-hidden">
                <PcReceiver />
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: Dedicated Full-Screen Phone Controller (dani.x240 APK Mode) */}
        {viewMode === 'phone_pad' && (
          <div className="w-full h-full">
            <PhoneController />
          </div>
        )}

        {/* VIEW 3: Dedicated PC Receiver & Game Center */}
        {viewMode === 'pc_receiver' && (
          <div className="w-full h-full">
            <PcReceiver />
          </div>
        )}

        {/* VIEW 4: Flutter Source & GitHub Actions Studio */}
        {viewMode === 'flutter_studio' && (
          <div className="w-full h-full">
            <FlutterActionsStudio />
          </div>
        )}
      </main>
    </div>
  );
}
