import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'dart:math' as math;
import 'dart:ui';

class LoginScreen extends StatefulWidget {
  final VoidCallback onLoginSuccess;

  const LoginScreen({
    super.key,
    required this.onLoginSuccess,
  });

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen>
    with TickerProviderStateMixin {
  final _emailController = TextEditingController();
  final _passController = TextEditingController();
  bool _obscurePass = true;
  bool _isLoading = false;
  String? _errorMsg;

  late AnimationController _bgController;
  late AnimationController _formController;
  late AnimationController _glowController;

  late Animation<double> _formOpacity;
  late Animation<Offset> _formSlide;
  late Animation<double> _logoScale;
  late Animation<double> _logoGlow;

  final _accounts = {
    'supervisor@kideco.com': '123456',
    'admin@kideco.com': 'admin123',
    'demo': 'demo',
  };

  static const Color _kDeepNavy = Color(0xFF050D18);
  static const Color _kNavy = Color(0xFF0A1628);
  static const Color _kNavyLight = Color(0xFF1E293B);
  static const Color _kNavySoft = Color(0xFF1E3A5F);
  static const Color _kAccent = Color(0xFF0284C7);
  static const Color _kTextSecondary = Color(0xFFB0C4DE);
  static const Color _kTextMuted = Color(0xFF64748B);
  static const Color _kDanger = Color(0xFFDC2626);

  @override
  void initState() {
    super.initState();

    _bgController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 10),
    )..repeat();

