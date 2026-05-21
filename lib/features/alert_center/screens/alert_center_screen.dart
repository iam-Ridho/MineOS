import 'dart:async';
import 'dart:math';
import 'package:flutter/material.dart';

class AlertCenterScreen extends StatefulWidget {
  const AlertCenterScreen({super.key});

  @override
  State<AlertCenterScreen> createState() => _AlertCenterScreenState();
}

class _AlertCenterScreenState extends State<AlertCenterScreen> {
  final _random = Random();
  Timer? _timer;

  final List<Map<String, dynamic>> _alerts = [
    {
      'id': '1',
      'severity': 'red',
      'message': 'Fatigue operator Andi Wijaya mencapai 80%!',
      'vehicle': 'DT-002',
      'time': DateTime.now().subtract(const Duration(minutes: 5)),
      'acknowledged': false,
    },
    {
      'id': '2',
      'severity': 'red',
      'message': 'BBM DT-003 kritis — hanya tersisa 20%!',
      'vehicle': 'DT-003',
      'time': DateTime.now().subtract(const Duration(minutes: 12)),
      'acknowledged': false,
    },
    {
      'id': '3',
      'severity': 'yellow',
      'message': 'Kecepatan DT-001 melebihi batas zona Pit A',
      'vehicle': 'DT-001',
      'time': DateTime.now().subtract(const Duration(minutes: 20)),
      'acknowledged': true,
    },
  ];

  // Template alert simulasi
  final List<Map<String, dynamic>> _alertTemplates = [
    {'severity': 'red', 'message': 'Fatigue operator mencapai batas kritis!', 'vehicle': 'DT-002'},
    {'severity': 'yellow', 'message': 'BBM mulai menipis, segera isi ulang', 'vehicle': 'DT-001'},
    {'severity': 'red', 'message': 'Kendaraan keluar dari zona operasional!', 'vehicle': 'DT-003'},
    {'severity': 'yellow', 'message': 'Kecepatan melebihi batas yang ditentukan', 'vehicle': 'EX-001'},
    {'severity': 'green', 'message': 'Kendaraan kembali ke zona normal', 'vehicle': 'DT-001'},
    {'severity': 'red', 'message': 'Sensor getaran abnormal terdeteksi!', 'vehicle': 'EX-001'},
  ];

