import 'dart:async';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';

typedef SwitchTabCallback = void Function(int index);

class DashboardScreen extends StatefulWidget {
  final SwitchTabCallback? onSwitchTab;
  const DashboardScreen({super.key, this.onSwitchTab});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen>
    with TickerProviderStateMixin {
  final _random = Random();
  Timer? _timer;
  late AnimationController _pulseController;

  int _activeVehicles = 142;
  int _safetyAlerts = 2;
  double _dailyCO2 = 4.8;
  double _reclamation = 68.4;
  double _efficiency = 94.2;
  String _currentTime = '';
  String _currentDate = '';

  // Design tokens — Enterprise
  static const Color _bg = Color(0xFFF7F9FC);
  static const Color _surface = Color(0xFFFFFFFF);
  static const Color _navy = Color(0xFF0A1628);
  static const Color _navyMid = Color(0xFF1E3A5F);
  static const Color _blue = Color(0xFF1D4ED8);
  static const Color _blueLight = Color(0xFFEFF6FF);
  static const Color _textPrimary = Color(0xFF0F172A);
  static const Color _textSecondary = Color(0xFF475569);
  static const Color _textMuted = Color(0xFF94A3B8);
  static const Color _border = Color(0xFFE2E8F0);
  static const Color _success = Color(0xFF059669);
  static const Color _successBg = Color(0xFFECFDF5);
  static const Color _warning = Color(0xFFD97706);
  static const Color _warningBg = Color(0xFFFFFBEB);
  static const Color _danger = Color(0xFFDC2626);
  static const Color _dangerBg = Color(0xFFFEF2F2);
  static const Color _info = Color(0xFF0284C7);
  static const Color _infoBg = Color(0xFFEFF6FF);

  final List<Map<String, dynamic>> _aiFeeds = [
    {
      'agent': 'Fleet Agent',
      'type': 'Kritis',
      'typeColor': 0xFFDC2626,
      'typeBg': 0xFFFEF2F2,
      'time': '12:45',
      'message': 'Evakuasi disarankan segera di Pit Alpha — Stabilitas Lereng 78%',
      'action': 'Ambil Tindakan',
      'actionSecondary': 'Abaikan',
    },
    {
      'agent': 'Safety Agent',
      'type': 'Peringatan',
      'typeColor': 0xFFD97706,
      'typeBg': 0xFFFFFBEB,
      'time': '12:44',
      'message': 'Reroute Armada B-3 disarankan karena kondisi cuaca buruk.',
      'action': 'Optimalkan',
      'actionSecondary': null,
    },
  ];

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2000),
    )..repeat(reverse: true);
    _updateTime();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      setState(() {
        _updateTime();
        if (_timer!.tick % 5 == 0) {
          _activeVehicles += _random.nextInt(3) - 1;
          _dailyCO2 = (_dailyCO2 + (_random.nextDouble() - 0.5) * 0.1).clamp(3.0, 7.0);
          _reclamation = (_reclamation + (_random.nextDouble() - 0.5) * 0.1).clamp(60.0, 80.0);
          _efficiency = (_efficiency + (_random.nextDouble() - 0.5) * 0.2).clamp(85.0, 99.0);
        }
      });
    });
  }

  void _updateTime() {
    final now = DateTime.now();
    _currentTime =
        '${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}:${now.second.toString().padLeft(2, '0')}';
    final months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
    _currentDate = '${now.day} ${months[now.month - 1]} ${now.year}';
  }

  @override
  void dispose() {
    _timer?.cancel();
    _pulseController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.dark,
      child: Scaffold(
        backgroundColor: _bg,
        body: SafeArea(
          child: CustomScrollView(
            physics: const BouncingScrollPhysics(),
            slivers: [
              SliverToBoxAdapter(child: _buildTopBar()),
              SliverToBoxAdapter(child: _buildHeroBanner()),
              SliverToBoxAdapter(child: _buildMetricsRow()),
              SliverToBoxAdapter(child: _buildMapPreview()),
              SliverToBoxAdapter(child: _buildAIFeedSection()),
              SliverToBoxAdapter(child: _buildAgentRow()),
              const SliverToBoxAdapter(child: SizedBox(height: 100)),
            ],
          ),
        ),
      ),
    );
  }

  // ── Top Bar ──────────────────────────────────────────────
  Widget _buildTopBar() {
    return Container(
      color: _surface,
      padding: const EdgeInsets.fromLTRB(20, 14, 20, 14),
      child: Row(
        children: [
          // Logo
          Row(
            children: [
              Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  color: _navy,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Center(
                  child: Text(
                    'M',
                    style: GoogleFonts.inter(
                      color: Colors.white,
                      fontSize: 16,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'MineOS',
                    style: GoogleFonts.inter(
                      color: _textPrimary,
                      fontSize: 15,
                      fontWeight: FontWeight.w800,
                      letterSpacing: -0.3,
                    ),
                  ),
                  Text(
                    'Operations Dashboard',
                    style: GoogleFonts.inter(
                      color: _textMuted,
                      fontSize: 10,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ],
          ),
          const Spacer(),
          // Time chip
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
            decoration: BoxDecoration(
              color: _bg,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: _border),
            ),
            child: Row(
              children: [
                AnimatedBuilder(
                  animation: _pulseController,
                  builder: (_, __) => Container(
                    width: 6,
                    height: 6,
                    decoration: BoxDecoration(
                      color: Color.lerp(
                        _success,
                        _success.withOpacity(0.2),
                        _pulseController.value,
                      ),
                      shape: BoxShape.circle,
                    ),
                  ),
                ),
                const SizedBox(width: 6),
                Text(
                  _currentTime,
                  style: GoogleFonts.inter(
                    color: _textPrimary,
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    fontFeatures: [const FontFeature.tabularFigures()],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          // Notification bell
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: _dangerBg,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: _danger.withOpacity(0.15)),
            ),
            child: Stack(
              alignment: Alignment.center,
              children: [
                Icon(Icons.notifications_outlined, color: _danger, size: 18),
                Positioned(
                  top: 6,
                  right: 6,
                  child: Container(
                    width: 7,
                    height: 7,
                    decoration: BoxDecoration(
                      color: _danger,
                      shape: BoxShape.circle,
                      border: Border.all(color: Colors.white, width: 1),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ── Hero Banner ──────────────────────────────────────────
  Widget _buildHeroBanner() {
    final h = DateTime.now().hour;
    final greeting = h < 12 ? 'Selamat Pagi' : h < 18 ? 'Selamat Siang' : 'Selamat Malam';
    final shift = h >= 6 && h < 14 ? 'Shift Pagi · 06:00–14:00' : h >= 14 && h < 22 ? 'Shift Siang · 14:00–22:00' : 'Shift Malam · 22:00–06:00';

    return Container(
      margin: const EdgeInsets.fromLTRB(16, 16, 16, 0),
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [_navy, _navyMid],
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: _navy.withOpacity(0.25),
            blurRadius: 32,
            offset: const Offset(0, 12),
            spreadRadius: -8,
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                greeting,
                style: GoogleFonts.inter(
                  color: Colors.white.withOpacity(0.6),
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                ),
              ),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: _success.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(color: _success.withOpacity(0.3)),
                ),
                child: Text(
                  shift,
                  style: GoogleFonts.inter(
                    color: const Color(0xFF6EE7B7),
                    fontSize: 10,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Kideco Operations',
                    style: GoogleFonts.inter(
                      color: Colors.white,
                      fontSize: 22,
                      fontWeight: FontWeight.w800,
                      letterSpacing: -0.5,
                      height: 1,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'PT Kideco Jaya Agung · $_currentDate',
                    style: GoogleFonts.inter(
                      color: Colors.white.withOpacity(0.4),
                      fontSize: 12,
                      fontWeight: FontWeight.w400,
                    ),
                  ),
                ],
              ),
              const Spacer(),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    '${_efficiency.toStringAsFixed(1)}%',
                    style: GoogleFonts.inter(
                      color: Colors.white,
                      fontSize: 32,
                      fontWeight: FontWeight.w300,
                      letterSpacing: -1,
                      height: 1,
                    ),
                  ),
                  Text(
                    'Efisiensi',
                    style: GoogleFonts.inter(
                      color: Colors.white.withOpacity(0.4),
                      fontSize: 11,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 20),
          // Progress bar efisiensi
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: _efficiency / 100,
              backgroundColor: Colors.white.withOpacity(0.1),
              valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF6EE7B7)),
              minHeight: 4,
            ),
          ),
          const SizedBox(height: 16),
          // Bottom stats
          Row(
            children: [
              _BannerStat(label: 'Agen AI', value: '4 Aktif', icon: Icons.smart_toy_outlined),
              _BannerDivider(),
              _BannerStat(label: 'Armada', value: '$_activeVehicles unit', icon: Icons.local_shipping_outlined),
              _BannerDivider(),
              _BannerStat(
                label: 'Alert',
                value: '$_safetyAlerts aktif',
                icon: Icons.warning_amber_outlined,
                valueColor: _safetyAlerts > 0 ? const Color(0xFFFCA5A5) : const Color(0xFF6EE7B7),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // ── Metrics Row ──────────────────────────────────────────
  Widget _buildMetricsRow() {
    final metrics = [
      {
        'label': 'Safety Alert',
        'value': '$_safetyAlerts',
        'sub': '24 jam terakhir',
        'color': _danger,
        'bg': _dangerBg,
        'icon': Icons.shield_rounded,
        'tab': 2,
      },
      {
        'label': 'Emisi CO₂',
        'value': '${_dailyCO2.toStringAsFixed(1)}t',
        'sub': '-12% dari target',
        'color': _info,
        'bg': _infoBg,
        'icon': Icons.eco_rounded,
        'tab': null,
      },
      {
        'label': 'Reklamasi',
        'value': '${_reclamation.toStringAsFixed(0)}%',
        'sub': 'dari target lahan',
        'color': _success,
        'bg': _successBg,
        'icon': Icons.landscape_rounded,
        'tab': null,
      },
    ];

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
      child: Row(
        children: metrics.asMap().entries.map((e) {
          final m = e.value;
          final color = m['color'] as Color;
          final bg = m['bg'] as Color;
          final tab = m['tab'] as int?;
          return Expanded(
            child: GestureDetector(
              onTap: tab != null ? () => widget.onSwitchTab?.call(tab) : null,
              child: Container(
                margin: EdgeInsets.only(right: e.key < 2 ? 8 : 0),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: _surface,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: _border),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.04),
                      blurRadius: 10,
                      offset: const Offset(0, 3),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(7),
                      decoration: BoxDecoration(
                        color: bg,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Icon(m['icon'] as IconData, color: color, size: 14),
                    ),
                    const SizedBox(height: 10),
                    Text(
                      m['value'] as String,
                      style: GoogleFonts.inter(
                        color: _textPrimary,
                        fontSize: 20,
                        fontWeight: FontWeight.w800,
                        letterSpacing: -0.5,
                        height: 1,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      m['label'] as String,
                      style: GoogleFonts.inter(
                        color: _textMuted,
                        fontSize: 9,
                        fontWeight: FontWeight.w600,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      m['sub'] as String,
                      style: GoogleFonts.inter(
                        color: color,
                        fontSize: 8,
                        fontWeight: FontWeight.w600,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  // ── Map Preview ──────────────────────────────────────────
  Widget _buildMapPreview() {
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 16, 16, 0),
      decoration: BoxDecoration(
        color: _surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: _border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 16,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        children: [
          // Header
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(7),
                  decoration: BoxDecoration(
                    color: _infoBg,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(Icons.map_rounded, color: _info, size: 14),
                ),
                const SizedBox(width: 10),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Live Map — Pit Area',
                      style: GoogleFonts.inter(
                        color: _textPrimary,
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    Text(
                      '$_activeVehicles kendaraan aktif',
                      style: GoogleFonts.inter(
                        color: _textMuted,
                        fontSize: 10,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
                const Spacer(),
                GestureDetector(
                  onTap: () => widget.onSwitchTab?.call(1),
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: _navy,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      'Buka Peta',
                      style: GoogleFonts.inter(
                        color: Colors.white,
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          // Map
          ClipRRect(
            borderRadius: const BorderRadius.vertical(
                bottom: Radius.circular(20)),
            child: GestureDetector(
              onTap: () => widget.onSwitchTab?.call(1),
              child: SizedBox(
                height: 180,
                child: Stack(
                  children: [
                    FlutterMap(
                      options: const MapOptions(
                        initialCenter: LatLng(-1.9300, 116.3200),
                        initialZoom: 13,
                        interactionOptions: InteractionOptions(
                          flags: InteractiveFlag.none,
                        ),
                      ),
                      children: [
                        TileLayer(
                          urlTemplate:
                              'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                          userAgentPackageName: 'com.kic2026.mineos',
                        ),
                        MarkerLayer(
                          markers: [
                            LatLng(-1.9200, 116.3100),
                            LatLng(-1.9350, 116.3250),
                            LatLng(-1.9150, 116.3050),
                            LatLng(-1.9450, 116.3350),
                            LatLng(-1.9280, 116.3180),
                          ]
                              .map((pos) => Marker(
                                    point: pos,
                                    width: 20,
                                    height: 20,
                                    child: Container(
                                      decoration: BoxDecoration(
                                        color: _success,
                                        shape: BoxShape.circle,
                                        border: Border.all(
                                            color: Colors.white, width: 2),
                                        boxShadow: [
                                          BoxShadow(
                                            color: _success.withOpacity(0.4),
                                            blurRadius: 6,
                                          ),
                                        ],
                                      ),
                                    ),
                                  ))
                              .toList(),
                        ),
                      ],
                    ),
                    // Overlay gradient bottom
                    Positioned(
                      bottom: 0,
                      left: 0,
                      right: 0,
                      child: Container(
                        height: 50,
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.topCenter,
                            end: Alignment.bottomCenter,
                            colors: [
                              Colors.transparent,
                              Colors.black.withOpacity(0.3),
                            ],
                          ),
                        ),
                      ),
                    ),
                    // Live badge
                    Positioned(
                      top: 10,
                      right: 10,
                      child: AnimatedBuilder(
                        animation: _pulseController,
                        builder: (_, __) => Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: Colors.black.withOpacity(0.6),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Container(
                                width: 6,
                                height: 6,
                                decoration: BoxDecoration(
                                  color: Color.lerp(
                                    _success,
                                    _success.withOpacity(0.2),
                                    _pulseController.value,
                                  ),
                                  shape: BoxShape.circle,
                                ),
                              ),
                              const SizedBox(width: 5),
                              Text(
                                'LIVE',
                                style: GoogleFonts.inter(
                                  color: Colors.white,
                                  fontSize: 9,
                                  fontWeight: FontWeight.w800,
                                  letterSpacing: 1,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ── AI Feed Section ──────────────────────────────────────
  Widget _buildAIFeedSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 24, 16, 12),
          child: Row(
            children: [
              Container(
                width: 3,
                height: 18,
                decoration: BoxDecoration(
                  color: _navy,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(width: 10),
              Text(
                'AI Decision Feed',
                style: GoogleFonts.inter(
                  color: _textPrimary,
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  letterSpacing: -0.3,
                ),
              ),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(
                    horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: _successBg,
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(color: _success.withOpacity(0.2)),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 5,
                      height: 5,
                      decoration: BoxDecoration(
                        color: _success,
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 5),
                    Text(
                      'Real-time',
                      style: GoogleFonts.inter(
                        color: _success,
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        ..._aiFeeds.map((feed) => _AIFeedCard(
              feed: feed,
              onTap: () => widget.onSwitchTab?.call(2),
            )),
      ],
    );
  }

  // ── Agent Row ────────────────────────────────────────────
  Widget _buildAgentRow() {
    final agents = [
      {'label': 'Fleet', 'status': 'Optimal', 'color': _success, 'bg': _successBg, 'icon': Icons.local_shipping_rounded, 'desc': '$_activeVehicles unit'},
      {'label': 'Safety', 'status': 'Kritis', 'color': _danger, 'bg': _dangerBg, 'icon': Icons.shield_rounded, 'desc': '$_safetyAlerts alert'},
      {'label': 'Emisi', 'status': 'Normal', 'color': _info, 'bg': _infoBg, 'icon': Icons.eco_rounded, 'desc': '${_dailyCO2.toStringAsFixed(1)}t'},
      {'label': 'Lahan', 'status': 'Aktif', 'color': _success, 'bg': _successBg, 'icon': Icons.landscape_rounded, 'desc': '${_reclamation.toStringAsFixed(0)}%'},
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 24, 16, 12),
          child: Row(
            children: [
              Container(
                width: 3,
                height: 18,
                decoration: BoxDecoration(
                  color: _navy,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(width: 10),
              Text(
                'Status Agen AI',
                style: GoogleFonts.inter(
                  color: _textPrimary,
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  letterSpacing: -0.3,
                ),
              ),
            ],
          ),
        ),
        SizedBox(
          height: 110,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            itemCount: agents.length,
            itemBuilder: (_, i) {
              final a = agents[i];
              final color = a['color'] as Color;
              final bg = a['bg'] as Color;
              return Container(
                width: 130,
                margin: const EdgeInsets.only(right: 10),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: _surface,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: color.withOpacity(0.15)),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.04),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(6),
                          decoration: BoxDecoration(
                            color: bg,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Icon(a['icon'] as IconData,
                              color: color, size: 14),
                        ),
                        const Spacer(),
                        Container(
                          width: 7,
                          height: 7,
                          decoration: BoxDecoration(
                            color: color,
                            shape: BoxShape.circle,
                          ),
                        ),
                      ],
                    ),
                    const Spacer(),
                    Text(
                      a['status'] as String,
                      style: GoogleFonts.inter(
                        color: color,
                        fontSize: 13,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      a['label'] as String,
                      style: GoogleFonts.inter(
                        color: _textMuted,
                        fontSize: 10,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    Text(
                      a['desc'] as String,
                      style: GoogleFonts.inter(
                        color: _textMuted,
                        fontSize: 9,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}

// ── Banner Stat ──────────────────────────────────────────
class _BannerStat extends StatelessWidget {
  final String label, value;
  final IconData icon;
  final Color? valueColor;
  const _BannerStat({
    required this.label,
    required this.value,
    required this.icon,
    this.valueColor,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(icon, color: Colors.white.withOpacity(0.35), size: 10),
            const SizedBox(width: 4),
            Text(
              label,
              style: GoogleFonts.inter(
                color: Colors.white.withOpacity(0.35),
                fontSize: 9,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
        const SizedBox(height: 3),
        Text(
          value,
          style: GoogleFonts.inter(
            color: valueColor ?? Colors.white,
            fontSize: 14,
            fontWeight: FontWeight.w700,
            height: 1,
          ),
        ),
      ],
    );
  }
}

class _BannerDivider extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      width: 1,
      height: 28,
      color: Colors.white.withOpacity(0.1),
      margin: const EdgeInsets.symmetric(horizontal: 16),
    );
  }
}

// ── AI Feed Card ─────────────────────────────────────────
class _AIFeedCard extends StatelessWidget {
  final Map<String, dynamic> feed;
  final VoidCallback? onTap;
  const _AIFeedCard({required this.feed, this.onTap});

  static const _navy = Color(0xFF0A1628);
  static const _navyMid = Color(0xFF1E3A5F);
  static const _border = Color(0xFFE2E8F0);
  static const _textPrimary = Color(0xFF0F172A);
  static const _textSecondary = Color(0xFF475569);
  static const _textMuted = Color(0xFF94A3B8);
  static const _bg = Color(0xFFF8FAFC);

  @override
  Widget build(BuildContext context) {
    final typeColor = Color(feed['typeColor'] as int);
    final typeBg = Color(feed['typeBg'] as int);
    final type = feed['type'] as String;
    final isKritis = type == 'Kritis';

    return Container(
      margin: const EdgeInsets.fromLTRB(16, 0, 16, 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isKritis ? typeColor.withOpacity(0.25) : _border,
        ),
        boxShadow: [
          BoxShadow(
            color: isKritis
                ? typeColor.withOpacity(0.08)
                : Colors.black.withOpacity(0.04),
            blurRadius: 16,
            offset: const Offset(0, 6),
            spreadRadius: -4,
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (isKritis)
            Container(
              height: 3,
              decoration: BoxDecoration(
                color: typeColor,
                borderRadius:
                    const BorderRadius.vertical(top: Radius.circular(16)),
              ),
            ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: typeBg,
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        type,
                        style: GoogleFonts.inter(
                          color: typeColor,
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      feed['agent'] as String,
                      style: GoogleFonts.inter(
                        color: _textMuted,
                        fontSize: 11,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const Spacer(),
                    Text(
                      feed['time'] as String,
                      style: GoogleFonts.inter(
                        color: _textMuted,
                        fontSize: 11,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Text(
                  feed['message'] as String,
                  style: GoogleFonts.inter(
                    color: _textPrimary,
                    fontSize: 13,
                    height: 1.5,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                if (feed['action'] != null) ...[
                  const SizedBox(height: 14),
                  Row(
                    children: [
                      Expanded(
                        child: GestureDetector(
                          onTap: onTap,
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 11),
                            decoration: BoxDecoration(
                              gradient: const LinearGradient(
                                colors: [_navy, _navyMid],
                              ),
                              borderRadius: BorderRadius.circular(10),
                              boxShadow: [
                                BoxShadow(
                                  color: _navy.withOpacity(0.2),
                                  blurRadius: 8,
                                  offset: const Offset(0, 4),
                                ),
                              ],
                            ),
                            child: Text(
                              feed['action'] as String,
                              textAlign: TextAlign.center,
                              style: GoogleFonts.inter(
                                color: Colors.white,
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                        ),
                      ),
                      if (feed['actionSecondary'] != null) ...[
                        const SizedBox(width: 8),
                        Expanded(
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 11),
                            decoration: BoxDecoration(
                              color: _bg,
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(color: _border),
                            ),
                            child: Text(
                              feed['actionSecondary'] as String,
                              textAlign: TextAlign.center,
                              style: GoogleFonts.inter(
                                color: _textSecondary,
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}