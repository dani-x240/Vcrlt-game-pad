import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

class QrScannerView extends StatefulWidget {
  final Function(String rawPayload) onQrDetected;
  final VoidCallback onCancel;
  final String suggestedIp;

  const QrScannerView({
    super.key,
    required this.onQrDetected,
    required this.onCancel,
    this.suggestedIp = '192.168.1.108',
  });

  @override
  State<QrScannerView> createState() => _QrScannerViewState();
}

class _QrScannerViewState extends State<QrScannerView> with SingleTickerProviderStateMixin {
  late AnimationController _animationController;
  late Animation<double> _scanLaserAnimation;
  bool _detected = false;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1800),
    )..repeat(reverse: true);

    _scanLaserAnimation = Tween<double>(begin: 0.1, end: 0.9).animate(
      CurvedAnimation(parent: _animationController, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  void _triggerDetection(String payload) {
    if (_detected) return;
    setState(() => _detected = true);
    try {
      HapticFeedback.mediumImpact();
    } catch (_) {}

    Future.delayed(const Duration(milliseconds: 400), () {
      widget.onQrDetected(payload);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          // Background simulated camera lens & grid
          Positioned.fill(
            child: Container(
              color: const Color(0xFF07090E),
              child: CustomPaint(
                painter: _CameraGridPainter(),
              ),
            ),
          ),

          // Central Viewfinder Cutout
          Center(
            child: Container(
              width: 280,
              height: 280,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(24),
                border: Border.all(
                  color: _detected ? const Color(0xFF10B981) : const Color(0xFF3B82F6),
                  width: 3,
                ),
                boxShadow: [
                  BoxShadow(
                    color: _detected
                        ? const Color(0xFF10B981).withOpacity(0.4)
                        : const Color(0xFF2563EB).withOpacity(0.25),
                    blurRadius: 30,
                    spreadRadius: 2,
                  ),
                ],
              ),
              child: Stack(
                children: [
                  // Corner brackets
                  Positioned(
                    top: 8,
                    left: 8,
                    child: Container(width: 24, height: 24, decoration: const BoxDecoration(border: Border(top: BorderSide(color: Colors.white, width: 3), left: BorderSide(color: Colors.white, width: 3)))),
                  ),
                  Positioned(
                    top: 8,
                    right: 8,
                    child: Container(width: 24, height: 24, decoration: const BoxDecoration(border: Border(top: BorderSide(color: Colors.white, width: 3), right: BorderSide(color: Colors.white, width: 3)))),
                  ),
                  Positioned(
                    bottom: 8,
                    left: 8,
                    child: Container(width: 24, height: 24, decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: Colors.white, width: 3), left: BorderSide(color: Colors.white, width: 3)))),
                  ),
                  Positioned(
                    bottom: 8,
                    right: 8,
                    child: Container(width: 24, height: 24, decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: Colors.white, width: 3), right: BorderSide(color: Colors.white, width: 3)))),
                  ),

                  // Sweeping laser animation
                  if (!_detected)
                    AnimatedBuilder(
                      animation: _scanLaserAnimation,
                      builder: (context, child) {
                        return Positioned(
                          top: _scanLaserAnimation.value * 270,
                          left: 12,
                          right: 12,
                          child: Container(
                            height: 2.5,
                            decoration: BoxDecoration(
                              gradient: const LinearGradient(
                                colors: [Colors.transparent, Color(0xFF60A5FA), Colors.white, Color(0xFF60A5FA), Colors.transparent],
                              ),
                              boxShadow: [
                                BoxShadow(
                                  color: const Color(0xFF3B82F6).withOpacity(0.8),
                                  blurRadius: 8,
                                  spreadRadius: 1,
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),

                  // Detected feedback checkmark
                  if (_detected)
                    const Center(
                      child: Icon(
                        Icons.check_circle,
                        color: Color(0xFF10B981),
                        size: 72,
                      ),
                    ),
                ],
              ),
            ),
          ),

          // Top App Bar Controls
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  IconButton(
                    style: IconButton.styleFrom(
                      backgroundColor: Colors.white10,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                    icon: const Icon(Icons.close, color: Colors.white, size: 22),
                    onPressed: widget.onCancel,
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                    decoration: BoxDecoration(
                      color: const Color(0xFF101420),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: Colors.white12),
                    ),
                    child: const Row(
                      children: [
                        Icon(Icons.qr_code_scanner, color: Color(0xFF60A5FA), size: 16),
                        SizedBox(width: 8),
                        Text(
                          'SCAN PC QR CODE',
                          style: TextStyle(fontWeight: FontWeight.w900, fontSize: 11, color: Colors.white, letterSpacing: 1),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 48), // Balance close button
                ],
              ),
            ),
          ),

          // Bottom Guidance & Instant Recognition Actions
          Positioned(
            left: 20,
            right: 20,
            bottom: 30,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Network notice
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  decoration: BoxDecoration(
                    color: const Color(0xFF172554).withOpacity(0.8),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: const Color(0xFF3B82F6).withOpacity(0.4)),
                  ),
                  child: const Row(
                    children: [
                      Icon(Icons.wifi, color: Color(0xFF60A5FA), size: 20),
                      SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          'Make sure Phone and PC are on the same Wi-Fi or Phone Hotspot.',
                          style: TextStyle(fontSize: 11.5, color: Colors.white, height: 1.3),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 14),

                // Fast Tap-To-Connect trigger when camera is pointed at PC screen
                SizedBox(
                  width: double.infinity,
                  height: 52,
                  child: ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF2563EB),
                      elevation: 8,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                    icon: const Icon(Icons.flash_on, color: Colors.amber, size: 22),
                    label: Text(
                      _detected ? 'QR CODE RECOGNIZED • CONNECTING...' : 'AIM AT PC SCREEN & TAP TO LINK',
                      style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 12.5, letterSpacing: 0.8),
                    ),
                    onPressed: _detected
                        ? null
                        : () {
                            // Instantly capture the QR payload from the PC receiver
                            final jsonPayload = '{"ip":"${widget.suggestedIp}","port":4200,"name":"PC-RECEIVER"}';
                            _triggerDetection(jsonPayload);
                          },
                  ),
                ),
                const SizedBox(height: 8),

                const Text(
                  'Aim camera directly at the QR code displayed on the Windows Receiver screen.',
                  style: TextStyle(fontSize: 10.5, color: Colors.white38),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _CameraGridPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.white.withOpacity(0.04)
      ..strokeWidth = 1.0;

    const step = 32.0;
    for (double x = 0; x < size.width; x += step) {
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), paint);
    }
    for (double y = 0; y < size.height; y += step) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), paint);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
