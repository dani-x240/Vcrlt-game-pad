import 'dart:io';
import 'package:flutter/material.dart';
import 'vcrlt_packet.dart';
import 'network_manager.dart';
import 'virtual_gamepad.dart';
import 'qr_painter.dart';

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
        scaffoldBackgroundColor: const Color(0xFF0A0D14),
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFF2563EB),
          secondary: Color(0xFF10B981),
          surface: Color(0xFF121622),
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
  bool _forceShowQr = false;

  @override
  void initState() {
    super.initState();
    _gamepadService = VirtualGamepadService();
    _gamepadService.initialize();

    _networkManager = NetworkManager(gamepadService: _gamepadService);
    _networkManager.start();

    _networkManager.clientStream.listen((client) {
      if (mounted) {
        setState(() {
          _connectedClient = client;
          if (client != null) {
            _forceShowQr = false; // Auto-switch to live controller feed upon connection!
          }
        });
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

    // Auto-update QR if Wi-Fi or network changes
    _networkManager.ipStream.listen((newIp) {
      if (mounted) setState(() {});
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
    final bool showFeed = isPaired && !_forceShowQr;

    return Scaffold(
      appBar: AppBar(
        backgroundColor: const Color(0xFF101420),
        elevation: 0,
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF2563EB), Color(0xFF4F46E5)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(Icons.sports_esports, size: 20, color: Colors.white),
            ),
            const SizedBox(width: 14),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Text(
                      'REMOTE GAMEPAD RECEIVER',
                      style: TextStyle(fontWeight: FontWeight.w900, letterSpacing: 1.2, fontSize: 15),
                    ),
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: const Color(0xFF10B981).withOpacity(0.2),
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(color: const Color(0xFF10B981).withOpacity(0.4)),
                      ),
                      child: const Text(
                        'XINPUT • XBOX 360',
                        style: TextStyle(fontSize: 9, fontWeight: FontWeight.w900, color: Color(0xFF34D399), letterSpacing: 0.8),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 2),
                const Text(
                  'ViGEmBus Virtual Gamepad Driver Active • Low Latency UDP',
                  style: TextStyle(fontSize: 10.5, color: Colors.white54),
                ),
              ],
            ),
          ],
        ),
        actions: [
          // Driver Status Pill
          Container(
            margin: const EdgeInsets.symmetric(vertical: 11),
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
            decoration: BoxDecoration(
              color: const Color(0xFF1E293B),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.white12),
            ),
            child: const Row(
              children: [
                Icon(Icons.check_circle, size: 12, color: Color(0xFF38BDF8)),
                SizedBox(width: 6),
                Text('Driver: Ready', style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.bold, color: Colors.white70)),
              ],
            ),
          ),
          const SizedBox(width: 8),

          // Connection Status Pill
          Container(
            margin: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
            decoration: BoxDecoration(
              color: isPaired ? const Color(0xFF064E3B) : const Color(0xFF1E293B),
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
                  size: 9,
                ),
                const SizedBox(width: 8),
                Text(
                  isPaired ? 'PLAYER 1 CONNECTED' : 'WAITING FOR CONNECTION',
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

          // Switch between QR code and Controller Feed button
          if (isPaired)
            Padding(
              padding: const EdgeInsets.only(right: 16),
              child: TextButton.icon(
                style: TextButton.styleFrom(
                  foregroundColor: Colors.white70,
                  backgroundColor: Colors.white10,
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                icon: Icon(_forceShowQr ? Icons.sports_esports : Icons.qr_code, size: 16),
                label: Text(
                  _forceShowQr ? 'Show Controller Feed' : 'Show QR Code',
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                ),
                onPressed: () {
                  setState(() => _forceShowQr = !_forceShowQr);
                },
              ),
            ),
        ],
      ),
      body: Center(
        child: showFeed ? _buildControllerFeedView() : _buildQrCodeFastScreen(),
      ),
    );
  }

  // =========================================================================
  // 1. FAST SCREEN: AUTO-GENERATED QR CODE ON THE CURRENT WI-FI / NETWORK
  // =========================================================================
  Widget _buildQrCodeFastScreen() {
    final qrData = _networkManager.qrPayload;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Container(
        constraints: const BoxConstraints(maxWidth: 580),
        padding: const EdgeInsets.all(28),
        decoration: BoxDecoration(
          color: const Color(0xFF121622),
          borderRadius: BorderRadius.circular(28),
          border: Border.all(color: Colors.white12),
          boxShadow: const [
            BoxShadow(color: Colors.black54, blurRadius: 24, offset: Offset(0, 12)),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Top Badge
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
              decoration: BoxDecoration(
                color: const Color(0xFF2563EB).withOpacity(0.15),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: const Color(0xFF3B82F6).withOpacity(0.4)),
              ),
              child: const Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.qr_code_scanner, color: Color(0xFF60A5FA), size: 16),
                  SizedBox(width: 8),
                  Text(
                    'AUTO-GENERATED WI-FI QR CODE',
                    style: TextStyle(
                      color: Color(0xFF93C5FD),
                      fontSize: 11,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 1.1,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),

            const Text(
              'Scan With Your Phone to Connect',
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: Colors.white),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 6),
            const Text(
              'Open the VCRLT Controller APK on your phone, tap "Scan QR Code", and aim at this screen.',
              style: TextStyle(fontSize: 12, color: Colors.white54, height: 1.4),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 20),

            // Same Wi-Fi callout note
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFF172554).withOpacity(0.6),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFF3B82F6).withOpacity(0.3)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.wifi, color: Color(0xFF60A5FA), size: 22),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      'Make sure your Phone and PC are connected to the same Wi-Fi network or Phone Hotspot.',
                      style: TextStyle(fontSize: 11.5, color: Colors.blue.shade100, height: 1.3),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 22),

            // Crisp Auto-Generated QR Code
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(24),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF2563EB).withOpacity(0.25),
                    blurRadius: 28,
                    offset: const Offset(0, 12),
                  ),
                ],
              ),
              child: QrCodeWidget(
                data: qrData,
                size: 230,
                backgroundColor: Colors.white,
                foregroundColor: const Color(0xFF0F172A),
              ),
            ),
            const SizedBox(height: 16),

            // Prominent IP & Port Display for Direct / Manual Connection (RemoteGamepad style)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
              decoration: BoxDecoration(
                color: const Color(0xFF1E293B),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFF3B82F6).withOpacity(0.4)),
              ),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                    children: [
                      Column(
                        children: [
                          const Text(
                            'PC IP ADDRESS & PORT',
                            style: TextStyle(fontSize: 10, color: Color(0xFF94A3B8), fontWeight: FontWeight.bold, letterSpacing: 1),
                          ),
                          const SizedBox(height: 4),
                          SelectableText(
                            '${_networkManager.localIp} : ${_networkManager.port}',
                            style: const TextStyle(fontSize: 18, color: Color(0xFF60A5FA), fontWeight: FontWeight.w900, fontFamily: 'monospace'),
                          ),
                        ],
                      ),
                      Container(height: 36, width: 1, color: Colors.white12),
                      Column(
                        children: [
                          const Text(
                            'PAIRING PIN / KEY',
                            style: TextStyle(fontSize: 10, color: Color(0xFF94A3B8), fontWeight: FontWeight.bold, letterSpacing: 1),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            _networkManager.pairCode.isNotEmpty ? _networkManager.pairCode : '4200',
                            style: const TextStyle(fontSize: 18, color: Color(0xFF34D399), fontWeight: FontWeight.w900, fontFamily: 'monospace'),
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Scan the QR code with your phone, or tap "Enter PC IP Manually" on the phone app to connect.',
                    style: TextStyle(fontSize: 11, color: Colors.white54),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),

            // Subtle Status Hint
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                color: const Color(0xFF0B0E16),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.white10),
              ),
              child: const Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  SizedBox(
                    width: 8,
                    height: 8,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF60A5FA)),
                    ),
                  ),
                  SizedBox(width: 10),
                  Text(
                    'Listening for phone... switches to controller feed on connect',
                    style: TextStyle(fontSize: 12, color: Colors.white70, fontWeight: FontWeight.w600),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  // =========================================================================
  // 2. CONNECTED SCREEN: CONTROLLER FEED & GAME ENGINE ACTIVE (GTA V READY)
  // =========================================================================
  Widget _buildControllerFeedView() {
    final pkt = _latestPacket;
    final client = _connectedClient;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Container(
        constraints: const BoxConstraints(maxWidth: 820),
        child: Column(
          children: [
            // Top Connection Banner
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFF101B2E),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFF10B981).withOpacity(0.4)),
                boxShadow: const [
                  BoxShadow(color: Colors.black38, blurRadius: 16, offset: Offset(0, 8)),
                ],
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: const Color(0xFF064E3B),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(Icons.check_circle, color: Color(0xFF34D399), size: 28),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Text(
                              'PHONE CONNECTED: ${client?.name ?? "Android Gamepad"}',
                              style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 14, color: Colors.white),
                            ),
                            const SizedBox(width: 10),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                              decoration: BoxDecoration(
                                color: const Color(0xFF047857),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Text(
                                '$_currentHz Hz • ${_latencyMs.toStringAsFixed(1)}ms',
                                style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.white, fontFamily: 'monospace'),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        const Text(
                          'Virtual Gamepad Emulation (XInput / ViGEm Player 1) ACTIVE. Open GTA V, Forza, or any PC game and play now!',
                          style: TextStyle(fontSize: 11, color: Color(0xFFA7F3D0)),
                        ),
                      ],
                    ),
                  ),
                  ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF2563EB),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    ),
                    icon: const Icon(Icons.vibration, size: 16),
                    label: const Text('Test Rumble', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                    onPressed: () => _networkManager.sendVibration(intensity: 0.9, durationMs: 250),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Live Controller Input Feed Visualizer
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: const Color(0xFF121622),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: Colors.white12),
              ),
              child: Column(
                children: [
                  const Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'LIVE CONTROLLER FEED (PRESS PHONE BUTTONS TO TEST)',
                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900, color: Colors.white54, letterSpacing: 1.2),
                      ),
                      Text('XInput Mode', style: TextStyle(fontSize: 10, color: Color(0xFF60A5FA), fontWeight: FontWeight.bold)),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Shoulder Triggers & Bumpers Row
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          _indicatorPill('L2', (pkt?.leftTrigger ?? 0) > 0.1, val: pkt != null ? '${(pkt.leftTrigger * 100).toInt()}%' : null),
                          const SizedBox(width: 8),
                          _indicatorPill('L1', pkt?.l1 ?? false),
                        ],
                      ),
                      // Touchpad
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        decoration: BoxDecoration(
                          color: (pkt?.touchpad.active ?? false) ? const Color(0xFF1E3A8A) : Colors.black38,
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: (pkt?.touchpad.active ?? false) ? const Color(0xFF3B82F6) : Colors.white12),
                        ),
                        child: Text(
                          'TOUCHPAD: ${(pkt?.touchpad.x ?? 0.5).toStringAsFixed(2)}, ${(pkt?.touchpad.y ?? 0.5).toStringAsFixed(2)}',
                          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.white70),
                        ),
                      ),
                      Row(
                        children: [
                          _indicatorPill('R1', pkt?.r1 ?? false),
                          const SizedBox(width: 8),
                          _indicatorPill('R2', (pkt?.rightTrigger ?? 0) > 0.1, val: pkt != null ? '${(pkt.rightTrigger * 100).toInt()}%' : null),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),

                  // Middle: D-Pad, Center Buttons, Action Buttons
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      // D-Pad
                      Expanded(
                        child: Column(
                          children: [
                            const Text('D-PAD', style: TextStyle(fontSize: 11, color: Colors.white38, fontWeight: FontWeight.bold)),
                            const SizedBox(height: 8),
                            _indicatorSquare('▲', pkt?.dpadUp ?? false),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                _indicatorSquare('◀', pkt?.dpadLeft ?? false),
                                const SizedBox(width: 32),
                                _indicatorSquare('▶', pkt?.dpadRight ?? false),
                              ],
                            ),
                            _indicatorSquare('▼', pkt?.dpadDown ?? false),
                          ],
                        ),
                      ),

                      // Center Sticks & Meta
                      Expanded(
                        flex: 2,
                        child: Column(
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                              children: [
                                Column(
                                  children: [
                                    const Text('LEFT STICK (L3)', style: TextStyle(fontSize: 10, color: Colors.white38, fontWeight: FontWeight.bold)),
                                    const SizedBox(height: 6),
                                    _buildStickViewer(pkt?.leftStick.x ?? 0, pkt?.leftStick.y ?? 0),
                                  ],
                                ),
                                Column(
                                  children: [
                                    const Text('RIGHT STICK (R3)', style: TextStyle(fontSize: 10, color: Colors.white38, fontWeight: FontWeight.bold)),
                                    const SizedBox(height: 6),
                                    _buildStickViewer(pkt?.rightStick.x ?? 0, pkt?.rightStick.y ?? 0),
                                  ],
                                ),
                              ],
                            ),
                            const SizedBox(height: 16),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                _indicatorPill('SELECT', pkt?.select ?? false),
                                const SizedBox(width: 10),
                                _indicatorPill('HOME', pkt?.home ?? false),
                                const SizedBox(width: 10),
                                _indicatorPill('START', pkt?.start ?? false),
                              ],
                            ),
                          ],
                        ),
                      ),

                      // Action buttons: ▲, ●, ✕, ■
                      Expanded(
                        child: Column(
                          children: [
                            const Text('ACTION BUTTONS', style: TextStyle(fontSize: 11, color: Colors.white38, fontWeight: FontWeight.bold)),
                            const SizedBox(height: 8),
                            _indicatorRound('▲', pkt?.y ?? false, Colors.teal),
                            const SizedBox(height: 4),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                _indicatorRound('■', pkt?.x ?? false, Colors.pinkAccent),
                                const SizedBox(width: 32),
                                _indicatorRound('●', pkt?.b ?? false, Colors.redAccent),
                              ],
                            ),
                            const SizedBox(height: 4),
                            _indicatorRound('✕', pkt?.a ?? false, Colors.blue),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _indicatorPill(String label, bool active, {String? val}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
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
      width: 84,
      height: 84,
      decoration: BoxDecoration(
        color: Colors.black45,
        shape: BoxShape.circle,
        border: Border.all(color: Colors.white24),
      ),
      child: Stack(
        alignment: Alignment.center,
        children: [
          Transform.translate(
            offset: Offset(x * 26, y * 26),
            child: Container(
              width: 30,
              height: 30,
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
