import 'package:flutter/material.dart';
import 'dart:math' as math;
import '../../../main.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

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
  late Animation<double> _formOpacity;
  late Animation<Offset> _formSlide;

  final _accounts = {
    'supervisor@kideco.com': '123456',
    'admin@kideco.com': 'admin123',
    'demo': 'demo',
  };

  @override
  void initState() {
    super.initState();
    _bgController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 8),
    )..repeat();

    _formController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    );
    _formOpacity = Tween<double>(begin: 0, end: 1).animate(
      CurvedAnimation(parent: _formController, curve: Curves.easeOut),
    );
    _formSlide = Tween<Offset>(
      begin: const Offset(0, 0.2),
      end: Offset.zero,
    ).animate(
      CurvedAnimation(parent: _formController, curve: Curves.easeOut),
    );

    Future.delayed(const Duration(milliseconds: 300), () {
      _formController.forward();
    });
  }

  @override
  void dispose() {
    _bgController.dispose();
    _formController.dispose();
    _emailController.dispose();
    _passController.dispose();
    super.dispose();
  }

  void _login() async {
    final email = _emailController.text.trim();
    final pass = _passController.text.trim();

    if (email.isEmpty || pass.isEmpty) {
      setState(() => _errorMsg = 'Email dan password tidak boleh kosong');
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMsg = null;
    });

    await Future.delayed(const Duration(milliseconds: 1500));

    if (_accounts[email] == pass) {
      if (mounted) {
        Navigator.pushReplacement(
          context,
          PageRouteBuilder(
            pageBuilder: (_, __, ___) => const MainNavigation(),
            transitionsBuilder: (_, anim, __, child) =>
                FadeTransition(opacity: anim, child: child),
            transitionDuration: const Duration(milliseconds: 600),
          ),
        );
      }
    } else {
      setState(() {
        _isLoading = false;
        _errorMsg = 'Email atau password salah';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          // Animated background
          AnimatedBuilder(
            animation: _bgController,
            builder: (_, __) => CustomPaint(
              painter: _LoginBgPainter(_bgController.value),
              size: Size.infinite,
            ),
          ),

          // Gradient overlay
          Container(
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  Color(0xCC0A0E1A),
                  Color(0xFF0A0E1A),
                ],
              ),
            ),
          ),

          // Konten
          SafeArea(
            child: SingleChildScrollView(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 28),
                child: FadeTransition(
                  opacity: _formOpacity,
                  child: SlideTransition(
                    position: _formSlide,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const SizedBox(height: 60),

                        // Logo area
                        Center(
                          child: Column(
                            children: [
                              Container(
                                width: 80,
                                height: 80,
                                decoration: BoxDecoration(
                                  gradient: const LinearGradient(
                                    colors: [
                                      Color(0xFF1A237E),
                                      Color(0xFF283593),
                                    ],
                                    begin: Alignment.topLeft,
                                    end: Alignment.bottomRight,
                                  ),
                                  borderRadius: BorderRadius.circular(22),
                                  boxShadow: [
                                    BoxShadow(
                                      color: const Color(0xFF1A237E)
                                          .withOpacity(0.5),
                                      blurRadius: 24,
                                      spreadRadius: 4,
                                    ),
                                  ],
                                ),
                                child: const Icon(
                                  Icons.terrain,
                                  color: Colors.white,
                                  size: 42,
                                ),
                              ),
                              const SizedBox(height: 20),
                              const Text(
                                'MineOS',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 32,
                                  fontWeight: FontWeight.bold,
                                  letterSpacing: 3,
                                ),
                              ),
                              const SizedBox(height: 6),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 12, vertical: 4),
                                decoration: BoxDecoration(
                                  border: Border.all(
                                      color: Colors.white24),
                                  borderRadius: BorderRadius.circular(20),
                                ),
                                child: const Text(
                                  'PT KIDECO JAYA AGUNG',
                                  style: TextStyle(
                                    color: Colors.white38,
                                    fontSize: 10,
                                    letterSpacing: 2,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),

                        const SizedBox(height: 52),

                        // Form card
                        Container(
                          padding: const EdgeInsets.all(24),
                          decoration: BoxDecoration(
                            color: const Color(0xFF0D1117).withOpacity(0.8),
                            borderRadius: BorderRadius.circular(24),
                            border:
                                Border.all(color: Colors.white10),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withOpacity(0.3),
                                blurRadius: 30,
                                offset: const Offset(0, 10),
                              ),
                            ],
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'Selamat Datang',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 22,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              const SizedBox(height: 4),
                              const Text(
                                'Masuk untuk akses monitoring tambang',
                                style: TextStyle(
                                    color: Colors.white38, fontSize: 13),
                              ),
                              const SizedBox(height: 28),

                              // Email field
                              _buildLabel('Email'),
                              const SizedBox(height: 8),
                              _buildTextField(
                                controller: _emailController,
                                hint: 'supervisor@kideco.com',
                                icon: Icons.alternate_email,
                                keyboardType:
                                    TextInputType.emailAddress,
                              ),
                              const SizedBox(height: 16),

                              // Password field
                              _buildLabel('Password'),
                              const SizedBox(height: 8),
                              _buildTextField(
                                controller: _passController,
                                hint: '••••••••',
                                icon: Icons.lock_outline,
                                isPassword: true,
                                onSubmit: (_) => _login(),
                              ),

                              // Error message
                              if (_errorMsg != null) ...[
                                const SizedBox(height: 12),
                                Container(
                                  padding: const EdgeInsets.all(12),
                                  decoration: BoxDecoration(
                                    color: Colors.red.withOpacity(0.1),
                                    borderRadius:
                                        BorderRadius.circular(10),
                                    border: Border.all(
                                        color:
                                            Colors.red.withOpacity(0.3)),
                                  ),
                                  child: Row(
                                    children: [
                                      const Icon(Icons.error_outline,
                                          color: Colors.red, size: 16),
                                      const SizedBox(width: 8),
                                      Text(_errorMsg!,
                                          style: const TextStyle(
                                              color: Colors.red,
                                              fontSize: 12)),
                                    ],
                                  ),
                                ),
                              ],

                              const SizedBox(height: 24),

                              // Login button
                              SizedBox(
                                width: double.infinity,
                                height: 52,
                                child: DecoratedBox(
                                  decoration: BoxDecoration(
                                    gradient: const LinearGradient(
                                      colors: [
                                        Color(0xFF1A237E),
                                        Color(0xFF3949AB),
                                      ],
                                    ),
                                    borderRadius:
                                        BorderRadius.circular(14),
                                    boxShadow: [
                                      BoxShadow(
                                        color: const Color(0xFF1A237E)
                                            .withOpacity(0.4),
                                        blurRadius: 16,
                                        offset: const Offset(0, 6),
                                      ),
                                    ],
                                  ),
                                  child: ElevatedButton(
                                    onPressed:
                                        _isLoading ? null : _login,
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: Colors.transparent,
                                      shadowColor: Colors.transparent,
                                      shape: RoundedRectangleBorder(
                                        borderRadius:
                                            BorderRadius.circular(14),
                                      ),
                                    ),
                                    child: _isLoading
                                        ? const SizedBox(
                                            width: 22,
                                            height: 22,
                                            child:
                                                CircularProgressIndicator(
                                              color: Colors.white,
                                              strokeWidth: 2,
                                            ),
                                          )
                                        : const Row(
                                            mainAxisAlignment:
                                                MainAxisAlignment.center,
                                            children: [
                                              Text(
                                                'Masuk',
                                                style: TextStyle(
                                                  color: Colors.white,
                                                  fontSize: 16,
                                                  fontWeight:
                                                      FontWeight.bold,
                                                  letterSpacing: 1,
                                                ),
                                              ),
                                              SizedBox(width: 8),
                                              Icon(
                                                Icons.arrow_forward,
                                                color: Colors.white,
                                                size: 18,
                                              ),
                                            ],
                                          ),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),

                        const SizedBox(height: 20),

                        // Demo hint
                        Center(
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 16, vertical: 10),
                            decoration: BoxDecoration(
                              color: Colors.white.withOpacity(0.05),
                              borderRadius: BorderRadius.circular(12),
                              border:
                                  Border.all(color: Colors.white10),
                            ),
                            child: const Column(
                              children: [
                                Text(
                                  'Akun Demo',
                                  style: TextStyle(
                                    color: Colors.white54,
                                    fontSize: 11,
                                    fontWeight: FontWeight.bold,
                                    letterSpacing: 1,
                                  ),
                                ),
                                SizedBox(height: 4),
                                Text(
                                  'supervisor@kideco.com  /  123456',
                                  style: TextStyle(
                                      color: Colors.white38,
                                      fontSize: 11),
                                ),
                              ],
                            ),
                          ),
                        ),

                        const SizedBox(height: 40),
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

  Widget _buildLabel(String text) {
    return Text(
      text,
      style: const TextStyle(
        color: Colors.white60,
        fontSize: 13,
        fontWeight: FontWeight.w500,
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
        color: const Color(0xFF1A1A2E),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.white12),
      ),
      child: TextField(
        controller: controller,
        obscureText: isPassword ? _obscurePass : false,
        style: const TextStyle(color: Colors.white),
        keyboardType: keyboardType,
        onSubmitted: onSubmit,
        decoration: InputDecoration(
          hintText: hint,
          hintStyle: const TextStyle(color: Colors.white24),
          prefixIcon: Icon(icon, color: Colors.white38, size: 20),
          suffixIcon: isPassword
              ? IconButton(
                  icon: Icon(
                    _obscurePass
                        ? Icons.visibility_outlined
                        : Icons.visibility_off_outlined,
                    color: Colors.white38,
                    size: 20,
                  ),
                  onPressed: () =>
                      setState(() => _obscurePass = !_obscurePass),
                )
              : null,
          border: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(
              horizontal: 16, vertical: 16),
        ),
      ),
    );
  }
}

// Background animasi partikel
class _LoginBgPainter extends CustomPainter {
  final double progress;
  _LoginBgPainter(this.progress);

  @override
  void paint(Canvas canvas, Size size) {
    canvas.drawRect(
      Rect.fromLTWH(0, 0, size.width, size.height),
      Paint()..color = const Color(0xFF0A0E1A),
    );

    final paint = Paint()..style = PaintingStyle.fill;
    final orbs = [
      _Orb(0.2, 0.1, 200, const Color(0xFF1A237E), 0),
      _Orb(0.8, 0.3, 150, const Color(0xFF0D47A1), 0.3),
      _Orb(0.1, 0.7, 180, const Color(0xFF1565C0), 0.6),
      _Orb(0.9, 0.8, 120, const Color(0xFF283593), 0.8),
    ];

    for (final orb in orbs) {
      final animProgress = (progress + orb.phase) % 1.0;
      final dy = math.sin(animProgress * 2 * math.pi) * 20;
      paint.color = orb.color.withOpacity(0.15);
      paint.maskFilter =
          const MaskFilter.blur(BlurStyle.normal, 60);
      canvas.drawCircle(
        Offset(size.width * orb.x, size.height * orb.y + dy),
        orb.radius,
        paint,
      );
    }
  }

  @override
  bool shouldRepaint(_LoginBgPainter old) => old.progress != progress;
}

class _Orb {
  final double x, y, radius, phase;
  final Color color;
  const _Orb(this.x, this.y, this.radius, this.color, this.phase);
}