import 'package:flutter/material.dart';
import 'vcrlt_packet.dart';
import 'network_manager.dart';
import 'virtual_gamepad.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const VcrltWindowsReceiverApp());
}

class VcrltWindowsReceiverApp extends StatelessWidget {
  const VcrltWindowsReceiverApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'VCRLT PC Receiver',
      debugShowCheckedModeBanner: false,
      theme: ThemeData.dark().copyWith(
        scaffoldBackgroundColor: const Color(0xFF0C0E15),
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFF2563EB),
          secondary: Color(0xFF10B981),
          surface: Color(0xFF151924),
        ),
      ),
      home: const ReceiverDashboardScreen(),
    );
  }
}

class ReceiverDashboardScreen extends StatefulWidget {
  const ReceiverDashboardScreen({super.key});

  @override
  State<ReceiverDashboardScreen> createState() => _ReceiverDashboardScreenState();
}

class _ReceiverDashboardScreenState extends State<ReceiverDashboardScreen> {
  late final VirtualGamepadService _gamepadService;
  late final NetworkManager _networkManager;

  ConnectedClient? _connectedClient;
  int _currentHz = 0;
  double _latencyMs = 1.8;
  VcrltPacket? _latestPacket;

  @override
  void initState() {
    super.initState();
    _gamepadService = VirtualGamepadService();
    _gamepadService.initialize();

    _networkManager = NetworkManager(gamepadService: _gamepadService);
    _networkManager.start();

    _networkManager.clientStream.listen((client) {
      if (mounted) {
        setState(() => _connectedClient = client);
      }
    });

    _networkManager.packetStream.listen((pkt) {
      if (mounted) {
        setState(() => _latestPacket = pkt);
      }
    });

    _networkManager.statsStream.listen((stats) {
      if (mounted) {
        setState(() {
          _currentHz = stats['hz'] as int? ?? 0;
          _latencyMs = stats['latency'] as double? ?? 1.8;
        });
      }
    });
  }

