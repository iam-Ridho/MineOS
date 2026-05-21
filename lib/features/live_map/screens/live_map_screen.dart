import 'dart:async';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import '../../vehicle_detail/screens/vehicle_detail_screen.dart';

class LiveMapScreen extends StatefulWidget {
  const LiveMapScreen({super.key});

  @override
  State<LiveMapScreen> createState() => _LiveMapScreenState();
}

class _LiveMapScreenState extends State<LiveMapScreen> {
  final _random = Random();
  Timer? _timer;
  final MapController _mapController = MapController();

  final List<Map<String, dynamic>> _vehicles = [
    {
      'id': 'DT-001',
      'name': 'Dump Truck 001',
      'lat': -1.9200,
      'lng': 116.3100,
      'status': 'active',
      'fuel': 75,
      'fatigue': 30,
      'operator': 'Budi Santoso',
      'speed': 35,
    },
    {
      'id': 'DT-002',
      'name': 'Dump Truck 002',
      'lat': -1.9350,
      'lng': 116.3250,
      'status': 'warning',
      'fuel': 45,
      'fatigue': 80,
      'operator': 'Andi Wijaya',
      'speed': 28,
    },
    {
      'id': 'EX-001',
      'name': 'Excavator 001',
      'lat': -1.9150,
      'lng': 116.3050,
      'status': 'active',
      'fuel': 90,
      'fatigue': 20,
      'operator': 'Sari Dewi',
      'speed': 0,
    },
    {
      'id': 'DT-003',
      'name': 'Dump Truck 003',
      'lat': -1.9450,
      'lng': 116.3350,
      'status': 'idle',
      'fuel': 20,
      'fatigue': 60,
      'operator': 'Reza Firmansyah',
      'speed': 0,
    },
  ];

