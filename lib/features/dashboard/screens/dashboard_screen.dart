import 'dart:async';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';

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
  String _currentTime = '';

  final List<Map<String, dynamic>> _aiFeeds = [
    {
      'agent': 'FLEET AGENT',
      'type': 'Kritis',
      'typeColor': 0xFFDC2626,
      'time': '12:45:02',
      'message': 'Evakuasi disarankan segera di Pit Alpha — Stabilitas Lereng 78%',
      'action': 'Ambil Tindakan',
      'actionSecondary': 'Abaikan',
    },
    {
      'agent': 'SAFETY AGENT',
      'type': 'Peringatan',
      'typeColor': 0xFFD97706,
      'time': '12:44:15',
      'message': 'Reroute Armada B-3 disarankan karena kondisi cuaca buruk.',
      'action': 'Optimalkan',
      'actionSecondary': null,
    },
    {
      'agent': 'EMISSION AGENT',
      'type': 'Normal',
      'typeColor': 0xFF059669,
      'time': '12:42:00',
      'message': 'Siklus pengisian daya otonom Fleet Delta selesai dengan baik.',
      'action': null,
      'actionSecondary': null,
    },
  ];

  // ── Color System ─────────────────────────────────────────
  static const Color _kBackground = Color(0xFFF8FAFC);
  static const Color _kSurface = Color(0xFFFFFFFF);
  static const Color _kNavy = Color(0xFF0A1628);
  static const Color _kNavyLight = Color(0xFF1E293B);
  static const Color _kTextPrimary = Color(0xFF0F172A);
  static const Color _kTextSecondary = Color(0xFF475569);
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
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      setState(() {
        _updateTime();
        if (_timer!.tick % 5 == 0) {
          _activeVehicles += _random.nextInt(3) - 1;
          _dailyCO2 = (_dailyCO2 + (_random.nextDouble() - 0.5) * 0.1)
              .clamp(3.0, 7.0);
          _reclamation = (_reclamation + (_random.nextDouble() - 0.5) * 0.1)
              .clamp(60.0, 80.0);
        }
      });
    });
  }

  void _updateTime() {
    final now = DateTime.now();
    _currentTime =
        '${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}:${now.second.toString().padLeft(2, '0')}';
  }

  @override
  void dispose() {
    _timer?.cancel();
    _pulseController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _kBackground,
      body: SafeArea(
        child: CustomScrollView(
          physics: const BouncingScrollPhysics(),
          slivers: [
            SliverToBoxAdapter(child: _buildHeader()),
            SliverToBoxAdapter(child: _buildStatusBanner()),
            SliverToBoxAdapter(child: _buildKPIGrid()),
            SliverToBoxAdapter(child: _buildSectionTitle('AI Decision Feed', badge: 'Real-time')),
            SliverList(
              delegate: SliverChildBuilderDelegate(
                (context, index) => _AIFeedCard(
                  feed: _aiFeeds[index],
                  onTap: () => widget.onSwitchTab?.call(2),
                ),
                childCount: _aiFeeds.length,
              ),
            ),
            SliverToBoxAdapter(child: _buildSectionTitle('Status Agen AI')),
            SliverToBoxAdapter(child: _buildAgentStatusSection()),
            const SliverToBoxAdapter(child: SizedBox(height: 120)),
          ],
        ),
      ),
    );
  }

  // ── Header ───────────────────────────────────────────────
  Widget _buildHeader() {
    return Container(
      margin: const EdgeInsets.fromLTRB(20, 16, 20, 8),
      child: Row(
        children: [
          // Logo mark with subtle gradient depth
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
              child: Text(
                'M',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                  letterSpacing: -0.5,
                ),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'MineOS',
                style: GoogleFonts.inter(
                  color: _kTextPrimary,
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                  letterSpacing: -0.5,
                ),
              ),
              Text(
                'Command Center',
                style: GoogleFonts.inter(
                  color: _kTextSecondary,
                  fontSize: 11,
                  fontWeight: FontWeight.w500,
                  letterSpacing: 0.2,
                ),
              ),
            ],
          ),
          const Spacer(),
          // Live Time Pill
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            decoration: BoxDecoration(
              color: _kSurface,
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: _kBorder),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.03),
                  blurRadius: 8,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                AnimatedBuilder(
                  animation: _pulseController,
                  builder: (_, __) => Container(
                    width: 8,
                    height: 8,
                    decoration: BoxDecoration(
                      color: Color.lerp(
                        _kSuccess,
                        _kSuccess.withOpacity(0.2),
                        _pulseController.value,
                      ),
                      shape: BoxShape.circle,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  _currentTime,
                  style: GoogleFonts.inter(
                    color: _kTextPrimary,
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    letterSpacing: 0.5,
                    fontFeatures: [const FontFeature.tabularFigures()],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ── Status Banner ────────────────────────────────────────
  Widget _buildStatusBanner() {
    return Container(
      margin: const EdgeInsets.fromLTRB(20, 12, 20, 0),
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.centerLeft,
          end: Alignment.centerRight,
          colors: [_kNavy, _kNavyLight],
        ),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: _kNavy.withOpacity(0.15),
            blurRadius: 12,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.15),
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Icon(
              Icons.verified_outlined,
              color: Colors.white,
              size: 18,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              'Sistem Operasional — 4 Agen Aktif',
              style: GoogleFonts.inter(
                color: Colors.white,
                fontSize: 13,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
            decoration: BoxDecoration(
              color: _kSuccess,
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(
              'LIVE',
              style: GoogleFonts.inter(
                color: Colors.white,
                fontSize: 10,
                fontWeight: FontWeight.w800,
                letterSpacing: 1,
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ── KPI Grid (Overflow Fixed) ──────────────────────────
  Widget _buildKPIGrid() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
      child: LayoutBuilder(
        builder: (context, constraints) {
          final crossAxisCount = 2;
          final spacing = 12.0;
          final itemWidth = (constraints.maxWidth - spacing) / crossAxisCount;
          
          return Wrap(
            spacing: spacing,
            runSpacing: spacing,
            children: [
              SizedBox(
                width: itemWidth,
                child: _KPICard(
                  label: 'Armada Aktif',
                  value: '$_activeVehicles',
                  sub: 'kendaraan',
                  icon: Icons.local_shipping_outlined,
                  accentColor: _kNavy,
                  trend: '+3.2%',
                  trendUp: true,
                  onTap: () => widget.onSwitchTab?.call(1),
                ),
              ),
              SizedBox(
                width: itemWidth,
                child: _KPICard(
                  label: 'Alert Safety',
                  value: '$_safetyAlerts',
                  sub: '24 jam terakhir',
                  icon: Icons.shield_outlined,
                  accentColor: _kDanger,
                  trend: 'Perlu Aksi',
                  trendUp: false,
                  onTap: () => widget.onSwitchTab?.call(2),
                ),
              ),
              SizedBox(
                width: itemWidth,
                child: _KPICard(
                  label: 'Emisi CO₂',
                  value: '${_dailyCO2.toStringAsFixed(1)}t',
                  sub: 'hari ini',
                  icon: Icons.eco_outlined,
                  accentColor: _kInfo,
                  trend: '-12%',
                  trendUp: true,
                  onTap: null,
                ),
              ),
              SizedBox(
                width: itemWidth,
                child: _KPICard(
                  label: 'Reklamasi',
                  value: '${_reclamation.toStringAsFixed(1)}%',
                  sub: 'dari target',
                  icon: Icons.landscape_outlined,
                  accentColor: _kSuccess,
                  showBar: true,
                  barValue: _reclamation / 100,
                  onTap: null,
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  // ── Section Title ────────────────────────────────────────
  Widget _buildSectionTitle(String title, {String? badge}) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 32, 20, 16),
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
              fontSize: 17,
              fontWeight: FontWeight.w700,
              letterSpacing: -0.3,
            ),
          ),
          const Spacer(),
          if (badge != null)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
              decoration: BoxDecoration(
                color: const Color(0xFFDBEAFE),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: const Color(0xFFBFDBFE)),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 6,
                    height: 6,
                    decoration: const BoxDecoration(
                      color: _kInfo,
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 6),
                  Text(
                    badge,
                    style: GoogleFonts.inter(
                      color: _kInfo,
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  // ── Agent Status ───────────────────────────────────────
  Widget _buildAgentStatusSection() {
    final agents = [
      {'label': 'Fleet', 'status': 'Optimal', 'color': _kSuccess, 'icon': Icons.local_shipping_outlined},
      {'label': 'Safety', 'status': 'Kritis', 'color': _kDanger, 'icon': Icons.shield_outlined},
      {'label': 'Emisi', 'status': 'Normal', 'color': _kInfo, 'icon': Icons.eco_outlined},
      {'label': 'Lahan', 'status': 'Aktif', 'color': _kSuccess, 'icon': Icons.landscape_outlined},
    ];

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Row(
        children: agents.map((a) {
          final color = a['color'] as Color;
          return Expanded(
            child: Container(
              margin: EdgeInsets.only(
                right: a == agents.last ? 0 : 10,
              ),
              padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 8),
              decoration: BoxDecoration(
                color: _kSurface,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: _kBorder),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.03),
                    blurRadius: 10,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Column(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: color.withOpacity(0.08),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(
                      a['icon'] as IconData,
                      color: color,
                      size: 20,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    a['label'] as String,
                    style: GoogleFonts.inter(
                      color: _kTextSecondary,
                      fontSize: 10,
                      fontWeight: FontWeight.w600,
                      letterSpacing: 0.5,
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    a['status'] as String,
                    style: GoogleFonts.inter(
                      color: color,
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
}

// ── KPI Card (Premium + Overflow Safe) ───────────────────
class _KPICard extends StatelessWidget {
  final String label;
  final String value;
  final String sub;
  final IconData icon;
  final Color accentColor;
  final String? trend;
  final bool trendUp;
  final bool showBar;
  final double barValue;
  final VoidCallback? onTap;

  const _KPICard({
    required this.label,
    required this.value,
    required this.sub,
    required this.icon,
    required this.accentColor,
    this.trend,
    this.trendUp = true,
    this.showBar = false,
    this.barValue = 0,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: const Color(0xFFE2E8F0),
            width: 1,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.04),
              blurRadius: 16,
              offset: const Offset(0, 4),
              spreadRadius: -2,
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            // Header: Label + Icon
            Row(
              children: [
                Expanded(
                  child: Text(
                    label,
                    style: GoogleFonts.inter(
                      color: const Color(0xFF475569),
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      letterSpacing: 0.3,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                const SizedBox(width: 8),
                Container(
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(
                    color: accentColor.withOpacity(0.08),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(icon, color: accentColor, size: 16),
                ),
              ],
            ),
            const SizedBox(height: 12),
            // Value
            Text(
              value,
              style: GoogleFonts.inter(
                color: const Color(0xFF0F172A),
                fontSize: 26,
                fontWeight: FontWeight.w800,
                letterSpacing: -0.5,
                height: 1.0,
              ),
            ),
            const SizedBox(height: 8),
            // Trend / Bar
            if (trend != null)
              Row(
                children: [
                  Icon(
                    trendUp
                        ? Icons.trending_up_rounded
                        : Icons.trending_down_rounded,
                    color: trendUp
                        ? const Color(0xFF059669)
                        : const Color(0xFFDC2626),
                    size: 14,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    trend!,
                    style: GoogleFonts.inter(
                      color: trendUp
                          ? const Color(0xFF059669)
                          : const Color(0xFFDC2626),
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(width: 6),
                  Flexible(
                    child: Text(
                      sub,
                      style: GoogleFonts.inter(
                        color: const Color(0xFF94A3B8),
                        fontSize: 10,
                        fontWeight: FontWeight.w500,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
            if (showBar) ...[
              const SizedBox(height: 8),
              ClipRRect(
                borderRadius: BorderRadius.circular(4),
                child: LinearProgressIndicator(
                  value: barValue,
                  backgroundColor: const Color(0xFFF1F5F9),
                  color: accentColor,
                  minHeight: 6,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                sub,
                style: GoogleFonts.inter(
                  color: const Color(0xFF94A3B8),
                  fontSize: 10,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

// ── AI Feed Card (Premium + Overflow Safe) ─────────────
class _AIFeedCard extends StatelessWidget {
  final Map<String, dynamic> feed;
  final VoidCallback? onTap;
  const _AIFeedCard({required this.feed, this.onTap});

  static const Color _kTextPrimary = Color(0xFF0F172A);
  static const Color _kTextSecondary = Color(0xFF475569);
  static const Color _kTextTertiary = Color(0xFF94A3B8);
  static const Color _kBorder = Color(0xFFE2E8F0);
  static const Color _kNavy = Color(0xFF0A1628);
  static const Color _kDanger = Color(0xFFDC2626);

  @override
  Widget build(BuildContext context) {
    final typeColor = Color(feed['typeColor'] as int);
    final type = feed['type'] as String;
    final isKritis = type == 'Kritis';

    return Container(
      margin: const EdgeInsets.fromLTRB(20, 0, 20, 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isKritis ? _kDanger.withOpacity(0.2) : _kBorder,
          width: isKritis ? 1.5 : 1,
        ),
        boxShadow: [
          BoxShadow(
            color: isKritis
                ? _kDanger.withOpacity(0.06)
                : Colors.black.withOpacity(0.03),
            blurRadius: 12,
            offset: const Offset(0, 4),
            spreadRadius: -2,
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            // Meta Row
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: typeColor.withOpacity(0.08),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: typeColor.withOpacity(0.15),
                      width: 1,
                    ),
                  ),
                  child: Text(
                    type.toUpperCase(),
                    style: GoogleFonts.inter(
                      color: typeColor,
                      fontSize: 10,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 0.5,
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    feed['agent'] as String,
                    style: GoogleFonts.inter(
                      color: _kTextSecondary,
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      letterSpacing: 0.5,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                Text(
                  feed['time'] as String,
                  style: GoogleFonts.inter(
                    color: _kTextTertiary,
                    fontSize: 11,
                    fontWeight: FontWeight.w500,
                    fontFeatures: [const FontFeature.tabularFigures()],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            // Message
            Text(
              feed['message'] as String,
              style: GoogleFonts.inter(
                color: _kTextPrimary,
                fontSize: 14,
                height: 1.5,
                fontWeight: FontWeight.w500,
              ),
            ),
            // Actions
            if (feed['action'] != null) ...[
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: GestureDetector(
                      onTap: onTap,
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            colors: [_kNavy, Color(0xFF1E293B)],
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
                        child: Text(
                          feed['action'] as String,
                          textAlign: TextAlign.center,
                          style: GoogleFonts.inter(
                            color: Colors.white,
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ),
                  ),
                  if (feed['actionSecondary'] != null) ...[
                    const SizedBox(width: 10),
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: _kBorder),
                        ),
                        child: Text(
                          feed['actionSecondary'] as String,
                          textAlign: TextAlign.center,
                          style: GoogleFonts.inter(
                            color: _kTextSecondary,
                            fontSize: 13,
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
    );
  }
}