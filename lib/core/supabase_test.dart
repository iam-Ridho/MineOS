import 'package:supabase_flutter/supabase_flutter.dart';

Future<void> testSupabaseConnection() async {
  try {
    final supabase = Supabase.instance.client;
    
    // Coba ambil list tabel yang ada
    final response = await supabase
        .from('vehicles')  // coba tabel vehicles dulu
        .select()
        .limit(1);
    
    print('✅ Supabase terhubung! Data: $response');
  } catch (e) {
    print('❌ Error koneksi: $e');
  }
}