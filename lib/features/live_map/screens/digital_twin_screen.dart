import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:webview_flutter/webview_flutter.dart';

class DigitalTwinScreen extends StatefulWidget {
  final String url;
  const DigitalTwinScreen({super.key, required this.url});

  @override
  State<DigitalTwinScreen> createState() => _DigitalTwinScreenState();
}

class _DigitalTwinScreenState extends State<DigitalTwinScreen>
    with TickerProviderStateMixin {
  late final WebViewController _controller;
  bool _isLoading = true;
  bool _hasError = false;
  int _loadingProgress = 0;
  late AnimationController _pulseController;

  Future<void> _injectMobileStyle() async {
  await _controller.runJavaScript('''
    (function() {
      // Tunggu DOM siap
      function hideSidebar() {
        // Sembunyikan semua kemungkinan sidebar
        const sidebarSelectors = [
          'aside', 'nav', '.sidebar', '.side-nav',
          '.sidenav', '[class*="sidebar"]', '[class*="side-bar"]',
          '[class*="drawer"]', '[class*="navigation"]',
          '[id*="sidebar"]', '[id*="sidenav"]', '.drawer',
          '[class*="nav-panel"]', '[class*="left-panel"]'
        ];
        
        sidebarSelectors.forEach(sel => {
          document.querySelectorAll(sel).forEach(el => {
            el.style.cssText += 'display:none!important;width:0!important;visibility:hidden!important;';
          });
        });
        
        // Paksa main content fullscreen
        const mainSelectors = [
          'main', '.main', '#main', '#content', '.content',
          '[class*="main-content"]', '[class*="page-content"]',
          '[class*="digital-twin"]', '[class*="viewport"]',
          '[class*="scene"]', 'canvas', '#root > div'
        ];
        
        mainSelectors.forEach(sel => {
          document.querySelectorAll(sel).forEach(el => {
            el.style.cssText += 'width:100vw!important;margin-left:0!important;padding-left:0!important;left:0!important;';
          });
        });
        
        // Inject global CSS
        const style = document.createElement('style');
        style.textContent = \`
          * { box-sizing: border-box; }
          body { 
            overflow: hidden !important; 
            margin: 0 !important; 
            padding: 0 !important;
          }
          aside, nav, 
          [class*="sidebar"], 
          [class*="side-nav"],
          [class*="drawer"] { 
            display: none !important; 
            width: 0 !important; 
          }
          main, .main, #main,
          [class*="main-content"],
          [class*="page-content"] {
            width: 100vw !important;
            margin: 0 !important;
            padding: 0 !important;
            left: 0 !important;
          }
          canvas {
            width: 100vw !important;
            height: 100vh !important;
          }
        \`;
        document.head.appendChild(style);
        
        console.log('MineOS Mobile: Sidebar hidden, fullscreen active');
      }
      
      // Jalankan sekarang
      hideSidebar();
      
      // Jalankan lagi setelah 1 detik (untuk SPA yang load lambat)
      setTimeout(hideSidebar, 1000);
      setTimeout(hideSidebar, 2000);
      setTimeout(hideSidebar, 3000);
    })();
  ''');
}

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1000),
    )..repeat(reverse: true);

    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(const Color(0xFF031427))
      ..setNavigationDelegate(
        NavigationDelegate(
          onProgress: (progress) {
            setState(() => _loadingProgress = progress);
          },
          onPageStarted: (_) {
            setState(() {
              _isLoading = true;
              _hasError = false;
            });
          },
          onPageFinished: (_) {
            setState(() => _isLoading = false);
            _injectMobileStyle();
          },
          onWebResourceError: (_) {
            setState(() {
              _isLoading = false;
              _hasError = true;
            });
          },
        ),
      )
      ..loadRequest(Uri.parse(widget.url));
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF031427),
      body: SafeArea(
        child: Column(
          children: [
            _buildHeader(),
            if (_isLoading) _buildLoadingBar(),
            Expanded(
              child: _hasError ? _buildErrorView() : _buildWebView(),
            ),
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
          GestureDetector(
            onTap: () => Navigator.pop(context),
            child: const Icon(Icons.arrow_back_ios,
                color: Color(0xFF8892A4), size: 18),
          ),
          const SizedBox(width: 12),
          Text('MineOS',
              style: GoogleFonts.inter(
                  color: Colors.white,
                  fontSize: 20,
                  fontWeight: FontWeight.bold)),
          const SizedBox(width: 8),
          Text('Digital Twin',
              style: GoogleFonts.inter(
                  color: const Color(0xFF3B82F6),
                  fontSize: 20,
                  fontWeight: FontWeight.w300)),
          const Spacer(),
          GestureDetector(
            onTap: () {
              setState(() {
                _isLoading = true;
                _hasError = false;
              });
              _controller.reload();
            },
            child: Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: const Color(0xFF1E2D45),
                borderRadius: BorderRadius.circular(6),
                border: Border.all(color: const Color(0xFF2D3F55)),
              ),
              child: const Icon(Icons.refresh,
                  color: Color(0xFF8892A4), size: 16),
            ),
          ),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: _isLoading
                  ? const Color(0xFFFBBF24).withOpacity(0.1)
                  : _hasError
                      ? const Color(0xFFF87171).withOpacity(0.1)
                      : const Color(0xFF10B981).withOpacity(0.1),
              borderRadius: BorderRadius.circular(4),
              border: Border.all(
                color: _isLoading
                    ? const Color(0xFFFBBF24).withOpacity(0.4)
                    : _hasError
                        ? const Color(0xFFF87171).withOpacity(0.4)
                        : const Color(0xFF10B981).withOpacity(0.4),
              ),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                AnimatedBuilder(
                  animation: _pulseController,
                  builder: (_, __) => Container(
                    width: 6,
                    height: 6,
                    decoration: BoxDecoration(
                      color: Color.lerp(
                        _isLoading
                            ? const Color(0xFFFBBF24)
                            : _hasError
                                ? const Color(0xFFF87171)
                                : const Color(0xFF10B981),
                        Colors.transparent,
                        _pulseController.value,
                      ),
                      shape: BoxShape.circle,
                    ),
                  ),
                ),
                const SizedBox(width: 5),
                Text(
                  _isLoading
                      ? '$_loadingProgress%'
                      : _hasError
                          ? 'ERROR'
                          : 'LIVE',
                  style: GoogleFonts.sourceCodePro(
                    color: _isLoading
                        ? const Color(0xFFFBBF24)
                        : _hasError
                            ? const Color(0xFFF87171)
                            : const Color(0xFF10B981),
                    fontSize: 9,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 1,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLoadingBar() {
    return LinearProgressIndicator(
      value: _loadingProgress / 100,
      backgroundColor: const Color(0xFF1E2D45),
      color: const Color(0xFF3B82F6),
      minHeight: 2,
    );
  }

  Widget _buildWebView() {
    return WebViewWidget(controller: _controller);
  }

  Widget _buildErrorView() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.wifi_off, color: Color(0xFFF87171), size: 48),
          const SizedBox(height: 16),
          Text('KONEKSI GAGAL',
              style: GoogleFonts.sourceCodePro(
                  color: const Color(0xFFF87171),
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 1)),
          const SizedBox(height: 8),
          Text(
            'Pastikan HP dan laptop\nada di WiFi yang sama',
            textAlign: TextAlign.center,
            style: GoogleFonts.inter(
                color: const Color(0xFF8892A4), fontSize: 13),
          ),
          const SizedBox(height: 8),
          Text(widget.url,
              style: GoogleFonts.sourceCodePro(
                  color: const Color(0xFF3B82F6), fontSize: 11)),
          const SizedBox(height: 24),
          GestureDetector(
            onTap: () {
              setState(() {
                _isLoading = true;
                _hasError = false;
              });
              _controller.reload();
            },
            child: Container(
              padding: const EdgeInsets.symmetric(
                  horizontal: 20, vertical: 10),
              decoration: BoxDecoration(
                color: const Color(0xFF3B82F6).withOpacity(0.15),
                borderRadius: BorderRadius.circular(6),
                border: Border.all(
                    color: const Color(0xFF3B82F6).withOpacity(0.4)),
              ),
              child: Text('COBA LAGI',
                  style: GoogleFonts.inter(
                      color: const Color(0xFF3B82F6),
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 1)),
            ),
          ),
        ],
      ),
    );
  }
}