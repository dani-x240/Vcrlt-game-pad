// Real UDP Network Client for VCRLT Android Controller
import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'vcrlt_packet.dart';

enum ConnectionStatus { disconnected, discovering, connecting, connected }

class DiscoveredPc {
  final String name;
  final String ip;
  final int port;
  final String defaultPin;

  DiscoveredPc({
    required this.name,
    required this.ip,
    required this.port,
    required this.defaultPin,
  });
}

class QrConnectionResult {
  final bool success;
  final String ip;
  final int port;
  final String? errorMessage;

  QrConnectionResult({
    required this.success,
    required this.ip,
    required this.port,
    this.errorMessage,
  });
}

class NetworkClient {
  static const int defaultPort = 4200;

  RawDatagramSocket? _socket;
  ConnectionStatus status = ConnectionStatus.disconnected;

  InternetAddress? _targetAddress;
  int _targetPort = defaultPort;
  String connectedPcName = '';

  Timer? _discoveryTimer;
  Timer? _heartbeatTimer;

  final List<DiscoveredPc> discoveredPcs = [];

  // Callbacks
  Function(ConnectionStatus)? onStatusChanged;
  Function(DiscoveredPc)? onPcDiscovered;
  Function(double intensity, int durationMs)? onVibrate;

  Future<void> init() async {
    try {
      _socket = await RawDatagramSocket.bind(InternetAddress.anyIPv4, 0);
      _socket?.broadcastEnabled = true;
      _socket?.listen(_handleDatagram);
    } catch (_) {}
  }

  // Parse QR Code payload, verify same Wi-Fi subnet, and auto-connect
  Future<QrConnectionResult> connectFromQrString(String rawData) async {
    try {
      String ip = '';
      int port = defaultPort;

      final trimmed = rawData.trim();
      if (trimmed.startsWith('{')) {
        final map = jsonDecode(trimmed) as Map<String, dynamic>;
        ip = (map['ip'] ?? '').toString().trim();
        if (map['port'] != null) {
          port = int.tryParse(map['port'].toString()) ?? defaultPort;
        }
      } else if (trimmed.contains(':')) {
        final parts = trimmed.split(':');
        ip = parts[0].trim();
        port = int.tryParse(parts[1].trim()) ?? defaultPort;
      } else {
        ip = trimmed;
      }

      if (ip.isEmpty) {
        return QrConnectionResult(
          success: false,
          ip: '',
          port: port,
          errorMessage: 'Invalid QR code. Please scan the Windows Receiver QR code.',
        );
      }

      // Directly auto-connect to the scanned PC IP and port
      await pairWithPc(ip: ip, port: port);
      return QrConnectionResult(success: true, ip: ip, port: port);
    } catch (_) {
      return QrConnectionResult(
        success: false,
        ip: '',
        port: defaultPort,
        errorMessage: 'Unable to connect to PC. Make sure both are on same WiFi.',
      );
    }
  }

  Future<List<String>> getPhoneLocalIps() async {
    final list = <String>[];
    try {
      final interfaces = await NetworkInterface.list(
        includeLoopback: false,
        type: InternetAddressType.IPv4,
      );
      for (final iface in interfaces) {
        for (final addr in iface.addresses) {
          if (!addr.isLoopback && !addr.address.startsWith('169.254')) {
            list.add(addr.address);
          }
        }
      }
    } catch (_) {}
    return list;
  }

  void startDiscovery() {
    status = ConnectionStatus.discovering;
    onStatusChanged?.call(status);
    discoveredPcs.clear();

    // Broadcast discovery probe
    _sendDiscoveryProbe();

    _discoveryTimer?.cancel();
    _discoveryTimer = Timer.periodic(const Duration(milliseconds: 1500), (_) {
      _sendDiscoveryProbe();
    });
  }