  @override
  void initState() {
    super.initState();
    // Simulasi alert masuk tiap 10-15 detik
    _timer = Timer.periodic(const Duration(seconds: 10), (_) {
      final template = _alertTemplates[_random.nextInt(_alertTemplates.length)];
      setState(() {
        _alerts.insert(0, {
          'id': DateTime.now().millisecondsSinceEpoch.toString(),
          'severity': template['severity'],
          'message': template['message'],
          'vehicle': template['vehicle'],
          'time': DateTime.now(),
          'acknowledged': false,
        });
      });
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Color _getColor(String severity) {
    switch (severity) {
      case 'red': return Colors.red.shade700;
      case 'yellow': return Colors.amber.shade600;
      default: return Colors.green.shade600;
    }
  }

  IconData _getIcon(String severity) {
    switch (severity) {
      case 'red': return Icons.dangerous;
      case 'yellow': return Icons.warning_amber;
      default: return Icons.check_circle;
    }
  }

  String _formatTime(DateTime time) {
    final diff = DateTime.now().difference(time);
    if (diff.inMinutes < 1) return 'Baru saja';
    if (diff.inMinutes < 60) return '${diff.inMinutes} menit lalu';
    return '${diff.inHours} jam lalu';
  }

  void _acknowledge(String id) {
    setState(() {
      final alert = _alerts.firstWhere((a) => a['id'] == id);
      alert['acknowledged'] = true;
    });
  }

  int get _unacknowledgedCount =>
      _alerts.where((a) => !a['acknowledged']).length;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0D1117),
      appBar: AppBar(
        backgroundColor: const Color(0xFF1A237E),
        title: Row(
          children: [
            const Text('Alert Center',
                style: TextStyle(
                    color: Colors.white, fontWeight: FontWeight.bold)),
            const SizedBox(width: 8),
            if (_unacknowledgedCount > 0)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: Colors.red,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  '$_unacknowledgedCount',
                  style: const TextStyle(
                      color: Colors.white,
                      fontSize: 12,
                      fontWeight: FontWeight.bold),
                ),
              ),
          ],
        ),
        actions: [
          // Acknowledge all button
          if (_unacknowledgedCount > 0)
            TextButton.icon(
              onPressed: () {
                setState(() {
                  for (var a in _alerts) {
                    a['acknowledged'] = true;
                  }
                });
              },
              icon: const Icon(Icons.done_all, color: Colors.white70, size: 18),
              label: const Text('Semua',
                  style: TextStyle(color: Colors.white70, fontSize: 12)),
            ),
        ],
      ),
      body: Column(
        children: [
          // Summary bar
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            color: const Color(0xFF1A1A2E),
            child: Row(
              children: [
                _SummaryChip(
                  color: Colors.red,
                  label: 'Kritis',
                  count: _alerts
                      .where((a) => a['severity'] == 'red' && !a['acknowledged'])
                      .length,
                ),
                const SizedBox(width: 8),
                _SummaryChip(
                  color: Colors.amber,
                  label: 'Warning',
                  count: _alerts
                      .where((a) => a['severity'] == 'yellow' && !a['acknowledged'])
                      .length,
                ),
                const SizedBox(width: 8),
                _SummaryChip(
                  color: Colors.green,
                  label: 'Normal',
                  count: _alerts
                      .where((a) => a['severity'] == 'green' && !a['acknowledged'])
                      .length,
                ),
                const Spacer(),
                Text(
                  'Total: ${_alerts.length} alert',
                  style: const TextStyle(color: Colors.white38, fontSize: 11),
                ),
              ],
            ),
          ),
          // Alert list
          Expanded(
            child: _alerts.isEmpty
                ? const Center(
                    child: Text('Tidak ada alert',
                        style: TextStyle(color: Colors.white38)))
                : ListView.builder(
                    padding: const EdgeInsets.all(12),
                    itemCount: _alerts.length,
                    itemBuilder: (context, index) {
                      final alert = _alerts[index];
                      final color = _getColor(alert['severity']);
                      return AnimatedContainer(
                        duration: const Duration(milliseconds: 300),
                        margin: const EdgeInsets.only(bottom: 10),
                        decoration: BoxDecoration(
                          color: alert['acknowledged']
                              ? const Color(0xFF1A1A2E)
                              : color.withOpacity(0.15),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: alert['acknowledged']
                                ? Colors.white12
                                : color.withOpacity(0.5),
                          ),
                        ),
                        child: ListTile(
                          contentPadding: const EdgeInsets.symmetric(
                              horizontal: 14, vertical: 8),
                          leading: CircleAvatar(
                            backgroundColor: alert['acknowledged']
                                ? Colors.white12
                                : color,
                            child: Icon(
                              alert['acknowledged']
                                  ? Icons.check
                                  : _getIcon(alert['severity']),
                              color: Colors.white,
                              size: 20,
                            ),
                          ),
                          title: Text(
                            alert['message'],
                            style: TextStyle(
                              color: alert['acknowledged']
                                  ? Colors.white38
                                  : Colors.white,
                              fontSize: 13,
                              fontWeight: alert['acknowledged']
                                  ? FontWeight.normal
                                  : FontWeight.w600,
                            ),
                          ),
                          subtitle: Padding(
                            padding: const EdgeInsets.only(top: 4),
                            child: Row(
                              children: [
                                Icon(Icons.local_shipping,
                                    color: Colors.white38, size: 12),
                                const SizedBox(width: 4),
                                Text(alert['vehicle'],
                                    style: const TextStyle(
                                        color: Colors.white38, fontSize: 11)),
                                const SizedBox(width: 12),
                                Icon(Icons.access_time,
                                    color: Colors.white38, size: 12),
                                const SizedBox(width: 4),
                                Text(_formatTime(alert['time']),
                                    style: const TextStyle(
                                        color: Colors.white38, fontSize: 11)),
                              ],
                            ),
                          ),
                          trailing: alert['acknowledged']
                              ? const Icon(Icons.check_circle,
                                  color: Colors.green, size: 20)
                              : ElevatedButton(
                                  onPressed: () => _acknowledge(alert['id']),
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: color,
                                    padding: const EdgeInsets.symmetric(
                                        horizontal: 10, vertical: 6),
                                    minimumSize: Size.zero,
                                    tapTargetSize:
                                        MaterialTapTargetSize.shrinkWrap,
                                  ),
                                  child: const Text('ACK',
                                      style: TextStyle(
                                          color: Colors.white,
                                          fontSize: 11,
                                          fontWeight: FontWeight.bold)),
                                ),
                        ),
                      );
                    },
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
        color: count > 0 ? color.withOpacity(0.2) : Colors.white10,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
            color: count > 0 ? color.withOpacity(0.5) : Colors.white12),
      ),
      child: Row(
        children: [
          CircleAvatar(
              backgroundColor: count > 0 ? color : Colors.white24,
              radius: 6,
              child: Text('$count',
                  style: const TextStyle(
                      color: Colors.white,
                      fontSize: 8,
                      fontWeight: FontWeight.bold))),
          const SizedBox(width: 6),
          Text(label,
              style: TextStyle(
                  color: count > 0 ? color : Colors.white38,
                  fontSize: 11,
                  fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}