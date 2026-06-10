import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import '../providers/alerts_provider.dart';
import '../../../shared/models/alert.dart';

class AlertCenterScreen extends ConsumerWidget {
  const AlertCenterScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final alertsAsync = ref.watch(alertsProvider);

    return Scaffold(
      backgroundColor: const Color(0xFF031427),
      body: SafeArea(
        child: Column(
          children: [
            _buildHeader(alertsAsync),
            _buildOrchestrationStatus(),
            Expanded(
              child: alertsAsync.when(
                data: (alerts) => _buildBody(context, ref, alerts),
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

  Widget _buildHeader(AsyncValue alertsAsync) {
    final unacked = alertsAsync.maybeWhen(
      data: (alerts) =>
          (alerts as List<Alert>).where((a) => !a.acknowledged).length,
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
          Text(
            'MineOS',
            style: GoogleFonts.inter(
              color: Colors.white,
              fontSize: 20,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(width: 8),
          Text(
            'Agent Monitor',
            style: GoogleFonts.inter(
              color: const Color(0xFF3B82F6),
              fontSize: 20,
              fontWeight: FontWeight.w300,
            ),
          ),
          const Spacer(),
          if (unacked > 0)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: const Color(0xFFF87171).withOpacity(0.15),
                borderRadius: BorderRadius.circular(4),
                border: Border.all(
                    color: const Color(0xFFF87171).withOpacity(0.5)),
              ),
              child: Text(
                '$unacked UNACKED',
                style: GoogleFonts.sourceCodePro(
                  color: const Color(0xFFF87171),
                  fontSize: 9,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 1,
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildOrchestrationStatus() {
    return Container(
      margin: const EdgeInsets.all(12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFF0B1C30),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
            color: const Color(0xFF10B981).withOpacity(0.3)),
      ),
      child: Row(
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'LANGGRAPH ORCHESTRATION',
                style: GoogleFonts.sourceCodePro(
                  color: const Color(0xFF8892A4),
                  fontSize: 8,
                  letterSpacing: 1,
                ),
              ),
              const SizedBox(height: 3),
              Text(
                '4/4 NODE AKTIF',
                style: GoogleFonts.sourceCodePro(
                  color: const Color(0xFF10B981),
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          const Spacer(),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                'LATENCY',
                style: GoogleFonts.sourceCodePro(
                  color: const Color(0xFF8892A4),
                  fontSize: 8,
                  letterSpacing: 1,
                ),
              ),
              const SizedBox(height: 3),
              Text(
                '22ms',
                style: GoogleFonts.sourceCodePro(
                  color: const Color(0xFF10B981),
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          const SizedBox(width: 12),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: const Color(0xFF10B981).withOpacity(0.1),
              borderRadius: BorderRadius.circular(4),
              border: Border.all(
                  color: const Color(0xFF10B981).withOpacity(0.4)),
            ),
            child: Text(
              'LIVE HUD',
              style: GoogleFonts.sourceCodePro(
                color: const Color(0xFF10B981),
                fontSize: 9,
                fontWeight: FontWeight.bold,
                letterSpacing: 1,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBody(
      BuildContext context, WidgetRef ref, List<Alert> alerts) {
    final kritisCount =
        alerts.where((a) => a.severity == 'KRITIS' && !a.acknowledged).length;
    final waspadaCount =
        alerts.where((a) => a.severity == 'WASPADA' && !a.acknowledged).length;

    return Column(
      children: [
        // Summary bar
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          color: const Color(0xFF0B1C30),
          child: Row(
            children: [
              _SummaryChip(
                  color: const Color(0xFFF87171),
                  label: 'KRITIS',
                  count: kritisCount),
              const SizedBox(width: 8),
              _SummaryChip(
                  color: const Color(0xFFFBBF24),
                  label: 'WASPADA',
                  count: waspadaCount),
              const Spacer(),
              Consumer(
                builder: (context, ref, _) {
                  final unacked =
                      alerts.where((a) => !a.acknowledged).length;
                  if (unacked == 0) return const SizedBox();
                  return GestureDetector(
                    onTap: () async {
                      final service = ref.read(acknowledgeAlertProvider);
                      for (final alert
                          in alerts.where((a) => !a.acknowledged)) {
                        await service.acknowledge(alert.id);
                      }
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: const Color(0xFF1E2D45),
                        borderRadius: BorderRadius.circular(4),
                        border:
                            Border.all(color: const Color(0xFF2D3F55)),
                      ),
                      child: Text(
                        'ACK ALL',
                        style: GoogleFonts.inter(
                          color: const Color(0xFF8892A4),
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          letterSpacing: 1,
                        ),
                      ),
                    ),
                  );
                },
              ),
            ],
          ),
        ),

        // Alert list
        Expanded(
          child: alerts.isEmpty
              ? Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.check_circle_outline,
                          color: Color(0xFF10B981), size: 48),
                      const SizedBox(height: 12),
                      Text(
                        'SEMUA SISTEM NOMINAL',
                        style: GoogleFonts.sourceCodePro(
                          color: const Color(0xFF10B981),
                          fontSize: 13,
                          fontWeight: FontWeight.bold,
                          letterSpacing: 1,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Tidak ada alert aktif',
                        style: GoogleFonts.inter(
                          color: const Color(0xFF8892A4),
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.all(12),
                  itemCount: alerts.length,
                  itemBuilder: (context, index) => _AlertCard(
                    alert: alerts[index],
                    onAcknowledge: () async {
                      final service = ref.read(acknowledgeAlertProvider);
                      await service.acknowledge(alerts[index].id);
                    },
                  ),
                ),
        ),
      ],
    );
  }
}

class _AlertCard extends StatelessWidget {
  final Alert alert;
  final VoidCallback onAcknowledge;
  const _AlertCard({required this.alert, required this.onAcknowledge});

  Color get _color {
    switch (alert.severity) {
      case 'KRITIS': return const Color(0xFFF87171);
      case 'WASPADA': return const Color(0xFFFBBF24);
      default: return const Color(0xFF10B981);
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
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: const Color(0xFF0B1C30),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: alert.acknowledged
              ? const Color(0xFF1E2D45)
              : _color.withOpacity(0.4),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 10, 12, 6),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: _color.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(3),
                    border: Border.all(color: _color.withOpacity(0.4)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        alert.severity == 'KRITIS'
                            ? Icons.dangerous
                            : alert.severity == 'WASPADA'
                                ? Icons.warning_amber
                                : Icons.check_circle,
                        color: _color,
                        size: 10,
                      ),
                      const SizedBox(width: 3),
                      Text(
                        alert.severity,
                        style: GoogleFonts.inter(
                          color: _color,
                          fontSize: 8,
                          fontWeight: FontWeight.bold,
                          letterSpacing: 0.5,
                        ),
                      ),
                    ],
                  ),
                ),
                if (alert.vehicleId != null) ...[
                  const SizedBox(width: 6),
                  Text(
                    alert.vehicleId!,
                    style: GoogleFonts.sourceCodePro(
                      color: const Color(0xFF8892A4),
                      fontSize: 9,
                    ),
                  ),
                ],
                const Spacer(),
                Text(
                  _formatTime(alert.createdAt),
                  style: GoogleFonts.sourceCodePro(
                    color: const Color(0xFF8892A4),
                    fontSize: 9,
                  ),
                ),
              ],
            ),
          ),

          // Message
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 0, 12, 10),
            child: Text(
              alert.message,
              style: GoogleFonts.inter(
                color: alert.acknowledged
                    ? const Color(0xFF8892A4)
                    : Colors.white,
                fontSize: 12,
                height: 1.4,
              ),
            ),
          ),

          // Action
          if (!alert.acknowledged)
            Container(
              decoration: BoxDecoration(
                border: Border(
                    top: BorderSide(color: _color.withOpacity(0.2))),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: GestureDetector(
                      onTap: onAcknowledge,
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        decoration: BoxDecoration(
                          color: _color.withOpacity(0.1),
                          borderRadius: const BorderRadius.only(
                            bottomLeft: Radius.circular(8),
                          ),
                        ),
                        child: Text(
                          'ACKNOWLEDGE',
                          textAlign: TextAlign.center,
                          style: GoogleFonts.inter(
                            color: _color,
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 1,
                          ),
                        ),
                      ),
                    ),
                  ),
                  Container(
                    width: 1,
                    height: 36,
                    color: _color.withOpacity(0.2),
                  ),
                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      decoration: const BoxDecoration(
                        borderRadius: BorderRadius.only(
                          bottomRight: Radius.circular(8),
                        ),
                      ),
                      child: Text(
                        'ABAIKAN',
                        textAlign: TextAlign.center,
                        style: GoogleFonts.inter(
                          color: const Color(0xFF8892A4),
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          letterSpacing: 1,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            )
          else
            Container(
              padding: const EdgeInsets.symmetric(vertical: 8),
              decoration: const BoxDecoration(
                border: Border(
                    top: BorderSide(color: Color(0xFF1E2D45))),
                borderRadius: BorderRadius.only(
                  bottomLeft: Radius.circular(8),
                  bottomRight: Radius.circular(8),
                ),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.check_circle,
                      color: Color(0xFF10B981), size: 12),
                  const SizedBox(width: 6),
                  Text(
                    'ACKNOWLEDGED',
                    style: GoogleFonts.inter(
                      color: const Color(0xFF10B981),
                      fontSize: 9,
                      fontWeight: FontWeight.bold,
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
}

class _SummaryChip extends StatelessWidget {
  final Color color;
  final String label;
  final int count;
  const _SummaryChip(
      {required this.color, required this.label, required this.count});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: count > 0 ? color.withOpacity(0.1) : Colors.transparent,
        borderRadius: BorderRadius.circular(4),
        border: Border.all(
            color: count > 0 ? color.withOpacity(0.4) : const Color(0xFF1E2D45)),
      ),
      child: Row(
        children: [
          Text(
            '$count',
            style: GoogleFonts.sourceCodePro(
              color: count > 0 ? color : const Color(0xFF8892A4),
              fontSize: 12,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(width: 6),
          Text(
            label,
            style: GoogleFonts.inter(
              color: count > 0 ? color : const Color(0xFF8892A4),
              fontSize: 10,
              fontWeight: FontWeight.bold,
              letterSpacing: 0.5,
            ),
          ),
        ],
      ),
    );
  }
}