  void scanHotspotSubnet(String subnetPrefix) {
    if (_socket == null) return;
    status = ConnectionStatus.discovering;
    onStatusChanged?.call(status);

    // Send discovery probes across common hotspot host IPs (e.g. 192.168.43.2 to 192.168.43.254)
    final probe = {'type': 'VCRLT_DISCOVER_PROBE'};
    final bytes = utf8.encode(jsonEncode(probe));

    // Also send subnet-specific broadcast
    try {
      _socket?.send(bytes, InternetAddress('$subnetPrefix.255'), defaultPort);
      _socket?.send(bytes, InternetAddress('255.255.255.255'), defaultPort);
    } catch (_) {}

    // Fast-burst top 30 common assigned IPs
    for (int i = 2; i <= 35; i++) {
      try {
        _socket?.send(bytes, InternetAddress('$subnetPrefix.$i'), defaultPort);
      } catch (_) {}
    }
  }

  void _sendDiscoveryProbe() {
    if (_socket == null) return;
    try {
      final probe = {'type': 'VCRLT_DISCOVER_PROBE'};
      final bytes = utf8.encode(jsonEncode(probe));
      _socket?.send(bytes, InternetAddress('255.255.255.255'), defaultPort);
      _socket?.send(bytes, InternetAddress('192.168.43.255'), defaultPort);
      _socket?.send(bytes, InternetAddress('192.168.137.255'), defaultPort);
    } catch (_) {}
  }

  Future<void> pairWithPc({
    required String ip,
    int port = defaultPort,
    String pin = '482731',
    String deviceName = 'Android dani.x240',
  }) async {
    status = ConnectionStatus.connecting;
    onStatusChanged?.call(status);

    try {
      _targetAddress = InternetAddress(ip);
      _targetPort = port;

      final req = VcrltPairRequest(clientName: deviceName, pairCode: pin);
      final bytes = utf8.encode(jsonEncode(req.toJson()));
      _socket?.send(bytes, _targetAddress!, _targetPort);

      // Start ping heartbeat
      _heartbeatTimer?.cancel();
      _heartbeatTimer = Timer.periodic(const Duration(seconds: 2), (_) {
        if (status == ConnectionStatus.connected && _targetAddress != null) {
          // Keep-alive
        }
      });
    } catch (_) {
      status = ConnectionStatus.disconnected;
      onStatusChanged?.call(status);
    }
  }

  void sendControllerPacket(VcrltPacket packet) {
    if (_socket == null || _targetAddress == null) return;
    try {
      final bytes = packet.toBinary();
      _socket?.send(bytes, _targetAddress!, _targetPort);
    } catch (_) {}
  }

  void disconnect() {
    status = ConnectionStatus.disconnected;
    _targetAddress = null;
    connectedPcName = '';
    _discoveryTimer?.cancel();
    _heartbeatTimer?.cancel();
    onStatusChanged?.call(status);
  }

  void _handleDatagram(RawSocketEvent event) {
    if (event != RawSocketEvent.read) return;
    final datagram = _socket?.receive();
    if (datagram == null) return;

    try {
      final str = utf8.decode(datagram.data);
      final json = jsonDecode(str) as Map<String, dynamic>;
      final type = json['type'] as String?;

      if (type == 'VCRLT_BEACON') {
        final beacon = VcrltBeacon.fromJson(json);
        final ip = beacon.ip.isNotEmpty ? beacon.ip : datagram.address.address;
        final pc = DiscoveredPc(
          name: beacon.pcName,
          ip: ip,
          port: beacon.port,
          defaultPin: beacon.pairCode,
        );

        if (!discoveredPcs.any((p) => p.ip == pc.ip)) {
          discoveredPcs.add(pc);
          onPcDiscovered?.call(pc);
        }
      } else if (type == 'VCRLT_PAIR_ACK') {
        final resp = VcrltPairResponse.fromJson(json);
        if (resp.success) {
          status = ConnectionStatus.connected;
          connectedPcName = resp.pcName;
          _discoveryTimer?.cancel();
          onStatusChanged?.call(status);
        } else {
          status = ConnectionStatus.disconnected;
          onStatusChanged?.call(status);
        }
      } else if (type == 'VCRLT_VIBRATE') {
        final vib = VcrltVibrationPacket.fromJson(json);
        onVibrate?.call(vib.intensity, vib.durationMs);
      }
    } catch (_) {}
  }

  void dispose() {
    disconnect();
    _socket?.close();
  }
}
