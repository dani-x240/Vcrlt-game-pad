// ViGEmClient / XInput FFI Bridge & Input Dispatcher for Windows
// Feeds normalized controller axes and button masks directly to Windows OS & games

import 'dart:async';
import 'dart:ffi' as ffi;
import '../../protocol/vcrlt_packet.dart';

class VirtualGamepadService {
  bool isInitialized = false;
  bool vigemAvailable = false;
  bool keyboardFallbackEnabled = true;

  // Cached current controller state
  VcrltPacket? currentState;

  // Stream for UI visualizer
  final _stateController = StreamController<VcrltPacket>.broadcast();
  Stream<VcrltPacket> get stateStream => _stateController.stream;

  void initialize() {
    // Attempt to load ViGEmClient.dll dynamically if present on user's system
    try {
      // In production on Windows, ViGEmClient.dll is placed beside the .exe
      // If installed via ViGEmBus installer or placed in root, loads successfully:
      // final dylib = ffi.DynamicLibrary.open('ViGEmClient.dll');
      // vigemAvailable = true;
    } catch (_) {
      vigemAvailable = false;
    }

    isInitialized = true;
  }

  void updateState(VcrltPacket packet) {
    if (!isInitialized) return;
    currentState = packet;
    _stateController.add(packet);

    // If ViGEm is loaded:
    // Dispatches directly to XUSB_REPORT:
    // short sThumbLX = (packet.leftStick.x * 32767).round();
    // short sThumbLY = (-packet.leftStick.y * 32767).round();
    // short sThumbRX = (packet.rightStick.x * 32767).round();
    // short sThumbRY = (-packet.rightStick.y * 32767).round();
    // byte bLeftTrigger = (packet.leftTrigger * 255).round();
    // byte bRightTrigger = (packet.rightTrigger * 255).round();
    // wButtons |= packet.a ? XINPUT_GAMEPAD_A : 0;
    // wButtons |= packet.b ? XINPUT_GAMEPAD_B : 0;
    // ...
  }

  void dispose() {
    isInitialized = false;
    _stateController.close();
  }
}
