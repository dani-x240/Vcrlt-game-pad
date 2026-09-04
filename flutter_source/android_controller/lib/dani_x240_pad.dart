import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'vcrlt_packet.dart';
import 'network_client.dart';

class DaniX240PadScreen extends StatefulWidget {
  const DaniX240PadScreen({super.key});

  @override
  State<DaniX240PadScreen> createState() => _DaniX240PadScreenState();
}

class _DaniX240PadScreenState extends State<DaniX240PadScreen> {
  final NetworkClient _client = NetworkClient();

  ConnectionStatus _status = ConnectionStatus.disconnected;
  String _ipInput = '192.168.1.';
  String _pinInput = '482731';

  // Controller State
  int _sequence = 0;
  double _leftStickX = 0.0;
  double _leftStickY = 0.0;
  double _rightStickX = 0.0;
  double _rightStickY = 0.0;

  double _l2Trigger = 0.0;
  double _r2Trigger = 0.0;
  bool _l1 = false;
  bool _r1 = false;

  bool _dpadUp = false;
  bool _dpadDown = false;
  bool _dpadLeft = false;
  bool _dpadRight = false;

  bool _btnA = false; // Cross
  bool _btnB = false; // Circle
  bool _btnX = false; // Square
  bool _btnY = false; // Triangle

  bool _btnSelect = false;
  bool _btnStart = false;
  bool _btnHome = false;
  bool _btnL3 = false;
  bool _btnR3 = false;
  bool _micMuted = false;

  // Touchpad
  double _touchpadX = 0.5;
  double _touchpadY = 0.5;
  bool _touchpadActive = false;

  @override
  void initState() {
    super.initState();
    _initNetwork();
  }

  Future<void> _initNetwork() async {
    await _client.init();

    _client.onStatusChanged = (status) {
      if (mounted) setState(() => _status = status);
    };

    _client.onPcDiscovered = (pc) {
      if (mounted) {
        setState(() {
          _ipInput = pc.ip;
          _pinInput = pc.defaultPin;
        });
      }
    };

    _client.onVibrate = (intensity, durationMs) {
      try {
        HapticFeedback.heavyImpact();
      } catch (_) {}
    };

    // Auto-start discovery on launch
    _client.startDiscovery();
  }

  void _sendPacket() {
    _sequence++;
    final packet = VcrltPacket(
      controllerId: 1,
      sequence: _sequence,
      timestamp: DateTime.now().millisecondsSinceEpoch,
      leftStick: VcrltStickCoordinate(x: _leftStickX, y: _leftStickY),
      rightStick: VcrltStickCoordinate(x: _rightStickX, y: _rightStickY),
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
      select: _btnSelect,
      start: _btnStart,
      home: _btnHome,
      l3: _btnL3,
      r3: _btnR3,
      touchpad: VcrltTouchpadCoordinate(
        x: _touchpadX,
        y: _touchpadY,
        active: _touchpadActive,
        clicked: _touchpadActive,
      ),
    );

    _client.sendControllerPacket(packet);
  }

  void _triggerHapticTap() {
    try {
      HapticFeedback.lightImpact();
    } catch (_) {}
  }

  @override
  void dispose() {
    _client.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isConnected = _status == ConnectionStatus.connected;

    return Scaffold(
      backgroundColor: const Color(0xFF07090E),
      body: SafeArea(
        child: isConnected ? _buildControllerPad() : _buildPairingScreen(),
      ),
    );
  }

