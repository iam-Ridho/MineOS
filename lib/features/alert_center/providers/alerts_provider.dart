import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../shared/models/alert.dart';

// Dummy data — nanti diganti Supabase realtime
final alertsProvider = StateNotifierProvider<AlertsNotifier, List<Alert>>(
  (ref) => AlertsNotifier(),
);

class AlertsNotifier extends StateNotifier<List<Alert>> {
  AlertsNotifier() : super(_dummyAlerts);

  void acknowledge(String alertId) {
    state = state.map((alert) {
      if (alert.id == alertId) {
        return alert.copyWith(isAcknowledged: true);
      }
      return alert;
    }).toList();
  }

  static final List<Alert> _dummyAlerts = [
    Alert(
      id: 'ALT-001',
      vehicleId: 'DT-002',
      vehicleName: 'Dump Truck 002',
      message: 'Tingkat kelelahan operator mencapai 80%! Segera istirahat.',
      severity: 'red',
      category: 'fatigue',
      createdAt: DateTime.now().subtract(const Duration(minutes: 5)),
      isAcknowledged: false,
    ),
    Alert(
      id: 'ALT-002',
      vehicleId: 'DT-003',
      vehicleName: 'Dump Truck 003',
      message: 'Level BBM di bawah 25%. Segera ke fuel station.',
      severity: 'red',
      category: 'fuel',
      createdAt: DateTime.now().subtract(const Duration(minutes: 12)),
      isAcknowledged: false,
    ),
    Alert(
      id: 'ALT-003',
      vehicleId: 'DT-001',
      vehicleName: 'Dump Truck 001',
      message: 'Kecepatan melebihi batas zona Pit A (40 km/h).',
      severity: 'yellow',
      category: 'speed',
      createdAt: DateTime.now().subtract(const Duration(minutes: 20)),
      isAcknowledged: false,
    ),
    Alert(
      id: 'ALT-004',
      vehicleId: 'EX-001',
      vehicleName: 'Excavator 001',
      message: 'Jadwal maintenance 500 jam mendekati batas.',
      severity: 'yellow',
      category: 'maintenance',
      createdAt: DateTime.now().subtract(const Duration(hours: 1)),
      isAcknowledged: false,
    ),
    Alert(
      id: 'ALT-005',
      vehicleId: 'DT-001',
      vehicleName: 'Dump Truck 001',
      message: 'Operator check-in berhasil. Kondisi normal.',
      severity: 'green',
      category: 'fatigue',
      createdAt: DateTime.now().subtract(const Duration(hours: 2)),
      isAcknowledged: true,
    ),
  ];
}