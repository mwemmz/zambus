import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../../../core/constants/app_colors.dart';
import '../../../injection_container.dart';
import '../../cubit/driver/driver_cubit.dart';
import '../../cubit/driver/driver_state.dart';

/// QR ticket scanner. Provides its own [DriverCubit] because the page is
/// pushed as a separate route, outside DriverHome's BlocProvider.
class QrScannerPage extends StatelessWidget {
  const QrScannerPage({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => getIt<DriverCubit>(),
      child: const _QrScannerView(),
    );
  }
}

class _QrScannerView extends StatefulWidget {
  const _QrScannerView();

  @override
  State<_QrScannerView> createState() => _QrScannerViewState();
}

class _QrScannerViewState extends State<_QrScannerView> {
  MobileScannerController? _cameraController;
  bool _isProcessing = false;

  @override
  void initState() {
    super.initState();
    _cameraController = MobileScannerController();
  }

  @override
  void dispose() {
    _cameraController?.dispose();
    super.dispose();
  }

  void _onDetect(BarcodeCapture capture) {
    if (_isProcessing) return;
    final barcode = capture.barcodes.firstOrNull;
    if (barcode == null || barcode.rawValue == null) return;

    setState(() {
      _isProcessing = true;
    });

    context.read<DriverCubit>().scanTicket(barcode.rawValue!);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        title: const Text('Scan Ticket'),
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
      ),
      body: BlocConsumer<DriverCubit, DriverState>(
        listener: (context, state) {
          if (state is ScanResult) {
            _showScanResult(context, state);
            Future.delayed(const Duration(seconds: 2), () {
              if (mounted) setState(() => _isProcessing = false);
            });
          } else if (state is DriverError) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(state.message), backgroundColor: AppColors.error),
            );
            setState(() => _isProcessing = false);
          }
        },
        builder: (context, state) {
          return Stack(
            children: [
              // Camera
              if (_cameraController != null && !(_isProcessing))
                MobileScanner(
                  controller: _cameraController!,
                  onDetect: _onDetect,
                ),

              // Overlay
              Center(
                child: Container(
                  width: 250,
                  height: 250,
                  decoration: BoxDecoration(
                    border: Border.all(color: Colors.white.withValues(alpha: 0.5), width: 2),
                    borderRadius: BorderRadius.circular(16),
                  ),
                ),
              ),

              // Instructions
              Positioned(
                bottom: 100,
                left: 0,
                right: 0,
                child: Center(
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                    decoration: BoxDecoration(
                      color: Colors.black.withValues(alpha: 0.7),
                      borderRadius: BorderRadius.circular(24),
                    ),
                    child: const Text(
                      'Align QR code within the frame',
                      style: TextStyle(color: Colors.white, fontSize: 14),
                    ),
                  ),
                ),
              ),

              // Processing indicator
              if (_isProcessing)
                Container(
                  color: Colors.black.withValues(alpha: 0.5),
                  child: const Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        CircularProgressIndicator(color: Colors.white),
                        SizedBox(height: 16),
                        Text('Processing...', style: TextStyle(color: Colors.white, fontSize: 16)),
                      ],
                    ),
                  ),
                ),
            ],
          );
        },
      ),
    );
  }

  void _showScanResult(BuildContext context, ScanResult result) {
    final Color color;
    final IconData icon;
    final String title;
    switch (result.status) {
      case 'VALID':
        color = AppColors.success;
        icon = Icons.check_circle;
        title = 'Valid Ticket - Mark as Boarded';
        break;
      case 'DUPLICATE':
        color = AppColors.warning;
        icon = Icons.warning_amber;
        title = 'Already Used';
        break;
      case 'INVALID_ROUTE':
        color = AppColors.error;
        icon = Icons.cancel;
        title = 'Wrong Trip';
        break;
      case 'WRONG_DATE':
        color = AppColors.error;
        icon = Icons.event_busy;
        title = 'Not For Today';
        break;
      default:
        color = AppColors.error;
        icon = Icons.cancel;
        title = 'Invalid Ticket';
    }

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(width: 40, height: 4, decoration: BoxDecoration(color: AppColors.border, borderRadius: BorderRadius.circular(2))),
            const SizedBox(height: 20),
            Icon(icon, size: 64, color: color),
            const SizedBox(height: 16),
            Text(title, style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: color)),
            const SizedBox(height: 8),
            Text(result.message, textAlign: TextAlign.center, style: const TextStyle(color: AppColors.textSecondary)),
            if (result.seatNumber != null) ...[
              const SizedBox(height: 12),
              Text('Seat: ${result.seatNumber}', style: const TextStyle(fontWeight: FontWeight.w600)),
            ],
            const SizedBox(height: 24),
            if (result.valid && result.bookingId != null)
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () {
                    Navigator.pop(ctx);
                    context.read<DriverCubit>().markAsBoarded(result.bookingId!);
                  },
                  style: ElevatedButton.styleFrom(backgroundColor: AppColors.success, foregroundColor: Colors.white),
                  child: const Text('Mark as Boarded'),
                ),
              ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                onPressed: () => Navigator.pop(ctx),
                child: const Text('Scan Again'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
