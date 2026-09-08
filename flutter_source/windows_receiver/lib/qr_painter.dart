import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';

/// Standards-compliant QR Code Widget for VCRLT Windows Receiver using qr_flutter.
/// Generates 100% ISO/IEC 18004 compliant QR codes that scan instantly with any phone camera.
class QrCodeWidget extends StatelessWidget {
  final String data;
  final double size;
  final Color backgroundColor;
  final Color foregroundColor;

  const QrCodeWidget({
    super.key,
    required this.data,
    this.size = 220,
    this.backgroundColor = Colors.white,
    this.foregroundColor = const Color(0xFF0F172A),
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(18),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.35),
            blurRadius: 16,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Center(
        child: QrImageView(
          data: data,
          version: QrVersions.auto,
          size: size - 20,
          backgroundColor: backgroundColor,
          eyeStyle: QrEyeStyle(
            eyeShape: QrEyeShape.square,
            color: foregroundColor,
          ),
          dataModuleStyle: QrDataModuleStyle(
            dataModuleShape: QrDataModuleShape.square,
            color: foregroundColor,
          ),
          errorCorrectionLevel: QrErrorCorrectLevel.M,
        ),
      ),
    );
  }
}
