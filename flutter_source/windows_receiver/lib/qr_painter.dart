import 'dart:typed_data';
import 'package:flutter/material.dart';

/// A pure-Dart, self-contained QR Code Generator and Widget (Version 4, 33x33 modules, ECC Level M).
/// Encodes up to 64 bytes of JSON or text with zero external dependencies.
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
    final matrix = QrEncoder.encode(data);
    return Container(
      width: size,
      height: size,
      padding: EdgeInsets.all(size * 0.05),
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.4),
            blurRadius: 16,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: CustomPaint(
        painter: _QrPainter(matrix: matrix, color: foregroundColor),
      ),
    );
  }
}

class _QrPainter extends CustomPainter {
  final List<List<bool>> matrix;
  final Color color;

  _QrPainter({required this.matrix, required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.fill;

    final n = matrix.length;
    if (n == 0) return;

    final moduleSize = size.width / n;

    for (int y = 0; y < n; y++) {
      for (int x = 0; x < n; x++) {
        if (matrix[y][x]) {
          final rect = Rect.fromLTWH(
            x * moduleSize,
            y * moduleSize,
            moduleSize + 0.2,
            moduleSize + 0.2,
          );
          canvas.drawRect(rect, paint);
        }
      }
    }
  }

  @override
  bool shouldRepaint(covariant _QrPainter oldDelegate) {
    return oldDelegate.matrix != matrix || oldDelegate.color != color;
  }
}

/// Pure Dart QR Code generator for Version 4 (33x33, ECC Level M).
class QrEncoder {
  static const int size = 33;
  static const int totalCodewords = 100;
  static const int dataCodewordsLimit = 64;
  static const int ecCodewords = 36;

  static List<List<bool>> encode(String text) {
    final bytes = text.codeUnits;
    final dataBytes = _buildDataBitstream(bytes);
    final ecBytes = _calculateReedSolomon(dataBytes);

    final allCodewords = List<int>.from(dataBytes)..addAll(ecBytes);

    // Initialize 33x33 matrix and function pattern mask
    final matrix = List.generate(size, (_) => List.filled(size, false));
    final isFunction = List.generate(size, (_) => List.filled(size, false));

    // Place function patterns
    _placeFinderPattern(matrix, isFunction, 0, 0);
    _placeFinderPattern(matrix, isFunction, size - 7, 0);
    _placeFinderPattern(matrix, isFunction, 0, size - 7);

    _placeAlignmentPattern(matrix, isFunction, 26, 26);

    _placeTimingPatterns(matrix, isFunction);

    _placeFormatInfo(matrix, isFunction, 0); // Mask 0 placeholder

    // Place data bits in zigzag
    _placeDataBits(matrix, isFunction, allCodewords);

    // Apply best mask (Mask 0: (x + y) % 2 == 0)
    _applyMask(matrix, isFunction);

    // Write final format info with Mask 0
    _writeFormatInfo(matrix);

    return matrix;
  }

  static List<int> _buildDataBitstream(List<int> input) {
    // Mode indicator for 8-bit byte mode: 0100 (4 bits)
    // Character count indicator: 8 bits for Version 4
    final bitBuffer = <int>[];

    void pushBits(int value, int count) {
      for (int i = count - 1; i >= 0; i--) {
        bitBuffer.add((value >> i) & 1);
      }
    }

    pushBits(4, 4); // 0100 = 8-bit byte mode
    final len = input.length.clamp(0, dataCodewordsLimit - 2);
    pushBits(len, 8);

    for (int i = 0; i < len; i++) {
      pushBits(input[i], 8);
    }

    // Terminator: 0000 (up to 4 bits)
    pushBits(0, 4);

    // Pad to byte boundary
    while (bitBuffer.length % 8 != 0) {
      bitBuffer.add(0);
    }

    // Convert bitBuffer to bytes
    final result = <int>[];
    for (int i = 0; i < bitBuffer.length; i += 8) {
      int b = 0;
      for (int j = 0; j < 8; j++) {
        b = (b << 1) | bitBuffer[i + j];
      }
      result.add(b);
    }

    // Pad with 0xEC and 0x11 alternating until dataCodewordsLimit
    bool padAlternate = true;
    while (result.length < dataCodewordsLimit) {
      result.add(padAlternate ? 0xEC : 0x11);
      padAlternate = !padAlternate;
    }

    return result;
  }

  static List<int> _calculateReedSolomon(List<int> data) {
    // Standard GF(256) polynomial arithmetic for QR ECC Level M
    final gfExp = List<int>.filled(512, 0);
    final gfLog = List<int>.filled(256, 0);

    int x = 1;
    for (int i = 0; i < 255; i++) {
      gfExp[i] = x;
      gfLog[x] = i;
      x <<= 1;
      if (x & 0x100 != 0) x ^= 0x11D;
    }
    for (int i = 255; i < 512; i++) {
      gfExp[i] = gfExp[i - 255];
    }

    int gfMult(int a, int b) {
      if (a == 0 || b == 0) return 0;
      return gfExp[gfLog[a] + gfLog[b]];
    }

    // Generator polynomial for ecCodewords = 36 (split in two blocks of 18)
    // Version 4-M uses 2 blocks of (data: 32, ec: 18) = total 100
    final ecBytes = List<int>.filled(36, 0);

    List<int> generateBlockEC(List<int> blockData, int ecLen) {
      // Build generator polynomial
      var gen = [1];
      for (int i = 0; i < ecLen; i++) {
        final next = List<int>.filled(gen.length + 1, 0);
        for (int j = 0; j < gen.length; j++) {
          next[j] ^= gfMult(gen[j], gfExp[i]);
          next[j + 1] ^= gen[j];
        }
        gen = next;
      }

      // Polynomial division
      final info = List<int>.from(blockData)..addAll(List.filled(ecLen, 0));
      for (int i = 0; i < blockData.length; i++) {
        final lead = info[i];
        if (lead != 0) {
          for (int j = 0; j < gen.length; j++) {
            info[i + j] ^= gfMult(gen[j], lead);
          }
        }
      }
      return info.sublist(blockData.length);
    }

    final block1 = data.sublist(0, 32);
    final block2 = data.sublist(32, 64);

    final ec1 = generateBlockEC(block1, 18);
    final ec2 = generateBlockEC(block2, 18);

    // Interleave EC codewords
    for (int i = 0; i < 18; i++) {
      ecBytes[i * 2] = ec1[i];
      ecBytes[i * 2 + 1] = ec2[i];
    }

    return ecBytes;
  }

