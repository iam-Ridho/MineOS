import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:http/http.dart' as http;

class VehicleDetailScreen extends StatefulWidget {
  final String vehicleId;
  const VehicleDetailScreen({super.key, required this.vehicleId});

  @override
  State<VehicleDetailScreen> createState() => _VehicleDetailScreenState();
}

class _VehicleDetailScreenState extends State<VehicleDetailScreen>
    with SingleTickerProviderStateMixin {
  bool _isLoading = true;
  String _error = '';
  Map<String, dynamic>? _vehicleData;
  late AnimationController _pulseController;

  // ── UPDATE IP RIDHO DI SINI ─────────────────────────────
  static const String _baseUrl = 'http://10.10.14.40:8000';

  // ── Color System Kideco Premium ─────────────────────────
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
      duration: const Duration(milliseconds: 1200),
    )..repeat(reverse: true);
    _fetchVehicleData();
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  Future<void> _fetchVehicleData() async {
    setState(() {
      _isLoading = true;
      _error = '';
    });

    try {
      final response = await http
          .get(
            Uri.parse('$_baseUrl/api/vehicles/${widget.vehicleId}'),
            headers: {'Content-Type': 'application/json'},
          )
          .timeout(const Duration(seconds: 15));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        setState(() {
          _vehicleData = data;
          _isLoading = false;
        });
      } else if (response.statusCode == 404) {
        setState(() {
          _error = 'Kendaraan ${widget.vehicleId} tidak ditemukan.';
          _isLoading = false;
        });
      } else {
        setState(() {
          _error = 'Server error: ${response.statusCode}';
          _isLoading = false;
        });
      }
    } on TimeoutException {
      setState(() {
        _error = 'Waktu respons habis. Coba lagi.';
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = 'Koneksi gagal. Pastikan HP dan laptop di WiFi sama.';
        _isLoading = false;
      });
    }
  }

  // ── Fallback dummy kalau API belum ready ────────────────
  void _loadDummyData() {
    final dummyData = {
      'HD-003': {
        'id': 'HD-003',
        'name': 'Komatsu HD785-7 #3',
        'type': 'haul_truck',
        'capacity_ton': 91.0,
        'is_active': true,
        'position': {
          'latitude': -1.911635,
          'longitude': 115.870176,
          'speed_kmh': 30.0,
          'fuel_pct': 59.0,
          'load_weight_ton': 27.0,
          'zone': 'HAULING-ROAD-1',
          'operator_name': 'Sigit Purnomo',
          'heading_deg': 262.0,
          'timestamp': '2026-06-11T03:15:00',
        },
      },
    };

    setState(() {
      _vehicleData = dummyData[widget.vehicleId];
      if (_vehicleData == null) {
        _error = 'Kendaraan ${widget.vehicleId} tidak ditemukan.';
      }
      _isLoading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _kBackground,
      body: SafeArea(
        child: _isLoading
            ? _buildLoadingState()
            : _error.isNotEmpty
                ? _buildErrorState()
                : _buildDetailContent(),
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
            'Memuat data kendaraan...',
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
  Widget _buildErrorState() {
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
              'Gagal Memuat Data',
              style: GoogleFonts.inter(
                color: _kTextPrimary,
                fontSize: 18,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              _error,
              textAlign: TextAlign.center,
              style: GoogleFonts.inter(
                color: _kTextSecondary,
                fontSize: 13,
                height: 1.5,
              ),
            ),
            const SizedBox(height: 24),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                GestureDetector(
                  onTap: _fetchVehicleData,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(colors: [_kNavy, _kNavyLight]),
                      borderRadius: BorderRadius.circular(12),
                      boxShadow: [
                        BoxShadow(
                          color: _kNavy.withOpacity(0.2),
                          blurRadius: 8,
                          offset: const Offset(0, 3),
                        ),
                      ],
                    ),
                    child: Text(
                      'Coba Lagi',
                      style: GoogleFonts.inter(
                        color: Colors.white,
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                GestureDetector(
                  onTap: _loadDummyData,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                    decoration: BoxDecoration(
                      color: _kSurface,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: _kBorder),
                    ),
                    child: Text(
                      'Load Dummy',
                      style: GoogleFonts.inter(
                        color: _kTextSecondary,
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
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
  }

  // ── Detail Content ───────────────────────────────────────
  Widget _buildDetailContent() {
    if (_vehicleData == null) return const SizedBox.shrink();

    final vehicle = _vehicleData!;
    final position = vehicle['position'] ?? {};

    return CustomScrollView(
      physics: const BouncingScrollPhysics(),
      slivers: [
        // Custom AppBar
        SliverToBoxAdapter(child: _buildAppBar(vehicle)),
        // Hero Card
        SliverToBoxAdapter(child: _buildHeroCard(vehicle)),
        // Real-time Status
        SliverToBoxAdapter(child: _buildSectionTitle('Kondisi Real-time')),
        SliverToBoxAdapter(child: _buildStatusCards(position)),
        // Operator Info
        SliverToBoxAdapter(child: _buildSectionTitle('Informasi Operator')),
        SliverToBoxAdapter(child: _buildOperatorCard(position)),
        // GPS Location
        SliverToBoxAdapter(child: _buildSectionTitle('Lokasi GPS')),
        SliverToBoxAdapter(child: _buildGPSCard(position)),
        const SliverToBoxAdapter(child: SizedBox(height: 32)),
      ],
    );
  }

  // ── Custom AppBar ──────────────────────────────────────
  Widget _buildAppBar(Map<String, dynamic> vehicle) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
      child: Row(
        children: [
          GestureDetector(
            onTap: () {
              HapticFeedback.lightImpact();
              Navigator.pop(context);
            },
            child: Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: _kSurface,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: _kBorder),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.04),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: const Icon(
                Icons.arrow_back_rounded,
                color: _kTextPrimary,
                size: 20,
              ),
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Text(
              widget.vehicleId,
              style: GoogleFonts.inter(
                color: _kTextPrimary,
                fontSize: 20,
                fontWeight: FontWeight.w800,
                letterSpacing: -0.3,
              ),
            ),
          ),
          GestureDetector(
            onTap: _fetchVehicleData,
            child: Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: _kSurface,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: _kBorder),
              ),
              child: Icon(
                Icons.refresh_rounded,
                color: _kTextSecondary,
                size: 20,
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ── Hero Card ──────────────────────────────────────────
  Widget _buildHeroCard(Map<String, dynamic> vehicle) {
    final isActive = vehicle['is_active'] ?? false;

    return Container(
      margin: const EdgeInsets.fromLTRB(16, 16, 16, 0),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [_kNavy, _kNavyLight],
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: _kNavy.withOpacity(0.2),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 64,
            height: 64,
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.1),
              borderRadius: BorderRadius.circular(18),
              border: Border.all(
                color: Colors.white.withOpacity(0.2),
              ),
            ),
            child: const Icon(
              Icons.local_shipping_rounded,
              color: Colors.white,
              size: 32,
            ),
          ),
          const SizedBox(width: 18),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  vehicle['name'] ?? widget.vehicleId,
                  style: GoogleFonts.inter(
                    color: Colors.white,
                    fontSize: 20,
                    fontWeight: FontWeight.w800,
                    letterSpacing: -0.3,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'ID: ${widget.vehicleId} • ${vehicle['type'] ?? 'Unknown'}',
                  style: GoogleFonts.inter(
                    color: Colors.white.withOpacity(0.6),
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: isActive
                        ? _kSuccess.withOpacity(0.2)
                        : _kDanger.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: isActive
                          ? _kSuccess.withOpacity(0.4)
                          : _kDanger.withOpacity(0.4),
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      AnimatedBuilder(
                        animation: _pulseController,
                        builder: (_, __) => Container(
                          width: 6,
                          height: 6,
                          decoration: BoxDecoration(
                            color: Color.lerp(
                              isActive ? _kSuccess : _kDanger,
                              (isActive ? _kSuccess : _kDanger).withOpacity(0.3),
                              _pulseController.value,
                            ),
                            shape: BoxShape.circle,
                          ),
                        ),
                      ),
                      const SizedBox(width: 6),
                      Text(
                        isActive ? 'AKTIF' : 'NON-AKTIF',
                        style: GoogleFonts.inter(
                          color: isActive ? _kSuccess : _kDanger,
                          fontSize: 10,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 1,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ── Section Title ──────────────────────────────────────
  Widget _buildSectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 28, 20, 16),
      child: Row(
        children: [
          Container(
            width: 4,
            height: 20,
            decoration: BoxDecoration(
              color: _kNavy,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(width: 10),
          Text(
            title,
            style: GoogleFonts.inter(
              color: _kTextPrimary,
              fontSize: 16,
              fontWeight: FontWeight.w700,
              letterSpacing: -0.3,
            ),
          ),
        ],
      ),
    );
  }

  // ── Status Cards (BBM, Muatan, Kecepatan, Heading) ─────
  Widget _buildStatusCards(Map<String, dynamic> position) {
    final fuel = (position['fuel_pct'] ?? 0.0) as double;
    final load = (position['load_weight_ton'] ?? 0.0) as double;
    final speed = (position['speed_kmh'] ?? 0.0) as double;
    final heading = (position['heading_deg'] ?? 0.0) as double;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: _MetricCard(
                  label: 'BBM',
                  value: '${fuel.toStringAsFixed(0)}%',
                  icon: Icons.local_gas_station_rounded,
                  color: fuel < 20 ? _kDanger : _kInfo,
                  progress: fuel / 100,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _MetricCard(
                  label: 'Muatan',
                  value: '${load.toStringAsFixed(1)}t',
                  icon: Icons.scale_rounded,
                  color: _kWarning,
                  progress: load / 91.0, // capacity
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _SimpleMetricCard(
                  label: 'Kecepatan',
                  value: '${speed.toStringAsFixed(0)}',
                  unit: 'km/h',
                  icon: Icons.speed_rounded,
                  color: speed > 40 ? _kDanger : _kInfo,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _SimpleMetricCard(
                  label: 'Heading',
                  value: '${heading.toStringAsFixed(0)}°',
                  icon: Icons.navigation_rounded,
                  color: _kWarning,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // ── Operator Card ──────────────────────────────────────
  Widget _buildOperatorCard(Map<String, dynamic> position) {
    final operatorName = position['operator_name'] ?? 'Tidak diketahui';
    final zone = position['zone'] ?? 'Unknown';

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: _kSurface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: _kBorder),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.03),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        children: [
          _InfoRow(
            icon: Icons.person_outline_rounded,
            label: 'Operator',
            value: operatorName,
          ),
          Divider(color: _kBorder, height: 20),
          _InfoRow(
            icon: Icons.location_on_outlined,
            label: 'Zona',
            value: zone,
          ),
        ],
      ),
    );
  }

  // ── GPS Card ───────────────────────────────────────────
  Widget _buildGPSCard(Map<String, dynamic> position) {
    final lat = (position['latitude'] ?? 0.0).toStringAsFixed(6);
    final lng = (position['longitude'] ?? 0.0).toStringAsFixed(6);
    final timestamp = position['timestamp'] ?? 'Unknown';

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: _kSurface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: _kBorder),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.03),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        children: [
          _InfoRow(
            icon: Icons.gps_fixed_rounded,
            label: 'Latitude',
            value: lat,
          ),
          Divider(color: _kBorder, height: 20),
          _InfoRow(
            icon: Icons.gps_fixed_rounded,
            label: 'Longitude',
            value: lng,
          ),
          Divider(color: _kBorder, height: 20),
          _InfoRow(
            icon: Icons.access_time_rounded,
            label: 'Update',
            value: _formatTimestamp(timestamp),
          ),
        ],
      ),
    );
  }

  String _formatTimestamp(String timestamp) {
    try {
      final dt = DateTime.parse(timestamp);
      return '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')} WITA';
    } catch (e) {
      return timestamp;
    }
  }
}

// ── Metric Card with Progress ────────────────────────────
class _MetricCard extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color color;
  final double progress;

  const _MetricCard({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
    required this.progress,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withOpacity(0.2)),
        boxShadow: [
          BoxShadow(
            color: color.withOpacity(0.06),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  label,
                  style: GoogleFonts.inter(
                    color: _VehicleDetailScreenState._kTextMuted,
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              Icon(icon, color: color, size: 16),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            value,
            style: GoogleFonts.inter(
              color: color,
              fontSize: 24,
              fontWeight: FontWeight.w800,
              letterSpacing: -0.5,
            ),
          ),
          const SizedBox(height: 10),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: progress.clamp(0.0, 1.0),
              backgroundColor: const Color(0xFFF1F5F9),
              color: color,
              minHeight: 6,
            ),
          ),
        ],
      ),
    );
  }
}

