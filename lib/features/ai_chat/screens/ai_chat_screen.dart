import 'dart:async';
import 'dart:convert';
import 'dart:ui';
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
  bool _isTyping = false;
  
  late AnimationController _pulseController;
  late AnimationController _typingController;
  late AnimationController _headerAnimation;
  late AnimationController _sendButtonAnimation;
  
  // ── Kideco Premium Design System ─────────────────────────
  static const Color _kBackground = Color(0xFFF8FAFC);
  static const Color _kSurface = Color(0xFFFFFFFF);
  static const Color _kElevated = Color(0xFFF1F5F9);
  static const Color _kNavy = Color(0xFF0A1628);
  static const Color _kNavyDeep = Color(0xFF050D18);
  static const Color _kNavySoft = Color(0xFF1E3A5F);
  static const Color _kTextPrimary = Color(0xFF0F172A);
  static const Color _kTextSecondary = Color(0xFF475569);
  static const Color _kTextMuted = Color(0xFF64748B);
  static const Color _kTextTertiary = Color(0xFF94A3B8);
  static const Color _kBorder = Color(0xFFE2E8F0);
  static const Color _kBorderLight = Color(0xFFF1F5F9);
  static const Color _kSuccess = Color(0xFF059669);
  static const Color _kWarning = Color(0xFFD97706);
  static const Color _kDanger = Color(0xFFDC2626);
  static const Color _kInfo = Color(0xFF0284C7);
  static const Color _kAccent = Color(0xFFCC0000);
  
  // Glassmorphism colors
  static const Color _kGlassBg = Color(0x80FFFFFF);
  static const Color _kGlassBorder = Color(0x40E2E8F0);

  static const String _baseUrl = 'http://10.10.14.40:8000';

  final List<Map<String, dynamic>> _quickPrompts = [
    {'icon': Icons.local_shipping_outlined, 'text': 'Kondisi armada', 'color': _kInfo},
    {'icon': Icons.warning_amber_rounded, 'text': 'Alert aktif', 'color': _kWarning},
    {'icon': Icons.bedtime_outlined, 'text': 'Rotasi operator', 'color': _kSuccess},
    {'icon': Icons.local_gas_station_outlined, 'text': 'BBM kritis', 'color': _kDanger},
    {'icon': Icons.analytics_outlined, 'text': 'Ringkasan hari ini', 'color': _kNavySoft},
  ];

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2000),
    )..repeat(reverse: true);

    _typingController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    )..repeat();

    _headerAnimation = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    )..forward();

    _sendButtonAnimation = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 300),
    );

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
    _headerAnimation.dispose();
    _sendButtonAnimation.dispose();
    _controller.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _sendMessage(String text) async {
    if (text.trim().isEmpty) return;
    _controller.clear();
    HapticFeedback.mediumImpact();

    setState(() {
      _messages.add({'role': 'user', 'content': text});
      _isLoading = true;
      _isTyping = true;
    });
    _scrollToBottom();

    try {
      List<Map<String, String>> history = [];
      for (int i = 1; i < _messages.length - 1; i++) {
        history.add({
          'role': _messages[i]['role']!,
          'content': _messages[i]['content']!,
        });
      }

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
            'model': data['model_used'] ?? 'AI',
          });
          _isLoading = false;
          _isTyping = false;
        });
      } else {
        _addErrorMessage('Server error: ${response.statusCode}', detail: response.body);
      }
    } on TimeoutException {
      _addErrorMessage('Waktu respons habis.', detail: 'Server terlalu lama merespons.');
    } on FormatException {
      _addErrorMessage('Format data tidak valid.', detail: 'Respons server tidak bisa diproses.');
    } catch (e) {
      _addErrorMessage('Koneksi gagal.', detail: 'Pastikan HP dan laptop di WiFi yang sama.');
    }
    _scrollToBottom();
  }

  void _addErrorMessage(String msg, {String? detail}) {
    setState(() {
      _messages.add({
        'role': 'assistant',
        'content': msg,
        'error': 'true',
        'detail': detail ?? '',
      });
      _isLoading = false;
      _isTyping = false;
    });
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 500),
          curve: Curves.easeOutQuart,
        );
      }
    });
  }

  void _showCopiedSnack() {
    HapticFeedback.lightImpact();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.check_circle_rounded, color: Colors.white, size: 18),
                const SizedBox(width: 10),
                Text(
                  'Disalin ke clipboard',
                  style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w500),
                ),
              ],
            ),
            backgroundColor: _kNavy,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            margin: const EdgeInsets.all(16),
            duration: const Duration(seconds: 2),
          ),
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _kBackground,
      body: SafeArea(
        child: Column(
          children: [
            _buildGlassHeader(),
            Expanded(child: _buildMessageList()),
            if (_isTyping) _buildTypingIndicator(),
            _buildQuickPrompts(),
            _buildPremiumInputBar(),
          ],
        ),
      ),
    );
  }

  // ── Glassmorphism Header ─────────────────────────────────
  Widget _buildGlassHeader() {
    return ClipRRect(
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
        child: Container(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 16),
          decoration: BoxDecoration(
            color: _kGlassBg,
            border: Border(
              bottom: BorderSide(color: _kGlassBorder),
            ),
          ),
          child: Row(
            children: [
              // Animated Logo
              AnimatedBuilder(
                animation: _headerAnimation,
                builder: (_, __) {
                  return Transform.scale(
                    scale: 0.8 + (0.2 * _headerAnimation.value),
                    child: Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                          colors: [_kNavy, _kNavySoft],
                        ),
                        borderRadius: BorderRadius.circular(14),
                        boxShadow: [
                          BoxShadow(
                            color: _kNavy.withOpacity(0.25),
                            blurRadius: 12,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: const Center(
                        child: Icon(
                          Icons.auto_awesome,
                          color: Colors.white,
                          size: 20,
                        ),
                      ),
                    ),
                  );
                },
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'MineOS AI',
                      style: GoogleFonts.inter(
                        color: _kTextPrimary,
                        fontSize: 17,
                        fontWeight: FontWeight.w800,
                        letterSpacing: -0.3,
                      ),
                    ),
                    const SizedBox(height: 1),
                    Row(
                      children: [
                        _buildLiveDot(),
                        const SizedBox(width: 6),
                        Text(
                          'Neural Engine Active',
                          style: GoogleFonts.inter(
                            color: _kTextMuted,
                            fontSize: 11,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              if (_messages.length > 1)
                _buildIconButton(
                  icon: Icons.refresh_rounded,
                  onTap: () {
                    HapticFeedback.lightImpact();
                    setState(() {
                      _messages.clear();
                      _messages.add({
                        'role': 'assistant',
                        'content': 'Sesi direset. Ada yang bisa saya bantu?',
                      });
                    });
                  },
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildLiveDot() {
    return AnimatedBuilder(
      animation: _pulseController,
      builder: (_, __) {
        return Container(
          width: 7,
          height: 7,
          decoration: BoxDecoration(
            color: Color.lerp(
              _kSuccess,
              _kSuccess.withOpacity(0.3),
              _pulseController.value,
            ),
            shape: BoxShape.circle,
            boxShadow: [
              BoxShadow(
                color: _kSuccess.withOpacity(0.3 * _pulseController.value),
                blurRadius: 6,
                spreadRadius: 1,
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildIconButton({required IconData icon, required VoidCallback onTap}) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 36,
        height: 36,
        decoration: BoxDecoration(
          color: _kElevated,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: _kBorder),
        ),
        child: Icon(icon, color: _kTextSecondary, size: 18),
      ),
    );
  }

  // ── Message List with Animations ─────────────────────────
  Widget _buildMessageList() {
    return ListView.builder(
      controller: _scrollController,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
      itemCount: _messages.length,
      itemBuilder: (context, index) {
        final msg = _messages[index];
        final isUser = msg['role'] == 'user';
        
        return TweenAnimationBuilder<double>(
          tween: Tween(begin: 0, end: 1),
          duration: const Duration(milliseconds: 400),
          curve: Curves.easeOutQuart,
          builder: (context, value, child) {
            return Transform.translate(
              offset: Offset(0, 20 * (1 - value)),
              child: Opacity(
                opacity: value,
                child: child,
              ),
            );
          },
          child: isUser
              ? _buildUserBubble(msg['content']!)
              : _buildAIBubble(msg),
        );
      },
    );
  }

  // ── User Bubble (Premium) ────────────────────────────────
  Widget _buildUserBubble(String content) {
    return Align(
      alignment: Alignment.centerRight,
      child: Container(
        margin: const EdgeInsets.only(bottom: 16, left: 60),
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFF0A1628), Color(0xFF1E3A5F)],
          ),
          borderRadius: const BorderRadius.only(
            topLeft: Radius.circular(20),
            topRight: Radius.circular(6),
            bottomLeft: Radius.circular(20),
            bottomRight: Radius.circular(20),
          ),
          boxShadow: [
            BoxShadow(
              color: _kNavy.withOpacity(0.15),
              blurRadius: 16,
              offset: const Offset(0, 6),
              spreadRadius: -4,
            ),
          ],
        ),
        child: Text(
          content,
          style: GoogleFonts.inter(
            color: Colors.white,
            fontSize: 14,
            height: 1.6,
            fontWeight: FontWeight.w500,
          ),
        ),
      ),
    );
  }

  // ── AI Bubble (Premium with Glass Effect) ────────────────
  Widget _buildAIBubble(Map<String, String> msg) {
    final isError = msg['error'] == 'true';
    final detail = msg['detail'];

    return Align(
      alignment: Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 16, right: 60),
        decoration: BoxDecoration(
          color: _kSurface,
          borderRadius: const BorderRadius.only(
            topLeft: Radius.circular(6),
            topRight: Radius.circular(20),
            bottomLeft: Radius.circular(20),
            bottomRight: Radius.circular(20),
          ),
          border: Border.all(
            color: isError ? _kDanger.withOpacity(0.3) : _kBorder,
            width: isError ? 1.5 : 1,
          ),
          boxShadow: [
            BoxShadow(
              color: (isError ? _kDanger : _kNavy).withOpacity(0.06),
              blurRadius: 20,
              offset: const Offset(0, 8),
              spreadRadius: -4,
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // AI Header
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 14, 16, 10),
              child: Row(
                children: [
                  Container(
                    width: 28,
                    height: 28,
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [_kNavy, _kNavySoft],
                      ),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Icon(
                      Icons.auto_awesome,
                      color: Colors.white,
                      size: 13,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Text(
                    'MineOS AI',
                    style: GoogleFonts.inter(
                      color: _kTextSecondary,
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.5,
                    ),
                  ),
                  const Spacer(),
                  if (!isError)
                    GestureDetector(
                      onTap: () {
                        Clipboard.setData(ClipboardData(text: msg['content']!));
                        _showCopiedSnack();
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                        decoration: BoxDecoration(
                          color: _kElevated,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: _kBorder),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.copy_rounded, size: 11, color: _kTextMuted),
                            const SizedBox(width: 5),
                            Text(
                              'Salin',
                              style: GoogleFonts.inter(
                                color: _kTextMuted,
                                fontSize: 10,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                ],
              ),
            ),
            // Content
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 14),
              child: Text(
                msg['content']!,
                style: GoogleFonts.inter(
                  color: isError ? _kDanger : _kTextPrimary,
                  fontSize: 14,
                  height: 1.7,
                  fontWeight: FontWeight.w400,
                ),
              ),
            ),
            // Error Detail
            if (isError && detail != null && detail.isNotEmpty)
              Container(
                margin: const EdgeInsets.fromLTRB(16, 0, 16, 14),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: _kDanger.withOpacity(0.05),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: _kDanger.withOpacity(0.15)),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(Icons.info_outline, size: 14, color: _kDanger.withOpacity(0.7)),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        detail,
                        style: GoogleFonts.inter(
                          color: _kDanger.withOpacity(0.8),
                          fontSize: 11,
                          height: 1.5,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }

  // ── Typing Indicator (Premium) ───────────────────────────
  Widget _buildTypingIndicator() {
    return Align(
      alignment: Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 16, right: 60, left: 16),
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
        decoration: BoxDecoration(
          color: _kSurface,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: _kBorder),
          boxShadow: [
            BoxShadow(
              color: _kNavy.withOpacity(0.04),
              blurRadius: 16,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 28,
              height: 28,
              decoration: BoxDecoration(
                gradient: const LinearGradient(colors: [_kNavy, _kNavySoft]),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.auto_awesome, color: Colors.white, size: 13),
            ),
            const SizedBox(width: 12),
            Text(
              'AI sedang berpikir',
              style: GoogleFonts.inter(
                color: _kTextMuted,
                fontSize: 13,
                fontWeight: FontWeight.w500,
              ),
            ),
            const SizedBox(width: 12),
            _buildTypingDots(),
          ],
        ),
      ),
    );
  }

  Widget _buildTypingDots() {
    return AnimatedBuilder(
      animation: _typingController,
      builder: (_, __) {
        return Row(
          children: List.generate(3, (i) {
            final delay = i * 0.33;
            final value = ((_typingController.value + delay) % 1.0);
            return Container(
              margin: const EdgeInsets.symmetric(horizontal: 2),
              width: 6,
              height: 6,
              decoration: BoxDecoration(
                color: Color.lerp(
                  _kTextTertiary,
                  _kNavy.withOpacity(0.6),
                  value < 0.5 ? value * 2 : (1 - value) * 2,
                ),
                shape: BoxShape.circle,
              ),
            );
          }),
        );
      },
    );
  }

  // ── Quick Prompts (Premium Chips) ────────────────────────
  Widget _buildQuickPrompts() {
    if (_messages.length > 1) return const SizedBox.shrink();
    
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(left: 4, bottom: 12),
            child: Text(
              'Quick Actions',
              style: GoogleFonts.inter(
                color: _kTextTertiary,
                fontSize: 10,
                fontWeight: FontWeight.w700,
                letterSpacing: 1.5,
              ),
            ),
          ),
          SizedBox(
            height: 42,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: _quickPrompts.length,
              separatorBuilder: (_, __) => const SizedBox(width: 8),
              itemBuilder: (context, index) {
                final prompt = _quickPrompts[index];
                return _buildPromptChip(prompt);
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPromptChip(Map<String, dynamic> prompt) {
    return GestureDetector(
      onTap: () {
        HapticFeedback.lightImpact();
        _sendMessage(prompt['text'] as String);
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(
          color: _kSurface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: _kBorder),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.02),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              prompt['icon'] as IconData,
              size: 16,
              color: prompt['color'] as Color,
            ),
            const SizedBox(width: 8),
            Text(
              prompt['text'] as String,
              style: GoogleFonts.inter(
                color: _kTextSecondary,
                fontSize: 12,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ── Premium Input Bar ────────────────────────────────────
  Widget _buildPremiumInputBar() {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
      decoration: BoxDecoration(
        color: _kSurface,
        border: Border(
          top: BorderSide(color: _kBorderLight),
        ),
        boxShadow: [
          BoxShadow(
            color: _kNavy.withOpacity(0.04),
            blurRadius: 24,
            offset: const Offset(0, -8),
            spreadRadius: -4,
          ),
        ],
      ),
      child: SafeArea(
        child: Row(
          children: [
            Expanded(
              child: Container(
                decoration: BoxDecoration(
                  color: _kBackground,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: _kBorder),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _controller,
                        style: GoogleFonts.inter(
                          color: _kTextPrimary,
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                        ),
                        maxLines: null,
                        decoration: InputDecoration(
                          hintText: 'Tanya tentang operasional tambang...',
                          hintStyle: GoogleFonts.inter(
                            color: _kTextTertiary,
                            fontSize: 14,
                          ),
                          border: InputBorder.none,
                          contentPadding: const EdgeInsets.symmetric(
                            horizontal: 18,
                            vertical: 14,
                          ),
                        ),
                        onSubmitted: _sendMessage,
                        textInputAction: TextInputAction.send,
                      ),
                    ),
                    if (_controller.text.isNotEmpty)
                      GestureDetector(
                        onTap: () => _controller.clear(),
                        child: Padding(
                          padding: const EdgeInsets.only(right: 8),
                          child: Icon(Icons.close_rounded, size: 18, color: _kTextTertiary),
                        ),
                      ),
                  ],
                ),
              ),
            ),
            const SizedBox(width: 10),
            GestureDetector(
              onTap: _isLoading ? null : () => _sendMessage(_controller.text),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                width: 50,
                height: 50,
                decoration: BoxDecoration(
                  gradient: _isLoading
                      ? null
                      : const LinearGradient(
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                          colors: [_kNavy, _kNavySoft],
                        ),
                  color: _isLoading ? _kBorder : null,
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: _isLoading
                      ? null
                      : [
                          BoxShadow(
                            color: _kNavy.withOpacity(0.3),
                            blurRadius: 12,
                            offset: const Offset(0, 4),
                          ),
                        ],
                ),
                child: _isLoading
                    ? Center(
                        child: SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2.5,
                            valueColor: AlwaysStoppedAnimation<Color>(_kTextTertiary),
                          ),
                        ),
                      )
                    : const Icon(
                        Icons.arrow_upward_rounded,
                        color: Colors.white,
                        size: 22,
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}