  @override
  void dispose() {
    _networkManager.stop();
    _gamepadService.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final bool isPaired = _connectedClient != null;

    return Scaffold(
      appBar: AppBar(
        backgroundColor: const Color(0xFF11141E),
        elevation: 0,
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: const Color(0xFF2563EB),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(Icons.sports_esports, size: 20, color: Colors.white),
            ),
            const SizedBox(width: 14),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'VCRLT PC RECEIVER',
                  style: TextStyle(fontWeight: FontWeight.bold, letterSpacing: 1.2, fontSize: 16),
                ),
                Text(
                  '${_networkManager.pcName} • ${_networkManager.localIp}:${NetworkManager.port}',
                  style: const TextStyle(fontSize: 11, color: Colors.white54),
                ),
              ],
            ),
          ],
        ),
        actions: [
          Container(
            margin: const EdgeInsets.only(right: 20),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
            decoration: BoxDecoration(
              color: isPaired ? const Color(0xFF064E3B) : const Color(0xFF374151),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: isPaired ? const Color(0xFF10B981) : Colors.white24,
              ),
            ),
            child: Row(
              children: [
                Icon(
                  Icons.circle,
                  color: isPaired ? const Color(0xFF10B981) : Colors.amber,
                  size: 10,
                ),
                const SizedBox(width: 8),
                Text(
                  isPaired ? 'PHONE CONNECTED' : 'WAITING FOR PHONE',
                  style: TextStyle(
                    color: isPaired ? const Color(0xFF6EE7B7) : Colors.white70,
                    fontWeight: FontWeight.bold,
                    fontSize: 11,
                    letterSpacing: 0.8,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Left Panel: Pairing Info & Diagnostics
            Expanded(
              flex: 4,
              child: Column(
                children: [
                  _buildPairingCard(isPaired),
                  const SizedBox(height: 16),
                  _buildDiagnosticsCard(isPaired),
                ],
              ),
            ),
            const SizedBox(width: 20),
            // Right Panel: Live Controller Visualizer
            Expanded(
              flex: 6,
              child: _buildGamepadVisualizer(),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPairingCard(bool isPaired) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFF151924),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white10),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'CONNECTION & PAIRING',
                style: TextStyle(color: Colors.white54, fontSize: 11, letterSpacing: 1.5, fontWeight: FontWeight.bold),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: const Color(0xFF2563EB).withOpacity(0.2),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: const Text('UDP 48270', style: TextStyle(color: Color(0xFF60A5FA), fontSize: 10, fontWeight: FontWeight.bold)),
              ),
            ],
          ),
          const SizedBox(height: 14),

          // PC Local IP
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.black38,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: Colors.white12),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('PC IP Address:', style: TextStyle(color: Colors.white70, fontSize: 13)),
                SelectableText(
                  _networkManager.localIp,
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Colors.white),
                ),
              ],
            ),
          ),
          const SizedBox(height: 10),

          // Fast Pair Code
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.black38,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: const Color(0xFF3B82F6).withOpacity(0.3)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Pair Code / PIN:', style: TextStyle(color: Colors.white70, fontSize: 13)),
                Text(
                  _networkManager.pairCode,
                  style: const TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 4,
                    color: Color(0xFF60A5FA),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Test Vibration Button
          ElevatedButton.icon(
            style: ElevatedButton.styleFrom(
              backgroundColor: isPaired ? const Color(0xFF2563EB) : const Color(0xFF374151),
              minimumSize: const Size.fromHeight(42),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            icon: const Icon(Icons.vibration, size: 18),
            label: Text(isPaired ? 'Send Test Rumble to Phone' : 'Connect Phone First to Test Rumble'),
            onPressed: isPaired
                ? () {
                    _networkManager.sendVibration(intensity: 0.9, durationMs: 200);
                  }
                : null,
          ),
        ],
      ),
    );
  }

  Widget _buildDiagnosticsCard(bool isPaired) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFF151924),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white10),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('SYSTEM DIAGNOSTICS', style: TextStyle(color: Colors.white54, fontSize: 11, letterSpacing: 1.5, fontWeight: FontWeight.bold)),
          const SizedBox(height: 14),
          _diagRow(
            'Active Device',
            isPaired ? '${_connectedClient!.name} (${_connectedClient!.address.address})' : 'None (Broadcasting beacon)',
            Icons.phone_android,
            isPaired ? Colors.green : Colors.white38,
          ),
          const Divider(color: Colors.white10, height: 20),
          _diagRow(
            'Input Rate',
            isPaired ? '$_currentHz Hz' : '0 Hz (Idle)',
            Icons.speed,
            isPaired ? Colors.cyan : Colors.white38,
          ),
          const Divider(color: Colors.white10, height: 20),
          _diagRow(
            'Round-trip Latency',
            isPaired ? '${_latencyMs.toStringAsFixed(1)} ms' : '--',
            Icons.timer,
            Colors.amber,
          ),
          const Divider(color: Colors.white10, height: 20),
          _diagRow(
            'Driver Output',
            'ViGEmBus / XInput (Controller #1)',
            Icons.sports_esports,
            Colors.blue,
          ),
        ],
      ),
    );
  }

  Widget _diagRow(String title, String val, IconData icon, Color color) {
    return Row(
      children: [
        Icon(icon, size: 16, color: color),
        const SizedBox(width: 8),
        Text(title, style: const TextStyle(color: Colors.white70, fontSize: 12)),
        const Spacer(),
        Text(val, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Colors.white)),
      ],
    );
  }

  Widget _buildGamepadVisualizer() {
    final pkt = _latestPacket;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFF151924),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white10),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'LIVE XINPUT CONTROLLER FEED',
                style: TextStyle(color: Colors.white54, fontSize: 11, letterSpacing: 1.5, fontWeight: FontWeight.bold),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: (pkt != null) ? const Color(0xFF10B981).withOpacity(0.15) : Colors.white.withOpacity(0.05),
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(color: (pkt != null) ? const Color(0xFF10B981).withOpacity(0.5) : Colors.white10),
                ),
                child: Text(
                  pkt != null ? 'FEED ACTIVE • 120 FPS' : 'WAITING FOR INPUT',
                  style: TextStyle(
                    color: pkt != null ? const Color(0xFF6EE7B7) : Colors.white38,
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Triggers / Bumpers Bar
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _indicatorPill('L2', (pkt?.leftTrigger ?? 0) > 0.1, val: pkt?.leftTrigger.toStringAsFixed(2)),
              _indicatorPill('L1', pkt?.l1 ?? false),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                decoration: BoxDecoration(
                  color: (pkt?.touchpad.active ?? false) ? const Color(0xFF2563EB).withOpacity(0.3) : Colors.black26,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: (pkt?.touchpad.active ?? false) ? const Color(0xFF60A5FA) : Colors.white10),
                ),
                child: Text(
                  'TOUCHPAD ${(pkt?.touchpad.active ?? false) ? '(${((pkt?.touchpad.x ?? 0.5) * 100).toInt()}%, ${((pkt?.touchpad.y ?? 0.5) * 100).toInt()}%)' : 'IDLE'}',
                  style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.white70),
                ),
              ),
              _indicatorPill('R1', pkt?.r1 ?? false),
              _indicatorPill('R2', (pkt?.rightTrigger ?? 0) > 0.1, val: pkt?.rightTrigger.toStringAsFixed(2)),
            ],
          ),
          const SizedBox(height: 24),

          // Sticks & Buttons Area
          Expanded(
            child: Row(
              children: [
                // Left Stick & D-Pad
                Expanded(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Text('LEFT ANALOG STICK', style: TextStyle(fontSize: 11, color: Colors.white38, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 8),
                      _buildStickViewer(pkt?.leftStick.x ?? 0, pkt?.leftStick.y ?? 0),
                      const SizedBox(height: 16),
                      // D-Pad Grid
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          _indicatorSquare('▲', pkt?.dpadUp ?? false),
                          const SizedBox(width: 6),
                          _indicatorSquare('◀', pkt?.dpadLeft ?? false),
                          const SizedBox(width: 6),
                          _indicatorSquare('▼', pkt?.dpadDown ?? false),
                          const SizedBox(width: 6),
                          _indicatorSquare('▶', pkt?.dpadRight ?? false),
                        ],
                      ),
                    ],
                  ),
                ),

                // Center Utility Buttons
                Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    _indicatorPill('SELECT', pkt?.select ?? false),
                    const SizedBox(height: 12),
                    Container(
                      width: 38,
                      height: 38,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: (pkt?.home ?? false) ? const Color(0xFF2563EB) : Colors.black45,
                        border: Border.all(color: (pkt?.home ?? false) ? Colors.white : Colors.white24),
                      ),
                      child: const Center(
                        child: Icon(Icons.circle, size: 14, color: Colors.white),
                      ),
                    ),
                    const SizedBox(height: 12),
                    _indicatorPill('START', pkt?.start ?? false),
                  ],
                ),

                // Right Stick & Action Buttons (▲, ●, ✕, ■)
                Expanded(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Text('RIGHT ANALOG STICK', style: TextStyle(fontSize: 11, color: Colors.white38, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 8),
                      _buildStickViewer(pkt?.rightStick.x ?? 0, pkt?.rightStick.y ?? 0),
                      const SizedBox(height: 16),
                      // Action buttons
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          _indicatorRound('▲', pkt?.y ?? false, Colors.teal),
                          const SizedBox(width: 8),
                          _indicatorRound('■', pkt?.x ?? false, Colors.pinkAccent),
                          const SizedBox(width: 8),
                          _indicatorRound('✕', pkt?.a ?? false, Colors.blue),
                          const SizedBox(width: 8),
                          _indicatorRound('●', pkt?.b ?? false, Colors.redAccent),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _indicatorPill(String label, bool active, {String? val}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
      decoration: BoxDecoration(
        color: active ? const Color(0xFF2563EB) : Colors.black38,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: active ? const Color(0xFF60A5FA) : Colors.white12),
      ),
      child: Text(
        val != null ? '$label: $val' : label,
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.bold,
          color: active ? Colors.white : Colors.white54,
        ),
      ),
    );
  }

  Widget _indicatorSquare(String label, bool active) {
    return Container(
      width: 32,
      height: 32,
      decoration: BoxDecoration(
        color: active ? const Color(0xFF2563EB) : Colors.black38,
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: active ? Colors.white : Colors.white12),
      ),
      child: Center(
        child: Text(label, style: TextStyle(color: active ? Colors.white : Colors.white54, fontSize: 13, fontWeight: FontWeight.bold)),
      ),
    );
  }

  Widget _indicatorRound(String label, bool active, Color color) {
    return Container(
      width: 34,
      height: 34,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: active ? color : Colors.black38,
        border: Border.all(color: active ? Colors.white : color.withOpacity(0.5), width: 1.5),
      ),
      child: Center(
        child: Text(
          label,
          style: TextStyle(color: active ? Colors.white : color, fontSize: 14, fontWeight: FontWeight.bold),
        ),
      ),
    );
  }

  Widget _buildStickViewer(double x, double y) {
    return Container(
      width: 90,
      height: 90,
      decoration: BoxDecoration(
        color: Colors.black45,
        shape: BoxShape.circle,
        border: Border.all(color: Colors.white24),
      ),
      child: Stack(
        alignment: Alignment.center,
        children: [
          Transform.translate(
            offset: Offset(x * 28, y * 28),
            child: Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: const Color(0xFF2563EB),
                border: Border.all(color: Colors.white, width: 2),
                boxShadow: [
                  BoxShadow(color: const Color(0xFF2563EB).withOpacity(0.6), blurRadius: 8),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
