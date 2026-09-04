// VCRLT Low-Latency Protocol
// Defines the input, discovery, pairing, and vibration packet structures transmitted over UDP/Wi-Fi or USB

import 'dart:convert';
import 'dart:typed_data';

class VcrltStickCoordinate {
  final double x; // -1.0 to 1.0
  final double y; // -1.0 to 1.0

  const VcrltStickCoordinate({required this.x, required this.y});

  Map<String, dynamic> toJson() => {'x': x, 'y': y};

  factory VcrltStickCoordinate.fromJson(Map<String, dynamic> json) =>
      VcrltStickCoordinate(
        x: (json['x'] as num).toDouble(),
        y: (json['y'] as num).toDouble(),
      );
}

class VcrltTouchpadCoordinate {
  final double x; // 0.0 to 1.0
  final double y; // 0.0 to 1.0
  final bool active;
  final bool clicked;

  const VcrltTouchpadCoordinate({
    required this.x,
    required this.y,
    required this.active,
    required this.clicked,
  });

  Map<String, dynamic> toJson() => {
        'x': x,
        'y': y,
        'active': active,
        'clicked': clicked,
      };

  factory VcrltTouchpadCoordinate.fromJson(Map<String, dynamic> json) =>
      VcrltTouchpadCoordinate(
        x: (json['x'] as num).toDouble(),
        y: (json['y'] as num).toDouble(),
        active: json['active'] as bool,
        clicked: json['clicked'] as bool,
      );
}

class VcrltPacket {
  final String type; // 'INPUT'
  final int controllerId; // 1 to 4
  final int sequence;
  final int timestamp; // Milliseconds

  final VcrltStickCoordinate leftStick;
  final VcrltStickCoordinate rightStick;

  final double leftTrigger;  // L2 (0.0 to 1.0)
  final double rightTrigger; // R2 (0.0 to 1.0)

  final bool l1;
  final bool r1;

  final bool dpadUp;
  final bool dpadDown;
  final bool dpadLeft;
  final bool dpadRight;

  final bool a; // Cross / A
  final bool b; // Circle / B
  final bool x; // Square / X
  final bool y; // Triangle / Y

  final bool select;
  final bool start;
  final bool home;
  final bool l3;
  final bool r3;

  final VcrltTouchpadCoordinate touchpad;

  const VcrltPacket({
    this.type = 'INPUT',
    required this.controllerId,
    required this.sequence,
    required this.timestamp,
    required this.leftStick,
    required this.rightStick,
    required this.leftTrigger,
    required this.rightTrigger,
    required this.l1,
    required this.r1,
    required this.dpadUp,
    required this.dpadDown,
    required this.dpadLeft,
    required this.dpadRight,
    required this.a,
    required this.b,
    required this.x,
    required this.y,
    required this.select,
    required this.start,
    required this.home,
    required this.l3,
    required this.r3,
    required this.touchpad,
  });

  Map<String, dynamic> toJson() => {
        'type': type,
        'controllerId': controllerId,
        'sequence': sequence,
        'timestamp': timestamp,
        'leftStick': leftStick.toJson(),
        'rightStick': rightStick.toJson(),
        'leftTrigger': leftTrigger,
        'rightTrigger': rightTrigger,
        'l1': l1,
        'r1': r1,
        'dpadUp': dpadUp,
        'dpadDown': dpadDown,
        'dpadLeft': dpadLeft,
        'dpadRight': dpadRight,
        'a': a,
        'b': b,
        'x': x,
        'y': y,
        'select': select,
        'start': start,
        'home': home,
        'l3': l3,
        'r3': r3,
        'touchpad': touchpad.toJson(),
      };

