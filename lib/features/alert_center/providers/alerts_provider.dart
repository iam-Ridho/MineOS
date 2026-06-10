import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../shared/models/alert.dart';

final alertsProvider = StreamProvider<List<Alert>>((ref) {
  final supabase = Supabase.instance.client;

  return supabase
      .from('alerts')
      .stream(primaryKey: ['id'])
      .order('created_at', ascending: false)
      .map((rows) {
        print('alerts rows: ${rows.length}');
        return rows.map((row) => Alert.fromJson(row)).toList();
      });
});

// Provider untuk acknowledge alert
final acknowledgeAlertProvider = Provider((ref) {
  return AcknowledgeService();
});

class AcknowledgeService {
  final _supabase = Supabase.instance.client;

  Future<void> acknowledge(int alertId) async {
    await _supabase.from('alerts').update({
      'acknowledged': true,
      'acknowledged_by': 'Supervisor Mobile',
      'acknowledged_at': DateTime.now().toIso8601String(),
    }).eq('id', alertId);
  }
}