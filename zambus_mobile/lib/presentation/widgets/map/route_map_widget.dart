import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import '../../../core/constants/app_colors.dart';

/// Route Map Widget
///
/// Displays a bus route on an OpenStreetMap. For MVP, shows hardcoded
/// Zambian cities. Production would use real GPS coordinates from the API.
class RouteMapWidget extends StatelessWidget {
  final String? origin;
  final String? destination;
  final List<String> intermediateStops;
  final double height;

  const RouteMapWidget({
    super.key,
    this.origin,
    this.destination,
    this.intermediateStops = const [],
    this.height = 250,
  });

  /// Predefined Zambian city coordinates for MVP display
  static final Map<String, LatLng> _cityCoords = {
    'lusaka': const LatLng(-15.3875, 28.3228),
    'livingstone': const LatLng(-17.8419, 25.8578),
    'ndola': const LatLng(-12.9683, 28.6366),
    'kitwe': const LatLng(-12.8024, 28.2132),
    'chipata': const LatLng(-13.6396, 32.6489),
    'kabwe': const LatLng(-14.4469, 28.4464),
    'kafue': const LatLng(-15.7655, 28.1814),
    'choma': const LatLng(-16.8089, 26.9884),
    'mazabuka': const LatLng(-15.8561, 27.7483),
    'kapiri mposhi': const LatLng(-13.9717, 28.6766),
    'mpika': const LatLng(-11.8333, 28.8333),
    'kalomo': const LatLng(-16.8000, 26.5000),
    'petauke': const LatLng(-14.2411, 31.3197),
  };

  LatLng? _getCoords(String? city) {
    if (city == null) return null;
    return _cityCoords[city.toLowerCase()];
  }

  @override
  Widget build(BuildContext context) {
    final originCoords = _getCoords(origin);
    final destCoords = _getCoords(destination);

    if (originCoords == null || destCoords == null) {
      return Container(
        height: height,
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.border),
        ),
        child: const Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.map_outlined, size: 48, color: AppColors.textHint),
              SizedBox(height: 8),
              Text(
                'Route map unavailable',
                style: TextStyle(color: AppColors.textSecondary),
              ),
            ],
          ),
        ),
      );
    }

    // Build route points
    final points = <LatLng>[originCoords];
    for (final stop in intermediateStops) {
      final coords = _getCoords(stop);
      if (coords != null) points.add(coords);
    }
    points.add(destCoords);

    // Calculate bounds to fit all points
    final allLats = points.map((p) => p.latitude).toList();
    final allLngs = points.map((p) => p.longitude).toList();
    final center = LatLng(
      (allLats.reduce((a, b) => a + b) / allLats.length),
      (allLngs.reduce((a, b) => a + b) / allLngs.length),
    );

    return Container(
      height: height,
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: FlutterMap(
        options: MapOptions(
          initialCenter: center,
          initialZoom: 6.5,
          interactionOptions: const InteractionOptions(
            flags: InteractiveFlag.all & ~InteractiveFlag.rotate,
          ),
        ),
        children: [
          // OpenStreetMap tiles
          TileLayer(
            urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
            userAgentPackageName: 'com.zambus.app',
          ),
          // Route polyline
          if (points.length >= 2)
            PolylineLayer(
              polylines: [
                Polyline(
                  points: points,
                  color: AppColors.primary,
                  strokeWidth: 3.0,
                ),
              ],
            ),
          // City markers
          MarkerLayer(
            markers: [
              // Origin marker
              Marker(
                point: originCoords,
                width: 32,
                height: 32,
                child: Container(
                  decoration: BoxDecoration(
                    color: AppColors.success,
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.white, width: 2),
                  ),
                  child: const Icon(Icons.circle, color: Colors.white, size: 12),
                ),
              ),
              // Destination marker
              Marker(
                point: destCoords,
                width: 32,
                height: 32,
                child: Container(
                  decoration: BoxDecoration(
                    color: AppColors.error,
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.white, width: 2),
                  ),
                  child: const Icon(Icons.flag, color: Colors.white, size: 14),
                ),
              ),
              // Intermediate stop markers
              ...points
                  .where((p) => p != originCoords && p != destCoords)
                  .map(
                    (point) => Marker(
                      point: point,
                      width: 24,
                      height: 24,
                      child: Container(
                        decoration: BoxDecoration(
                          color: AppColors.warning,
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.white, width: 2),
                        ),
                        child:
                            const Icon(Icons.stop, color: Colors.white, size: 10),
                      ),
                    ),
                  ),
            ],
          ),
          // Map attribution
          const SimpleAttributionWidget(
            alignment: Alignment.bottomRight,
            source: Text(
              '© OpenStreetMap contributors',
              style: TextStyle(fontSize: 10),
            ),
          ),
        ],
      ),
    );
  }
}
