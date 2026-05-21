import 'dart:async';
import 'dart:math';
import 'package:flutter/material.dart';

// Callback untuk switch tab dari luar
typedef SwitchTabCallback = void Function(int index);

class DashboardScreen extends StatefulWidget {
  final SwitchTabCallback? onSwitchTab;
  const DashboardScreen({super.key, this.onSwitchTab});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  final _random = Random();
  Timer? _timer;

  int _activeVehicles = 4;
  int _alertCount = 2;
  double _efficiency = 78.5;
  int _totalTon = 1240;
  String _lastUpdate = '';

  @override
  void initState() {
    super.initState();
    _updateTime();
    _timer = Timer.periodic(const Duration(seconds: 5), (_) {
      setState(() {
        _totalTon += _random.nextInt(10);
        _efficiency = (_efficiency + (_random.nextDouble() - 0.5)).clamp(70, 95);
        _updateTime();
      });
    });
  }

  void _updateTime() {
    final now = DateTime.now();
    _lastUpdate =
        '${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}:${now.second.toString().padLeft(2, '0')}';
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0A0E1A),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Row(
                children: [
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: const Color(0xFF1A237E),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(Icons.terrain, color: Colors.white, size: 22),
                  ),
                  const SizedBox(width: 12),
                  const Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('MineOS Mobile',
                          style: TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                              fontSize: 18)),
                      Text('PT Kideco Jaya Agung',
                          style: TextStyle(color: Colors.white38, fontSize: 12)),
                    ],
                  ),
                  const Spacer(),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.green.withOpacity(0.15),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: Colors.green.withOpacity(0.4)),
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 6,
                          height: 6,
                          decoration: const BoxDecoration(
                            color: Colors.green,
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: 6),
                        const Text('LIVE',
                            style: TextStyle(
                                color: Colors.green,
                                fontSize: 11,
                                fontWeight: FontWeight.bold)),
                      ],
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 6),
              Text('Update terakhir: $_lastUpdate',
                  style: const TextStyle(color: Colors.white24, fontSize: 10)),

              const SizedBox(height: 20),

              // Alert banner
              if (_alertCount > 0)
                GestureDetector(
                  onTap: () => widget.onSwitchTab?.call(2),
                  child: Container(
                    margin: const EdgeInsets.only(bottom: 16),
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    decoration: BoxDecoration(
                      color: Colors.red.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: Colors.red.withOpacity(0.4)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.warning_amber, color: Colors.red, size: 18),
                        const SizedBox(width: 10),
                        Text('$_alertCount alert kritis membutuhkan perhatian',
                            style: const TextStyle(
                                color: Colors.red,
                                fontSize: 13,
                                fontWeight: FontWeight.w600)),
                        const Spacer(),
                        const Icon(Icons.arrow_forward_ios, color: Colors.red, size: 12),
                      ],
                    ),
                  ),
                ),

              // Stats grid
              const _SectionLabel(label: 'Ringkasan Operasional'),
              const SizedBox(height: 10),
              GridView.count(
                crossAxisCount: 2,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                crossAxisSpacing: 10,
                mainAxisSpacing: 10,
                childAspectRatio: 1.5,
                children: [
                  _StatCard(
                    icon: Icons.local_shipping,
                    label: 'Kendaraan Aktif',
                    value: '$_activeVehicles',
                    subtitle: 'dari 4 total',
                    color: Colors.blue,
                  ),
                  _StatCard(
                    icon: Icons.warning_amber,
                    label: 'Alert Aktif',
                    value: '$_alertCount',
                    subtitle: 'perlu ditangani',
                    color: _alertCount > 0 ? Colors.red : Colors.green,
                  ),
                  _StatCard(
                    icon: Icons.trending_up,
                    label: 'Efisiensi',
                    value: '${_efficiency.toStringAsFixed(1)}%',
                    subtitle: 'target 80%',
                    color: _efficiency >= 80 ? Colors.green : Colors.orange,
                  ),
                  _StatCard(
                    icon: Icons.inventory,
                    label: 'Produksi',
                    value: '$_totalTon ton',
                    subtitle: 'hari ini',
                    color: Colors.purple,
                  ),
                ],
              ),

              const SizedBox(height: 20),

              // Operator status
              const _SectionLabel(label: 'Status Operator'),
              const SizedBox(height: 10),
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: const Color(0xFF1A1A2E),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.white12),
                ),
                child: const Column(
                  children: [
                    _OperatorRow(name: 'Budi Santoso', vehicle: 'DT-001', fatigue: 30),
                    Divider(color: Colors.white12, height: 16),
                    _OperatorRow(name: 'Andi Wijaya', vehicle: 'DT-002', fatigue: 80),
                    Divider(color: Colors.white12, height: 16),
                    _OperatorRow(name: 'Sari Dewi', vehicle: 'EX-001', fatigue: 20),
                    Divider(color: Colors.white12, height: 16),
                    _OperatorRow(name: 'Reza Firmansyah', vehicle: 'DT-003', fatigue: 60),
                  ],
                ),
              ),

              const SizedBox(height: 20),

              // Quick actions
              const _SectionLabel(label: 'Akses Cepat'),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: _QuickAction(
                      icon: Icons.map,
                      label: 'Live Map',
                      color: Colors.blue,
                      onTap: () => widget.onSwitchTab?.call(1),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _QuickAction(
                      icon: Icons.warning_amber,
                      label: 'Alerts',
                      color: Colors.red,
                      onTap: () => widget.onSwitchTab?.call(2),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _QuickAction(
                      icon: Icons.qr_code_scanner,
                      label: 'Scan QR',
                      color: Colors.amber,
                      onTap: () => widget.onSwitchTab?.call(3),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _QuickAction(
                      icon: Icons.smart_toy,
                      label: 'AI Chat',
                      color: Colors.green,
                      onTap: () => widget.onSwitchTab?.call(4),
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 20),

              // Shift info
              const _SectionLabel(label: 'Info Shift'),
              const SizedBox(height: 10),
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: const Color(0xFF1A1A2E),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.white12),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.access_time, color: Colors.white38, size: 20),
                    const SizedBox(width: 12),
                    const Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Shift Pagi',
                            style: TextStyle(
                                color: Colors.white, fontWeight: FontWeight.bold)),
                        Text('06:00 - 14:00 WITA',
                            style: TextStyle(color: Colors.white54, fontSize: 12)),
                      ],
                    ),
                    const Spacer(),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.green.withOpacity(0.15),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: Colors.green.withOpacity(0.4)),
                      ),
                      child: const Text('Berlangsung',
                          style: TextStyle(
                              color: Colors.green,
                              fontSize: 11,
                              fontWeight: FontWeight.bold)),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }
}

