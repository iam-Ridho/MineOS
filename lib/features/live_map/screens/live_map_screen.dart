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
  late AnimationController _sheetController;
  Vehicle? _selectedVehicle;
  String _currentTime = '';
  Timer? _timeTimer;
  String _filterZone = 'Semua';

  // Design System
  static const _bg = Color(0xFFF0F4F8);
  static const _surface = Color(0xFFFFFFFF);
  static const _navy = Color(0xFF0A1628);
  static const _navyLight = Color(0xFF1E3A5F);
  static const _textPrimary = Color(0xFF0D1B2A);
  static const _textSecondary = Color(0xFF4A6080);
  static const _textMuted = Color(0xFF8DA0B3);
  static const _border = Color(0xFFDDE6EF);
  static const _success = Color(0xFF0A7553);
  static const _warning = Color(0xFFB45309);
  static const _danger = Color(0xFFB91C1C);
  static const _info = Color(0xFF0369A1);

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1800),
    )..repeat(reverse: true);

    _sheetController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 300),
    );

    _updateTime();
    _timeTimer = Timer.periodic(
        const Duration(seconds: 1), (_) => setState(_updateTime));
  }

  void _updateTime([_]) {
    final now = DateTime.now();
    _currentTime =
        '${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}:${now.second.toString().padLeft(2, '0')}';
  }

  @override
  void dispose() {
    _pulseController.dispose();
    _sheetController.dispose();
    _timeTimer?.cancel();
    super.dispose();
  }

  Color _statusColor(Vehicle v) {
    if ((v.fuelPct ?? 100) < 20) return _danger;
    if ((v.speedKmh ?? 0) > 50) return _warning;
    return _success;
  }

  IconData _vehicleIcon(Vehicle v) {
    final id = v.vehicleId.toLowerCase();
    if (id.contains('ex') || id.contains('excavator')) {
      return Icons.construction_rounded;
    }
    return Icons.local_shipping_rounded;
  }

  String _statusLabel(Vehicle v) {
    if ((v.fuelPct ?? 100) < 20) return 'BBM KRITIS';
    if ((v.speedKmh ?? 0) > 50) return 'OVER SPEED';
    return 'NORMAL';
  }

  void _selectVehicle(Vehicle v) {
    setState(() => _selectedVehicle = v);
    _sheetController.forward(from: 0);
    _mapController.move(LatLng(v.latitude, v.longitude), 15.5);
  }

  @override
  Widget build(BuildContext context) {
    final vehiclesAsync = ref.watch(vehiclesProvider);

    return Scaffold(
      backgroundColor: _bg,
      body: SafeArea(
        child: Column(
          children: [
            _buildHeader(vehiclesAsync),
            Expanded(
              child: vehiclesAsync.when(
                data: _buildMap,
                loading: _buildLoading,
                error: (e, _) => _buildError(e),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ── Header ───────────────────────────────────────────────
  Widget _buildHeader(AsyncValue vehiclesAsync) {
    final count = vehiclesAsync.maybeWhen(
      data: (v) => (v as List<Vehicle>).length,
      orElse: () => 0,
    );

    return Container(
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [_navy, _navyLight],
        ),
        boxShadow: [
          BoxShadow(
            color: _navy.withOpacity(0.2),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
            child: Row(
              children: [
                // Icon
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                        color: Colors.white.withOpacity(0.15)),
                  ),
                  child: const Icon(Icons.map_rounded,
                      color: Colors.white, size: 20),
                ),
                const SizedBox(width: 12),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Live Map',
                        style: GoogleFonts.inter(
                          color: Colors.white,
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                          letterSpacing: -0.3,
                        )),
                    Text('$count kendaraan terpantau',
                        style: GoogleFonts.inter(
                          color: Colors.white.withOpacity(0.55),
                          fontSize: 11,
                          fontWeight: FontWeight.w500,
                        )),
                  ],
                ),
                const Spacer(),
                // 3D Twin button
                GestureDetector(
                  onTap: () => Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => const DigitalTwinScreen(
                        url:
                            'http://10.10.5.12:3000/digital-twin?mobile=true',
                      ),
                    ),
                  ),
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 14, vertical: 9),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.12),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                          color: Colors.white.withOpacity(0.2)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.view_in_ar_rounded,
                            color: Colors.white, size: 16),
                        const SizedBox(width: 6),
                        Text('3D Twin',
                            style: GoogleFonts.inter(
                              color: Colors.white,
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                            )),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
          // Live telemetry bar
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 14),
            child: Row(
              children: [
                AnimatedBuilder(
                  animation: _pulseController,
                  builder: (_, __) => Container(
                    width: 7,
                    height: 7,
                    decoration: BoxDecoration(
                      color: Color.lerp(
                        const Color(0xFF10B981),
                        const Color(0xFF10B981).withOpacity(0.2),
                        _pulseController.value,
                      ),
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFF10B981).withOpacity(0.5),
                          blurRadius: 6,
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Text('Live Telemetry Sync',
                    style: GoogleFonts.inter(
                      color: const Color(0xFF10B981),
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.5,
                    )),
                const Spacer(),
                Text(_currentTime,
                    style: GoogleFonts.inter(
                      color: Colors.white.withOpacity(0.45),
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      fontFeatures: [const FontFeature.tabularFigures()],
                    )),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ── Loading ──────────────────────────────────────────────
  Widget _buildLoading() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          SizedBox(
            width: 44,
            height: 44,
            child: CircularProgressIndicator(
              strokeWidth: 3,
              valueColor: const AlwaysStoppedAnimation(_navy),
            ),
          ),
          const SizedBox(height: 16),
          Text('Memuat posisi kendaraan...',
              style: GoogleFonts.inter(
                  color: _textSecondary,
                  fontSize: 14,
                  fontWeight: FontWeight.w500)),
        ],
      ),
    );
  }

  // ── Error ────────────────────────────────────────────────
  Widget _buildError(Object e) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 64,
              height: 64,
              decoration: BoxDecoration(
                color: _danger.withOpacity(0.08),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Icon(Icons.error_outline_rounded,
                  color: _danger, size: 30),
            ),
            const SizedBox(height: 16),
            Text('Gagal memuat peta',
                style: GoogleFonts.inter(
                    color: _textPrimary,
                    fontSize: 17,
                    fontWeight: FontWeight.w700)),
            const SizedBox(height: 8),
            Text(e.toString(),
                textAlign: TextAlign.center,
                style: GoogleFonts.inter(
                    color: _textSecondary, fontSize: 13)),
          ],
        ),
      ),
    );
  }

  // ── Map ──────────────────────────────────────────────────
  Widget _buildMap(List<Vehicle> vehicles) {
    return Stack(
      children: [
        // Map
        FlutterMap(
          mapController: _mapController,
          options: MapOptions(
            initialCenter: vehicles.isNotEmpty
                ? LatLng(vehicles.first.latitude, vehicles.first.longitude)
                : const LatLng(-1.9300, 116.3200),
            initialZoom: 14,
            onTap: (_, __) {
              setState(() => _selectedVehicle = null);
              _sheetController.reverse();
            },
          ),
          children: [
            TileLayer(
              urlTemplate:
                  'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
              userAgentPackageName: 'com.kic2026.mineos',
            ),
            MarkerLayer(
              markers: vehicles.map((v) {
                final color = _statusColor(v);
                final isSelected =
                    _selectedVehicle?.vehicleId == v.vehicleId;

                return Marker(
                  point: LatLng(v.latitude, v.longitude),
                  width: 72,
                  height: 72,
                  child: GestureDetector(
                    onTap: () => _selectVehicle(v),
                    child: Column(
                      children: [
                        // Label nama
                        if (isSelected)
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: _navy,
                              borderRadius: BorderRadius.circular(6),
                              boxShadow: [
                                BoxShadow(
                                  color: _navy.withOpacity(0.3),
                                  blurRadius: 8,
                                  offset: const Offset(0, 2),
                                ),
                              ],
                            ),
                            child: Text(
                              v.vehicleId,
                              style: GoogleFonts.inter(
                                color: Colors.white,
                                fontSize: 9,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                        const SizedBox(height: 2),
                        // Marker
                        Stack(
                          alignment: Alignment.center,
                          children: [
                            // Pulse
                            AnimatedBuilder(
                              animation: _pulseController,
                              builder: (_, __) => Container(
                                width: isSelected ? 52 : 44,
                                height: isSelected ? 52 : 44,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: color.withOpacity(
                                      0.12 * (1 - _pulseController.value)),
                                  border: Border.all(
                                    color: color.withOpacity(
                                        0.25 * (1 - _pulseController.value)),
                                    width: 1,
                                  ),
                                ),
                              ),
                            ),
                            // Circle
                            Container(
                              width: isSelected ? 44 : 36,
                              height: isSelected ? 44 : 36,
                              decoration: BoxDecoration(
                                gradient: LinearGradient(
                                  begin: Alignment.topLeft,
                                  end: Alignment.bottomRight,
                                  colors: [color, color.withOpacity(0.75)],
                                ),
                                shape: BoxShape.circle,
                                border: Border.all(
                                  color: Colors.white,
                                  width: isSelected ? 2.5 : 2,
                                ),
                                boxShadow: [
                                  BoxShadow(
                                    color: color.withOpacity(0.45),
                                    blurRadius: isSelected ? 18 : 10,
                                    spreadRadius: isSelected ? 3 : 1,
                                  ),
                                ],
                              ),
                              child: Icon(
                                _vehicleIcon(v),
                                color: Colors.white,
                                size: isSelected ? 20 : 16,
                              ),
                            ),
                            // Speed badge
                            Positioned(
                              bottom: 0,
                              right: 0,
                              child: Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 5, vertical: 2),
                                decoration: BoxDecoration(
                                  color: _surface,
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(color: _border),
                                  boxShadow: [
                                    BoxShadow(
                                      color: Colors.black.withOpacity(0.1),
                                      blurRadius: 4,
                                    ),
                                  ],
                                ),
                                child: Text(
                                  '${(v.speedKmh ?? 0).toInt()}',
                                  style: GoogleFonts.inter(
                                    color: _textPrimary,
                                    fontSize: 8,
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                );
              }).toList(),
            ),
          ],
        ),

        // Floating stats — top left
        Positioned(
          top: 16,
          left: 16,
          child: Column(
            children: [
              _FloatCard(
                icon: Icons.local_shipping_rounded,
                label: 'ARMADA',
                value: '${vehicles.length}/14',
                color: _success,
              ),
              const SizedBox(height: 8),
              _FloatCard(
                icon: Icons.warning_amber_rounded,
                label: 'ALERT',
                value: vehicles
                    .where((v) => (v.fuelPct ?? 100) < 20)
                    .length
                    .toString(),
                color: _danger,
              ),
            ],
          ),
        ),

        // Map controls — right
        Positioned(
          right: 16,
          bottom: _selectedVehicle != null ? 220 : 100,
          child: Column(
            children: [
              _MapBtn(
                icon: Icons.add_rounded,
                onTap: () => _mapController.move(
                  _mapController.camera.center,
                  _mapController.camera.zoom + 1,
                ),
              ),
              const SizedBox(height: 8),
              _MapBtn(
                icon: Icons.remove_rounded,
                onTap: () => _mapController.move(
                  _mapController.camera.center,
                  _mapController.camera.zoom - 1,
                ),
              ),
              const SizedBox(height: 8),
              _MapBtn(
                icon: Icons.my_location_rounded,
                onTap: () {
                  if (vehicles.isNotEmpty) {
                    _mapController.move(
                      LatLng(vehicles.first.latitude,
                          vehicles.first.longitude),
                      14,
                    );
                  }
                },
                isPrimary: true,
              ),
            ],
          ),
        ),

        // Bottom sheet kendaraan terpilih
        if (_selectedVehicle != null)
          Positioned(
            bottom: 0,
            left: 0,
            right: 0,
            child: SlideTransition(
              position: Tween<Offset>(
                begin: const Offset(0, 1),
                end: Offset.zero,
              ).animate(CurvedAnimation(
                parent: _sheetController,
                curve: Curves.easeOutCubic,
              )),
              child: _VehicleSheet(
                vehicle: _selectedVehicle!,
                color: _statusColor(_selectedVehicle!),
                icon: _vehicleIcon(_selectedVehicle!),
                statusLabel: _statusLabel(_selectedVehicle!),
                onClose: () {
                  setState(() => _selectedVehicle = null);
                  _sheetController.reverse();
                },
                onDetail: () => Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => VehicleDetailScreen(
                      vehicleId: _selectedVehicle!.vehicleId,
                    ),
                  ),
                ),
              ),
            ),
          ),
      ],
    );
  }
}

// ── Float Card ────────────────────────────────────────────
class _FloatCard extends StatelessWidget {
  final IconData icon;
  final String label, value;
  final Color color;
  const _FloatCard({
    required this.icon,
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFDDE6EF)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.06),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 30,
            height: 30,
            decoration: BoxDecoration(
              color: color.withOpacity(0.08),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, color: color, size: 15),
          ),
          const SizedBox(width: 8),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label,
                  style: GoogleFonts.inter(
                    color: const Color(0xFF8DA0B3),
                    fontSize: 8,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 0.8,
                  )),
              Text(value,
                  style: GoogleFonts.inter(
                    color: const Color(0xFF0D1B2A),
                    fontSize: 14,
                    fontWeight: FontWeight.w800,
                  )),
            ],
          ),
        ],
      ),
    );
  }
}