  static void _placeFinderPattern(
    List<List<bool>> m,
    List<List<bool>> f,
    int startX,
    int startY,
  ) {
    for (int y = -1; y <= 7; y++) {
      for (int x = -1; x <= 7; x++) {
        final px = startX + x;
        final py = startY + y;
        if (px >= 0 && px < size && py >= 0 && py < size) {
          f[py][px] = true;
          if (x >= 0 && x <= 6 && y >= 0 && y <= 6) {
            final isBorder = x == 0 || x == 6 || y == 0 || y == 6;
            final isCenter = x >= 2 && x <= 4 && y >= 2 && y <= 4;
            m[py][px] = isBorder || isCenter;
          } else {
            m[py][px] = false; // Separator
          }
        }
      }
    }
  }

  static void _placeAlignmentPattern(
    List<List<bool>> m,
    List<List<bool>> f,
    int cx,
    int cy,
  ) {
    for (int y = -2; y <= 2; y++) {
      for (int x = -2; x <= 2; x++) {
        final px = cx + x;
        final py = cy + y;
        f[py][px] = true;
        final isBorder = x == -2 || x == 2 || y == -2 || y == 2;
        final isCenter = x == 0 && y == 0;
        m[py][px] = isBorder || isCenter;
      }
    }
  }

  static void _placeTimingPatterns(List<List<bool>> m, List<List<bool>> f) {
    for (int i = 8; i < size - 8; i++) {
      f[6][i] = true;
      m[6][i] = (i % 2 == 0);
      f[i][6] = true;
      m[i][6] = (i % 2 == 0);
    }
    // Dark module at (4*V + 9, 8) -> (25, 8)
    f[25][8] = true;
    m[25][8] = true;
  }

  static void _placeFormatInfo(List<List<bool>> m, List<List<bool>> f, int mask) {
    for (int i = 0; i <= 8; i++) {
      if (i != 6) {
        f[8][i] = true;
        f[i][8] = true;
      }
    }
    for (int i = size - 8; i < size; i++) {
      f[8][i] = true;
    }
    for (int i = size - 7; i < size; i++) {
      f[i][8] = true;
    }
  }

  static void _placeDataBits(
    List<List<bool>> m,
    List<List<bool>> f,
    List<int> codewords,
  ) {
    // Interleave block 1 and block 2 data
    final interleaved = <int>[];
    for (int i = 0; i < 32; i++) {
      interleaved.add(codewords[i]);
      interleaved.add(codewords[i + 32]);
    }
    // Append EC codewords (already interleaved)
    interleaved.addAll(codewords.sublist(64));

    final bits = <bool>[];
    for (final b in interleaved) {
      for (int i = 7; i >= 0; i--) {
        bits.add(((b >> i) & 1) == 1);
      }
    }

    int bitIndex = 0;
    int col = size - 1;
    bool upward = true;

    while (col > 0) {
      if (col == 6) col--; // Skip vertical timing pattern column

      final yRange = upward
          ? List.generate(size, (i) => size - 1 - i)
          : List.generate(size, (i) => i);

      for (final row in yRange) {
        for (int c = 0; c < 2; c++) {
          final x = col - c;
          if (!f[row][x]) {
            if (bitIndex < bits.length) {
              m[row][x] = bits[bitIndex++];
            } else {
              m[row][x] = false;
            }
          }
        }
      }

      col -= 2;
      upward = !upward;
    }
  }

  static void _applyMask(List<List<bool>> m, List<List<bool>> f) {
    // Mask 0: (row + col) % 2 == 0
    for (int y = 0; y < size; y++) {
      for (int x = 0; x < size; x++) {
        if (!f[y][x]) {
          if ((x + y) % 2 == 0) {
            m[y][x] = !m[y][x];
          }
        }
      }
    }
  }

  static void _writeFormatInfo(List<List<bool>> m) {
    // Format bits for ECC Level M, Mask 0
    // Standard format string: 101010000010010
    const formatBits = [true, false, true, false, true, false, false, false, false, false, true, false, false, true, false];

    // Around top-left finder
    m[8][0] = formatBits[0];
    m[8][1] = formatBits[1];
    m[8][2] = formatBits[2];
    m[8][3] = formatBits[3];
    m[8][4] = formatBits[4];
    m[8][5] = formatBits[5];
    m[8][7] = formatBits[6];
    m[8][8] = formatBits[7];
    m[7][8] = formatBits[8];
    m[5][8] = formatBits[9];
    m[4][8] = formatBits[10];
    m[3][8] = formatBits[11];
    m[2][8] = formatBits[12];
    m[1][8] = formatBits[13];
    m[0][8] = formatBits[14];

    // Around top-right and bottom-left finders
    for (int i = 0; i < 8; i++) {
      m[8][size - 1 - i] = formatBits[i];
    }
    for (int i = 0; i < 7; i++) {
      m[size - 7 + i][8] = formatBits[8 + i];
    }
  }
}
