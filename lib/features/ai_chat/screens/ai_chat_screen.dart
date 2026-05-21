import 'dart:math';
import 'package:flutter/material.dart';

class AIChatScreen extends StatefulWidget {
  const AIChatScreen({super.key});

  @override
  State<AIChatScreen> createState() => _AIChatScreenState();
}

class _AIChatScreenState extends State<AIChatScreen> {
  final TextEditingController _controller = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  bool _isLoading = false;

  final List<Map<String, dynamic>> _messages = [
    {
      'role': 'assistant',
      'text': 'Halo! Saya MineOS AI Assistant. Saya bisa membantu analisa kondisi operasional tambang, laporan kendaraan, dan rekomendasi keselamatan. Ada yang bisa saya bantu?',
      'time': DateTime.now(),
    }
  ];

  // Simulasi respons AI berdasarkan keyword
  final Map<String, List<String>> _aiResponses = {
    'fatigue': [
      'Berdasarkan data terkini, operator Andi Wijaya (DT-002) memiliki fatigue score 80% — sudah melewati batas aman 70%. Rekomendasi: segera rotasi operator atau berikan waktu istirahat minimal 30 menit.',
      'Tingkat kelelahan operator di Pit B cukup mengkhawatirkan. Ada 2 operator yang mendekati batas kritis. Saran: terapkan jadwal shift lebih ketat dan aktifkan monitoring real-time.',
    ],
    'bbm': [
      'DT-003 memiliki level BBM 20% — kritis! Segera arahkan ke fuel station terdekat di koordinat -1.940, 116.330. Estimasi jarak: 2.1 km.',
      'Status BBM armada saat ini: DT-001 (75% ✅), DT-002 (45% ⚠️), DT-003 (20% 🔴), EX-001 (90% ✅). Prioritaskan pengisian DT-003 segera.',
    ],
    'laporan': [
      'Laporan Operasional Hari Ini:\n\n📊 Total kendaraan aktif: 4\n✅ Beroperasi normal: 2\n⚠️ Perlu perhatian: 1\n🔴 Status kritis: 1\n\nProduksi estimasi: 1.240 ton\nEfisiensi operasional: 78%',
      'Ringkasan shift pagi (06:00-14:00):\n• DT-001: 8 ritase, 320 ton\n• DT-002: 6 ritase, 240 ton (terhambat fatigue)\n• DT-003: 5 ritase, 200 ton (BBM kritis)\n• EX-001: Loading normal di Pit A',
    ],
    'cuaca': [
      'Kondisi cuaca area Kideco saat ini: Cerah berawan, suhu 31°C, kelembaban 78%. Tidak ada peringatan hujan lebat dalam 6 jam ke depan. Kondisi aman untuk operasional.',
    ],
    'rekomendasi': [
      'Rekomendasi prioritas hari ini:\n\n1. 🔴 Segera isi BBM DT-003\n2. 🔴 Rotasi operator Andi Wijaya (DT-002)\n3. ⚠️ Jadwalkan servis DT-002 minggu ini\n4. ✅ Pertahankan performa EX-001 di Pit A',
    ],
  };

  String _generateResponse(String input) {
    final lower = input.toLowerCase();
    for (final key in _aiResponses.keys) {
      if (lower.contains(key)) {
        final responses = _aiResponses[key]!;
        return responses[Random().nextInt(responses.length)];
      }
    }
    // Default responses
    final defaults = [
      'Berdasarkan data sensor terkini, semua sistem berjalan dalam parameter normal. Ada aspek spesifik yang ingin Anda analisa?',
      'Saya memantau 4 kendaraan aktif di area tambang. Untuk informasi detail, coba tanyakan tentang "fatigue", "BBM", "laporan", atau "rekomendasi".',
      'Analisa AI sedang memproses data real-time dari seluruh sensor kendaraan. Apakah ada alert spesifik yang perlu ditindaklanjuti?',
    ];
    return defaults[Random().nextInt(defaults.length)];
  }

  void _sendMessage() async {
    final text = _controller.text.trim();
    if (text.isEmpty) return;

    setState(() {
      _messages.add({
        'role': 'user',
        'text': text,
        'time': DateTime.now(),
      });
      _isLoading = true;
    });

    _controller.clear();
    _scrollToBottom();

    // Simulasi delay AI thinking
    await Future.delayed(Duration(milliseconds: 800 + Random().nextInt(700)));

    setState(() {
      _messages.add({
        'role': 'assistant',
        'text': _generateResponse(text),
        'time': DateTime.now(),
      });
      _isLoading = false;
    });

    _scrollToBottom();
  }

