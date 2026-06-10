import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:http/http.dart' as http;

class AIChatScreen extends StatefulWidget {
  const AIChatScreen({super.key});

  @override
  State<AIChatScreen> createState() => _AIChatScreenState();
}

class _AIChatScreenState extends State<AIChatScreen>
    with TickerProviderStateMixin {
  final _controller = TextEditingController();
  final _scrollController = ScrollController();
  final List<Map<String, String>> _messages = [];
  bool _isLoading = false;
  late AnimationController _pulseController;
  late AnimationController _typingController;

  // Ganti dengan IP backend Ridho
  static const String _baseUrl = 'http://IP:10.10.14.40:8000';

  final List<String> _quickPrompts = [
    '🚛 Kondisi armada sekarang?',
    '⚠️ Alert aktif apa saja?',
    '😴 Siapa operator yang perlu rotasi?',
    '⛽ Kendaraan BBM kritis?',
    '📊 Ringkasan operasional hari ini',
  ];

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1000),
    )..repeat(reverse: true);

    _typingController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
    )..repeat(reverse: true);

    // Greeting awal
    _messages.add({
      'role': 'assistant',
      'content':
          'Selamat datang di MineOS AI Assistant.\n\nSaya siap membantu memantau kondisi operasional tambang. Tanyakan kondisi armada, alert safety, atau status operator.',
    });
  }

  @override
  void dispose() {
    _pulseController.dispose();
    _typingController.dispose();
    _controller.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _sendMessage(String text) async {
    if (text.trim().isEmpty) return;
    _controller.clear();

    setState(() {
      _messages.add({'role': 'user', 'content': text});
      _isLoading = true;
    });
    _scrollToBottom();

    try {
      // Build history dari messages sebelumnya (exclude greeting)
      final history = _messages
          .where((m) => _messages.indexOf(m) > 0)
          .take(_messages.length - 2)
          .map((m) => {'role': m['role']!, 'content': m['content']!})
          .toList();

      final response = await http
          .post(
            Uri.parse('$_baseUrl/api/chat'),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({'message': text, 'history': history}),
          )
          .timeout(const Duration(seconds: 30));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        setState(() {
          _messages.add({
            'role': 'assistant',
            'content': data['answer'] ?? 'Tidak ada respons.',
            'context': data['context_scenario'] ?? '',
            'model': data['model_used'] ?? '',
          });
          _isLoading = false;
        });
      } else {
        _addErrorMessage('Server error: ${response.statusCode}');
      }
    } catch (e) {
      _addErrorMessage('Koneksi gagal. Cek jaringan.');
    }
    _scrollToBottom();
  }

  void _addErrorMessage(String msg) {
    setState(() {
      _messages.add({'role': 'assistant', 'content': '⚠️ $msg', 'error': 'true'});
      _isLoading = false;
    });
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF031427),
      body: SafeArea(
        child: Column(
          children: [
            _buildHeader(),
            _buildNeuralStatus(),
            Expanded(child: _buildChatList()),
            if (_messages.length <= 1) _buildQuickPrompts(),
            _buildInputBar(),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
      decoration: const BoxDecoration(
        color: Color(0xFF031427),
        border: Border(bottom: BorderSide(color: Color(0xFF1E2D45))),
      ),
      child: Row(
        children: [
          Text('MineOS',
              style: GoogleFonts.inter(
                  color: Colors.white,
                  fontSize: 20,
                  fontWeight: FontWeight.bold)),
          const SizedBox(width: 8),
          Text('AI Assistant',
              style: GoogleFonts.inter(
                  color: const Color(0xFF3B82F6),
                  fontSize: 20,
                  fontWeight: FontWeight.w300)),
          const Spacer(),
          if (_messages.length > 1)
            GestureDetector(
              onTap: () {
                setState(() {
                  _messages.clear();
                  _messages.add({
                    'role': 'assistant',
                    'content': 'Sesi chat direset. Ada yang bisa saya bantu?',
                  });
                });
              },
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFF1E2D45),
                  borderRadius: BorderRadius.circular(4),
                  border: Border.all(color: const Color(0xFF2D3F55)),
                ),
                child: Text('RESET',
                    style: GoogleFonts.inter(
                        color: const Color(0xFF8892A4),
                        fontSize: 9,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 1)),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildNeuralStatus() {
    return Container(
      margin: const EdgeInsets.all(12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFF0B1C30),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
            color: const Color(0xFF10B981).withOpacity(0.3)),
      ),
      child: Row(
        children: [
          AnimatedBuilder(
            animation: _pulseController,
            builder: (_, __) => Container(
              width: 8,
              height: 8,
              decoration: BoxDecoration(
                color: Color.lerp(
                  const Color(0xFF10B981),
                  Colors.transparent,
                  _pulseController.value,
                ),
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF10B981).withOpacity(0.4),
                    blurRadius: 6,
                    spreadRadius: 1,
                  )
                ],
              ),
            ),
          ),
          const SizedBox(width: 8),
          Text('NEURAL ENGINE ACTIVE',
              style: GoogleFonts.sourceCodePro(
                  color: const Color(0xFF10B981),
                  fontSize: 9,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 1)),
          const Spacer(),
          Text('gemini-3.5-flash',
              style: GoogleFonts.sourceCodePro(
                  color: const Color(0xFF8892A4), fontSize: 9)),
          const SizedBox(width: 8),
          Container(
            padding:
                const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
            decoration: BoxDecoration(
              color: const Color(0xFFFBBF24).withOpacity(0.1),
              borderRadius: BorderRadius.circular(3),
              border: Border.all(
                  color: const Color(0xFFFBBF24).withOpacity(0.4)),
            ),
            child: Text('READY',
                style: GoogleFonts.sourceCodePro(
                    color: const Color(0xFFFBBF24),
                    fontSize: 8,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 1)),
          ),
        ],
      ),
    );
  }

  Widget _buildChatList() {
    return ListView.builder(
      controller: _scrollController,
      padding: const EdgeInsets.fromLTRB(12, 0, 12, 8),
      itemCount: _messages.length + (_isLoading ? 1 : 0),
      itemBuilder: (context, index) {
        if (index == _messages.length) {
          return _buildTypingIndicator();
        }
        final msg = _messages[index];
        return msg['role'] == 'user'
            ? _buildUserBubble(msg['content']!)
            : _buildAssistantBubble(msg);
      },
    );
  }

  Widget _buildUserBubble(String content) {
    return Align(
      alignment: Alignment.centerRight,
      child: Container(
        margin: const EdgeInsets.only(bottom: 8, left: 48),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: const Color(0xFF3B82F6).withOpacity(0.2),
          borderRadius: const BorderRadius.only(
            topLeft: Radius.circular(12),
            topRight: Radius.circular(4),
            bottomLeft: Radius.circular(12),
            bottomRight: Radius.circular(12),
          ),
          border: Border.all(
              color: const Color(0xFF3B82F6).withOpacity(0.4)),
        ),
        child: Text(content,
            style: GoogleFonts.inter(
                color: Colors.white, fontSize: 13, height: 1.4)),
      ),
    );
  }

  Widget _buildAssistantBubble(Map<String, String> msg) {
    final isError = msg['error'] == 'true';
    final context = msg['context'];

    return Align(
      alignment: Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 8, right: 48),
        decoration: BoxDecoration(
          color: const Color(0xFF0B1C30),
          borderRadius: const BorderRadius.only(
            topLeft: Radius.circular(4),
            topRight: Radius.circular(12),
            bottomLeft: Radius.circular(12),
            bottomRight: Radius.circular(12),
          ),
          border: Border.all(
            color: isError
                ? const Color(0xFFF87171).withOpacity(0.4)
                : const Color(0xFF1E2D45),
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Agent label
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 8, 12, 4),
              child: Row(
                children: [
                  Container(
                    width: 18,
                    height: 18,
                    decoration: BoxDecoration(
                      color: const Color(0xFF10B981).withOpacity(0.15),
                      borderRadius: BorderRadius.circular(4),
                      border: Border.all(
                          color: const Color(0xFF10B981).withOpacity(0.4)),
                    ),
                    child: const Icon(Icons.auto_awesome,
                        color: Color(0xFF10B981), size: 10),
                  ),
                  const SizedBox(width: 6),
                  Text('MINEOS AI',
                      style: GoogleFonts.sourceCodePro(
                          color: const Color(0xFF10B981),
                          fontSize: 8,
                          fontWeight: FontWeight.bold,
                          letterSpacing: 1)),
                  if (context != null && context.isNotEmpty) ...[
                    const SizedBox(width: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 5, vertical: 1),
                      decoration: BoxDecoration(
                        color: const Color(0xFF1E2D45),
                        borderRadius: BorderRadius.circular(3),
                      ),
                      child: Text(context.toUpperCase(),
                          style: GoogleFonts.sourceCodePro(
                              color: const Color(0xFF8892A4),
                              fontSize: 7,
                              letterSpacing: 0.5)),
                    ),
                  ],
                ],
              ),
            ),
            // Content
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 0, 12, 10),
              child: Text(msg['content']!,
                  style: GoogleFonts.inter(
                      color: isError
                          ? const Color(0xFFF87171)
                          : Colors.white,
                      fontSize: 13,
                      height: 1.5)),
            ),
            // Copy button
            GestureDetector(
              onTap: () {
                Clipboard.setData(
                    ClipboardData(text: msg['content']!));
                ScaffoldMessenger.of(this.context).showSnackBar(
                  SnackBar(
                    content: Text('Disalin!',
                        style: GoogleFonts.inter(fontSize: 12)),
                    backgroundColor: const Color(0xFF0B1C30),
                    duration: const Duration(seconds: 1),
                  ),
                );
              },
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: const BoxDecoration(
                  border: Border(
                      top: BorderSide(color: Color(0xFF1E2D45))),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.copy,
                        color: Color(0xFF8892A4), size: 11),
                    const SizedBox(width: 4),
                    Text('Salin',
                        style: GoogleFonts.inter(
                            color: const Color(0xFF8892A4), fontSize: 10)),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTypingIndicator() {
    return Align(
      alignment: Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 8, right: 48),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: const Color(0xFF0B1C30),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFF1E2D45)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.auto_awesome,
                color: Color(0xFF10B981), size: 12),
            const SizedBox(width: 8),
            Text('AI sedang memproses...',
                style: GoogleFonts.sourceCodePro(
                    color: const Color(0xFF8892A4),
                    fontSize: 10,
                    letterSpacing: 0.5)),
            const SizedBox(width: 8),
            AnimatedBuilder(
              animation: _typingController,
              builder: (_, __) => Row(
                children: List.generate(
                    3,
                    (i) => Container(
                          margin: const EdgeInsets.symmetric(horizontal: 1),
                          width: 4,
                          height: 4,
                          decoration: BoxDecoration(
                            color: Color.lerp(
                              const Color(0xFF10B981),
                              Colors.transparent,
                              ((_typingController.value + i * 0.3) % 1.0),
                            ),
                            shape: BoxShape.circle,
                          ),
                        )),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildQuickPrompts() {
    return Container(
      padding: const EdgeInsets.fromLTRB(12, 0, 12, 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('QUICK QUERY',
              style: GoogleFonts.sourceCodePro(
                  color: const Color(0xFF8892A4),
                  fontSize: 8,
                  letterSpacing: 1)),
          const SizedBox(height: 6),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: _quickPrompts
                .map((p) => GestureDetector(
                      onTap: () => _sendMessage(p),
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 10, vertical: 6),
                        decoration: BoxDecoration(
                          color: const Color(0xFF0B1C30),
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(
                              color: const Color(0xFF3B82F6)
                                  .withOpacity(0.3)),
                        ),
                        child: Text(p,
                            style: GoogleFonts.inter(
                                color: const Color(0xFF8892A4),
                                fontSize: 11)),
                      ),
                    ))
                .toList(),
          ),
        ],
      ),
    );
  }

  Widget _buildInputBar() {
    return Container(
      padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
      decoration: const BoxDecoration(
        color: Color(0xFF0B1C30),
        border: Border(top: BorderSide(color: Color(0xFF1E2D45))),
      ),
      child: Row(
        children: [
          Expanded(
            child: Container(
              decoration: BoxDecoration(
                color: const Color(0xFF031427),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0xFF1E2D45)),
              ),
              child: TextField(
                controller: _controller,
                style: GoogleFonts.inter(
                    color: Colors.white, fontSize: 13),
                maxLines: null,
                decoration: InputDecoration(
                  hintText: 'Tanya kondisi tambang...',
                  hintStyle: GoogleFonts.inter(
                      color: const Color(0xFF8892A4), fontSize: 13),
                  border: InputBorder.none,
                  contentPadding: const EdgeInsets.symmetric(
                      horizontal: 14, vertical: 10),
                ),
                onSubmitted: _sendMessage,
              ),
            ),
          ),
          const SizedBox(width: 8),
          GestureDetector(
            onTap: _isLoading
                ? null
                : () => _sendMessage(_controller.text),
            child: Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: _isLoading
                    ? const Color(0xFF1E2D45)
                    : const Color(0xFF3B82F6).withOpacity(0.8),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                  color: _isLoading
                      ? const Color(0xFF2D3F55)
                      : const Color(0xFF3B82F6),
                ),
              ),
              child: Icon(
                _isLoading ? Icons.hourglass_empty : Icons.send,
                color: _isLoading
                    ? const Color(0xFF8892A4)
                    : Colors.white,
                size: 18,
              ),
            ),
          ),
        ],
      ),
    );
  }
}