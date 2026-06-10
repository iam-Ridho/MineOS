class ApiConfig {
  static const String baseUrl = 'http://10.10.14.40:8000';
  
  // Endpoints
  static const String activeAlerts = '$baseUrl/api/alerts/active';
  static const String acknowledgeAlert = '$baseUrl/api/alerts/acknowledged';
  static const String scenario = '$baseUrl/api/scenario';
  static const String llmReport = '$baseUrl/api/llm/report';
}