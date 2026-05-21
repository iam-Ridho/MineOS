class Alert {
  final String id;
  final String vehicleId;
  final String vehicleName;
  final String message;
  final String severity; // 'red', 'yellow', 'green'
  final String category; // 'fatigue', 'fuel', 'speed', 'maintenance'
  final DateTime createdAt;
  final bool isAcknowledged;

  const Alert({
    required this.id,
    required this.vehicleId,
    required this.vehicleName,
    required this.message,
    required this.severity,
    required this.category,
    required this.createdAt,
    required this.isAcknowledged,
  });

  Alert copyWith({bool? isAcknowledged}) => Alert(
        id: id,
        vehicleId: vehicleId,
        vehicleName: vehicleName,
        message: message,
        severity: severity,
        category: category,
        createdAt: createdAt,
        isAcknowledged: isAcknowledged ?? this.isAcknowledged,
      );

  factory Alert.fromJson(Map<String, dynamic> json) => Alert(
        id: json['id'],
        vehicleId: json['vehicle_id'],
        vehicleName: json['vehicle_name'],
        message: json['message'],
        severity: json['severity'],
        category: json['category'],
        createdAt: DateTime.parse(json['created_at']),
        isAcknowledged: json['is_acknowledged'] ?? false,
      );
}