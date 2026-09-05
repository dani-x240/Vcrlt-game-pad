import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'dani_x240_pad.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Force Landscape and full-screen immersive mode (hide system nav bars)
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.landscapeLeft,
    DeviceOrientation.landscapeRight,
  ]);

  await SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);

  runApp(const VcrltControllerApp());
}

class VcrltControllerApp extends StatelessWidget {
  const VcrltControllerApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'VCRLT Game Pad',
      debugShowCheckedModeBanner: false,
      theme: ThemeData.dark().copyWith(
        scaffoldBackgroundColor: const Color(0xFF090A0F),
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFF3B82F6),
          secondary: Color(0xFF6366F1),
          surface: Color(0xFF131722),
        ),
      ),
      home: const DaniX240PadScreen(),
    );
  }
}