class _SectionLabel extends StatelessWidget {
  final String label;
  const _SectionLabel({required this.label});

  @override
  Widget build(BuildContext context) {
    return Text(label,
        style: const TextStyle(
            color: Colors.white70,
            fontSize: 13,
            fontWeight: FontWeight.bold,
            letterSpacing: 0.5));
  }
}

class _StatCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final String subtitle;
  final Color color;
  const _StatCard({
    required this.icon,
    required this.label,
    required this.value,
    required this.subtitle,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFF1A1A2E),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Icon(icon, color: color, size: 18),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(value,
                  style: TextStyle(
                      color: color, fontSize: 22, fontWeight: FontWeight.bold)),
              Text(label,
                  style: const TextStyle(color: Colors.white, fontSize: 12)),
              Text(subtitle,
                  style: const TextStyle(color: Colors.white38, fontSize: 10)),
            ],
          ),
        ],
      ),
    );
  }
}

class _OperatorRow extends StatelessWidget {
  final String name;
  final String vehicle;
  final int fatigue;
  const _OperatorRow({
    required this.name,
    required this.vehicle,
    required this.fatigue,
  });

  Color get _fatigueColor {
    if (fatigue > 70) return Colors.red;
    if (fatigue > 50) return Colors.orange;
    return Colors.green;
  }

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        CircleAvatar(
          backgroundColor: _fatigueColor.withOpacity(0.2),
          radius: 16,
          child: Text(name[0],
              style: TextStyle(
                  color: _fatigueColor, fontWeight: FontWeight.bold)),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(name,
                  style: const TextStyle(color: Colors.white, fontSize: 13)),
              Text(vehicle,
                  style: const TextStyle(color: Colors.white38, fontSize: 11)),
            ],
          ),
        ),
        SizedBox(
          width: 80,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text('Fatigue $fatigue%',
                  style: TextStyle(
                      color: _fatigueColor,
                      fontSize: 10,
                      fontWeight: FontWeight.bold)),
              const SizedBox(height: 3),
              ClipRRect(
                borderRadius: BorderRadius.circular(4),
                child: LinearProgressIndicator(
                  value: fatigue / 100,
                  backgroundColor: Colors.white12,
                  color: _fatigueColor,
                  minHeight: 5,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _QuickAction extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;
  const _QuickAction({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(
          color: color.withOpacity(0.1),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: color.withOpacity(0.3)),
        ),
        child: Column(
          children: [
            Icon(icon, color: color, size: 24),
            const SizedBox(height: 6),
            Text(label,
                textAlign: TextAlign.center,
                style: TextStyle(
                    color: color, fontSize: 10, fontWeight: FontWeight.bold)),
          ],
        ),
      ),
    );
  }
}