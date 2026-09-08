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

  Completer<bool>? _pairCompleter;
  Timer? _pairRetryTimer;
  Timer? _pairTimeoutTimer;

  // Robustly extract IPv4 and Port from ANY string (JSON, URL, IP:Port, plain IP)
  static Map<String, dynamic>? parseIpAndPort(String raw) {
    try {
      final trimmed = raw.trim();
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        final map = jsonDecode(trimmed) as Map<String, dynamic>;
        final ip = (map['ip'] ?? '').toString().trim();
        final port = int.tryParse(map['port']?.toString() ?? '') ?? defaultPort;
        if (ip.isNotEmpty) return {'ip': ip, 'port': port, 'name': map['name'] ?? ''};
      }
    } catch (_) {}

    // Regex match for IPv4 address
    final ipRegex = RegExp(r'\b(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\b');
    final match = ipRegex.firstMatch(raw);
    if (match != null) {
      final ip = match.group(0)!;
      final afterIp = raw.substring(match.end);
      final portMatch = RegExp(r'^:(\d{2,5})').firstMatch(afterIp);
      int port = defaultPort;
      if (portMatch != null) {
        port = int.tryParse(portMatch.group(1)!) ?? defaultPort;
      }
      return {'ip': ip, 'port': port, 'name': ''};
    }
    return null;
  }

  // Parse QR Code payload, verify and auto-connect
  Future<QrConnectionResult> connectFromQrString(String rawData) async {
    final parsed = parseIpAndPort(rawData);
    if (parsed == null || (parsed['ip'] as String).isEmpty) {
      return const QrConnectionResult(
        success: false,
        ip: '',
        port: defaultPort,
        errorMessage: 'Invalid QR code. Could not detect PC IP address.',
      );
    }

    final ip = parsed['ip'] as String;
    final port = parsed['port'] as int;
    final success = await pairWithPc(ip: ip, port: port);
    if (success) {
      return QrConnectionResult(success: true, ip: ip, port: port);
    } else {
      return QrConnectionResult(
        success: false,
        ip: ip,
        port: port,
        errorMessage: 'Could not connect to PC at $ip:$port.\nMake sure VCRLT Windows Receiver is open and both devices are on the same Wi-Fi.',
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

  Future<bool> pairWithPc({
    required String ip,
    int port = defaultPort,
    String pin = '482731',
    String deviceName = 'Android dani.x240',
    Duration timeout = const Duration(seconds: 4),
  }) async {
    status = ConnectionStatus.connecting;
    onStatusChanged?.call(status);

    _pairRetryTimer?.cancel();
    _pairTimeoutTimer?.cancel();

    try {
      _targetAddress = InternetAddress(ip);
      _targetPort = port;

      final completer = Completer<bool>();
      _pairCompleter = completer;

      final req = VcrltPairRequest(clientName: deviceName, pairCode: pin);
      final bytes = utf8.encode(jsonEncode(req.toJson()));

      // Send initial pair datagram
      _socket?.send(bytes, _targetAddress!, _targetPort);

      // Retry every 350ms to guarantee UDP delivery through Wi-Fi packet loss
      _pairRetryTimer = Timer.periodic(const Duration(milliseconds: 350), (_) {
        if (status == ConnectionStatus.connected) {
          _pairRetryTimer?.cancel();
          if (!completer.isCompleted) completer.complete(true);
        } else if (_socket != null && _targetAddress != null) {
          try {
            _socket?.send(bytes, _targetAddress!, _targetPort);
          } catch (_) {}
        }
      });

      // 4-second timeout
      _pairTimeoutTimer = Timer(timeout, () {
        _pairRetryTimer?.cancel();
        if (!completer.isCompleted) {
          if (status != ConnectionStatus.connected) {
            status = ConnectionStatus.disconnected;
            onStatusChanged?.call(status);
          }
          completer.complete(status == ConnectionStatus.connected);
        }
      });

      final result = await completer.future;
      _pairRetryTimer?.cancel();
      _pairTimeoutTimer?.cancel();
      _pairCompleter = null;
      return result;
    } catch (_) {
      _pairRetryTimer?.cancel();
      _pairTimeoutTimer?.cancel();
      status = ConnectionStatus.disconnected;
      onStatusChanged?.call(status);
      return false;
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
    _pairRetryTimer?.cancel();
    _pairTimeoutTimer?.cancel();
    _pairCompleter = null;
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
          _pairRetryTimer?.cancel();
          _pairTimeoutTimer?.cancel();
          _discoveryTimer?.cancel();
          _startHeartbeat();
          if (_pairCompleter != null && !_pairCompleter!.isCompleted) {
            _pairCompleter!.complete(true);
          }
          onStatusChanged?.call(status);
        } else {
          status = ConnectionStatus.disconnected;
          if (_pairCompleter != null && !_pairCompleter!.isCompleted) {
            _pairCompleter!.complete(false);
          }
          onStatusChanged?.call(status);
        }
      } else if (type == 'VCRLT_VIBRATE') {
        final vib = VcrltVibrationPacket.fromJson(json);
        onVibrate?.call(vib.intensity, vib.durationMs);
      }
    } catch (_) {}
  }

  void _startHeartbeat() {
    _heartbeatTimer?.cancel();
    _heartbeatTimer = Timer.periodic(const Duration(milliseconds: 1500), (_) {
      if (status == ConnectionStatus.connected && _socket != null && _targetAddress != null) {
        try {
          final ping = {
            'type': 'INPUT',
            'controllerId': 1,
            'sequence': 0,
            'timestamp': DateTime.now().millisecondsSinceEpoch,
            'leftStick': {'x': 0.0, 'y': 0.0},
            'rightStick': {'x': 0.0, 'y': 0.0},
            'leftTrigger': 0.0,
            'rightTrigger': 0.0,
            'l1': false,
            'r1': false,
            'dpadUp': false,
            'dpadDown': false,
            'dpadLeft': false,
            'dpadRight': false,
            'a': false,
            'b': false,
            'x': false,
            'y': false,
            'select': false,
            'start': false,
            'home': false,
            'l3': false,
            'r3': false,
            'touchpad': {'x': 0.5, 'y': 0.5, 'active': false, 'clicked': false},
          };
          final bytes = utf8.encode(jsonEncode(ping));
          _socket?.send(bytes, _targetAddress!, _targetPort);
        } catch (_) {}
      }
    });
  }

  void dispose() {
    disconnect();
    _socket?.close();
  }
}