  Widget _buildPairingScreen() {
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
        child: Container(
          constraints: const BoxConstraints(maxWidth: 480),
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: const Color(0xFF10131B),
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: Colors.white12),
            boxShadow: const [
              BoxShadow(color: Colors.black54, blurRadius: 20, offset: Offset(0, 10)),
            ],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Console Logo Icon
              Container(
                width: 56,
                height: 56,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF2563EB), Color(0xFF4F46E5)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF2563EB).withOpacity(0.4),
                      blurRadius: 14,
                    ),
                  ],
                ),
                child: const Icon(Icons.sports_esports, color: Colors.white, size: 30),
              ),
              const SizedBox(height: 12),
              const Text(
                'VCRLT Game Pad',
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: Colors.white, letterSpacing: 1.1),
              ),
              const SizedBox(height: 4),
              const Text(
                'Connect to PC over Wi-Fi for ultra-low latency gaming',
                style: TextStyle(fontSize: 12, color: Colors.white54),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 20),

              // Discovered PCs list
              if (_client.discoveredPcs.isNotEmpty) ...[
                Align(
                  alignment: Alignment.centerLeft,
                  child: Text(
                    'DISCOVERED COMPUTERS (${_client.discoveredPcs.length})',
                    style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 1.2, color: Color(0xFF60A5FA)),
                  ),
                ),
                const SizedBox(height: 8),
                ..._client.discoveredPcs.map((pc) => Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      decoration: BoxDecoration(
                        color: const Color(0xFF181C28),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFF2563EB).withOpacity(0.4)),
                      ),
                      child: ListTile(
                        leading: const Icon(Icons.desktop_windows, color: Color(0xFF60A5FA)),
                        title: Text(pc.name, style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
                        subtitle: Text('${pc.ip}:${pc.port}', style: const TextStyle(color: Colors.white54, fontSize: 11)),
                        trailing: ElevatedButton(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF2563EB),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          ),
                          onPressed: () {
                            _client.pairWithPc(ip: pc.ip, port: pc.port, pin: pc.defaultPin);
                          },
                          child: const Text('Connect', style: TextStyle(fontWeight: FontWeight.bold)),
                        ),
                      ),
                    )),
                const SizedBox(height: 12),
              ],

              // Hotspot vs Wi-Fi Quick Toggle
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      style: OutlinedButton.styleFrom(
                        foregroundColor: Colors.white,
                        side: BorderSide(color: _ipInput.startsWith('192.168.1') ? const Color(0xFF2563EB) : Colors.white12),
                        backgroundColor: _ipInput.startsWith('192.168.1') ? const Color(0xFF1E3A8A).withOpacity(0.3) : Colors.transparent,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      icon: const Icon(Icons.wifi, size: 14),
                      label: const Text('Home Wi-Fi', style: TextStyle(fontSize: 11)),
                      onPressed: () {
                        setState(() => _ipInput = '192.168.1.');
                      },
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: OutlinedButton.icon(
                      style: OutlinedButton.styleFrom(
                        foregroundColor: Colors.white,
                        side: BorderSide(color: _ipInput.startsWith('192.168.43') ? Colors.amber : Colors.white12),
                        backgroundColor: _ipInput.startsWith('192.168.43') ? Colors.amber.withOpacity(0.2) : Colors.transparent,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      icon: const Icon(Icons.cell_tower, size: 14, color: Colors.amber),
                      label: const Text('Phone Hotspot', style: TextStyle(fontSize: 11)),
                      onPressed: () {
                        setState(() => _ipInput = '192.168.43.1');
                      },
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),

              // Manual IP / PIN Input
              Row(
                children: [
                  Expanded(
                    flex: 3,
                    child: TextField(
                      style: const TextStyle(color: Colors.white, fontSize: 13),
                      decoration: InputDecoration(
                        labelText: 'PC IP Address',
                        labelStyle: const TextStyle(color: Colors.white54, fontSize: 12),
                        hintText: '192.168.1.xxx',
                        hintStyle: const TextStyle(color: Colors.white24),
                        filled: true,
                        fillColor: const Color(0xFF151924),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
                      ),
                      controller: TextEditingController(text: _ipInput)..selection = TextSelection.collapsed(offset: _ipInput.length),
                      onChanged: (val) => _ipInput = val,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    flex: 2,
                    child: TextField(
                      style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold),
                      decoration: InputDecoration(
                        labelText: 'Pair PIN',
                        labelStyle: const TextStyle(color: Colors.white54, fontSize: 12),
                        hintText: '482731',
                        hintStyle: const TextStyle(color: Colors.white24),
                        filled: true,
                        fillColor: const Color(0xFF151924),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
                      ),
                      controller: TextEditingController(text: _pinInput),
                      onChanged: (val) => _pinInput = val,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // Connect Button
              SizedBox(
                width: double.infinity,
                height: 46,
                child: ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF2563EB),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  icon: _status == ConnectionStatus.connecting
                      ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Icon(Icons.wifi, size: 18),
                  label: Text(
                    _status == ConnectionStatus.connecting ? 'Connecting...' : 'Pair & Launch Gamepad',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                  ),
                  onPressed: _status == ConnectionStatus.connecting
                      ? null
                      : () {
                          _client.pairWithPc(ip: _ipInput.trim(), pin: _pinInput.trim());
                        },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // Pure wordless controller pad matching photo
  Widget _buildControllerPad() {
    return Container(
      width: double.infinity,
      height: double.infinity,
      decoration: const BoxDecoration(
        color: Color(0xFF090B10),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          // TOP ROW: L2, L1, Touchpad, R1, R2
          _buildTopShoulderRow(),

          // MIDDLE ROW: D-Pad & Action Buttons
          Expanded(
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                _buildDpadCluster(),
                _buildActionButtonsCluster(),
              ],
            ),
          ),

          // BOTTOM ROW: Left Stick, Center Icons, Right Stick
          _buildBottomSticksAndUtility(),
        ],
      ),
    );
  }

  Widget _buildTopShoulderRow() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        // L2 and L1
        Row(
          children: [
            _shoulderCapsule('L2', _l2Trigger > 0.5, (pressed) {
              _triggerHapticTap();
              setState(() => _l2Trigger = pressed ? 1.0 : 0.0);
              _sendPacket();
            }, width: 78, height: 38),
            const SizedBox(width: 6),
            _shoulderCapsule('L1', _l1, (pressed) {
              _triggerHapticTap();
              setState(() => _l1 = pressed);
              _sendPacket();
            }, width: 70, height: 34),
          ],
        ),

        // Center Touchpad (curved wide capsule)
        GestureDetector(
          onPanDown: (d) {
            _triggerHapticTap();
            setState(() => _touchpadActive = true);
          },
          onPanUpdate: (d) {
            setState(() {
              _touchpadX = (d.localPosition.dx / 220.0).clamp(0.0, 1.0);
              _touchpadY = (d.localPosition.dy / 64.0).clamp(0.0, 1.0);
            });
            _sendPacket();
          },
          onPanEnd: (_) {
            setState(() => _touchpadActive = false);
            _sendPacket();
          },
          child: Container(
            width: 220,
            height: 64,
            decoration: BoxDecoration(
              color: _touchpadActive ? const Color(0xFF1E273A) : const Color(0xFF12151F),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: _touchpadActive ? const Color(0xFF60A5FA) : Colors.white12,
                width: 1.5,
              ),
            ),
            child: Center(
              child: Container(
                width: 6,
                height: 6,
                decoration: BoxDecoration(
                  color: _touchpadActive ? const Color(0xFF60A5FA) : Colors.white24,
                  shape: BoxShape.circle,
                ),
              ),
            ),
          ),
        ),

        // R1 and R2
        Row(
          children: [
            _shoulderCapsule('R1', _r1, (pressed) {
              _triggerHapticTap();
              setState(() => _r1 = pressed);
              _sendPacket();
            }, width: 70, height: 34),
            const SizedBox(width: 6),
            _shoulderCapsule('R2', _r2Trigger > 0.5, (pressed) {
              _triggerHapticTap();
              setState(() => _r2Trigger = pressed ? 1.0 : 0.0);
              _sendPacket();
            }, width: 78, height: 38),
          ],
        ),
      ],
    );
  }

  Widget _shoulderCapsule(String label, bool active, Function(bool) onChanged, {double width = 74, double height = 36}) {
    return GestureDetector(
      onTapDown: (_) => onChanged(true),
      onTapUp: (_) => onChanged(false),
      onTapCancel: () => onChanged(false),
      child: Container(
        width: width,
        height: height,
        decoration: BoxDecoration(
          color: active ? const Color(0xFF2563EB) : const Color(0xFF161A24),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: active ? const Color(0xFF60A5FA) : Colors.white24),
        ),
        alignment: Alignment.center,
        child: Text(
          label,
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: active ? Colors.white : Colors.white70),
        ),
      ),
    );
  }

  Widget _buildDpadCluster() {
    return Container(
      width: 140,
      height: 140,
      margin: const EdgeInsets.only(left: 20),
      child: Stack(
        alignment: Alignment.center,
        children: [
          // Up
          Positioned(
            top: 0,
            child: _dpadKey(Icons.keyboard_arrow_up, _dpadUp, (v) {
              setState(() => _dpadUp = v);
              _sendPacket();
            }),
          ),
          // Down
          Positioned(
            bottom: 0,
            child: _dpadKey(Icons.keyboard_arrow_down, _dpadDown, (v) {
              setState(() => _dpadDown = v);
              _sendPacket();
            }),
          ),
          // Left
          Positioned(
            left: 0,
            child: _dpadKey(Icons.keyboard_arrow_left, _dpadLeft, (v) {
              setState(() => _dpadLeft = v);
              _sendPacket();
            }),
          ),
          // Right
          Positioned(
            right: 0,
            child: _dpadKey(Icons.keyboard_arrow_right, _dpadRight, (v) {
              setState(() => _dpadRight = v);
              _sendPacket();
            }),
          ),
          // Center core
          Container(
            width: 32,
            height: 32,
            decoration: const BoxDecoration(
              color: Color(0xFF0F121A),
              shape: BoxShape.circle,
            ),
          ),
        ],
      ),
    );
  }

  Widget _dpadKey(IconData icon, bool active, Function(bool) onChanged) {
    return GestureDetector(
      onTapDown: (_) {
        _triggerHapticTap();
        onChanged(true);
      },
      onTapUp: (_) => onChanged(false),
      onTapCancel: () => onChanged(false),
      child: Container(
        width: 44,
        height: 44,
        decoration: BoxDecoration(
          color: active ? const Color(0xFF2563EB) : const Color(0xFF161A26),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: active ? Colors.white : Colors.white12),
        ),
        child: Icon(icon, color: active ? Colors.white : Colors.white70, size: 28),
      ),
    );
  }

  Widget _buildActionButtonsCluster() {
    return Container(
      width: 140,
      height: 140,
      margin: const EdgeInsets.only(right: 20),
      child: Stack(
        alignment: Alignment.center,
        children: [
          // Triangle (Top)
          Positioned(
            top: 0,
            child: _actionKey('▲', const Color(0xFF2DD4BF), _btnY, (v) {
              setState(() => _btnY = v);
              _sendPacket();
            }),
          ),
          // Circle (Right)
          Positioned(
            right: 0,
            child: _actionKey('●', const Color(0xFFF43F5E), _btnB, (v) {
              setState(() => _btnB = v);
              _sendPacket();
            }),
          ),
          // Cross (Bottom)
          Positioned(
            bottom: 0,
            child: _actionKey('✕', const Color(0xFF3B82F6), _btnA, (v) {
              setState(() => _btnA = v);
              _sendPacket();
            }),
          ),
          // Square (Left)
          Positioned(
            left: 0,
            child: _actionKey('■', const Color(0xFFEC4899), _btnX, (v) {
              setState(() => _btnX = v);
              _sendPacket();
            }),
          ),
        ],
      ),
    );
  }

  Widget _actionKey(String symbol, Color accent, bool active, Function(bool) onChanged) {
    return GestureDetector(
      onTapDown: (_) {
        _triggerHapticTap();
        onChanged(true);
      },
      onTapUp: (_) => onChanged(false),
      onTapCancel: () => onChanged(false),
      child: Container(
        width: 44,
        height: 44,
        decoration: BoxDecoration(
          color: active ? accent : const Color(0xFF161A26),
          shape: BoxShape.circle,
          border: Border.all(color: active ? Colors.white : accent.withOpacity(0.6), width: 1.5),
        ),
        alignment: Alignment.center,
        child: Text(
          symbol,
          style: TextStyle(
            color: active ? Colors.white : accent,
            fontSize: 18,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
    );
  }

  Widget _buildBottomSticksAndUtility() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        // Left Analog Stick & L3 Click
        Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            _analogStickWidget(
              x: _leftStickX,
              y: _leftStickY,
              onChanged: (x, y) {
                setState(() {
                  _leftStickX = x;
                  _leftStickY = y;
                });
                _sendPacket();
              },
            ),
            GestureDetector(
              onTapDown: (_) {
                _triggerHapticTap();
                setState(() => _btnL3 = true);
                _sendPacket();
              },
              onTapUp: (_) {
                setState(() => _btnL3 = false);
                _sendPacket();
              },
              onTapCancel: () {
                setState(() => _btnL3 = false);
                _sendPacket();
              },
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
                decoration: BoxDecoration(
                  color: _btnL3 ? const Color(0xFF10B981) : const Color(0xFF181C28),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: _btnL3 ? Colors.white : Colors.white24),
                ),
                child: const Text('L3', style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
              ),
            ),
          ],
        ),

        // Center Utility Icons: Share, PS Home, Options, Mic
        Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: Row(
            children: [
              _utilityIconButton(Icons.share, _btnSelect, (v) {
                _triggerHapticTap();
                setState(() => _btnSelect = v);
                _sendPacket();
              }),
              const SizedBox(width: 14),
              // Home button
              GestureDetector(
                onTap: () {
                  _triggerHapticTap();
                  setState(() => _btnHome = !_btnHome);
                  _sendPacket();
                },
                child: Container(
                  width: 38,
                  height: 38,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: _btnHome ? const Color(0xFF2563EB) : const Color(0xFF181C28),
                    border: Border.all(color: _btnHome ? Colors.white : Colors.white24, width: 2),
                  ),
                  child: const Center(
                    child: Icon(Icons.circle, size: 12, color: Colors.white),
                  ),
                ),
              ),
              const SizedBox(width: 14),
              _utilityIconButton(Icons.menu, _btnStart, (v) {
                _triggerHapticTap();
                setState(() => _btnStart = v);
                _sendPacket();
              }),
              const SizedBox(width: 14),
              _utilityIconButton(
                _micMuted ? Icons.mic_off : Icons.mic,
                _micMuted,
                (_) {
                  _triggerHapticTap();
                  setState(() => _micMuted = !_micMuted);
                },
                color: _micMuted ? Colors.amber : null,
              ),
            ],
          ),
        ),

        // Right Analog Stick & R3 Click
        Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            _analogStickWidget(
              x: _rightStickX,
              y: _rightStickY,
              onChanged: (x, y) {
                setState(() {
                  _rightStickX = x;
                  _rightStickY = y;
                });
                _sendPacket();
              },
            ),
            GestureDetector(
              onTapDown: (_) {
                _triggerHapticTap();
                setState(() => _btnR3 = true);
                _sendPacket();
              },
              onTapUp: (_) {
                setState(() => _btnR3 = false);
                _sendPacket();
              },
              onTapCancel: () {
                setState(() => _btnR3 = false);
                _sendPacket();
              },
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
                decoration: BoxDecoration(
                  color: _btnR3 ? const Color(0xFF10B981) : const Color(0xFF181C28),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: _btnR3 ? Colors.white : Colors.white24),
                ),
                child: const Text('R3', style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _utilityIconButton(IconData icon, bool active, Function(bool) onChanged, {Color? color}) {
    return GestureDetector(
      onTapDown: (_) => onChanged(true),
      onTapUp: (_) => onChanged(false),
      onTapCancel: () => onChanged(false),
      child: Container(
        width: 32,
        height: 32,
        decoration: BoxDecoration(
          color: active ? const Color(0xFF2563EB) : const Color(0xFF141722),
          shape: BoxShape.circle,
          border: Border.all(color: active ? Colors.white : Colors.white12),
        ),
        child: Icon(icon, size: 16, color: color ?? (active ? Colors.white : Colors.white54)),
      ),
    );
  }

  Widget _analogStickWidget({
    required double x,
    required double y,
    required Function(double x, double y) onChanged,
  }) {
    const double radius = 52.0;

    return GestureDetector(
      onPanUpdate: (details) {
        final localPos = details.localPosition - const Offset(radius, radius);
        final dist = sqrt(localPos.dx * localPos.dx + localPos.dy * localPos.dy);
        double nx = localPos.dx / radius;
        double ny = localPos.dy / radius;
        if (dist > radius) {
          nx = (localPos.dx / dist);
          ny = (localPos.dy / dist);
        }
        onChanged(nx.clamp(-1.0, 1.0), ny.clamp(-1.0, 1.0));
      },
      onPanEnd: (_) {
        _triggerHapticTap();
        onChanged(0.0, 0.0);
      },
      onPanCancel: () => onChanged(0.0, 0.0),
      child: Container(
        width: radius * 2,
        height: radius * 2,
        margin: const EdgeInsets.only(bottom: 6),
        decoration: BoxDecoration(
          color: const Color(0xFF10131B),
          shape: BoxShape.circle,
          border: Border.all(color: Colors.white12, width: 2),
        ),
        child: Stack(
          alignment: Alignment.center,
          children: [
            Transform.translate(
              offset: Offset(x * 24, y * 24),
              child: Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  gradient: const RadialGradient(
                    colors: [Color(0xFF2E374D), Color(0xFF171B26)],
                  ),
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.white24, width: 1.5),
                  boxShadow: const [
                    BoxShadow(color: Colors.black87, blurRadius: 6, offset: Offset(0, 3)),
                  ],
                ),
                child: Center(
                  child: Container(
                    width: 20,
                    height: 20,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(color: Colors.white10),
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