  factory VcrltPacket.fromJson(Map<String, dynamic> json) => VcrltPacket(
        type: json['type'] as String? ?? 'INPUT',
        controllerId: json['controllerId'] as int? ?? 1,
        sequence: json['sequence'] as int? ?? 0,
        timestamp: json['timestamp'] as int? ?? DateTime.now().millisecondsSinceEpoch,
        leftStick: json['leftStick'] != null
            ? VcrltStickCoordinate.fromJson(json['leftStick'])
            : const VcrltStickCoordinate(x: 0, y: 0),
        rightStick: json['rightStick'] != null
            ? VcrltStickCoordinate.fromJson(json['rightStick'])
            : const VcrltStickCoordinate(x: 0, y: 0),
        leftTrigger: (json['leftTrigger'] as num?)?.toDouble() ?? 0.0,
        rightTrigger: (json['rightTrigger'] as num?)?.toDouble() ?? 0.0,
        l1: json['l1'] as bool? ?? false,
        r1: json['r1'] as bool? ?? false,
        dpadUp: json['dpadUp'] as bool? ?? false,
        dpadDown: json['dpadDown'] as bool? ?? false,
        dpadLeft: json['dpadLeft'] as bool? ?? false,
        dpadRight: json['dpadRight'] as bool? ?? false,
        a: json['a'] as bool? ?? false,
        b: json['b'] as bool? ?? false,
        x: json['x'] as bool? ?? false,
        y: json['y'] as bool? ?? false,
        select: json['select'] as bool? ?? false,
        start: json['start'] as bool? ?? false,
        home: json['home'] as bool? ?? false,
        l3: json['l3'] as bool? ?? false,
        r3: json['r3'] as bool? ?? false,
        touchpad: json['touchpad'] != null
            ? VcrltTouchpadCoordinate.fromJson(json['touchpad'])
            : const VcrltTouchpadCoordinate(x: 0.5, y: 0.5, active: false, clicked: false),
      );

  Uint8List toBinary() {
    final str = jsonEncode(toJson());
    return Uint8List.fromList(utf8.encode(str));
  }

  factory VcrltPacket.fromBinary(Uint8List data) {
    final str = utf8.decode(data);
    final map = jsonDecode(str) as Map<String, dynamic>;
    return VcrltPacket.fromJson(map);
  }
}

// Network Discovery Beacon from PC
class VcrltBeacon {
  final String pcName;
  final String ip;
  final int port;
  final String pairCode;

  const VcrltBeacon({
    required this.pcName,
    required this.ip,
    required this.port,
    required this.pairCode,
  });

  Map<String, dynamic> toJson() => {
        'type': 'VCRLT_BEACON',
        'pcName': pcName,
        'ip': ip,
        'port': port,
        'pairCode': pairCode,
      };

  factory VcrltBeacon.fromJson(Map<String, dynamic> json) => VcrltBeacon(
        pcName: json['pcName'] as String? ?? 'PC',
        ip: json['ip'] as String? ?? '',
        port: json['port'] as int? ?? 48270,
        pairCode: json['pairCode'] as String? ?? '482731',
      );
}

// Pairing Request from Phone
class VcrltPairRequest {
  final String clientName;
  final String pairCode;
  final int controllerId;

  const VcrltPairRequest({
    required this.clientName,
    required this.pairCode,
    this.controllerId = 1,
  });

  Map<String, dynamic> toJson() => {
        'type': 'VCRLT_PAIR_REQ',
        'clientName': clientName,
        'pairCode': pairCode,
        'controllerId': controllerId,
      };

  factory VcrltPairRequest.fromJson(Map<String, dynamic> json) => VcrltPairRequest(
        clientName: json['clientName'] as String? ?? 'Phone',
        pairCode: json['pairCode'] as String? ?? '',
        controllerId: json['controllerId'] as int? ?? 1,
      );
}

// Pairing Response from PC
class VcrltPairResponse {
  final bool success;
  final String pcName;
  final String message;
  final int controllerId;

  const VcrltPairResponse({
    required this.success,
    required this.pcName,
    required this.message,
    this.controllerId = 1,
  });

  Map<String, dynamic> toJson() => {
        'type': 'VCRLT_PAIR_ACK',
        'success': success,
        'pcName': pcName,
        'message': message,
        'controllerId': controllerId,
      };

  factory VcrltPairResponse.fromJson(Map<String, dynamic> json) => VcrltPairResponse(
        success: json['success'] as bool? ?? false,
        pcName: json['pcName'] as String? ?? 'PC',
        message: json['message'] as String? ?? '',
        controllerId: json['controllerId'] as int? ?? 1,
      );
}

// Reverse Vibration packet from PC to Phone
class VcrltVibrationPacket {
  final double intensity; // 0.0 to 1.0
  final int durationMs;

  const VcrltVibrationPacket({
    required this.intensity,
    required this.durationMs,
  });

  Map<String, dynamic> toJson() => {
        'type': 'VCRLT_VIBRATE',
        'intensity': intensity,
        'durationMs': durationMs,
      };

  factory VcrltVibrationPacket.fromJson(Map<String, dynamic> json) => VcrltVibrationPacket(
        intensity: (json['intensity'] as num?)?.toDouble() ?? 0.5,
        durationMs: json['durationMs'] as int? ?? 150,
      );
}
