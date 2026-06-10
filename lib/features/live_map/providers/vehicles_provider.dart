import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../shared/models/vehicle.dart';

final vehiclesProvider = StreamProvider<List<Vehicle>>((ref) {
  final supabase = Supabase.instance.client;

  return supabase
      .from('vehicle_positions')
      .stream(primaryKey: ['id'])
      .map((rows) {
        print('vehicle_positions rows: ${rows.length}');
        for (final row in rows) {
          print('Row: $row');
        }

        // Ambil posisi terbaru per vehicle_id
        final Map<String, Map<String, dynamic>> latest = {};
        for (final row in rows) {
          final vid = row['vehicle_id'] as String;
          if (!latest.containsKey(vid)) {
            latest[vid] = row;
          }
        }
        return latest.values
            .map((row) => Vehicle.fromJson(row))
            .toList();
      });
});