// ── Simple Metric Card ───────────────────────────────────
class _SimpleMetricCard extends StatelessWidget {
  final String label;
  final String value;
  final String? unit;
  final IconData icon;
  final Color color;

  const _SimpleMetricCard({
    required this.label,
    required this.value,
    this.unit,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.03),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: color.withOpacity(0.08),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: color, size: 22),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: GoogleFonts.inter(
                    color: const Color(0xFF64748B),
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 4),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      value,
                      style: GoogleFonts.inter(
                        color: const Color(0xFF0F172A),
                        fontSize: 22,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    if (unit != null) ...[
                      const SizedBox(width: 4),
                      Text(
                        unit!,
                        style: GoogleFonts.inter(
                          color: const Color(0xFF94A3B8),
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ── Info Row ─────────────────────────────────────────────
class _InfoRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;

  const _InfoRow({
    required this.icon,
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 36,
          height: 36,
          decoration: BoxDecoration(
            color: const Color(0xFFF1F5F9),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(
            icon,
            color: const Color(0xFF475569),
            size: 18,
          ),
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Text(
            label,
            style: GoogleFonts.inter(
              color: const Color(0xFF64748B),
              fontSize: 13,
              fontWeight: FontWeight.w500,
            ),
          ),
        ),
        Text(
          value,
          style: GoogleFonts.inter(
            color: const Color(0xFF0F172A),
            fontSize: 14,
            fontWeight: FontWeight.w700,
          ),
        ),
      ],
    );
  }
}