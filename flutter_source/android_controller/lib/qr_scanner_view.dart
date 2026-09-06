import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:permission_handler/permission_handler.dart';

class QrScannerView extends StatefulWidget {
  final Function(String rawPayload) onQrDetected;
  final VoidCallback onCancel;
  final String? suggestedIp;
  final String? detectedPcName;

  const QrScannerView({
    super.key,
    required this.onQrDetected,
    required this.onCancel,
    this.suggestedIp,
    this.detectedPcName,
  });

  @override
  State<QrScannerView> createState() => _QrScannerViewState();
}

class _QrScannerViewState extends State<QrScannerView> with SingleTickerProviderStateMixin {
  late MobileScannerController _controller;
  late AnimationController _animController;
  late Animation<double> _laserAnim;
  bool _hasPermission = false;
  bool _isLoading = true;
  bool _scanned = false;
  bool _torch = false;

  @override
  void initState() {
    super.initState();
    _controller = MobileScannerController(
      detectionSpeed: DetectionSpeed.normal,
      facing: CameraFacing.back,
      torchEnabled: false,
    );

    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1600),
    )..repeat(reverse: true);

    _laserAnim = Tween<double>(begin: 0.05, end: 0.95).animate(
      CurvedAnimation(parent: _animController, curve: Curves.easeInOut),
    );

    _checkAndAskPermission();
  }

  Future<void> _checkAndAskPermission() async {
    setState(() => _isLoading = true);
    final status = await Permission.camera.request();
    if (mounted) {
      setState(() {
        _hasPermission = status.isGranted;
        _isLoading = false;
      });
      if (_hasPermission) {
        _controller.start();
      }
    }
  }

  @override
  void dispose() {
    _animController.dispose();
    _controller.dispose();
    super.dispose();
  }

  void _onDetect(BarcodeCapture capture) {
    if (_scanned) return;
    for (final b in capture.barcodes) {
      final code = b.rawValue;
      if (code != null && code.trim().isNotEmpty) {
        _scanned = true;
        try { HapticFeedback.mediumImpact(); } catch (_) {}
        setState(() {});
        Future.delayed(const Duration(milliseconds: 250), () {
          widget.onQrDetected(code.trim());
        });
        break;
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          if (_hasPermission)
            MobileScanner(
              controller: _controller,
              onDetect: _onDetect,
              errorBuilder: (ctx, err, _) => _fallback('Camera unavailable: ${err.errorCode}'),
            )
          else if (_isLoading)
            const Center(child: CircularProgressIndicator(color: Color(0xFF3B82F6)))
          else
            _buildPermissionPrompt(),

          if (_hasPermission && !_scanned)
            _buildScanTarget(),

          if (_scanned)
            Container(
              color: Colors.black.withOpacity(0.75),
              child: const Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.check_circle, color: Color(0xFF10B981), size: 72),
                    SizedBox(height: 16),
                    Text(
                      'QR CODE DETECTED',
                      style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18),
                    ),
                    SizedBox(height: 6),
                    Text('Connecting to PC...', style: TextStyle(color: Colors.white70)),
                  ],
                ),
              ),
            ),

          // Top navigation
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  IconButton(
                    style: IconButton.styleFrom(backgroundColor: Colors.black54),
                    icon: const Icon(Icons.arrow_back, color: Colors.white),
                    onPressed: widget.onCancel,
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                    decoration: BoxDecoration(
                      color: const Color(0xFF1E293B).withOpacity(0.85),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: const Row(
                      children: [
                        Icon(Icons.qr_code_scanner, color: Color(0xFF60A5FA), size: 16),
                        SizedBox(width: 8),
                        Text(
                          'SCAN PC QR CODE',
                          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                  if (_hasPermission)
                    IconButton(
                      style: IconButton.styleFrom(backgroundColor: Colors.black54),
                      icon: Icon(_torch ? Icons.flash_on : Icons.flash_off, color: _torch ? Colors.amber : Colors.white),
                      onPressed: () async {
                        await _controller.toggleTorch();
                        setState(() => _torch = !_torch);
                      },
                    )
                  else
                    const SizedBox(width: 48),
                ],
              ),
            ),
          ),

          // Bottom card
          Positioned(
            left: 20,
            right: 20,
            bottom: 28,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (widget.suggestedIp != null && widget.suggestedIp!.isNotEmpty && widget.suggestedIp != '127.0.0.1')
                  Container(
                    margin: const EdgeInsets.only(bottom: 12),
                    child: ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF10B981),
                        minimumSize: const Size(double.infinity, 48),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      ),
                      icon: const Icon(Icons.wifi_tethering, color: Colors.white),
                      label: Text(
                        'PC DETECTED (${widget.detectedPcName ?? widget.suggestedIp}) • TAP TO LINK',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 11),
                      ),
                      onPressed: () {
                        widget.onQrDetected(jsonEncode({
                          'ip': widget.suggestedIp,
                          'port': 4200,
                          'name': widget.detectedPcName ?? 'PC',
                        }));
                      },
                    ),
                  ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  decoration: BoxDecoration(
                    color: const Color(0xFF0F172A).withOpacity(0.9),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: Colors.white12),
                  ),
                  child: const Text(
                    'Point camera at the QR code on the Windows PC screen. It pairs automatically.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: Colors.white70, fontSize: 12),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildScanTarget() {
    return Center(
      child: Stack(
        alignment: Alignment.center,
        children: [
          Container(
            width: 250,
            height: 250,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: const Color(0xFF3B82F6), width: 2),
            ),
          ),
          AnimatedBuilder(
            animation: _laserAnim,
            builder: (ctx, _) {
              final topOffset = (MediaQuery.of(ctx).size.height / 2 - 125) + (_laserAnim.value * 250);
              return Positioned(
                top: topOffset,
                left: MediaQuery.of(ctx).size.width / 2 - 115,
                right: MediaQuery.of(ctx).size.width / 2 - 115,
                child: Container(
                  height: 3,
                  decoration: BoxDecoration(
                    color: const Color(0xFF60A5FA),
                    boxShadow: [BoxShadow(color: const Color(0xFF3B82F6).withOpacity(0.9), blurRadius: 6)],
                  ),
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildPermissionPrompt() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.camera_alt_outlined, color: Colors.amber, size: 64),
            const SizedBox(height: 16),
            const Text(
              'Camera Permission Needed',
              style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            const Text(
              'Allow camera access so VCRLT can scan the pairing QR code on your PC.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.white60, fontSize: 13),
            ),
            const SizedBox(height: 20),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF2563EB),
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              onPressed: _checkAndAskPermission,
              child: const Text('ALLOW CAMERA'),
            ),
            const SizedBox(height: 8),
            TextButton(
              onPressed: () => openAppSettings(),
              child: const Text('Open Settings', style: TextStyle(color: Colors.white38, fontSize: 12)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _fallback(String msg) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.videocam_off, color: Colors.redAccent, size: 48),
            const SizedBox(height: 12),
            Text(msg, textAlign: TextAlign.center, style: const TextStyle(color: Colors.white70)),
          ],
        ),
      ),
    );
  }
}
