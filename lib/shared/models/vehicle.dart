class Vehicle {
  final int id;
  final String vehicleId;
  final double latitude;
  final double longitude;
  final double? speedKmh;
  final double? headingDeg;
  final double? fuelPct;
  final double? loadWeightTon;
  final String? zone;
  final String? operatorName;
  final String? timestamp;

  const Vehicle({
    required this.id,
    required this.vehicleId,
    required this.latitude,
    required this.longitude,
    this.speedKmh,
    this.headingDeg,
    this.fuelPct,
    this.loadWeightTon,
    this.zone,
    this.operatorName,
    this.timestamp,
  });

  factory Vehicle.fromJson(Map<String, dynamic> json) => Vehicle(
        id: json['id'],
        vehicleId: json['vehicle_id'],
        latitude: (json['latitude'] as num).toDouble(),
        longitude: (json['longitude'] as num).toDouble(),
        speedKmh: json['speed_kmh'] != null
            ? (json['speed_kmh'] as num).toDouble()
            : null,
        headingDeg: json['heading_deg'] != null
            ? (json['heading_deg'] as num).toDouble()
            : null,
        fuelPct: json['fuel_pct'] != null
            ? (json['fuel_pct'] as num).toDouble()
            : null,
        loadWeightTon: json['load_weight_ton'] != null
            ? (json['load_weight_ton'] as num).toDouble()
            : null,
        zone: json['zone'],
        operatorName: json['operator_name'],
        timestamp: json['timestamp'],
      );
}