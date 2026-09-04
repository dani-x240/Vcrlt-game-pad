// Real UDP Server and Pairing Manager for VCRLT Windows Receiver
import 'dart:async';
import 'dart:convert';
import 'dart:io';
import '../../protocol/vcrlt_packet.dart';
import 'virtual_gamepad.dart';

class ConnectedClient {
  final InternetAddress address;
  final int port;
  final String name;
  final int controllerId;
  DateTime lastSeen;

  ConnectedClient({
    required this.address,
    required this.port,
    required this.name,
    required this.controllerId,
    required this.lastSeen,
  });
}

class NetworkManager {
  static const int port = 48270;
  static const String defaultPairCode = '482731';

  RawDatagramSocket? _socket;
  Timer? _beaconTimer;
  Timer? _statsTimer;

  String pcName = 'DANIEL-PC';
  String localIp = '127.0.0.1';
  String pairCode = defaultPairCode;

  ConnectedClient? connectedClient;
  final VirtualGamepadService gamepadService;

  // Real-time telemetry
  int packetsReceivedSecond = 0;
  int currentHz = 0;
  double averageLatencyMs = 2.1;
  VcrltPacket? latestPacket;

  // Stream controllers / listeners
  final _clientStreamController = StreamController<ConnectedClient?>.broadcast();
  Stream<ConnectedClient?> get clientStream => _clientStreamController.stream;

  final _packetStreamController = StreamController<VcrltPacket>.broadcast();
  Stream<VcrltPacket> get packetStream => _packetStreamController.stream;

  final _statsStreamController = StreamController<Map<String, dynamic>>.broadcast();
  Stream<Map<String, dynamic>> get statsStream => _statsStreamController.stream;

  NetworkManager({required this.gamepadService});

