import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

class VehicleDetailScreen extends StatelessWidget {
  final String vehicleId;

  const VehicleDetailScreen({super.key, required this.vehicleId});

  static final Map<String, Map<String, dynamic>> _vehicleData = {
    'DT-001': {
      'name': 'Dump Truck 001',
      'id': 'DT-001',
      'operator': 'Budi Santoso',
      'status': 'active',
      'fuel': 75,
      'fatigue': 30,
      'zone': 'Pit A',
      'speed': 35,
      'engine_temp': 82,
      'hours': 1240,
      'last_service': '10 Mei 2026',
      'lat': -1.9200,
      'lng': 116.3100,
    },
    'DT-002': {
      'name': 'Dump Truck 002',
      'id': 'DT-002',
      'operator': 'Andi Wijaya',
      'status': 'warning',
      'fuel': 45,
      'fatigue': 80,
      'zone': 'Pit B',
      'speed': 28,
      'engine_temp': 95,
      'hours': 2100,
      'last_service': '2 April 2026',
      'lat': -1.9350,
      'lng': 116.3250,
    },
    'EX-001': {
      'name': 'Excavator 001',
      'id': 'EX-001',
      'operator': 'Sari Dewi',
      'status': 'active',
      'fuel': 90,
      'fatigue': 20,
      'zone': 'Pit A',
      'speed': 0,
      'engine_temp': 78,
      'hours': 890,
      'last_service': '15 Mei 2026',
      'lat': -1.9150,
      'lng': 116.3050,
    },
    'DT-003': {
      'name': 'Dump Truck 003',
      'id': 'DT-003',
      'operator': 'Reza Firmansyah',
      'status': 'idle',
      'fuel': 20,
      'fatigue': 60,
      'zone': 'Pit C',
      'speed': 0,
      'engine_temp': 70,
      'hours': 3200,
      'last_service': '20 Maret 2026',
      'lat': -1.9450,
      'lng': 116.3350,
    },
  };

