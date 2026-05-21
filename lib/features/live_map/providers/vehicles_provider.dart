import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../shared/models/vehicle.dart';

// Dummy data — nanti diganti Supabase realtime
final vehiclesProvider = StateProvider<List<Vehicle>>((ref) {
  return [
    const Vehicle(
      id: 'DT-001',
      name: 'Dump Truck 001',
      latitude: -1.9200,
      longitude: 116.3100,
      fuelLevel: 75.0,
      operatorName: 'Budi Santoso',
      fatigueScore: 0.3,
      zone: 'Pit A',
      status: 'active',
    ),
    const Vehicle(
      id: 'DT-002',
      name: 'Dump Truck 002',
      latitude: -1.9250,
      longitude: 116.3200,
      fuelLevel: 45.0,
      operatorName: 'Andi Wijaya',
      fatigueScore: 0.8,
      zone: 'Pit B',
      status: 'warning',
    ),
    const Vehicle(
      id: 'EX-001',
      name: 'Excavator 001',
      latitude: -1.9150,
      longitude: 116.3050,
      fuelLevel: 90.0,
      operatorName: 'Sari Dewi',
      fatigueScore: 0.2,
      zone: 'Pit A',
      status: 'active',
    ),
    const Vehicle(
      id: 'DT-003',
      name: 'Dump Truck 003',
      latitude: -1.9300,
      longitude: 116.3150,
      fuelLevel: 20.0,
      operatorName: 'Reza Firmansyah',
      fatigueScore: 0.6,
      zone: 'Pit C',
      status: 'idle',
    ),
  ];
});