  void _scrollToBottom() {
    Future.delayed(const Duration(milliseconds: 100), () {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  String _formatTime(DateTime time) {
    return '${time.hour.toString().padLeft(2, '0')}:${time.minute.toString().padLeft(2, '0')}';
  }

  @override
  void dispose() {
    _controller.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0D1117),
      appBar: AppBar(
        backgroundColor: const Color(0xFF1A237E),
        title: Row(
          children: [
            CircleAvatar(
              backgroundColor: Colors.green.withOpacity(0.2),
              radius: 16,
              child: const Icon(Icons.smart_toy, color: Colors.green, size: 18),
            ),
            const SizedBox(width: 10),
            const Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('MineOS AI',
                    style: TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                        fontSize: 15)),
                Text('Online • Memantau 4 kendaraan',
                    style: TextStyle(color: Colors.white54, fontSize: 11)),
              ],
            ),
          ],
        ),
      ),
      body: Column(
        children: [
          // Quick action chips
          Container(
            color: const Color(0xFF1A1A2E),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  'Laporan hari ini',
                  'Status BBM',
                  'Fatigue operator',
                  'Rekomendasi',
                  'Cuaca',
                ].map((label) => Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: ActionChip(
                    label: Text(label,
                        style: const TextStyle(
                            color: Colors.white70, fontSize: 11)),
                    backgroundColor: const Color(0xFF0D1117),
                    side: const BorderSide(color: Colors.white24),
                    onPressed: () {
                      _controller.text = label;
                      _sendMessage();
                    },
                  ),
                )).toList(),
              ),
            ),
          ),
          // Chat messages
          Expanded(
            child: ListView.builder(
              controller: _scrollController,
              padding: const EdgeInsets.all(12),
              itemCount: _messages.length + (_isLoading ? 1 : 0),
              itemBuilder: (context, index) {
                if (index == _messages.length && _isLoading) {
                  return _TypingIndicator();
                }
                final msg = _messages[index];
                final isUser = msg['role'] == 'user';
                return _ChatBubble(
                  text: msg['text'],
                  isUser: isUser,
                  time: _formatTime(msg['time']),
                );
              },
            ),
          ),
          // Input area
          Container(
            padding: const EdgeInsets.fromLTRB(12, 8, 12, 16),
            color: const Color(0xFF1A1A2E),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _controller,
                    style: const TextStyle(color: Colors.white, fontSize: 14),
                    decoration: InputDecoration(
                      hintText: 'Tanya tentang kondisi tambang...',
                      hintStyle: const TextStyle(
                          color: Colors.white38, fontSize: 13),
                      filled: true,
                      fillColor: const Color(0xFF0D1117),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(24),
                        borderSide: BorderSide.none,
                      ),
                      contentPadding: const EdgeInsets.symmetric(
                          horizontal: 16, vertical: 10),
                    ),
                    onSubmitted: (_) => _sendMessage(),
                    textInputAction: TextInputAction.send,
                  ),
                ),
                const SizedBox(width: 8),
                GestureDetector(
                  onTap: _sendMessage,
                  child: Container(
                    width: 44,
                    height: 44,
                    decoration: const BoxDecoration(
                      color: Color(0xFF1A237E),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.send, color: Colors.white, size: 20),
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

class _ChatBubble extends StatelessWidget {
  final String text;
  final bool isUser;
  final String time;
  const _ChatBubble(
      {required this.text, required this.isUser, required this.time});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        mainAxisAlignment:
            isUser ? MainAxisAlignment.end : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          if (!isUser) ...[
            CircleAvatar(
              backgroundColor: const Color(0xFF1A237E),
              radius: 14,
              child: const Icon(Icons.smart_toy, color: Colors.white, size: 14),
            ),
            const SizedBox(width: 8),
          ],
          Flexible(
            child: Column(
              crossAxisAlignment: isUser
                  ? CrossAxisAlignment.end
                  : CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 14, vertical: 10),
                  decoration: BoxDecoration(
                    color: isUser
                        ? const Color(0xFF1A237E)
                        : const Color(0xFF1A1A2E),
                    borderRadius: BorderRadius.only(
                      topLeft: const Radius.circular(16),
                      topRight: const Radius.circular(16),
                      bottomLeft: Radius.circular(isUser ? 16 : 4),
                      bottomRight: Radius.circular(isUser ? 4 : 16),
                    ),
                    border: isUser
                        ? null
                        : Border.all(color: Colors.white12),
                  ),
                  child: Text(text,
                      style: const TextStyle(
                          color: Colors.white, fontSize: 13, height: 1.4)),
                ),
                const SizedBox(height: 4),
                Text(time,
                    style: const TextStyle(
                        color: Colors.white38, fontSize: 10)),
              ],
            ),
          ),
          if (isUser) const SizedBox(width: 8),
        ],
      ),
    );
  }
}

class _TypingIndicator extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          CircleAvatar(
            backgroundColor: const Color(0xFF1A237E),
            radius: 14,
            child: const Icon(Icons.smart_toy, color: Colors.white, size: 14),
          ),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            decoration: BoxDecoration(
              color: const Color(0xFF1A1A2E),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.white12),
            ),
            child: const Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                _Dot(delay: 0),
                SizedBox(width: 4),
                _Dot(delay: 200),
                SizedBox(width: 4),
                _Dot(delay: 400),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _Dot extends StatefulWidget {
  final int delay;
  const _Dot({required this.delay});

  @override
  State<_Dot> createState() => _DotState();
}

class _DotState extends State<_Dot> with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;
  late Animation<double> _anim;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
    );
    Future.delayed(Duration(milliseconds: widget.delay), () {
      if (mounted) _ctrl.repeat(reverse: true);
    });
    _anim = Tween(begin: 0.3, end: 1.0).animate(_ctrl);
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: _anim,
      child: Container(
        width: 6,
        height: 6,
        decoration: const BoxDecoration(
          color: Colors.white54,
          shape: BoxShape.circle,
        ),
      ),
    );
  }
}