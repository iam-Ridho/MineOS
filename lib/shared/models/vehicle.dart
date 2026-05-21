class Vehicle {
  final String id;
  final String name;
  final double latitude;
  final double longitude;
  final double fuelLevel;
  final String operatorName;
  final double fatigueScore;
  final String zone;
  final String status; // 'active', 'idle', 'warning'

  const Vehicle({
    required this.id,
    required this.name,
    required this.latitude,
    required this.longitude,
    required this.fuelLevel,
    required this.operatorName,
    required this.fatigueScore,
    required this.zone,
    required this.status,
  });

  factory Vehicle.fromJson(Map<String, dynamic> json) => Vehicle(
        id: json['id'],
        name: json['name'],
        latitude: (json['latitude'] as num).toDouble(),
        longitude: (json['longitude'] as num).toDouble(),
        fuelLevel: (json['fuel_level'] as num).toDouble(),
        operatorName: json['operator_name'],
        fatigueScore: (json['fatigue_score'] as num).toDouble(),
        zone: json['zone'],
        status: json['status'],
      );
}