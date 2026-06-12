import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import '../providers/alerts_provider.dart';
import '../../../shared/models/alert.dart';

class AlertCenterScreen extends ConsumerStatefulWidget {
  const AlertCenterScreen({super.key});

  @override
  ConsumerState<AlertCenterScreen> createState() => _AlertCenterScreenState();
}

class _AlertCenterScreenState extends ConsumerState<AlertCenterScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _pulseController;
  String _filterSeverity = 'ALL';

  // ── Kideco Premium Design System ─────────────────────────
  static const Color _kBackground = Color(0xFFF8FAFC);
  static const Color _kSurface = Color(0xFFFFFFFF);
  static const Color _kElevated = Color(0xFFF1F5F9);
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
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final alertsAsync = ref.watch(alertsProvider);

    return Scaffold(
      backgroundColor: _kBackground,
      body: SafeArea(
        child: Column(
          children: [
            _buildPremiumHeader(alertsAsync),
            _buildOrchestrationBar(),
            _buildFilterTabs(),
            Expanded(
              child: alertsAsync.when(
                data: (alerts) => _buildBody(context, ref, alerts),
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
  Widget _buildPremiumHeader(AsyncValue alertsAsync) {
    final unacked = alertsAsync.maybeWhen(
      data: (alerts) => (alerts as List<Alert>).where((a) => !a.acknowledged).length,
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
                Icons.notifications_active_rounded,
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
                  'Alert Center',
                  style: GoogleFonts.inter(
                    color: _kTextPrimary,
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                    letterSpacing: -0.3,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  'Agent Monitor',
                  style: GoogleFonts.inter(
                    color: _kTextMuted,
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
          if (unacked > 0)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              decoration: BoxDecoration(
                color: _kDanger.withOpacity(0.08),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: _kDanger.withOpacity(0.2)),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  AnimatedBuilder(
                    animation: _pulseController,
                    builder: (_, __) => Container(
                      width: 7,
                      height: 7,
                      decoration: BoxDecoration(
                        color: Color.lerp(
                          _kDanger,
                          _kDanger.withOpacity(0.3),
                          _pulseController.value,
                        ),
                        shape: BoxShape.circle,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    '$unacked Unack',
                    style: GoogleFonts.inter(
                      color: _kDanger,
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.3,
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  // ── Orchestration Status Bar ─────────────────────────────
  Widget _buildOrchestrationBar() {
    return Container(
      margin: const EdgeInsets.fromLTRB(20, 16, 20, 0),
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.centerLeft,
          end: Alignment.centerRight,
          colors: [_kNavy, _kNavyLight],
        ),
        borderRadius: BorderRadius.circular(14),
        boxShadow: [
          BoxShadow(
            color: _kNavy.withOpacity(0.15),
            blurRadius: 16,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 10,
            height: 10,
            decoration: BoxDecoration(
              color: _kSuccess,
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(
                  color: _kSuccess.withOpacity(0.4),
                  blurRadius: 8,
                  spreadRadius: 2,
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'LangGraph Orchestration',
                  style: GoogleFonts.inter(
                    color: Colors.white.withOpacity(0.7),
                    fontSize: 10,
                    fontWeight: FontWeight.w600,
                    letterSpacing: 0.5,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  '4/4 Node Aktif',
                  style: GoogleFonts.inter(
                    color: Colors.white,
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.1),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: Colors.white.withOpacity(0.2)),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  '22ms',
                  style: GoogleFonts.inter(
                    color: Colors.white,
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(width: 6),
                Text(
                  'LIVE',
                  style: GoogleFonts.inter(
                    color: _kSuccess,
                    fontSize: 9,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 1,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ── Filter Tabs ──────────────────────────────────────────
  Widget _buildFilterTabs() {
    final filters = ['ALL', 'KRITIS', 'WASPADA', 'NORMAL'];

    return Container(
      margin: const EdgeInsets.fromLTRB(20, 16, 20, 0),
      child: Row(
        children: filters.map((filter) {
          final isActive = _filterSeverity == filter;
          Color badgeColor;
          switch (filter) {
            case 'KRITIS':
              badgeColor = _kDanger;
              break;
            case 'WASPADA':
              badgeColor = _kWarning;
              break;
            case 'NORMAL':
              badgeColor = _kSuccess;
              break;
            default:
              badgeColor = _kNavy;
          }

          return Expanded(
            child: GestureDetector(
              onTap: () {
                HapticFeedback.lightImpact();
                setState(() => _filterSeverity = filter);
              },
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                margin: EdgeInsets.only(right: filter == 'NORMAL' ? 0 : 8),
                padding: const EdgeInsets.symmetric(vertical: 10),
                decoration: BoxDecoration(
                  color: isActive ? badgeColor : _kSurface,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                    color: isActive ? badgeColor : _kBorder,
                  ),
                  boxShadow: isActive
                      ? [
                          BoxShadow(
                            color: badgeColor.withOpacity(0.2),
                            blurRadius: 8,
                            offset: const Offset(0, 3),
                          ),
                        ]
                      : null,
                ),
                child: Text(
                  filter,
                  textAlign: TextAlign.center,
                  style: GoogleFonts.inter(
                    color: isActive ? Colors.white : _kTextSecondary,
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 0.5,
                  ),
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  // ── Body Content ─────────────────────────────────────────
  Widget _buildBody(BuildContext context, WidgetRef ref, List<Alert> alerts) {
    final filteredAlerts = _filterSeverity == 'ALL'
        ? alerts
        : alerts.where((a) => a.severity == _filterSeverity).toList();

    final kritisCount = alerts.where((a) => a.severity == 'KRITIS' && !a.acknowledged).length;
    final waspadaCount = alerts.where((a) => a.severity == 'WASPADA' && !a.acknowledged).length;
    final normalCount = alerts.where((a) => a.severity == 'NORMAL' && !a.acknowledged).length;

    return Column(
      children: [
        // Summary Cards
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
          child: Row(
            children: [
              _SummaryCard(
                label: 'Kritis',
                count: kritisCount,
                color: _kDanger,
                icon: Icons.dangerous_rounded,
              ),
              const SizedBox(width: 10),
              _SummaryCard(
                label: 'Waspada',
                count: waspadaCount,
                color: _kWarning,
                icon: Icons.warning_amber_rounded,
              ),
              const SizedBox(width: 10),
              _SummaryCard(
                label: 'Normal',
                count: normalCount,
                color: _kSuccess,
                icon: Icons.check_circle_rounded,
              ),
            ],
          ),
        ),

        // Ack All Button
        if (alerts.where((a) => !a.acknowledged).isNotEmpty)
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
            child: GestureDetector(
              onTap: () async {
                HapticFeedback.mediumImpact();
                final service = ref.read(acknowledgeAlertProvider);
                for (final alert in alerts.where((a) => !a.acknowledged)) {
                  await service.acknowledge(alert.id);
                }
              },
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 12),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
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
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.done_all_rounded, color: Colors.white, size: 18),
                    const SizedBox(width: 8),
                    Text(
                      'Acknowledge All',
                      style: GoogleFonts.inter(
                        color: Colors.white,
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),

        // Alert List
        Expanded(
          child: filteredAlerts.isEmpty
              ? _buildEmptyState()
              : ListView.builder(
                  padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
                  itemCount: filteredAlerts.length,
                  itemBuilder: (context, index) {
                    final alert = filteredAlerts[index];
                    return TweenAnimationBuilder<double>(
                      tween: Tween(begin: 0, end: 1),
                      duration: Duration(milliseconds: 300 + (index * 50)),
                      curve: Curves.easeOutQuart,
                      builder: (context, value, child) {
                        return Transform.translate(
                          offset: Offset(0, 20 * (1 - value)),
                          child: Opacity(
                            opacity: value,
                            child: child,
                          ),
                        );
                      },
                      child: _PremiumAlertCard(
                        alert: alert,
                        onAcknowledge: () async {
                          HapticFeedback.lightImpact();
                          final service = ref.read(acknowledgeAlertProvider);
                          await service.acknowledge(alert.id);
                        },
                      ),
                    );
                  },
                ),
        ),
      ],
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
            'Memuat alert...',
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
              'Gagal Memuat Alert',
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

  // ── Empty State ──────────────────────────────────────────
  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              color: _kSuccess.withOpacity(0.08),
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: _kSuccess.withOpacity(0.2)),
            ),
            child: Icon(
              Icons.check_circle_outline_rounded,
              color: _kSuccess,
              size: 40,
            ),
          ),
          const SizedBox(height: 20),
          Text(
            'Semua Sistem Nominal',
            style: GoogleFonts.inter(
              color: _kTextPrimary,
              fontSize: 18,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            'Tidak ada alert aktif saat ini',
            style: GoogleFonts.inter(
              color: _kTextMuted,
              fontSize: 13,
            ),
          ),
        ],
      ),
    );
  }
}

// ── Summary Card ─────────────────────────────────────────
class _SummaryCard extends StatelessWidget {
  final String label;
  final int count;
  final Color color;
  final IconData icon;

  const _SummaryCard({
    required this.label,
    required this.count,
    required this.color,
    required this.icon,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: _AlertCenterScreenState._kSurface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: count > 0 ? color.withOpacity(0.3) : const Color(0xFFE2E8F0)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.03),
              blurRadius: 8,
              offset: const Offset(0, 2),
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
                      color: const Color(0xFF475569),
                      fontSize: 10,
                      fontWeight: FontWeight.w600,
                      letterSpacing: 0.5,
                    ),
                  ),
                ),
                Container(
                  width: 28,
                  height: 28,
                  decoration: BoxDecoration(
                    color: color.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(icon, color: color, size: 14),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Text(
              '$count',
              style: GoogleFonts.inter(
                color: count > 0 ? color : const Color(0xFF94A3B8),
                fontSize: 24,
                fontWeight: FontWeight.w800,
                letterSpacing: -0.5,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              count == 1 ? 'Alert' : 'Alerts',
              style: GoogleFonts.inter(
                color: const Color(0xFF94A3B8),
                fontSize: 10,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Premium Alert Card ───────────────────────────────────
class _PremiumAlertCard extends StatelessWidget {
  final Alert alert;
  final VoidCallback onAcknowledge;

  const _PremiumAlertCard({
    required this.alert,
    required this.onAcknowledge,
  });

  Color get _severityColor {
    switch (alert.severity) {
      case 'KRITIS':
        return const Color(0xFFDC2626);
      case 'WASPADA':
        return const Color(0xFFD97706);
      default:
        return const Color(0xFF059669);
    }
  }

  IconData get _severityIcon {
    switch (alert.severity) {
      case 'KRITIS':
        return Icons.dangerous_rounded;
      case 'WASPADA':
        return Icons.warning_amber_rounded;
      default:
        return Icons.check_circle_rounded;
    }
  }

  String _formatTime(String? timestamp) {
    if (timestamp == null) return '';
    final time = DateTime.tryParse(timestamp);
    if (time == null) return '';
    final diff = DateTime.now().difference(time);
    if (diff.inMinutes < 1) return 'Baru saja';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m lalu';
    if (diff.inHours < 24) return '${diff.inHours}h lalu';
    return '${diff.inDays}d lalu';
  }

  @override
  Widget build(BuildContext context) {
    final color = _severityColor;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: alert.acknowledged
              ? const Color(0xFFE2E8F0)
              : color.withOpacity(0.25),
          width: alert.acknowledged ? 1 : 1.5,
        ),
        boxShadow: [
          BoxShadow(
            color: (alert.acknowledged ? const Color(0xFF0A1628) : color)
                .withOpacity(alert.acknowledged ? 0.03 : 0.08),
            blurRadius: 16,
            offset: const Offset(0, 6),
            spreadRadius: -4,
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 10),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: color.withOpacity(0.08),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: color.withOpacity(0.25)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(_severityIcon, color: color, size: 12),
                      const SizedBox(width: 5),
                      Text(
                        alert.severity,
                        style: GoogleFonts.inter(
                          color: color,
                          fontSize: 10,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 0.5,
                        ),
                      ),
                    ],
                  ),
                ),
                if (alert.vehicleId != null) ...[
                  const SizedBox(width: 10),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF1F5F9),
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                    ),
                    child: Text(
                      alert.vehicleId!,
                      style: GoogleFonts.inter(
                        color: const Color(0xFF475569),
                        fontSize: 10,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
                const Spacer(),
                Text(
                  _formatTime(alert.createdAt),
                  style: GoogleFonts.inter(
                    color: const Color(0xFF94A3B8),
                    fontSize: 11,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),

          // Message
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 14),
            child: Text(
              alert.message,
              style: GoogleFonts.inter(
                color: alert.acknowledged
                    ? const Color(0xFF94A3B8)
                    : const Color(0xFF0F172A),
                fontSize: 14,
                height: 1.6,
                fontWeight: alert.acknowledged ? FontWeight.w400 : FontWeight.w500,
              ),
            ),
          ),

          // Actions
          if (!alert.acknowledged)
            Container(
              decoration: BoxDecoration(
                border: Border(
                  top: BorderSide(color: color.withOpacity(0.15)),
                ),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: GestureDetector(
                      onTap: onAcknowledge,
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        decoration: BoxDecoration(
                          color: color.withOpacity(0.05),
                          borderRadius: const BorderRadius.only(
                            bottomLeft: Radius.circular(15),
                          ),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.done_all_rounded, color: color, size: 16),
                            const SizedBox(width: 6),
                            Text(
                              'Acknowledge',
                              style: GoogleFonts.inter(
                                color: color,
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  Container(
                    width: 1,
                    height: 44,
                    color: color.withOpacity(0.15),
                  ),
                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      decoration: const BoxDecoration(
                        borderRadius: BorderRadius.only(
                          bottomRight: Radius.circular(15),
                        ),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.visibility_off_outlined,
                              color: const Color(0xFF94A3B8), size: 16),
                          const SizedBox(width: 6),
                          Text(
                            'Abaikan',
                            style: GoogleFonts.inter(
                              color: const Color(0xFF94A3B8),
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            )
          else
            Container(
              padding: const EdgeInsets.symmetric(vertical: 10),
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                borderRadius: const BorderRadius.only(
                  bottomLeft: Radius.circular(15),
                  bottomRight: Radius.circular(15),
                ),
                border: Border(
                  top: BorderSide(color: const Color(0xFFE2E8F0)),
                ),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.check_circle_rounded,
                      color: const Color(0xFF059669), size: 14),
                  const SizedBox(width: 6),
                  Text(
                    'Acknowledged',
                    style: GoogleFonts.inter(
                      color: const Color(0xFF059669),
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.5,
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}