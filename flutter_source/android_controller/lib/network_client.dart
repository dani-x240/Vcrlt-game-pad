// Real UDP Network Client for VCRLT Android Controller
import 'dart:async';
import 'dart:convert';
import 'dart:io';
import '../../protocol/vcrlt_packet.dart';

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

class NetworkClient {
  static const int defaultPort = 48270;

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

  void _sendDiscoveryProbe() {
    if (_socket == null) return;
    try {
      final probe = {'type': 'VCRLT_DISCOVER_PROBE'};
      final bytes = utf8.encode(jsonEncode(probe));
      _socket?.send(bytes, InternetAddress('255.255.255.255'), defaultPort);
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