  @override
  Widget build(BuildContext context) {
    final vehicle = _vehicleData[vehicleId];

    if (vehicle == null) {
      return Scaffold(
        backgroundColor: const Color(0xFF0D1117),
        appBar: AppBar(
          backgroundColor: const Color(0xFF1A237E),
          leading: IconButton(
            icon: const Icon(Icons.arrow_back, color: Colors.white),
            onPressed: () => Navigator.pop(context),
          ),
          title: const Text('Detail Kendaraan',
              style: TextStyle(color: Colors.white)),
        ),
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.search_off, color: Colors.white38, size: 64),
              const SizedBox(height: 16),
              Text('Kendaraan "$vehicleId" tidak ditemukan',
                  style: const TextStyle(color: Colors.white54)),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: const Color(0xFF0D1117),
      appBar: AppBar(
        backgroundColor: const Color(0xFF1A237E),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(vehicle['name'],
            style: const TextStyle(
                color: Colors.white, fontWeight: FontWeight.bold)),
        actions: [
          _StatusBadge(status: vehicle['status']),
          const SizedBox(width: 12),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _HeaderCard(vehicle: vehicle),
            const SizedBox(height: 16),
            const _SectionTitle(title: 'Kondisi Kendaraan'),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: _GaugeCard(
                    label: 'BBM',
                    value: vehicle['fuel'] / 100,
                    text: '${vehicle['fuel']}%',
                    color: vehicle['fuel'] < 30 ? Colors.red : Colors.blue,
                    icon: Icons.local_gas_station,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _GaugeCard(
                    label: 'Fatigue',
                    value: vehicle['fatigue'] / 100,
                    text: '${vehicle['fatigue']}%',
                    color: vehicle['fatigue'] > 70 ? Colors.red : Colors.green,
                    icon: Icons.psychology,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: _StatCard(
                    label: 'Kecepatan',
                    value: '${vehicle['speed']} km/h',
                    icon: Icons.speed,
                    color: vehicle['speed'] > 40 ? Colors.red : Colors.cyan,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _StatCard(
                    label: 'Suhu Mesin',
                    value: '${vehicle['engine_temp']}°C',
                    icon: Icons.thermostat,
                    color: vehicle['engine_temp'] > 90
                        ? Colors.red
                        : Colors.orange,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            const _SectionTitle(title: 'Informasi Operator'),
            const SizedBox(height: 10),
            _InfoCard(
              children: [
                _InfoRow(
                    icon: Icons.person,
                    label: 'Nama',
                    value: vehicle['operator']),
                _InfoRow(
                    icon: Icons.location_on,
                    label: 'Zona',
                    value: vehicle['zone']),
                _InfoRow(
                    icon: Icons.timer,
                    label: 'Jam Operasi',
                    value: '${vehicle['hours']} jam'),
                _InfoRow(
                    icon: Icons.build,
                    label: 'Servis Terakhir',
                    value: vehicle['last_service']),
              ],
            ),
            const SizedBox(height: 16),
            const _SectionTitle(title: 'Lokasi GPS'),
            const SizedBox(height: 10),
            _InfoCard(
              children: [
                _InfoRow(
                    icon: Icons.gps_fixed,
                    label: 'Latitude',
                    value: vehicle['lat'].toStringAsFixed(4)),
                _InfoRow(
                    icon: Icons.gps_fixed,
                    label: 'Longitude',
                    value: vehicle['lng'].toStringAsFixed(4)),
              ],
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }
}

// ─── QR Scanner Screen ───────────────────────────────────────────────────────

class QRScannerScreen extends StatefulWidget {
  const QRScannerScreen({super.key});

  @override
  State<QRScannerScreen> createState() => _QRScannerScreenState();
}

class _QRScannerScreenState extends State<QRScannerScreen> {
  bool _scanned = false;

  void _onDetect(BarcodeCapture capture) {
    if (_scanned) return;
    final barcode = capture.barcodes.firstOrNull;
    if (barcode?.rawValue != null) {
      _scanned = true;
      final vehicleId = barcode!.rawValue!;
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => VehicleDetailScreen(vehicleId: vehicleId),
        ),
      ).then((_) => setState(() => _scanned = false));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: const Color(0xFF1A237E),
        title: const Text('Scan QR Kendaraan',
            style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
      ),
      body: Stack(
        children: [
          MobileScanner(onDetect: _onDetect),
          Center(
            child: Container(
              width: 250,
              height: 250,
              decoration: BoxDecoration(
                border: Border.all(color: Colors.amber, width: 3),
                borderRadius: BorderRadius.circular(16),
              ),
            ),
          ),
          Positioned(
            bottom: 60,
            left: 0,
            right: 0,
            child: Column(
              children: [
                const Icon(Icons.qr_code_scanner,
                    color: Colors.white70, size: 32),
                const SizedBox(height: 8),
                Container(
                  margin: const EdgeInsets.symmetric(horizontal: 40),
                  padding: const EdgeInsets.symmetric(
                      horizontal: 16, vertical: 8),
                  decoration: BoxDecoration(
                    color: Colors.black54,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: const Text(
                    'Arahkan kamera ke QR Code kendaraan',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: Colors.white70, fontSize: 13),
                  ),
                ),
                const SizedBox(height: 16),
                const Text('— Atau pilih kendaraan —',
                    style: TextStyle(color: Colors.white38, fontSize: 11)),
                const SizedBox(height: 8),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: ['DT-001', 'DT-002', 'EX-001', 'DT-003']
                      .map((id) => Padding(
                            padding:
                                const EdgeInsets.symmetric(horizontal: 4),
                            child: OutlinedButton(
                              style: OutlinedButton.styleFrom(
                                side: const BorderSide(color: Colors.amber),
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 10, vertical: 4),
                                minimumSize: Size.zero,
                                tapTargetSize:
                                    MaterialTapTargetSize.shrinkWrap,
                              ),
                              onPressed: () => Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (_) =>
                                      VehicleDetailScreen(vehicleId: id),
                                ),
                              ),
                              child: Text(id,
                                  style: const TextStyle(
                                      color: Colors.amber, fontSize: 11)),
                            ),
                          ))
                      .toList(),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Widget Helpers ───────────────────────────────────────────────────────────

class _HeaderCard extends StatelessWidget {
  final Map<String, dynamic> vehicle;
  const _HeaderCard({required this.vehicle});

  Color get _color => vehicle['status'] == 'active'
      ? Colors.green
      : vehicle['status'] == 'warning'
          ? Colors.red
          : Colors.orange;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF1A1A2E),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: _color.withOpacity(0.3)),
      ),
      child: Row(
        children: [
          CircleAvatar(
            backgroundColor: _color.withOpacity(0.2),
            radius: 30,
            child: Icon(
              vehicle['id'].startsWith('EX')
                  ? Icons.construction
                  : Icons.local_shipping,
              color: _color,
              size: 30,
            ),
          ),
          const SizedBox(width: 16),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(vehicle['name'],
                  style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 18)),
              Text('ID: ${vehicle['id']}',
                  style: const TextStyle(color: Colors.white54, fontSize: 13)),
              Text('Zona: ${vehicle['zone']}',
                  style: const TextStyle(color: Colors.white54, fontSize: 13)),
            ],
          ),
        ],
      ),
    );
  }
}

class _GaugeCard extends StatelessWidget {
  final String label;
  final double value;
  final String text;
  final Color color;
  final IconData icon;
  const _GaugeCard(
      {required this.label,
      required this.value,
      required this.text,
      required this.color,
      required this.icon});

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
        children: [
          Row(
            children: [
              Icon(icon, color: color, size: 16),
              const SizedBox(width: 6),
              Text(label,
                  style: const TextStyle(color: Colors.white54, fontSize: 12)),
              const Spacer(),
              Text(text,
                  style: TextStyle(
                      color: color,
                      fontWeight: FontWeight.bold,
                      fontSize: 14)),
            ],
          ),
          const SizedBox(height: 8),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: value,
              backgroundColor: Colors.white12,
              color: color,
              minHeight: 8,
            ),
          ),
        ],
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color color;
  const _StatCard(
      {required this.label,
      required this.value,
      required this.icon,
      required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFF1A1A2E),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white12),
      ),
      child: Row(
        children: [
          Icon(icon, color: color, size: 24),
          const SizedBox(width: 10),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label,
                  style: const TextStyle(color: Colors.white54, fontSize: 11)),
              Text(value,
                  style: TextStyle(
                      color: color,
                      fontWeight: FontWeight.bold,
                      fontSize: 16)),
            ],
          ),
        ],
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  final String title;
  const _SectionTitle({required this.title});

  @override
  Widget build(BuildContext context) {
    return Text(title,
        style: const TextStyle(
            color: Colors.white70,
            fontSize: 13,
            fontWeight: FontWeight.bold,
            letterSpacing: 0.5));
  }
}

class _InfoCard extends StatelessWidget {
  final List<Widget> children;
  const _InfoCard({required this.children});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFF1A1A2E),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white12),
      ),
      child: Column(
        children: children
            .expand((w) =>
                [w, const Divider(color: Colors.white12, height: 16)])
            .toList()
          ..removeLast(),
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  const _InfoRow(
      {required this.icon, required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, color: Colors.white38, size: 16),
        const SizedBox(width: 8),
        Text('$label: ',
            style: const TextStyle(color: Colors.white38, fontSize: 13)),
        Expanded(
          child: Text(value,
              style: const TextStyle(
                  color: Colors.white,
                  fontSize: 13,
                  fontWeight: FontWeight.w500),
              textAlign: TextAlign.right),
        ),
      ],
    );
  }
}

class _StatusBadge extends StatelessWidget {
  final String status;
  const _StatusBadge({required this.status});

  @override
  Widget build(BuildContext context) {
    Color color = status == 'active'
        ? Colors.green
        : status == 'warning'
            ? Colors.red
            : Colors.orange;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.2),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color),
      ),
      child: Text(status.toUpperCase(),
          style: TextStyle(
              color: color, fontSize: 11, fontWeight: FontWeight.bold)),
    );
  }
}