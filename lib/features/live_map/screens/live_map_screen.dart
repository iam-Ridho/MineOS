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

  // ── Kideco Premium Design System ─────────────────────────
  static const Color _kBackground = Color(0xFFF8FAFC);
  static const Color _kSurface = Color(0xFFFFFFFF);
  static const Color _kNavy = Color(0xFF0A1628);
  static const Color _kNavyLight = Color(0xFF1E293B);
  static const Color _kTextPrimary = Color(0xFF0F172A);
  static const Color _kTextSecondary = Color(0xFF475569);
  static const Color _kTextMuted = Color(0xFF64748B);
  static const Color _kTextTertiary = Color(0xFF94A3B8);
  static const Color _kBorder = Color(0xFFE2E8F0);
  static const Color _kSuccess = Color(0xFF059669);
  static const Color _kWarning = Color(0xFFD97706);
  static const Color _kDanger = Color(0xFFDC2626);
  static const Color _kInfo = Color(0xFF0284C7);

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
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
    if ((v.fuelPct ?? 100) < 20) return _kDanger;
    if ((v.speedKmh ?? 0) > 50) return _kWarning;
    return _kSuccess;
  }

  IconData _getVehicleIcon(Vehicle v) {
    final id = v.vehicleId.toLowerCase();
    if (id.contains('ex') || id.contains('excavator')) {
      return Icons.construction_rounded;
    }
    return Icons.local_shipping_rounded;
  }

  @override
  Widget build(BuildContext context) {
    final vehiclesAsync = ref.watch(vehiclesProvider);

    return Scaffold(
      backgroundColor: _kBackground,
      body: SafeArea(
        child: Column(
          children: [
            _buildPremiumHeader(vehiclesAsync),
            Expanded(
              child: vehiclesAsync.when(
                data: (vehicles) => _buildMapView(vehicles),
                loading: () => _buildLoadingState(),
                error: (e, _) => _buildErrorState(e),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ── Premium Header ───────────────────────────────────────
  Widget _buildPremiumHeader(AsyncValue vehiclesAsync) {
    final count = vehiclesAsync.maybeWhen(
      data: (v) => (v as List<Vehicle>).length,
      orElse: () => 0,
    );

    return Container(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 16),
      decoration: BoxDecoration(
        color: _kSurface,
        border: Border(bottom: BorderSide(color: _kBorder)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.03),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [_kNavy, _kNavyLight],
              ),
              borderRadius: BorderRadius.circular(12),
              boxShadow: [
                BoxShadow(
                  color: _kNavy.withOpacity(0.2),
                  blurRadius: 8,
                  offset: const Offset(0, 3),
                ),
              ],
            ),
            child: const Center(
              child: Icon(
                Icons.map_rounded,
                color: Colors.white,
                size: 20,
              ),
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Live Map',
                  style: GoogleFonts.inter(
                    color: _kTextPrimary,
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                    letterSpacing: -0.3,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  'Digital Twin',
                  style: GoogleFonts.inter(
                    color: _kTextMuted,
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
          // 3D Twin Button
          GestureDetector(
            onTap: () => Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => const DigitalTwinScreen(
                  url: 'http://10.10.5.12:3000/digital-twin?mobile=true',
                ),
              ),
            ),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [_kNavy, _kNavyLight],
                ),
                borderRadius: BorderRadius.circular(10),
                boxShadow: [
                  BoxShadow(
                    color: _kNavy.withOpacity(0.2),
                    blurRadius: 8,
                    offset: const Offset(0, 3),
                  ),
                ],
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.view_in_ar_rounded, color: Colors.white, size: 16),
                  const SizedBox(width: 6),
                  Text(
                    '3D Twin',
                    style: GoogleFonts.inter(
                      color: Colors.white,
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.5,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ── Loading State ────────────────────────────────────────
  Widget _buildLoadingState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          SizedBox(
            width: 48,
            height: 48,
            child: CircularProgressIndicator(
              strokeWidth: 3,
              valueColor: AlwaysStoppedAnimation<Color>(_kNavy),
            ),
          ),
          const SizedBox(height: 20),
          Text(
            'Memuat peta...',
            style: GoogleFonts.inter(
              color: _kTextSecondary,
              fontSize: 14,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }

  // ── Error State ─────────────────────────────────────────
  Widget _buildErrorState(Object e) {
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
                color: const Color(0xFFFEF2F2),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Icon(Icons.error_outline_rounded, color: _kDanger, size: 32),
            ),
            const SizedBox(height: 20),
            Text(
              'Gagal Memuat Peta',
              style: GoogleFonts.inter(
                color: _kTextPrimary,
                fontSize: 18,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              e.toString(),
              textAlign: TextAlign.center,
              style: GoogleFonts.inter(
                color: _kTextSecondary,
                fontSize: 13,
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ── Map View ─────────────────────────────────────────────
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
                final isSelected = _selectedVehicle?.vehicleId == v.vehicleId;
                return Marker(
                  point: LatLng(v.latitude, v.longitude),
                  width: isSelected ? 64 : 52,
                  height: isSelected ? 64 : 52,
                  child: GestureDetector(
                    onTap: () {
                      setState(() => _selectedVehicle = v);
                      _mapController.move(
                        LatLng(v.latitude, v.longitude),
                        15,
                      );
                    },
                    child: TweenAnimationBuilder<double>(
                      tween: Tween(begin: 0.8, end: 1.0),
                      duration: const Duration(milliseconds: 300),
                      builder: (context, scale, child) {
                        return Transform.scale(
                          scale: isSelected ? scale : 1.0,
                          child: child,
                        );
                      },
                      child: Stack(
                        alignment: Alignment.center,
                        children: [
                          // Pulse ring
                          AnimatedBuilder(
                            animation: _pulseController,
                            builder: (_, __) {
                              return Container(
                                width: isSelected ? 56 : 44,
                                height: isSelected ? 56 : 44,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: color.withOpacity(
                                    0.1 * (1 - _pulseController.value),
                                  ),
                                  border: Border.all(
                                    color: color.withOpacity(
                                      0.3 * (1 - _pulseController.value),
                                    ),
                                    width: 1,
                                  ),
                                ),
                              );
                            },
                          ),
                          // Main marker
                          Container(
                            width: isSelected ? 48 : 40,
                            height: isSelected ? 48 : 40,
                            decoration: BoxDecoration(
                              gradient: LinearGradient(
                                begin: Alignment.topLeft,
                                end: Alignment.bottomRight,
                                colors: [
                                  color,
                                  color.withOpacity(0.8),
                                ],
                              ),
                              shape: BoxShape.circle,
                              border: Border.all(
                                color: Colors.white,
                                width: isSelected ? 3 : 2,
                              ),
                              boxShadow: [
                                BoxShadow(
                                  color: color.withOpacity(0.4),
                                  blurRadius: isSelected ? 16 : 10,
                                  spreadRadius: isSelected ? 4 : 2,
                                ),
                              ],
                            ),
                            child: Center(
                              child: Icon(
                                _getVehicleIcon(v),
                                color: Colors.white,
                                size: isSelected ? 22 : 18,
                              ),
                            ),
                          ),
                          // Speed badge
                          Positioned(
                            bottom: 0,
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 5,
                                vertical: 2,
                              ),
                              decoration: BoxDecoration(
                                color: _kSurface,
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(color: _kBorder),
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
                                  color: _kTextPrimary,
                                  fontSize: 8,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
          ],
        ),

        // Top Info Cards
        Positioned(
          top: 16,
          left: 16,
          right: 100,
          child: Row(
            children: [
              _InfoCard(
                icon: Icons.local_shipping_rounded,
                label: 'Active Fleet',
                value: '${vehicles.length}/14',
                color: _kSuccess,
              ),
              const SizedBox(width: 10),
              _InfoCard(
                icon: Icons.thermostat_rounded,
                label: 'Weather',
                value: '24°C',
                color: _kInfo,
              ),
            ],
          ),
        ),

        // Map Controls
        Positioned(
          right: 16,
          bottom: _selectedVehicle != null ? 200 : 100,
          child: Column(
            children: [
              _MapControlButton(
                icon: Icons.add_rounded,
                onTap: () => _mapController.move(
                  _mapController.camera.center,
                  _mapController.camera.zoom + 1,
                ),
              ),
              const SizedBox(height: 8),
              _MapControlButton(
                icon: Icons.remove_rounded,
                onTap: () => _mapController.move(
                  _mapController.camera.center,
                  _mapController.camera.zoom - 1,
                ),
              ),
              const SizedBox(height: 8),
              _MapControlButton(
                icon: Icons.my_location_rounded,
                onTap: () {
                  if (vehicles.isNotEmpty) {
                    _mapController.move(
                      LatLng(vehicles.first.latitude, vehicles.first.longitude),
                      14,
                    );
                  }
                },
              ),
            ],
          ),
        ),

        // Bottom Panel
        Positioned(
          bottom: 0,
          left: 0,
          right: 0,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Selected Vehicle Card
              if (_selectedVehicle != null)
                _SelectedVehicleCard(
                  vehicle: _selectedVehicle!,
                  markerColor: _getMarkerColor(_selectedVehicle!),
                  vehicleIcon: _getVehicleIcon(_selectedVehicle!),
                  onDetailTap: () => Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => VehicleDetailScreen(
                        vehicleId: _selectedVehicle!.vehicleId,
                      ),
                    ),
                  ),
                ),

              // Live Telemetry Bar
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                decoration: BoxDecoration(
                  color: _kSurface,
                  border: Border(top: BorderSide(color: _kBorder)),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.05),
                      blurRadius: 12,
                      offset: const Offset(0, -4),
                    ),
                  ],
                ),
                child: SafeArea(
                  top: false,
                  child: Row(
                    children: [
                      AnimatedBuilder(
                        animation: _pulseController,
                        builder: (_, __) => Container(
                          width: 8,
                          height: 8,
                          decoration: BoxDecoration(
                            color: Color.lerp(
                              _kSuccess,
                              _kSuccess.withOpacity(0.3),
                              _pulseController.value,
                            ),
                            shape: BoxShape.circle,
                            boxShadow: [
                              BoxShadow(
                                color: _kSuccess.withOpacity(
                                  0.4 * _pulseController.value,
                                ),
                                blurRadius: 6,
                                spreadRadius: 1,
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Text(
                        'Live Telemetry Sync',
                        style: GoogleFonts.inter(
                          color: _kSuccess,
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 0.5,
                        ),
                      ),
                      const Spacer(),
                      Text(
                        _currentTime,
                        style: GoogleFonts.inter(
                          color: _kTextTertiary,
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          fontFeatures: [const FontFeature.tabularFigures()],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

// ── Info Card ──────────────────────────────────────────────
class _InfoCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color color;

  const _InfoCard({
    required this.icon,
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: _LiveMapScreenState._kSurface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: _LiveMapScreenState._kBorder),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              color: color.withOpacity(0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, color: color, size: 16),
          ),
          const SizedBox(width: 10),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: GoogleFonts.inter(
                  color: _LiveMapScreenState._kTextTertiary,
                  fontSize: 9,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 1,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                value,
                style: GoogleFonts.inter(
                  color: _LiveMapScreenState._kTextPrimary,
                  fontSize: 13,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

// ── Map Control Button ────────────────────────────────────
class _MapControlButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;

  const _MapControlButton({
    required this.icon,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 44,
        height: 44,
        decoration: BoxDecoration(
          color: _LiveMapScreenState._kSurface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: _LiveMapScreenState._kBorder),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.05),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Icon(
          icon,
          color: _LiveMapScreenState._kTextSecondary,
          size: 20,
        ),
      ),
    );
  }
}

// ── Selected Vehicle Card ──────────────────────────────────
class _SelectedVehicleCard extends StatelessWidget {
  final Vehicle vehicle;
  final Color markerColor;
  final IconData vehicleIcon;
  final VoidCallback onDetailTap;

  const _SelectedVehicleCard({
    required this.vehicle,
    required this.markerColor,
    required this.vehicleIcon,
    required this.onDetailTap,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 0, 16, 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: markerColor.withOpacity(0.2),
          width: 1.5,
        ),
        boxShadow: [
          BoxShadow(
            color: markerColor.withOpacity(0.12),
            blurRadius: 24,
            offset: const Offset(0, 10),
            spreadRadius: -4,
          ),
          BoxShadow(
            color: Colors.black.withOpacity(0.08),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header dengan gradient
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  markerColor.withOpacity(0.08),
                  markerColor.withOpacity(0.02),
                ],
              ),
              borderRadius: const BorderRadius.vertical(
                top: Radius.circular(20),
              ),
            ),
            child: Row(
              children: [
                Container(
                  width: 52,
                  height: 52,
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [markerColor, markerColor.withOpacity(0.8)],
                    ),
                    borderRadius: BorderRadius.circular(14),
                    boxShadow: [
                      BoxShadow(
                        color: markerColor.withOpacity(0.3),
                        blurRadius: 12,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Icon(vehicleIcon, color: Colors.white, size: 26),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        vehicle.vehicleId,
                        style: GoogleFonts.inter(
                          color: const Color(0xFF0F172A),
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        vehicle.operatorName ?? 'Unknown Operator',
                        style: GoogleFonts.inter(
                          color: const Color(0xFF64748B),
                          fontSize: 13,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ),
                GestureDetector(
                  onTap: onDetailTap,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 10,
                    ),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFF0A1628), Color(0xFF1E293B)],
                      ),
                      borderRadius: BorderRadius.circular(12),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFF0A1628).withOpacity(0.2),
                          blurRadius: 8,
                          offset: const Offset(0, 3),
                        ),
                      ],
                    ),
                    child: Text(
                      'Detail',
                      style: GoogleFonts.inter(
                        color: Colors.white,
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Divider
          Container(
            height: 1,
            color: markerColor.withOpacity(0.1),
          ),

          // Telemetry badges
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                _TelemetryBadge(
                  icon: Icons.local_gas_station_rounded,
                  label: 'BBM',
                  value: '${(vehicle.fuelPct ?? 0).toStringAsFixed(0)}%',
                  color: (vehicle.fuelPct ?? 100) < 20
                      ? const Color(0xFFDC2626)
                      : const Color(0xFF059669),
                ),
                const SizedBox(width: 10),
                _TelemetryBadge(
                  icon: Icons.speed_rounded,
                  label: 'Speed',
                  value: '${(vehicle.speedKmh ?? 0).toStringAsFixed(0)}',
                  unit: 'km/h',
                  color: const Color(0xFF0284C7),
                ),
                const SizedBox(width: 10),
                _TelemetryBadge(
                  icon: Icons.scale_rounded,
                  label: 'Load',
                  value: '${(vehicle.loadWeightTon ?? 0).toStringAsFixed(1)}',
                  unit: 'ton',
                  color: const Color(0xFFD97706),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _TelemetryBadge extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final String? unit;
  final Color color;

  const _TelemetryBadge({
    required this.icon,
    required this.label,
    required this.value,
    this.unit,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 10),
        decoration: BoxDecoration(
          color: color.withOpacity(0.06),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: color.withOpacity(0.15)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, color: color, size: 14),
                const SizedBox(width: 6),
                Text(
                  label,
                  style: GoogleFonts.inter(
                    color: const Color(0xFF94A3B8),
                    fontSize: 10,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  value,
                  style: GoogleFonts.inter(
                    color: color,
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                if (unit != null) ...[
                  const SizedBox(width: 2),
                  Text(
                    unit!,
                    style: GoogleFonts.inter(
                      color: color.withOpacity(0.7),
                      fontSize: 10,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }
}