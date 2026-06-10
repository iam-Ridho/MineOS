import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:google_fonts/google_fonts.dart';
import '../providers/vehicles_provider.dart';
import '../../../shared/models/vehicle.dart';
import 'digital_twin_screen.dart';
import '../../vehicle_detail/screens/vehicle_detail_screen.dart';

class LiveMapScreen extends ConsumerStatefulWidget {
  const LiveMapScreen({super.key});

  @override
  ConsumerState<LiveMapScreen> createState() => _LiveMapScreenState();
}

class _LiveMapScreenState extends ConsumerState<LiveMapScreen>
    with TickerProviderStateMixin {
  final MapController _mapController = MapController();
  late AnimationController _pulseController;
  Vehicle? _selectedVehicle;
  String _currentTime = '';
  Timer? _timeTimer;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1000),
    )..repeat(reverse: true);

    _updateTime();
    _timeTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      setState(() => _updateTime());
    });
  }

  void _updateTime() {
    final now = DateTime.now();
    _currentTime =
        '${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}:${now.second.toString().padLeft(2, '0')}';
  }

  @override
  void dispose() {
    _pulseController.dispose();
    _timeTimer?.cancel();
    super.dispose();
  }

  Color _getMarkerColor(Vehicle v) {
    if ((v.fuelPct ?? 100) < 20) return const Color(0xFFF87171);
    if ((v.speedKmh ?? 0) > 50) return const Color(0xFFFBBF24);
    return const Color(0xFF10B981);
  }

  IconData _getVehicleIcon(Vehicle v) {
    final id = v.vehicleId.toLowerCase();
    if (id.contains('ex') || id.contains('excavator')) {
      return Icons.construction;
    }
    return Icons.local_shipping;
  }

  @override
  Widget build(BuildContext context) {
    final vehiclesAsync = ref.watch(vehiclesProvider);

    return Scaffold(
      backgroundColor: const Color(0xFF031427),
      body: SafeArea(
        child: Column(
          children: [
            _buildHeader(vehiclesAsync),
            Expanded(
              child: vehiclesAsync.when(
                data: (vehicles) => _buildMapView(vehicles),
                loading: () => const Center(
                  child: CircularProgressIndicator(color: Color(0xFF3B82F6)),
                ),
                error: (e, _) => Center(
                  child: Text('Error: $e',
                      style: const TextStyle(color: Color(0xFFF87171))),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader(AsyncValue vehiclesAsync) {
    final count = vehiclesAsync.maybeWhen(
      data: (v) => (v as List<Vehicle>).length,
      orElse: () => 0,
    );

    return Container(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
      decoration: const BoxDecoration(
        color: Color(0xFF031427),
        border: Border(bottom: BorderSide(color: Color(0xFF1E2D45))),
      ),
      child: Row(
        children: [
          Text('MineOS',
              style: GoogleFonts.inter(
                  color: Colors.white,
                  fontSize: 20,
                  fontWeight: FontWeight.bold)),
          const SizedBox(width: 8),
          Text('Digital Twin',
              style: GoogleFonts.inter(
                  color: const Color(0xFF3B82F6),
                  fontSize: 20,
                  fontWeight: FontWeight.w300)),
          const Spacer(),
          // Tombol 3D TWIN
          GestureDetector(
            onTap: () => Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => const DigitalTwinScreen(
                  url: 'http://10.10.5.12:3000/digital-twin',
                ),
              ),
            ),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: const Color(0xFF3B82F6).withOpacity(0.1),
                borderRadius: BorderRadius.circular(4),
                border: Border.all(
                    color: const Color(0xFF3B82F6).withOpacity(0.4)),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.view_in_ar,
                      color: Color(0xFF3B82F6), size: 14),
                  const SizedBox(width: 4),
                  Text('3D TWIN',
                      style: GoogleFonts.sourceCodePro(
                          color: const Color(0xFF3B82F6),
                          fontSize: 9,
                          fontWeight: FontWeight.bold,
                          letterSpacing: 1)),
                ],
              ),
            ),
          ),
          const SizedBox(width: 8),
        // Pulse indicator
        AnimatedBuilder(
          animation: _pulseController,
          builder: (_, __) => Container(
            width: 8,
            height: 8,
            decoration: BoxDecoration(
              color: Color.lerp(
                const Color(0xFF10B981),
                Colors.transparent,
                _pulseController.value,
              ),
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFF10B981).withOpacity(0.4),
                  blurRadius: 6,
                  spreadRadius: 1,
                ),
              ],
            ),
          ),
        ),
        const SizedBox(width: 8),
        // Recenter button
        GestureDetector(
          onTap: () {
            final vehicles = ref.read(vehiclesProvider).value;
            if (vehicles != null && vehicles.isNotEmpty) {
              _mapController.move(
                LatLng(vehicles.first.latitude,
                    vehicles.first.longitude),
                14,
              );
            }
          },
          child: const Icon(Icons.my_location,
              color: Color(0xFF8892A4), size: 18),
          ),
        ],
      ),
    );
  }

  Widget _buildMapView(List<Vehicle> vehicles) {
    return Stack(
      children: [
        FlutterMap(
          mapController: _mapController,
          options: MapOptions(
            initialCenter: vehicles.isNotEmpty
                ? LatLng(vehicles.first.latitude, vehicles.first.longitude)
                : const LatLng(-1.9300, 116.3200),
            initialZoom: 14,
            onTap: (_, __) => setState(() => _selectedVehicle = null),
          ),
          children: [
            TileLayer(
              urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
              userAgentPackageName: 'com.kic2026.mineos',
            ),
            MarkerLayer(
              markers: vehicles.map((v) {
                final color = _getMarkerColor(v);
                final isSelected =
                    _selectedVehicle?.vehicleId == v.vehicleId;
                return Marker(
                  point: LatLng(v.latitude, v.longitude),
                  width: isSelected ? 60 : 48,
                  height: isSelected ? 60 : 48,
                  child: GestureDetector(
                    onTap: () {
                      setState(() => _selectedVehicle = v);
                      _mapController.move(
                          LatLng(v.latitude, v.longitude), 15);
                    },
                    child: Stack(
                      alignment: Alignment.center,
                      children: [
                        Container(
                          width: isSelected ? 56 : 44,
                          height: isSelected ? 56 : 44,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            boxShadow: [
                              BoxShadow(
                                color: color.withOpacity(0.4),
                                blurRadius: isSelected ? 16 : 8,
                                spreadRadius: isSelected ? 4 : 2,
                              ),
                            ],
                          ),
                        ),
                        Container(
                          width: isSelected ? 44 : 36,
                          height: isSelected ? 44 : 36,
                          decoration: BoxDecoration(
                            color: color.withOpacity(0.15),
                            shape: BoxShape.circle,
                            border: Border.all(
                              color: color,
                              width: isSelected ? 2.5 : 1.5,
                            ),
                          ),
                          child: Icon(_getVehicleIcon(v),
                              color: color,
                              size: isSelected ? 22 : 18),
                        ),
                      ],
                    ),
                  ),
                );
              }).toList(),
            ),
          ],
        ),

        // Top overlay
        Positioned(
          top: 12,
          left: 12,
          right: 12,
          child: Row(
            children: [
              _GlassCard(
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.local_shipping,
                        color: Color(0xFF10B981), size: 14),
                    const SizedBox(width: 6),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('ACTIVE FLEET',
                            style: GoogleFonts.sourceCodePro(
                                color: const Color(0xFF8892A4),
                                fontSize: 8,
                                letterSpacing: 1)),
                        Text('${vehicles.length}/14',
                            style: GoogleFonts.sourceCodePro(
                                color: Colors.white,
                                fontSize: 13,
                                fontWeight: FontWeight.bold)),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              _GlassCard(
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.thermostat,
                        color: Color(0xFF10B981), size: 14),
                    const SizedBox(width: 6),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('WEATHER',
                            style: GoogleFonts.sourceCodePro(
                                color: const Color(0xFF8892A4),
                                fontSize: 8,
                                letterSpacing: 1)),
                        Text('24°C OPTIMAL',
                            style: GoogleFonts.sourceCodePro(
                                color: Colors.white,
                                fontSize: 11,
                                fontWeight: FontWeight.bold)),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),

        // Right controls
        Positioned(
          right: 12,
          bottom: _selectedVehicle != null ? 180 : 80,
          child: Column(
            children: [
              _MapButton(
                icon: Icons.add,
                onTap: () => _mapController.move(
                  _mapController.camera.center,
                  _mapController.camera.zoom + 1,
                ),
              ),
              const SizedBox(height: 6),
              _MapButton(
                icon: Icons.remove,
                onTap: () => _mapController.move(
                  _mapController.camera.center,
                  _mapController.camera.zoom - 1,
                ),
              ),
              const SizedBox(height: 6),
              _MapButton(icon: Icons.layers_outlined, onTap: () {}),
            ],
          ),
        ),

        // Bottom panel
        Positioned(
          bottom: 0,
          left: 0,
          right: 0,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (_selectedVehicle != null)
                Container(
                  margin: const EdgeInsets.fromLTRB(12, 0, 12, 8),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFF0B1C30),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color:
                          _getMarkerColor(_selectedVehicle!).withOpacity(0.4),
                    ),
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 40,
                        height: 40,
                        decoration: BoxDecoration(
                          color: _getMarkerColor(_selectedVehicle!)
                              .withOpacity(0.15),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(
                            color: _getMarkerColor(_selectedVehicle!)
                                .withOpacity(0.4),
                          ),
                        ),
                        child: Icon(_getVehicleIcon(_selectedVehicle!),
                            color: _getMarkerColor(_selectedVehicle!),
                            size: 20),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(_selectedVehicle!.vehicleId,
                                style: GoogleFonts.sourceCodePro(
                                    color: Colors.white,
                                    fontSize: 13,
                                    fontWeight: FontWeight.bold)),
                            Text(_selectedVehicle!.operatorName ?? '-',
                                style: GoogleFonts.inter(
                                    color: const Color(0xFF8892A4),
                                    fontSize: 11)),
                          ],
                        ),
                      ),
                      _TelemetryChip(
                        label: 'BBM',
                        value:
                            '${(_selectedVehicle!.fuelPct ?? 0).toStringAsFixed(0)}%',
                        color: (_selectedVehicle!.fuelPct ?? 100) < 20
                            ? const Color(0xFFF87171)
                            : const Color(0xFF10B981),
                      ),
                      const SizedBox(width: 8),
                      _TelemetryChip(
                        label: 'SPD',
                        value:
                            '${(_selectedVehicle!.speedKmh ?? 0).toStringAsFixed(0)}',
                        color: const Color(0xFF3B82F6),
                      ),
                      const SizedBox(width: 8),
                      // Tombol Detail
                      GestureDetector(
                        onTap: () => Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => VehicleDetailScreen(
                              vehicleId: _selectedVehicle!.vehicleId,
                            ),
                          ),
                        ),
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8, vertical: 6),
                          decoration: BoxDecoration(
                            color:
                                const Color(0xFF3B82F6).withOpacity(0.1),
                            borderRadius: BorderRadius.circular(4),
                            border: Border.all(
                                color: const Color(0xFF3B82F6)
                                    .withOpacity(0.4)),
                          ),
                          child: Text('DETAIL',
                              style: GoogleFonts.inter(
                                  color: const Color(0xFF3B82F6),
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                  letterSpacing: 1)),
                        ),
                      ),
                    ],
                  ),
                ),

              // Telemetry sync bar
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                color: const Color(0xFF0B1C30).withOpacity(0.95),
                child: Row(
                  children: [
                    AnimatedBuilder(
                      animation: _pulseController,
                      builder: (_, __) => Container(
                        width: 6,
                        height: 6,
                        decoration: BoxDecoration(
                          color: Color.lerp(
                            const Color(0xFF10B981),
                            Colors.transparent,
                            _pulseController.value,
                          ),
                          shape: BoxShape.circle,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text('LIVE TELEMETRY SYNC',
                        style: GoogleFonts.sourceCodePro(
                            color: const Color(0xFF10B981),
                            fontSize: 9,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 1)),
                    const Spacer(),
                    Text(_currentTime,
                        style: GoogleFonts.sourceCodePro(
                            color: const Color(0xFF8892A4), fontSize: 9)),
                  ],
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _GlassCard extends StatelessWidget {
  final Widget child;
  const _GlassCard({required this.child});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: const Color(0xFF0B1C30).withOpacity(0.9),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: const Color(0xFF1E2D45)),
      ),
      child: child,
    );
  }
}

class _MapButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;
  const _MapButton({required this.icon, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 36,
        height: 36,
        decoration: BoxDecoration(
          color: const Color(0xFF0B1C30).withOpacity(0.9),
          borderRadius: BorderRadius.circular(6),
          border: Border.all(color: const Color(0xFF1E2D45)),
        ),
        child: Icon(icon, color: const Color(0xFF8892A4), size: 18),
      ),
    );
  }
}

class _TelemetryChip extends StatelessWidget {
  final String label;
  final String value;
  final Color color;
  const _TelemetryChip(
      {required this.label, required this.value, required this.color});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(label,
            style: GoogleFonts.sourceCodePro(
                color: const Color(0xFF8892A4),
                fontSize: 8,
                letterSpacing: 1)),
        const SizedBox(height: 2),
        Text(value,
            style: GoogleFonts.sourceCodePro(
                color: color,
                fontSize: 12,
                fontWeight: FontWeight.bold)),
      ],
    );
  }
}