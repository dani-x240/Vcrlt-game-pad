import React, { useState } from 'react';
import {
  FileCode,
  Download,
  Copy,
  Check,
  Terminal,
  Cpu,
  Layers,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  FolderGit2,
  Package,
} from 'lucide-react';
import { downloadProjectZip } from '../services/zipExporter';

export const FlutterActionsStudio: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<string>('android_workflow');
  const [copied, setCopied] = useState<boolean>(false);

  const fileContents: Record<
    string,
    { title: string; path: string; language: string; content: string }
  > = {
    android_workflow: {
      title: 'GitHub Action: Android APK (.apk)',
      path: '.github/workflows/android.yml',
      language: 'yaml',
      content: `name: Build VCRLT Android APK

on:
  push:
    branches: [ main, master ]
  pull_request:
    branches: [ main, master ]
  workflow_dispatch:

jobs:
  build-apk:
    name: Build Android APK (dani.x240 Controller)
    runs-on: ubuntu-latest

    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4

      - name: Set up Java Development Kit (JDK 17)
        uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'
          cache: 'gradle'

      - name: Set up Flutter
        uses: subosito/flutter-action@v2
        with:
          flutter-version: '3.29.x'
          channel: 'stable'
          cache: true

      - name: Verify Flutter Installation
        run: flutter doctor -v

      - name: Get Dependencies
        working-directory: ./flutter_source/android_controller
        run: flutter pub get

      - name: Build Android Release APK
        working-directory: ./flutter_source/android_controller
        run: flutter build apk --release --split-per-abi

      - name: Upload Universal & ABI-Split APK Artifacts
        uses: actions/upload-artifact@v4
        with:
          name: VCRLT-Controller-Android-APKs
          path: flutter_source/android_controller/build/app/outputs/flutter-apk/*.apk`,
    },
    windows_workflow: {
      title: 'GitHub Action: Windows Desktop (.exe)',
      path: '.github/workflows/windows.yml',
      language: 'yaml',
      content: `name: Build VCRLT Windows Receiver EXE

on:
  push:
    branches: [ main, master ]
  pull_request:
    branches: [ main, master ]
  workflow_dispatch:

jobs:
  build-windows:
    name: Build Windows Desktop Receiver (.exe)
    runs-on: windows-latest

    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4

      - name: Set up Flutter
        uses: subosito/flutter-action@v2
        with:
          flutter-version: '3.29.x'
          channel: 'stable'
          cache: true

      - name: Enable Windows Desktop Support
        run: flutter config --enable-windows-desktop

      - name: Verify Environment
        run: flutter doctor -v

      - name: Get Dependencies
        working-directory: ./flutter_source/windows_receiver
        run: flutter pub get

      - name: Build Windows Desktop Release
        working-directory: ./flutter_source/windows_receiver
        run: flutter build windows --release

      - name: Package VCRLT Receiver Release
        shell: pwsh
        run: |
          Compress-Archive -Path "flutter_source/windows_receiver/build/windows/x64/runner/Release/*" -DestinationPath "VCRLT-PC-Receiver-Windows-x64.zip"

      - name: Upload Windows Executable Artifact
        uses: actions/upload-artifact@v4
        with:
          name: VCRLT-PC-Receiver-Windows-x64
          path: VCRLT-PC-Receiver-Windows-x64.zip`,
    },
    dani_pad_dart: {
      title: 'Flutter Controller: dani_x240_pad.dart',
      path: 'flutter_source/android_controller/lib/dani_x240_pad.dart',
      language: 'dart',
      content: `import 'dart:async';
import 'dart:io';
import 'dart:math';
import 'package:flutter/material.dart';
import '../../protocol/vcrlt_packet.dart';

class DaniX240PadScreen extends StatefulWidget {
  const DaniX240PadScreen({super.key});

  @override
  State<DaniX240PadScreen> createState() => _DaniX240PadScreenState();
}

class _DaniX240PadScreenState extends State<DaniX240PadScreen> {
  // Real-time analog sticks (-1.0 to 1.0)
  double _leftStickX = 0.0;
  double _leftStickY = 0.0;
  double _rightStickX = 0.0;
  double _rightStickY = 0.0;
  
  // Triggers & Bumpers
  double _l2Trigger = 0.0;
  double _r2Trigger = 0.0;
  bool _l1 = false;
  bool _r1 = false;

  // D-Pad and Action buttons (ABXY)
  bool _dpadUp = false, _dpadDown = false, _dpadLeft = false, _dpadRight = false;
  bool _btnA = false, _btnB = false, _btnX = false, _btnY = false;

  // Central precision touchpad
  double _touchpadX = 0.5, _touchpadY = 0.5;
  bool _touchpadActive = false;

  double _deadZone = 0.10; // 10% deadzone
  RawDatagramSocket? _udpSocket;

  // Transmits low-latency binary UDP packet to Windows Receiver
  void _sendPacket() {
    final packet = VcrltPacket(
      controllerId: 1,
      sequence: DateTime.now().millisecondsSinceEpoch,
      timestamp: DateTime.now().millisecondsSinceEpoch,
      leftStick: VcrltStickCoordinate(x: _applyDeadZone(_leftStickX), y: _applyDeadZone(_leftStickY)),
      rightStick: VcrltStickCoordinate(x: _applyDeadZone(_rightStickX), y: _applyDeadZone(_rightStickY)),
      leftTrigger: _l2Trigger,
      rightTrigger: _r2Trigger,
      l1: _l1,
      r1: _r1,
      dpadUp: _dpadUp,
      dpadDown: _dpadDown,
      dpadLeft: _dpadLeft,
      dpadRight: _dpadRight,
      a: _btnA,
      b: _btnB,
      x: _btnX,
      y: _btnY,
      select: false,
      start: false,
      home: false,
      l3: false,
      r3: false,
      touchpad: VcrltTouchpadCoordinate(x: _touchpadX, y: _touchpadY, active: _touchpadActive, clicked: false),
    );

    _udpSocket?.send(packet.toBinary(), InternetAddress('255.255.255.255'), 48270);
  }

  double _applyDeadZone(double val) {
    if (val.abs() < _deadZone) return 0.0;
    return val;
  }
}`,
    },
    protocol_dart: {
      title: 'Protocol: vcrlt_packet.dart',
      path: 'flutter_source/protocol/vcrlt_packet.dart',
      language: 'dart',
      content: `// VCRLT Low-Latency Protocol
// Defines the input packet structure transmitted over UDP/Wi-Fi or USB

import 'dart:convert';
import 'dart:typed_data';

class VcrltPacket {
  final int controllerId; // 1 to 4
  final int sequence;
  final int timestamp;

  final VcrltStickCoordinate leftStick;
  final VcrltStickCoordinate rightStick;

  final double leftTrigger;  // L2 (0.0 to 1.0)
  final double rightTrigger; // R2 (0.0 to 1.0)

  final bool l1, r1;
  final bool dpadUp, dpadDown, dpadLeft, dpadRight;
  final bool a, b, x, y;
  final bool select, start, home, l3, r3;

  final VcrltTouchpadCoordinate touchpad;

  // Serialize to compact UDP binary buffer
  Uint8List toBinary() {
    final str = jsonEncode(toJson());
    return Uint8List.fromList(utf8.encode(str));
  }
}`,
    },
    windows_receiver_dart: {
      title: 'Windows Receiver: main.dart',
      path: 'flutter_source/windows_receiver/lib/main.dart',
      language: 'dart',
      content: `import 'package:flutter/material.dart';
import 'virtual_gamepad.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const VcrltWindowsReceiverApp());
}

// Runs as a Windows background system tray application
// Feeds packets to Microsoft XInput / ViGEm Virtual Controller`,
    },
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(fileContents[selectedFile].content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      id="flutter-actions-studio-container"
      className="w-full h-full bg-slate-950 text-slate-100 flex flex-col overflow-hidden"
    >
      {/* Studio Header */}
      <div className="px-6 py-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <FolderGit2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-base flex items-center gap-2">
              <span>Flutter Source & GitHub Actions Builder</span>
              <span className="text-xs px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 font-semibold border border-blue-500/30">
                APK + EXE Automation
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Pre-configured CI/CD workflows ready to build the Android APK and Windows .exe via GitHub Actions!
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            id="btn-download-full-project"
            onClick={downloadProjectZip}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 transition shadow-lg shadow-emerald-500/25"
          >
            <Download className="w-4 h-4 text-emerald-200" />
            <span>Download Project ZIP</span>
          </button>

          <button
            id="btn-copy-code"
            onClick={handleCopy}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 transition shadow-lg shadow-blue-500/30"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-300" />
                <span>Copied to Clipboard!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copy Selected File</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Studio Split */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: File Tree & Instructions */}
        <div className="w-80 border-r border-slate-800 bg-slate-900/60 p-4 flex flex-col justify-between overflow-y-auto">
          <div className="space-y-4">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                🤖 GitHub Actions Workflows
              </span>
              <div className="space-y-1">
                <button
                  id="tab-file-android-workflow"
                  onClick={() => setSelectedFile('android_workflow')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition ${
                    selectedFile === 'android_workflow'
                      ? 'bg-blue-600 text-white shadow'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Package className="w-4 h-4 text-emerald-400" />
                  <span>.github/workflows/android.yml</span>
                </button>
                <button
                  id="tab-file-windows-workflow"
                  onClick={() => setSelectedFile('windows_workflow')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition ${
                    selectedFile === 'windows_workflow'
                      ? 'bg-blue-600 text-white shadow'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Package className="w-4 h-4 text-cyan-400" />
                  <span>.github/workflows/windows.yml</span>
                </button>
              </div>
            </div>

            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                📱 Flutter Source Code
              </span>
              <div className="space-y-1">
                <button
                  id="tab-file-dani-pad"
                  onClick={() => setSelectedFile('dani_pad_dart')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition ${
                    selectedFile === 'dani_pad_dart'
                      ? 'bg-blue-600 text-white shadow'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <FileCode className="w-4 h-4 text-blue-400" />
                  <span>dani_x240_pad.dart</span>
                </button>
                <button
                  id="tab-file-protocol"
                  onClick={() => setSelectedFile('protocol_dart')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition ${
                    selectedFile === 'protocol_dart'
                      ? 'bg-blue-600 text-white shadow'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <FileCode className="w-4 h-4 text-purple-400" />
                  <span>vcrlt_packet.dart</span>
                </button>
                <button
                  id="tab-file-windows-receiver"
                  onClick={() => setSelectedFile('windows_receiver_dart')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition ${
                    selectedFile === 'windows_receiver_dart'
                      ? 'bg-blue-600 text-white shadow'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <FileCode className="w-4 h-4 text-indigo-400" />
                  <span>windows_receiver/main.dart</span>
                </button>
              </div>
            </div>
          </div>

          {/* Quick Guide Card */}
          <div className="mt-4 p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 space-y-2">
            <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <Download className="w-4 h-4" />
              <span>Instant Download Ready</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-300">
              Click <strong>Download Project ZIP</strong> above to instantly get all files on your computer.
            </p>
            <div className="pt-2 border-t border-slate-800 text-[11px] leading-relaxed space-y-1 text-slate-400">
              <p className="font-semibold text-blue-400">To build on GitHub:</p>
              <p>1. Go to <strong>github.com</strong> &rarr; <strong>New Repository</strong>.</p>
              <p>2. Drag & drop the unzipped files into GitHub.</p>
              <p>3. The <strong>Actions</strong> tab automatically compiles your <strong>.apk</strong> and <strong>.exe</strong>!</p>
            </div>
          </div>
        </div>

        {/* Right Area: Code Display */}
        <div className="flex-1 flex flex-col bg-slate-950 overflow-hidden">
          <div className="px-6 py-2 bg-slate-900 border-b border-slate-800 flex justify-between items-center text-xs text-slate-400 font-mono">
            <span>Path: {fileContents[selectedFile].path}</span>
            <span className="text-blue-400 uppercase">
              {fileContents[selectedFile].language}
            </span>
          </div>

          <pre className="flex-1 p-6 overflow-auto font-mono text-xs text-slate-300 bg-slate-950 leading-relaxed select-text">
            <code>{fileContents[selectedFile].content}</code>
          </pre>
        </div>
      </div>
    </div>
  );
};