    _glowController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2000),
    )..repeat(reverse: true);

    _formController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1000),
    );

    _formOpacity = Tween<double>(begin: 0, end: 1).animate(
      CurvedAnimation(parent: _formController, curve: Curves.easeOut),
    );

    _formSlide = Tween<Offset>(
      begin: const Offset(0, 0.15),
      end: Offset.zero,
    ).animate(
      CurvedAnimation(parent: _formController, curve: Curves.easeOutQuart),
    );

    _logoScale = Tween<double>(begin: 0.8, end: 1.0).animate(
      CurvedAnimation(
        parent: _formController,
        curve: const Interval(0.0, 0.6, curve: Curves.easeOutBack),
      ),
    );

    _logoGlow = Tween<double>(begin: 0.3, end: 0.7).animate(
      CurvedAnimation(parent: _glowController, curve: Curves.easeInOut),
    );

    Future.delayed(const Duration(milliseconds: 100), () {
      _formController.forward();
    });
  }

  @override
  void dispose() {
    _bgController.dispose();
    _formController.dispose();
    _glowController.dispose();
    _emailController.dispose();
    _passController.dispose();
    super.dispose();
  }

  void _login() async {
    HapticFeedback.mediumImpact();
    final email = _emailController.text.trim();
    final pass = _passController.text.trim();

    if (email.isEmpty || pass.isEmpty) {
      HapticFeedback.heavyImpact();
      setState(() => _errorMsg = 'Email dan password tidak boleh kosong');
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMsg = null;
    });

    await Future.delayed(const Duration(milliseconds: 1800));

    if (_accounts[email] == pass) {
      HapticFeedback.lightImpact();
      widget.onLoginSuccess();
    } else {
      HapticFeedback.heavyImpact();
      setState(() {
        _isLoading = false;
        _errorMsg = 'Email atau password salah';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _kDeepNavy,
      body: Stack(
        children: [
          AnimatedBuilder(
            animation: _bgController,
            builder: (_, __) => CustomPaint(
              painter: _PremiumBgPainter(_bgController.value),
              size: Size.infinite,
            ),
          ),
          Container(
            decoration: BoxDecoration(
              gradient: RadialGradient(
                center: const Alignment(0, -0.2),
                radius: 0.8,
                colors: [
                  Colors.transparent,
                  _kDeepNavy.withOpacity(0.7),
                ],
              ),
            ),
          ),
          SafeArea(
            child: SingleChildScrollView(
              physics: const BouncingScrollPhysics(),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 28),
                child: FadeTransition(
                  opacity: _formOpacity,
                  child: SlideTransition(
                    position: _formSlide,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const SizedBox(height: 48),
                        Center(
                          child: AnimatedBuilder(
                            animation: _logoScale,
                            builder: (context, child) {
                              return Transform.scale(
                                scale: _logoScale.value,
                                child: child,
                              );
                            },
                            child: _buildLogo(),
                          ),
                        ),
                        const SizedBox(height: 40),
                        _buildGlassForm(),
                        const SizedBox(height: 20),
                        _buildDemoHint(),
                        const SizedBox(height: 32),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLogo() {
    return Column(
      children: [
        AnimatedBuilder(
          animation: _logoGlow,
          builder: (context, child) {
            return Container(
              width: 88,
              height: 88,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [_kNavy, _kNavySoft],
                ),
                borderRadius: BorderRadius.circular(24),
                border: Border.all(
                  color: _kAccent.withOpacity(0.2 + (_logoGlow.value * 0.3)),
                  width: 1.5,
                ),
                boxShadow: [
                  BoxShadow(
                    color: _kAccent.withOpacity(0.1 + (_logoGlow.value * 0.2)),
                    blurRadius: 30 + (_logoGlow.value * 20),
                    spreadRadius: 4,
                  ),
                  BoxShadow(
                    color: _kNavy.withOpacity(0.5),
                    blurRadius: 20,
                    offset: const Offset(0, 8),
                  ),
                ],
              ),
              child: Center(
                child: Text(
                  'M',
                  style: GoogleFonts.inter(
                    color: Colors.white,
                    fontSize: 40,
                    fontWeight: FontWeight.w900,
                    letterSpacing: -2,
                  ),
                ),
              ),
            );
          },
        ),
        const SizedBox(height: 20),
        Text(
          'MineOS',
          style: GoogleFonts.inter(
            color: Colors.white,
            fontSize: 28,
            fontWeight: FontWeight.w800,
            letterSpacing: 6,
          ),
        ),
        const SizedBox(height: 6),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 5),
          decoration: BoxDecoration(
            color: _kAccent.withOpacity(0.1),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: _kAccent.withOpacity(0.2)),
          ),
          child: Text(
            'PT KIDECO JAYA AGUNG',
            style: GoogleFonts.inter(
              color: _kAccent.withOpacity(0.8),
              fontSize: 10,
              fontWeight: FontWeight.w700,
              letterSpacing: 2,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildGlassForm() {
    return ClipRRect(
      borderRadius: BorderRadius.circular(24),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
        child: Container(
          padding: const EdgeInsets.all(28),
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.03),
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: Colors.white.withOpacity(0.08)),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.2),
                blurRadius: 40,
                offset: const Offset(0, 20),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Selamat Datang',
                style: GoogleFonts.inter(
                  color: Colors.white,
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                  letterSpacing: -0.3,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                'Masuk untuk akses Command Center',
                style: GoogleFonts.inter(
                  color: _kTextSecondary.withOpacity(0.7),
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(height: 28),
              _buildLabel('Email'),
              const SizedBox(height: 8),
              _buildTextField(
                controller: _emailController,
                hint: 'supervisor@kideco.com',
                icon: Icons.alternate_email_rounded,
                keyboardType: TextInputType.emailAddress,
              ),
              const SizedBox(height: 18),
              _buildLabel('Password'),
              const SizedBox(height: 8),
              _buildTextField(
                controller: _passController,
                hint: '••••••••',
                icon: Icons.lock_outline_rounded,
                isPassword: true,
                onSubmit: (_) => _login(),
              ),
              if (_errorMsg != null) ...[
                const SizedBox(height: 14),
                _buildErrorBanner(),
              ],
              const SizedBox(height: 28),
              _buildLoginButton(),
              const SizedBox(height: 16),
              Center(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.03),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.white.withOpacity(0.08)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Icons.fingerprint_rounded,
                        color: _kTextSecondary.withOpacity(0.5),
                        size: 18,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'Biometric Login',
                        style: GoogleFonts.inter(
                          color: _kTextSecondary.withOpacity(0.5),
                          fontSize: 12,
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
      ),
    );
  }

  Widget _buildLabel(String text) {
    return Text(
      text,
      style: GoogleFonts.inter(
        color: _kTextSecondary,
        fontSize: 12,
        fontWeight: FontWeight.w600,
        letterSpacing: 0.5,
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String hint,
    required IconData icon,
    bool isPassword = false,
    TextInputType keyboardType = TextInputType.text,
    Function(String)? onSubmit,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.05),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.white.withOpacity(0.1)),
      ),
      child: TextField(
        controller: controller,
        obscureText: isPassword ? _obscurePass : false,
        style: GoogleFonts.inter(
          color: Colors.white,
          fontSize: 14,
          fontWeight: FontWeight.w500,
        ),
        keyboardType: keyboardType,
        onSubmitted: onSubmit,
        decoration: InputDecoration(
          hintText: hint,
          hintStyle: GoogleFonts.inter(
            color: _kTextMuted.withOpacity(0.5),
            fontSize: 14,
          ),
          prefixIcon: Icon(
            icon,
            color: _kTextMuted.withOpacity(0.6),
            size: 20,
          ),
          suffixIcon: isPassword
              ? GestureDetector(
                  onTap: () {
                    HapticFeedback.selectionClick();
                    setState(() => _obscurePass = !_obscurePass);
                  },
                  child: AnimatedSwitcher(
                    duration: const Duration(milliseconds: 200),
                    child: Icon(
                      _obscurePass
                          ? Icons.visibility_outlined
                          : Icons.visibility_off_outlined,
                      key: ValueKey(_obscurePass),
                      color: _kTextMuted.withOpacity(0.5),
                      size: 20,
                    ),
                  ),
                )
              : null,
          border: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(
            horizontal: 16,
            vertical: 16,
          ),
        ),
      ),
    );
  }

  Widget _buildErrorBanner() {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: _kDanger.withOpacity(0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: _kDanger.withOpacity(0.2)),
      ),
      child: Row(
        children: [
          Container(
            width: 28,
            height: 28,
            decoration: BoxDecoration(
              color: _kDanger.withOpacity(0.15),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(
              Icons.error_outline_rounded,
              color: _kDanger,
              size: 16,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              _errorMsg!,
              style: GoogleFonts.inter(
                color: _kDanger.withOpacity(0.9),
                fontSize: 12,
                fontWeight: FontWeight.w500,
                height: 1.4,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLoginButton() {
    return GestureDetector(
      onTap: _isLoading ? null : _login,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        width: double.infinity,
        height: 54,
        decoration: BoxDecoration(
          gradient: _isLoading
              ? null
              : const LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [_kNavySoft, _kAccent],
                ),
          color: _isLoading ? Colors.white.withOpacity(0.05) : null,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: _isLoading
                ? Colors.white.withOpacity(0.1)
                : _kAccent.withOpacity(0.3),
          ),
          boxShadow: _isLoading
              ? null
              : [
                  BoxShadow(
                    color: _kAccent.withOpacity(0.25),
                    blurRadius: 20,
                    offset: const Offset(0, 8),
                    spreadRadius: -4,
                  ),
                ],
        ),
        child: Center(
          child: _isLoading
              ? SizedBox(
                  width: 24,
                  height: 24,
                  child: CircularProgressIndicator(
                    color: _kAccent,
                    strokeWidth: 2.5,
                  ),
                )
              : Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      'Masuk ke Command Center',
                      style: GoogleFonts.inter(
                        color: Colors.white,
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.3,
                      ),
                    ),
                    const SizedBox(width: 10),
                    const Icon(
                      Icons.arrow_forward_rounded,
                      color: Colors.white,
                      size: 20,
                    ),
                  ],
                ),
        ),
      ),
    );
  }

  Widget _buildDemoHint() {
    return Center(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.03),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.white.withOpacity(0.06)),
        ),
        child: Column(
          children: [
            Text(
              'Akun Demo',
              style: GoogleFonts.inter(
                color: _kTextMuted,
                fontSize: 10,
                fontWeight: FontWeight.w700,
                letterSpacing: 1.5,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              'supervisor@kideco.com / 123456',
              style: GoogleFonts.inter(
                color: _kTextMuted.withOpacity(0.6),
                fontSize: 11,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Background Painter ─────────────────────────────────────
class _PremiumBgPainter extends CustomPainter {
  final double progress;
  _PremiumBgPainter(this.progress);

  @override
  void paint(Canvas canvas, Size size) {
    canvas.drawRect(
      Rect.fromLTWH(0, 0, size.width, size.height),
      Paint()..color = const Color(0xFF050D18),
    );

    final paint = Paint()..style = PaintingStyle.fill;

    final orbs = [
      _Orb(0.15, 0.2, 250, const Color(0xFF0A1628), 0),
      _Orb(0.85, 0.15, 200, const Color(0xFF1E3A5F), 0.2),
      _Orb(0.1, 0.75, 280, const Color(0xFF0D2137), 0.4),
      _Orb(0.9, 0.8, 180, const Color(0xFF0284C7), 0.6),
      _Orb(0.5, 0.5, 300, const Color(0xFF0A1628), 0.8),
    ];

    for (final orb in orbs) {
      final animProgress = (progress + orb.phase) % 1.0;
      final dy = math.sin(animProgress * 2 * math.pi) * 30;
      final dx = math.cos(animProgress * 2 * math.pi) * 15;

      paint.color = orb.color.withOpacity(0.08);
      paint.maskFilter = const MaskFilter.blur(BlurStyle.normal, 80);
      canvas.drawCircle(
        Offset(size.width * orb.x + dx, size.height * orb.y + dy),
        orb.radius,
        paint,
      );

      paint.color = orb.color.withOpacity(0.15);
      paint.maskFilter = const MaskFilter.blur(BlurStyle.normal, 40);
      canvas.drawCircle(
        Offset(size.width * orb.x + dx, size.height * orb.y + dy),
        orb.radius * 0.5,
        paint,
      );
    }

    final gridPaint = Paint()
      ..color = const Color(0xFF1E3A5F).withOpacity(0.03)
      ..strokeWidth = 1;

    final gridSpacing = 60.0;
    for (double x = 0; x < size.width; x += gridSpacing) {
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), gridPaint);
    }
    for (double y = 0; y < size.height; y += gridSpacing) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), gridPaint);
    }
  }

  @override
  bool shouldRepaint(_PremiumBgPainter old) => old.progress != progress;
}

class _Orb {
  final double x, y, radius, phase;
  final Color color;
  const _Orb(this.x, this.y, this.radius, this.color, this.phase);
}