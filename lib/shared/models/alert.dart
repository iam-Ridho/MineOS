class Alert {
  final int id;
  final String alertType;
  final String severity;
  final String message;
  final String? vehicleId;
  final String? zone;
  final bool acknowledged;
  final String? acknowledgedBy;
  final String? acknowledgedAt;
  final String? createdAt;

  const Alert({
    required this.id,
    required this.alertType,
    required this.severity,
    required this.message,
    this.vehicleId,
    this.zone,
    required this.acknowledged,
    this.acknowledgedBy,
    this.acknowledgedAt,
    this.createdAt,
  });

  factory Alert.fromJson(Map<String, dynamic> json) => Alert(
        id: json['id'],
        alertType: json['alert_type'] ?? '',
        severity: json['severity'] ?? 'low',
        message: json['message'] ?? '',
        vehicleId: json['vehicle_id'],
        zone: json['zone'],
        acknowledged: json['acknowledged'] ?? false,
        acknowledgedBy: json['acknowledged_by'],
        acknowledgedAt: json['acknowledged_at'],
        createdAt: json['created_at'],
      );
}