// ── Map Button ────────────────────────────────────────────
class _MapBtn extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;
  final bool isPrimary;
  const _MapBtn({required this.icon, required this.onTap, this.isPrimary = false});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 44,
        height: 44,
        decoration: BoxDecoration(
          color: isPrimary ? const Color(0xFF0A1628) : Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isPrimary
                ? Colors.transparent
                : const Color(0xFFDDE6EF),
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(isPrimary ? 0.15 : 0.06),
              blurRadius: 12,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Icon(
          icon,
          color: isPrimary ? Colors.white : const Color(0xFF4A6080),
          size: 20,
        ),
      ),
    );
  }
}

// ── Vehicle Bottom Sheet ──────────────────────────────────
class _VehicleSheet extends StatelessWidget {
  final Vehicle vehicle;
  final Color color;
  final IconData icon;
  final String statusLabel;
  final VoidCallback onClose, onDetail;

  const _VehicleSheet({
    required this.vehicle,
    required this.color,
    required this.icon,
    required this.statusLabel,
    required this.onClose,
    required this.onDetail,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.12),
            blurRadius: 32,
            offset: const Offset(0, -8),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Handle
          Center(
            child: Container(
              margin: const EdgeInsets.only(top: 12),
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: const Color(0xFFDDE6EF),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),

          Padding(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Header
                Row(
                  children: [
                    Container(
                      width: 52,
                      height: 52,
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: [color, color.withOpacity(0.75)],
                        ),
                        borderRadius: BorderRadius.circular(14),
                        boxShadow: [
                          BoxShadow(
                            color: color.withOpacity(0.3),
                            blurRadius: 12,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: Icon(icon, color: Colors.white, size: 26),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            vehicle.vehicleId,
                            style: GoogleFonts.inter(
                              color: const Color(0xFF0D1B2A),
                              fontSize: 20,
                              fontWeight: FontWeight.w800,
                              letterSpacing: -0.5,
                            ),
                          ),
                          const SizedBox(height: 3),
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 8, vertical: 3),
                                decoration: BoxDecoration(
                                  color: color.withOpacity(0.08),
                                  borderRadius: BorderRadius.circular(20),
                                  border: Border.all(
                                      color: color.withOpacity(0.2)),
                                ),
                                child: Text(
                                  statusLabel,
                                  style: GoogleFonts.inter(
                                    color: color,
                                    fontSize: 9,
                                    fontWeight: FontWeight.w800,
                                    letterSpacing: 0.5,
                                  ),
                                ),
                              ),
                              if (vehicle.zone != null) ...[
                                const SizedBox(width: 6),
                                Text(
                                  '📍 ${vehicle.zone}',
                                  style: GoogleFonts.inter(
                                    color: const Color(0xFF8DA0B3),
                                    fontSize: 11,
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ],
                      ),
                    ),
                    // Close
                    GestureDetector(
                      onTap: onClose,
                      child: Container(
                        width: 32,
                        height: 32,
                        decoration: BoxDecoration(
                          color: const Color(0xFFF0F4F8),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Icon(Icons.close_rounded,
                            color: Color(0xFF8DA0B3), size: 16),
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 16),

                // Divider
                Container(height: 1, color: const Color(0xFFDDE6EF)),

                const SizedBox(height: 16),

                // Operator row
                if (vehicle.operatorName != null)
                  Container(
                    padding: const EdgeInsets.all(12),
                    margin: const EdgeInsets.only(bottom: 14),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF0F4F8),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      children: [
                        const CircleAvatar(
                          radius: 18,
                          backgroundColor: Color(0xFF0A1628),
                          child: Icon(Icons.person_rounded,
                              color: Colors.white, size: 18),
                        ),
                        const SizedBox(width: 10),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              vehicle.operatorName!,
                              style: GoogleFonts.inter(
                                color: const Color(0xFF0D1B2A),
                                fontSize: 14,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            Text(
                              'Operator Aktif',
                              style: GoogleFonts.inter(
                                color: const Color(0xFF8DA0B3),
                                fontSize: 11,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ],
                        ),
                        const Spacer(),
                        Container(
                          width: 8,
                          height: 8,
                          decoration: const BoxDecoration(
                            color: Color(0xFF0A7553),
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: 5),
                        Text('Online',
                            style: GoogleFonts.inter(
                              color: const Color(0xFF0A7553),
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                            )),
                      ],
                    ),
                  ),

                // Telemetry row
                Row(
                  children: [
                    _TelemetryTile(
                      icon: Icons.local_gas_station_rounded,
                      label: 'BBM',
                      value:
                          '${(vehicle.fuelPct ?? 0).toStringAsFixed(0)}%',
                      color: (vehicle.fuelPct ?? 100) < 20
                          ? const Color(0xFFB91C1C)
                          : const Color(0xFF0A7553),
                    ),
                    const SizedBox(width: 10),
                    _TelemetryTile(
                      icon: Icons.speed_rounded,
                      label: 'Kecepatan',
                      value:
                          '${(vehicle.speedKmh ?? 0).toStringAsFixed(0)} km/h',
                      color: const Color(0xFF0369A1),
                    ),
                    const SizedBox(width: 10),
                    _TelemetryTile(
                      icon: Icons.scale_rounded,
                      label: 'Muatan',
                      value:
                          '${(vehicle.loadWeightTon ?? 0).toStringAsFixed(1)}t',
                      color: const Color(0xFFB45309),
                    ),
                  ],
                ),

                const SizedBox(height: 16),

                // Detail button
                GestureDetector(
                  onTap: onDetail,
                  child: Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFF0A1628), Color(0xFF1E3A5F)],
                      ),
                      borderRadius: BorderRadius.circular(14),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFF0A1628).withOpacity(0.25),
                          blurRadius: 12,
                          offset: const Offset(0, 6),
                        ),
                      ],
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          'Lihat Detail Lengkap',
                          style: GoogleFonts.inter(
                            color: Colors.white,
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const SizedBox(width: 8),
                        const Icon(Icons.arrow_forward_rounded,
                            color: Colors.white, size: 16),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 20),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ── Telemetry Tile ────────────────────────────────────────
class _TelemetryTile extends StatelessWidget {
  final IconData icon;
  final String label, value;
  final Color color;
  const _TelemetryTile({
    required this.icon,
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: color.withOpacity(0.05),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: color.withOpacity(0.12)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: color, size: 16),
            const SizedBox(height: 6),
            Text(
              value,
              style: GoogleFonts.inter(
                color: color,
                fontSize: 14,
                fontWeight: FontWeight.w800,
                letterSpacing: -0.3,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              label,
              style: GoogleFonts.inter(
                color: const Color(0xFF8DA0B3),
                fontSize: 10,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }
}