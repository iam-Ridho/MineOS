import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class FCMService {
  static final _messaging = FirebaseMessaging.instance;

  static Future<void> initialize(BuildContext context) async {
    // Minta izin notifikasi
    final settings = await _messaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );

    print('FCM permission: ${settings.authorizationStatus}');

    // Ambil FCM token — kirim ke Ridho
    final token = await _messaging.getToken();
    print('✅ FCM Token: $token');

    // Simpan token ke Supabase supaya Ridho bisa kirim notif ke device ini
    if (token != null) {
      await Supabase.instance.client.from('device_tokens').upsert({
        'token': token,
        'platform': 'android',
        'updated_at': DateTime.now().toIso8601String(),
      });
    }

    // Notif saat app AKTIF (foreground)
    FirebaseMessaging.onMessage.listen((message) {
      print('Foreground message: ${message.notification?.title}');
      _showInAppNotification(context, message);
    });

    // Notif saat app di background lalu diklik
    FirebaseMessaging.onMessageOpenedApp.listen((message) {
      print('Notification tapped: ${message.notification?.title}');
      // TODO: navigasi ke Alert Center
    });
  }

  static void _showInAppNotification(
      BuildContext context, RemoteMessage message) {
    final notification = message.notification;
    if (notification == null) return;

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        backgroundColor: Colors.red.shade700,
        duration: const Duration(seconds: 5),
        content: Row(
          children: [
            const Icon(Icons.warning_amber, color: Colors.white),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    notification.title ?? 'MineOS Alert',
                    style: const TextStyle(
                        color: Colors.white, fontWeight: FontWeight.bold),
                  ),
                  Text(
                    notification.body ?? '',
                    style: const TextStyle(color: Colors.white70),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}