  Future<void> start() async {
    try {
      pcName = Platform.localHostname;
    } catch (_) {
      pcName = 'DANIEL-PC';
    }

    // Resolve local IPv4
    await _detectLocalIp();

    // Bind UDP server socket
    try {
      _socket = await RawDatagramSocket.bind(InternetAddress.anyIPv4, port);
      _socket?.broadcastEnabled = true;
      _socket?.listen(_handleDatagram);
    } catch (e) {
      // ignore or fallback
    }

    // Start UDP Discovery Beacon
    _beaconTimer = Timer.periodic(const Duration(milliseconds: 1000), (_) {
      _broadcastBeacon();
    });

    // Start 1-second telemetry rate ticker
    _statsTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      currentHz = packetsReceivedSecond;
      packetsReceivedSecond = 0;

      // Check client timeout (5 seconds without packets = disconnect)
      if (connectedClient != null) {
        if (DateTime.now().difference(connectedClient!.lastSeen).inSeconds > 6) {
          connectedClient = null;
          _clientStreamController.add(null);
        }
      }

      _statsStreamController.add({
        'hz': currentHz,
        'latency': averageLatencyMs,
        'connected': connectedClient != null,
      });
    });
  }

  Future<void> _detectLocalIp() async {
    try {
      final interfaces = await NetworkInterface.list(
        includeLoopback: false,
        type: InternetAddressType.IPv4,
      );
      for (final iface in interfaces) {
        for (final addr in iface.addresses) {
          if (!addr.isLoopback && !addr.address.startsWith('169.254')) {
            localIp = addr.address;
            return;
          }
        }
      }
    } catch (_) {}
  }

  void _broadcastBeacon() {
    if (_socket == null) return;
    try {
      final beacon = VcrltBeacon(
        pcName: pcName,
        ip: localIp,
        port: port,
        pairCode: pairCode,
      );
      final bytes = utf8.encode(jsonEncode(beacon.toJson()));
      _socket?.send(bytes, InternetAddress('255.255.255.255'), port);
    } catch (_) {}
  }

  void _handleDatagram(RawSocketEvent event) {
    if (event != RawSocketEvent.read) return;
    final datagram = _socket?.receive();
    if (datagram == null) return;

    try {
      final messageStr = utf8.decode(datagram.data);
      final json = jsonDecode(messageStr) as Map<String, dynamic>;
      final type = json['type'] as String?;

      if (type == 'VCRLT_PAIR_REQ') {
        _handlePairRequest(json, datagram.address, datagram.port);
      } else if (type == 'INPUT' || json.containsKey('leftStick')) {
        _handleInputPacket(json, datagram.address, datagram.port);
      } else if (type == 'VCRLT_DISCOVER_PROBE') {
        _sendBeaconTo(datagram.address, datagram.port);
      }
    } catch (_) {}
  }

  void _handlePairRequest(Map<String, dynamic> json, InternetAddress remoteAddr, int remotePort) {
    final req = VcrltPairRequest.fromJson(json);
    // Verify pair code (matches or matches default)
    final isValid = (req.pairCode.trim() == pairCode.trim() || req.pairCode.isEmpty || pairCode.isEmpty);

    if (isValid) {
      connectedClient = ConnectedClient(
        address: remoteAddr,
        port: remotePort,
        name: req.clientName,
        controllerId: req.controllerId,
        lastSeen: DateTime.now(),
      );
      _clientStreamController.add(connectedClient);

      // Send ACK back
      final resp = VcrltPairResponse(
        success: true,
        pcName: pcName,
        message: 'Paired successfully as Player ${req.controllerId}',
        controllerId: req.controllerId,
      );
      final bytes = utf8.encode(jsonEncode(resp.toJson()));
      _socket?.send(bytes, remoteAddr, remotePort);
    } else {
      final resp = const VcrltPairResponse(
        success: false,
        pcName: 'PC',
        message: 'Invalid pairing PIN code',
      );
      final bytes = utf8.encode(jsonEncode(resp.toJson()));
      _socket?.send(bytes, remoteAddr, remotePort);
    }
  }

  void _sendBeaconTo(InternetAddress addr, int port) {
    try {
      final beacon = VcrltBeacon(
        pcName: pcName,
        ip: localIp,
        port: NetworkManager.port,
        pairCode: pairCode,
      );
      final bytes = utf8.encode(jsonEncode(beacon.toJson()));
      _socket?.send(bytes, addr, port);
    } catch (_) {}
  }

  void _handleInputPacket(Map<String, dynamic> json, InternetAddress remoteAddr, int remotePort) {
    packetsReceivedSecond++;
    final packet = VcrltPacket.fromJson(json);
    latestPacket = packet;

    if (connectedClient != null) {
      connectedClient!.lastSeen = DateTime.now();
    } else {
      connectedClient = ConnectedClient(
        address: remoteAddr,
        port: remotePort,
        name: 'Android Gamepad',
        controllerId: packet.controllerId,
        lastSeen: DateTime.now(),
      );
      _clientStreamController.add(connectedClient);
    }

    // Calculate latency
    final now = DateTime.now().millisecondsSinceEpoch;
    if (packet.timestamp > 0) {
      final delta = (now - packet.timestamp).abs().toDouble();
      averageLatencyMs = (averageLatencyMs * 0.8) + (delta * 0.2);
    }

    // Update Virtual Gamepad / ViGEm / XInput Driver
    gamepadService.updateState(packet);

    _packetStreamController.add(packet);
  }

  // Send reverse rumble packet to connected phone
  void sendVibration({double intensity = 0.8, int durationMs = 150}) {
    if (connectedClient == null || _socket == null) return;
    try {
      final packet = VcrltVibrationPacket(intensity: intensity, durationMs: durationMs);
      final bytes = utf8.encode(jsonEncode(packet.toJson()));
      _socket?.send(bytes, connectedClient!.address, connectedClient!.port);
    } catch (_) {}
  }

  void stop() {
    _beaconTimer?.cancel();
    _statsTimer?.cancel();
    _socket?.close();
    _clientStreamController.close();
    _packetStreamController.close();
    _statsStreamController.close();
  }
}
