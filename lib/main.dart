import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'features/splash/screens/splash_screen.dart';
import 'features/dashboard/screens/dashboard_screen.dart';
import 'features/live_map/screens/live_map_screen.dart';
import 'features/alert_center/screens/alert_center_screen.dart';
import 'features/vehicle_detail/screens/vehicle_detail_screen.dart';
import 'features/ai_chat/screens/ai_chat_screen.dart';

void main() {
  runApp(
    const ProviderScope(
      child: MineOSApp(),
    ),
  );
}

class MineOSApp extends StatelessWidget {
  const MineOSApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'MineOS Mobile',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF1A237E),
          brightness: Brightness.dark,
        ),
        useMaterial3: true,
      ),
      home: const SplashScreen(),
    );
  }
}

class MainNavigation extends StatefulWidget {
  const MainNavigation({super.key});

  @override
  State<MainNavigation> createState() => MainNavigationState();
}

class MainNavigationState extends State<MainNavigation> {
  int _currentIndex = 0;

  void switchTab(int index) {
    setState(() => _currentIndex = index);
  }

  @override
  Widget build(BuildContext context) {
    final screens = [
      DashboardScreen(onSwitchTab: switchTab),
      const LiveMapScreen(),
      const AlertCenterScreen(),
      const QRScannerScreen(),
      const AIChatScreen(),
    ];

    return Scaffold(
      body: screens[_currentIndex],
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: switchTab,
        backgroundColor: const Color(0xFF0D1117),
        selectedItemColor: const Color(0xFF5C6BC0),
        unselectedItemColor: Colors.white38,
        type: BottomNavigationBarType.fixed,
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.dashboard),
            label: 'Dashboard',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.map),
            label: 'Live Map',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.warning_amber),
            label: 'Alerts',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.qr_code_scanner),
            label: 'Vehicle',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.smart_toy),
            label: 'AI Chat',
          ),
        ],
      ),
    );
  }
}