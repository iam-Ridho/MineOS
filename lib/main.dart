import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'core/supabase_config.dart';
import 'features/splash/screens/splash_screen.dart';
import 'features/dashboard/screens/dashboard_screen.dart';
import 'features/live_map/screens/live_map_screen.dart';
import 'features/alert_center/screens/alert_center_screen.dart';
import 'features/vehicle_detail/screens/vehicle_detail_screen.dart';
import 'features/ai_chat/screens/ai_chat_screen.dart';

// Global navigator key — harus di atas sebelum dipakai
final navigatorKey = GlobalKey<NavigatorState>();

// Handler notif background
@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
  print('Background notif: ${message.notification?.title}');
}

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Init Firebase dengan timeout
  try {
    await Firebase.initializeApp()
        .timeout(const Duration(seconds: 5));
    FirebaseMessaging.onBackgroundMessage(
        _firebaseMessagingBackgroundHandler);
  } catch (e) {
    print('Firebase init error/timeout: $e');
  }

  // Init Supabase
  await Supabase.initialize(
    url: SupabaseConfig.url,
    anonKey: SupabaseConfig.anonKey,
  );

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
      navigatorKey: navigatorKey,
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

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _setupFCM();
    });
  }

  Future<void> _setupFCM() async {
    try {
      final messaging = FirebaseMessaging.instance;

      await messaging.requestPermission(
        alert: true,
        badge: true,
        sound: true,
      );

      await messaging.subscribeToTopic('mineos-kritis');
      await messaging.subscribeToTopic('mineos-waspada');
      print('FCM subscribed to topics');

      final token = await messaging.getToken();
      print('FCM Token: $token');

      // Notif saat app aktif
      FirebaseMessaging.onMessage.listen((message) {
        _showNotifBanner(message);
      });

      // Tap notif saat app background
      FirebaseMessaging.onMessageOpenedApp.listen((message) {
        switchTab(2);
      });
    } catch (e) {
      print('FCM setup error: $e');
    }
  }

  void _showNotifBanner(RemoteMessage message) {
    final ctx = navigatorKey.currentContext;
    if (ctx == null) return;

    ScaffoldMessenger.of(ctx).showSnackBar(
      SnackBar(
        backgroundColor: message.data['severity'] == 'critical'
            ? Colors.red.shade700
            : Colors.amber.shade700,
        duration: const Duration(seconds: 6),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        content: Row(
          children: [
            const Icon(Icons.warning_amber, color: Colors.white, size: 20),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    message.notification?.title ?? 'MineOS Alert',
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 13,
                    ),
                  ),
                  Text(
                    message.notification?.body ?? '',
                    style: const TextStyle(
                        color: Colors.white70, fontSize: 12),
                  ),
                ],
              ),
            ),
            TextButton(
              onPressed: () {
                ScaffoldMessenger.of(ctx).hideCurrentSnackBar();
                switchTab(2);
              },
              child: const Text('Lihat',
                  style: TextStyle(color: Colors.white)),
            ),
          ],
        ),
      ),
    );
  }

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