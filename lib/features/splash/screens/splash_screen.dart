import 'dart:async';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';

class SplashScreen extends StatefulWidget {
  final VoidCallback onComplete;
  const SplashScreen({super.key, required this.onComplete});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen>
    with TickerProviderStateMixin {
  late AnimationController _mainController;
  late AnimationController _pulseController;
  late AnimationController _particleController;
  
  late Animation<double> _logoScale;
  late Animation<double> _logoOpacity;
  late Animation<double> _textSlide;
  late Animation<double> _textOpacity;
  late Animation<double> _lineWidth;
  late Animation<double> _glowOpacity;
  late Animation<double> _fadeOut;

  @override
  void initState() {
    super.initState();
    
    // Set fullscreen immersive
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersive);

    _mainController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 3000),
    );

    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2000),
    )..repeat(reverse: true);

    _particleController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 4000),
    )..repeat();

    // Logo scale: 0.5 → 1.0 (0% - 30%)
    _logoScale = Tween<double>(begin: 0.5, end: 1.0).animate(
      CurvedAnimation(
        parent: _mainController,
        curve: const Interval(0.0, 0.30, curve: Curves.easeOutBack),
      ),
    );

    // Logo opacity: 0 → 1 (0% - 25%)
    _logoOpacity = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _mainController,
        curve: const Interval(0.0, 0.25, curve: Curves.easeOut),
      ),
    );

    // Text slide: 30 → 0 (25% - 50%)
    _textSlide = Tween<double>(begin: 30.0, end: 0.0).animate(
      CurvedAnimation(
        parent: _mainController,
        curve: const Interval(0.25, 0.50, curve: Curves.easeOutQuart),
      ),
    );

    // Text opacity: 0 → 1 (25% - 50%)
    _textOpacity = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _mainController,
        curve: const Interval(0.25, 0.50, curve: Curves.easeOut),
      ),
    );

    // Line width: 0 → 100 (40% - 60%)
    _lineWidth = Tween<double>(begin: 0.0, end: 100.0).animate(
      CurvedAnimation(
        parent: _mainController,
        curve: const Interval(0.40, 0.60, curve: Curves.easeInOutQuart),
      ),
    );

    // Glow opacity: 0 → 1 → 0 (50% - 80%)
    _glowOpacity = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _mainController,
        curve: const Interval(0.50, 0.80, curve: Curves.easeInOut),
      ),
    );

    // Fade out: 1 → 0 (80% - 100%)
    _fadeOut = Tween<double>(begin: 1.0, end: 0.0).animate(
      CurvedAnimation(
        parent: _mainController,
        curve: const Interval(0.80, 1.0, curve: Curves.easeInQuart),
      ),
    );

    // Start animation
    _mainController.forward();

    // Navigate after completion
    _mainController.addStatusListener((status) {
      if (status == AnimationStatus.completed) {
        SystemChrome.setEnabledSystemUIMode(
          SystemUiMode.edgeToEdge,
          overlays: [SystemUiOverlay.top, SystemUiOverlay.bottom],
        );
        widget.onComplete();
      }
    });
  }

  @override
  void dispose() {
    _mainController.dispose();
    _pulseController.dispose();
    _particleController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _mainController,
      builder: (context, child) {
        return Opacity(
          opacity: _fadeOut.value,
          child: child,
        );
      },
      child: Scaffold(
        backgroundColor: const Color(0xFF050D18), // Deep navy
        body: Stack(
          children: [
            // Background particles
            _buildParticles(),

            // Gradient overlay
            _buildGradientOverlay(),

            // Scan line effect
            _buildScanLine(),

            // Main content
            Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  // Logo container
                  AnimatedBuilder(
                    animation: _logoScale,
                    builder: (context, child) {
                      return Transform.scale(
                        scale: _logoScale.value,
                        child: Opacity(
                          opacity: _logoOpacity.value,
                          child: child,
                        ),
                      );
                    },
                    child: _buildLogo(),
                  ),

                  const SizedBox(height: 32),

                  // Brand text
                  AnimatedBuilder(
                    animation: _textSlide,
                    builder: (context, child) {
                      return Transform.translate(
                        offset: Offset(0, _textSlide.value),
                        child: Opacity(
                          opacity: _textOpacity.value,
                          child: child,
                        ),
                      );
                    },
                    child: _buildBrandText(),
                  ),

                  const SizedBox(height: 24),

                  // Progress line
                  _buildProgressLine(),

                  const SizedBox(height: 40),

                  // Status text
                  _buildStatusText(),
                ],
              ),
            ),

            // Corner accents
            _buildCornerAccents(),

            // Version text
            Positioned(
              bottom: 40,
              left: 0,
              right: 0,
              child: Center(
                child: Text(
                  'v2.0.1 • Kideco Jaya Agung',
                  style: GoogleFonts.inter(
                    color: Colors.white.withOpacity(0.3),
                    fontSize: 11,
                    fontWeight: FontWeight.w500,
                    letterSpacing: 2,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ── Logo Widget ──────────────────────────────────────────
  Widget _buildLogo() {
    return AnimatedBuilder(
      animation: _pulseController,
      builder: (context, child) {
        return Container(
          width: 120,
          height: 120,
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                const Color(0xFF0A1628),
                const Color(0xFF1E3A5F),
              ],
            ),
            borderRadius: BorderRadius.circular(28),
            border: Border.all(
              color: Colors.white.withOpacity(
                0.1 + (0.2 * _pulseController.value),
              ),
              width: 1.5,
            ),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFF0284C7).withOpacity(
                  0.1 + (0.2 * _pulseController.value),
                ),
                blurRadius: 30 + (20 * _pulseController.value),
                spreadRadius: 5,
              ),
            ],
          ),
          child: Center(
            child: Stack(
              alignment: Alignment.center,
              children: [
                // Glow behind M
                AnimatedBuilder(
                  animation: _glowOpacity,
                  builder: (context, child) {
                    return Opacity(
                      opacity: _glowOpacity.value * 0.3,
                      child: Text(
                        'M',
                        style: GoogleFonts.inter(
                          color: const Color(0xFF0284C7),
                          fontSize: 56,
                          fontWeight: FontWeight.w900,
                          letterSpacing: -2,
                        ),
                      ),
                    );
                  },
                ),
                // Main M
                Text(
                  'M',
                  style: GoogleFonts.inter(
                    color: Colors.white,
                    fontSize: 52,
                    fontWeight: FontWeight.w900,
                    letterSpacing: -2,
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  // ── Brand Text ───────────────────────────────────────────
  Widget _buildBrandText() {
    return Column(
      children: [
        Text(
          'MINEOS',
          style: GoogleFonts.inter(
            color: Colors.white,
            fontSize: 32,
            fontWeight: FontWeight.w900,
            letterSpacing: 6,
            height: 1.0,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          'COMMAND CENTER',
          style: GoogleFonts.inter(
            color: Colors.white.withOpacity(0.5),
            fontSize: 12,
            fontWeight: FontWeight.w600,
            letterSpacing: 8,
          ),
        ),
      ],
    );
  }

  // ── Progress Line ────────────────────────────────────────
  Widget _buildProgressLine() {
    return Container(
      width: 200,
      height: 2,
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.1),
        borderRadius: BorderRadius.circular(1),
      ),
      child: Align(
        alignment: Alignment.centerLeft,
        child: AnimatedBuilder(
          animation: _lineWidth,
          builder: (context, child) {
            return Container(
              width: (200 * _lineWidth.value) / 100,
              height: 2,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [
                    Color(0xFF0284C7),
                    Color(0xFF0A1628),
                  ],
                ),
                borderRadius: BorderRadius.circular(1),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF0284C7).withOpacity(0.5),
                    blurRadius: 8,
                    spreadRadius: 1,
                  ),
                ],
              ),
            );
          },
        ),
      ),
    );
  }

  // ── Status Text ──────────────────────────────────────────
  Widget _buildStatusText() {
    final statuses = [
      'Initializing neural engine...',
      'Connecting to fleet sensors...',
      'Syncing telemetry data...',
      'System ready',
    ];

    final index = (_mainController.value * statuses.length).floor().clamp(0, statuses.length - 1);

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        SizedBox(
          width: 12,
          height: 12,
          child: CircularProgressIndicator(
            strokeWidth: 1.5,
            valueColor: AlwaysStoppedAnimation<Color>(
              Colors.white.withOpacity(0.5),
            ),
          ),
        ),
        const SizedBox(width: 10),
        Text(
          statuses[index],
          style: GoogleFonts.inter(
            color: Colors.white.withOpacity(0.4),
            fontSize: 11,
            fontWeight: FontWeight.w500,
            letterSpacing: 0.5,
          ),
        ),
      ],
    );
  }

  // ── Particles Background ─────────────────────────────────
  Widget _buildParticles() {
    return AnimatedBuilder(
      animation: _particleController,
      builder: (context, child) {
        return CustomPaint(
          size: MediaQuery.of(context).size,
          painter: _ParticlePainter(
            progress: _particleController.value,
            particleCount: 30,
          ),
        );
      },
    );
  }

  // ── Gradient Overlay ─────────────────────────────────────
  Widget _buildGradientOverlay() {
    return Container(
      decoration: BoxDecoration(
        gradient: RadialGradient(
          center: const Alignment(0, -0.3),
          radius: 0.8,
          colors: [
            const Color(0xFF0A1628).withOpacity(0.8),
            const Color(0xFF050D18).withOpacity(1.0),
          ],
        ),
      ),
    );
  }

  // ── Scan Line ────────────────────────────────────────────
  Widget _buildScanLine() {
    return AnimatedBuilder(
      animation: _mainController,
      builder: (context, child) {
        final scanProgress = (_mainController.value * 2) % 1.0;
        return Positioned(
          top: MediaQuery.of(context).size.height * scanProgress,
          left: 0,
          right: 0,
          child: Container(
            height: 1,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  Colors.transparent,
                  const Color(0xFF0284C7).withOpacity(0.3),
                  Colors.transparent,
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  // ── Corner Accents ───────────────────────────────────────
  Widget _buildCornerAccents() {
    return Stack(
      children: [
        // Top left
        Positioned(
          top: 40,
          left: 40,
          child: _CornerAccent(),
        ),
        // Top right
        Positioned(
          top: 40,
          right: 40,
          child: Transform.rotate(
            angle: 1.5708, // 90 deg
            child: _CornerAccent(),
          ),
        ),
        // Bottom left
        Positioned(
          bottom: 40,
          left: 40,
          child: Transform.rotate(
            angle: -1.5708, // -90 deg
            child: _CornerAccent(),
          ),
        ),
        // Bottom right
        Positioned(
          bottom: 40,
          right: 40,
          child: Transform.rotate(
            angle: 3.14159, // 180 deg
            child: _CornerAccent(),
          ),
        ),
      ],
    );
  }
}

// ── Corner Accent Widget ───────────────────────────────────
class _CornerAccent extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      width: 24,
      height: 24,
      decoration: BoxDecoration(
        border: Border(
          top: BorderSide(color: Colors.white.withOpacity(0.15), width: 1.5),
          left: BorderSide(color: Colors.white.withOpacity(0.15), width: 1.5),
        ),
      ),
    );
  }
}

// ── Particle Painter ───────────────────────────────────────
class _ParticlePainter extends CustomPainter {
  final double progress;
  final int particleCount;
  final _random = Random(42); // Fixed seed for consistency

  _ParticlePainter({
    required this.progress,
    required this.particleCount,
  });

  @override
  void paint(Canvas canvas, Size size) {
    for (int i = 0; i < particleCount; i++) {
      final x = _random.nextDouble() * size.width;
      final y = ((progress * size.height * 2) + (_random.nextDouble() * size.height)) % size.height;
      final radius = _random.nextDouble() * 2 + 0.5;
      final opacity = (1 - (y / size.height)) * 0.3;

      final paint = Paint()
        ..color = Colors.white.withOpacity(opacity)
        ..style = PaintingStyle.fill;

      canvas.drawCircle(Offset(x, y), radius, paint);
    }
  }

  @override
  bool shouldRepaint(covariant _ParticlePainter oldDelegate) {
    return oldDelegate.progress != progress;
  }
}