  Map<String, dynamic>? _selectedVehicle;

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(seconds: 2), (_) {
      setState(() {
        for (var v in _vehicles) {
          if (v['status'] != 'idle') {
            v['lat'] += (_random.nextDouble() - 0.5) * 0.0008;
            v['lng'] += (_random.nextDouble() - 0.5) * 0.0008;
            v['speed'] = (v['speed'] + (_random.nextInt(5) - 2))
                .clamp(0, 60);
          }
        }
      });
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Color _getStatusColor(Map<String, dynamic> v) {
    if (v['status'] == 'warning') return Colors.red;
    if (v['fatigue'] > 70) return Colors.orange;
    if (v['fuel'] < 25) return Colors.orange;
    if (v['status'] == 'idle') return Colors.grey;
    return Colors.green;
  }

  IconData _getVehicleIcon(String id) {
    return id.startsWith('EX') ? Icons.construction : Icons.local_shipping;
  }

  int get _warningCount =>
      _vehicles.where((v) => v['status'] == 'warning').length;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0D1117),
      appBar: AppBar(
        backgroundColor: const Color(0xFF1A237E),
        title: Row(
          children: [
            const Icon(Icons.map, color: Colors.white, size: 20),
            const SizedBox(width: 8),
            const Text('Live Map',
                style: TextStyle(
                    color: Colors.white, fontWeight: FontWeight.bold)),
            const SizedBox(width: 8),
            if (_warningCount > 0)
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: Colors.red,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text('$_warningCount',
                    style: const TextStyle(
                        color: Colors.white,
                        fontSize: 12,
                        fontWeight: FontWeight.bold)),
              ),
          ],
        ),
        actions: [
          // Tombol center map
          IconButton(
            icon: const Icon(Icons.my_location, color: Colors.white),
            onPressed: () => _mapController.move(
              LatLng(-1.9300, 116.3200),
              14,
            ),
          ),
        ],
      ),
      body: Stack(
        children: [
          // Peta
          FlutterMap(
            mapController: _mapController,
            options: MapOptions(
              initialCenter: const LatLng(-1.9300, 116.3200),
              initialZoom: 14,
              onTap: (_, __) => setState(() => _selectedVehicle = null),
            ),
            children: [
              TileLayer(
                urlTemplate:
                    'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                userAgentPackageName: 'com.kic2026.mineos',
              ),
              MarkerLayer(
                markers: _vehicles.map((v) {
                  final color = _getStatusColor(v);
                  final isSelected = _selectedVehicle?['id'] == v['id'];
                  return Marker(
                    point: LatLng(v['lat'], v['lng']),
                    width: isSelected ? 56 : 44,
                    height: isSelected ? 56 : 44,
                    child: GestureDetector(
                      onTap: () =>
                          setState(() => _selectedVehicle = v),
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 200),
                        decoration: BoxDecoration(
                          color: color,
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: Colors.white,
                            width: isSelected ? 3 : 1.5,
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: color.withOpacity(0.5),
                              blurRadius: isSelected ? 12 : 6,
                              spreadRadius: isSelected ? 3 : 1,
                            ),
                          ],
                        ),
                        child: Icon(
                          _getVehicleIcon(v['id']),
                          color: Colors.white,
                          size: isSelected ? 28 : 22,
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
            ],
          ),

          // Legend
          Positioned(
            top: 12,
            right: 12,
            child: Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: Colors.black87,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: Colors.white12),
              ),
              child: const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _LegendItem(color: Colors.green, label: 'Normal'),
                  SizedBox(height: 4),
                  _LegendItem(color: Colors.orange, label: 'Perhatian'),
                  SizedBox(height: 4),
                  _LegendItem(color: Colors.red, label: 'Kritis'),
                  SizedBox(height: 4),
                  _LegendItem(color: Colors.grey, label: 'Idle'),
                ],
              ),
            ),
          ),

          // Summary bar bawah
          Positioned(
            bottom: 0,
            left: 0,
            right: 0,
            child: Container(
              padding: const EdgeInsets.all(12),
              decoration: const BoxDecoration(
                color: Color(0xE60D1117),
                borderRadius:
                    BorderRadius.vertical(top: Radius.circular(16)),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Vehicle chips
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: _vehicles.map((v) {
                        final color = _getStatusColor(v);
                        final isSelected =
                            _selectedVehicle?['id'] == v['id'];
                        return GestureDetector(
                          onTap: () {
                            setState(() => _selectedVehicle = v);
                            _mapController.move(
                                LatLng(v['lat'], v['lng']), 15);
                          },
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 200),
                            margin: const EdgeInsets.only(right: 8),
                            padding: const EdgeInsets.symmetric(
                                horizontal: 12, vertical: 6),
                            decoration: BoxDecoration(
                              color: isSelected
                                  ? color.withOpacity(0.3)
                                  : const Color(0xFF1A1A2E),
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(
                                color:
                                    isSelected ? color : Colors.white24,
                              ),
                            ),
                            child: Row(
                              children: [
                                CircleAvatar(
                                  backgroundColor: color,
                                  radius: 6,
                                ),
                                const SizedBox(width: 6),
                                Text(v['id'],
                                    style: TextStyle(
                                        color: isSelected
                                            ? Colors.white
                                            : Colors.white54,
                                        fontSize: 12,
                                        fontWeight: isSelected
                                            ? FontWeight.bold
                                            : FontWeight.normal)),
                              ],
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                  ),

                  // Detail panel jika ada yang dipilih
                  if (_selectedVehicle != null) ...[
                    const SizedBox(height: 10),
                    const Divider(color: Colors.white12, height: 1),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        CircleAvatar(
                          backgroundColor:
                              _getStatusColor(_selectedVehicle!)
                                  .withOpacity(0.2),
                          radius: 20,
                          child: Icon(
                            _getVehicleIcon(_selectedVehicle!['id']),
                            color:
                                _getStatusColor(_selectedVehicle!),
                            size: 20,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment:
                                CrossAxisAlignment.start,
                            children: [
                              Text(_selectedVehicle!['name'],
                                  style: const TextStyle(
                                      color: Colors.white,
                                      fontWeight: FontWeight.bold,
                                      fontSize: 14)),
                              Text(
                                  'Operator: ${_selectedVehicle!['operator']}',
                                  style: const TextStyle(
                                      color: Colors.white54,
                                      fontSize: 12)),
                            ],
                          ),
                        ),
                        // Stats
                        _MiniStat(
                          icon: Icons.local_gas_station,
                          value: '${_selectedVehicle!['fuel']}%',
                          color: _selectedVehicle!['fuel'] < 25
                              ? Colors.red
                              : Colors.blue,
                        ),
                        const SizedBox(width: 8),
                        _MiniStat(
                          icon: Icons.psychology,
                          value: '${_selectedVehicle!['fatigue']}%',
                          color: _selectedVehicle!['fatigue'] > 70
                              ? Colors.red
                              : Colors.green,
                        ),
                        const SizedBox(width: 8),
                        // Tombol detail
                        ElevatedButton(
                          onPressed: () => Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => VehicleDetailScreen(
                                  vehicleId:
                                      _selectedVehicle!['id']),
                            ),
                          ),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF1A237E),
                            padding: const EdgeInsets.symmetric(
                                horizontal: 12, vertical: 6),
                            minimumSize: Size.zero,
                            tapTargetSize:
                                MaterialTapTargetSize.shrinkWrap,
                          ),
                          child: const Text('Detail',
                              style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 12)),
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _LegendItem extends StatelessWidget {
  final Color color;
  final String label;
  const _LegendItem({required this.color, required this.label});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        CircleAvatar(backgroundColor: color, radius: 5),
        const SizedBox(width: 6),
        Text(label,
            style:
                const TextStyle(color: Colors.white70, fontSize: 10)),
      ],
    );
  }
}

class _MiniStat extends StatelessWidget {
  final IconData icon;
  final String value;
  final Color color;
  const _MiniStat(
      {required this.icon, required this.value, required this.color});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Icon(icon, color: color, size: 14),
        const SizedBox(height: 2),
        Text(value,
            style: TextStyle(
                color: color,
                fontSize: 10,
                fontWeight: FontWeight.bold)),
      ],
    );
  }
}