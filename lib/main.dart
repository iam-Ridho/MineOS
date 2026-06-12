import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'core/supabase_config.dart';
import 'features/splash/screens/splash_screen.dart';
import 'features/auth/screens/login_screen.dart';
import 'features/dashboard/screens/dashboard_screen.dart';
import 'features/live_map/screens/live_map_screen.dart';
import 'features/alert_center/screens/alert_center_screen.dart';
import 'features/vehicle_detail/screens/vehicle_detail_screen.dart';  // ← TAMBAH INI
import 'features/ai_chat/screens/ai_chat_screen.dart';
import 'features/vehicle_detail/screens/qr_scanner_screen.dart';  // ← TAMBAH INI

// Global navigator key
final navigatorKey = GlobalKey<NavigatorState>();

// Auth state provider
final authProvider = StateProvider<bool>((ref) => false);

@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
  print('Background notif: ${message.notification?.title}');
}

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Set preferred orientations
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);

  // Init Firebase
  try {
    await Firebase.initializeApp().timeout(const Duration(seconds: 5));
    FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);
  } catch (e) {
    print('Firebase init error: $e');
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

// ── Root App ─────────────────────────────────────────────
class MineOSApp extends StatelessWidget {
  const MineOSApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      navigatorKey: navigatorKey,
      title: 'MineOS Mobile',
      debugShowCheckedModeBanner: false,
      
      // ── THEME PREMIUM KIDECO ──────────────────────────
      theme: ThemeData(
        useMaterial3: true,
        brightness: Brightness.light,
        scaffoldBackgroundColor: const Color(0xFFF8FAFC),
        fontFamily: GoogleFonts.inter().fontFamily,
        colorScheme: const ColorScheme.light(
          primary: Color(0xFF0A1628),
          secondary: Color(0xFF1E293B),
          surface: Color(0xFFFFFFFF),
          background: Color(0xFFF8FAFC),
          error: Color(0xFFDC2626),
        ),
      ),
      
      // ── ROUTES ──────────────────────────────────────────
      home: const AppEntry(),
    );
  }
}

// ── App Entry: Splash → Login → Home ─────────────────────
class AppEntry extends ConsumerStatefulWidget {
  const AppEntry({super.key});

  @override
  ConsumerState<AppEntry> createState() => _AppEntryState();
}

class _AppEntryState extends ConsumerState<AppEntry> {
  bool _showSplash = true;
  bool _isLoggedIn = false;

  void _onSplashComplete() {
    setState(() => _showSplash = false);
  }

  void _onLoginSuccess() {
    HapticFeedback.mediumImpact();
    setState(() => _isLoggedIn = true);
  }

  @override
  Widget build(BuildContext context) {
    // Step 1: Splash Screen
    if (_showSplash) {
      return SplashScreen(onComplete: _onSplashComplete);
    }

    // Step 2: Login Screen (belum login)
    if (!_isLoggedIn) {
      return LoginScreen(onLoginSuccess: _onLoginSuccess);
    }

    // Step 3: Main App (sudah login)
    return const MainNavigation();
  }
}

// ── Main Navigation (Premium Bottom Nav) ─────────────────
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
      print('FCM subscribed');

      final token = await messaging.getToken();
      print('FCM Token: $token');

      FirebaseMessaging.onMessage.listen((message) {
        _showNotifBanner(message);
      });

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
            ? const Color(0xFFDC2626)
            : const Color(0xFFD97706),
        duration: const Duration(seconds: 6),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        margin: const EdgeInsets.all(16),
        content: Row(
          children: [
            const Icon(Icons.warning_amber_rounded, color: Colors.white, size: 20),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    message.notification?.title ?? 'MineOS Alert',
                    style: GoogleFonts.inter(
                      color: Colors.white,
                      fontWeight: FontWeight.w700,
                      fontSize: 13,
                    ),
                  ),
                  Text(
                    message.notification?.body ?? '',
                    style: GoogleFonts.inter(
                      color: Colors.white.withOpacity(0.8),
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),
            GestureDetector(
              onTap: () {
                ScaffoldMessenger.of(ctx).hideCurrentSnackBar();
                switchTab(2);
              },
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  'Lihat',
                  style: GoogleFonts.inter(
                    color: Colors.white,
                    fontWeight: FontWeight.w700,
                    fontSize: 12,
                  ),
                ),
              ),
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
      QRScannerScreen(),
      const AIChatScreen(),
    ];

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: IndexedStack(
        index: _currentIndex,
        children: screens,
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: switchTab,
        backgroundColor: const Color(0xFFFFFFFF),
        selectedItemColor: const Color(0xFF0A1628),
        unselectedItemColor: const Color(0xFF94A3B8),
        type: BottomNavigationBarType.fixed,
        selectedLabelStyle: GoogleFonts.inter(
          fontSize: 11,
          fontWeight: FontWeight.w700,
        ),
        unselectedLabelStyle: GoogleFonts.inter(
          fontSize: 11,
          fontWeight: FontWeight.w500,
        ),
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.space_dashboard_rounded),
            label: 'Dashboard',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.map_rounded),
            label: 'Live Map',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.notifications_active_rounded),
            label: 'Alerts',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.qr_code_scanner_rounded),
            label: 'Vehicle',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.smart_toy_rounded),
            label: 'AI Chat',
          ),
        ],
      ),
    );
  }
}