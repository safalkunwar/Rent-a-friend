import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { MapPin, Navigation, Compass } from 'lucide-react';

interface MapPreviewProps {
  center?: { lat: number; lng: number };
  zoom?: number;
  markers?: Array<{
    id: string;
    position: { lat: number; lng: number };
    title: string;
    subtitle?: string;
    type?: 'companion' | 'activity' | 'event' | 'attraction' | 'hotel';
  }>;
  height?: string;
  onMarkerClick?: (id: string) => void;
  className?: string;
}

// Helper to extract valid numeric lat/lng from various object formats
const sanitizeCoords = (obj: any): { lat: number; lng: number } => {
  if (!obj) return { lat: 27.7172, lng: 85.3240 };
  const rawLat = obj.lat ?? obj.latitude ?? obj._lat;
  const rawLng = obj.lng ?? obj.longitude ?? obj._long ?? obj._lng;

  const lat = typeof rawLat === 'string' ? parseFloat(rawLat) : Number(rawLat);
  const lng = typeof rawLng === 'string' ? parseFloat(rawLng) : Number(rawLng);

  return {
    lat: typeof lat === 'number' && !isNaN(lat) ? lat : 27.7172,
    lng: typeof lng === 'number' && !isNaN(lng) ? lng : 85.3240,
  };
};

export const MapPreview: React.FC<MapPreviewProps> = ({
  center = { lat: 27.7172, lng: 85.3240 }, // Kathmandu Default
  zoom = 13,
  markers = [],
  height = '320px',
  onMarkerClick,
  className = '',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);
  const [currentTheme, setCurrentTheme] = useState<'dark' | 'light'>('dark');

  const safeCenter = sanitizeCoords(center);

  // Detect theme changes on HTML element
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const isLight = document.documentElement.classList.contains('theme-light');
      setCurrentTheme(isLight ? 'light' : 'dark');
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    
    const isLight = document.documentElement.classList.contains('theme-light');
    setCurrentTheme(isLight ? 'light' : 'dark');
    
    return () => observer.disconnect();
  }, []);

  // Initialize Map Instance safely
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Reset leaflet ID on container if previously attached
    if ((mapContainerRef.current as any)._leaflet_id) {
      (mapContainerRef.current as any)._leaflet_id = null;
    }

    try {
      const map = L.map(mapContainerRef.current, {
        center: [safeCenter.lat, safeCenter.lng],
        zoom: zoom,
        zoomControl: false,
        attributionControl: false,
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      const markersGroup = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
      markersGroupRef.current = markersGroup;

      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 250);
    } catch (err) {
      console.warn('[MapPreview] Leaflet initialization error caught:', err);
    }

    return () => {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch (e) {
          // ignore cleanup error
        }
        mapInstanceRef.current = null;
      }
      if (mapContainerRef.current) {
        (mapContainerRef.current as any)._leaflet_id = null;
      }
    };
  }, []);

  // Set tile layer on theme shift
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear existing tile layers
    map.eachLayer(layer => {
      if (layer instanceof L.TileLayer) {
        map.removeLayer(layer);
      }
    });

    const tileUrl = currentTheme === 'light'
      ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

    L.tileLayer(tileUrl, {
      maxZoom: 20,
    }).addTo(map);
  }, [currentTheme]);

  // Handle map centering updates
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const { lat, lng } = sanitizeCoords(center);
    map.setView([lat, lng], zoom, { animate: true, duration: 1 });
  }, [center?.lat, center?.lng, zoom]);

  // Populate interactive custom marker layers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersGroup = markersGroupRef.current;
    if (!map || !markersGroup) return;

    markersGroup.clearLayers();

    markers.forEach(marker => {
      if (!marker || !marker.position) return;
      const { lat, lng } = sanitizeCoords(marker.position);

      let pinColor = '#C8A25E'; // Default Gold SATHI Theme
      if (marker.type === 'activity') pinColor = '#3B82F6'; // Adventure Blue
      if (marker.type === 'event') pinColor = '#EF4444'; // Festive Red
      if (marker.type === 'attraction') pinColor = '#10B981'; // Emerald Nature
      if (marker.type === 'hotel') pinColor = '#8B5CF6'; // Partner Purple

      const markerIcon = L.divIcon({
        html: `
          <div class="relative flex items-center justify-center w-8 h-8 group">
            <div class="absolute w-8 h-8 rounded-full bg-[${pinColor}]/20 animate-ping"></div>
            <div class="absolute w-4.5 h-4.5 rounded-full bg-[${pinColor}] border-2 border-[#17191C] shadow-lg flex items-center justify-center transition-transform group-hover:scale-125 duration-300">
              <div class="w-1.5 h-1.5 rounded-full bg-white"></div>
            </div>
          </div>
        `,
        className: 'custom-sathi-marker',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const leafletMarker = L.marker([lat, lng], { icon: markerIcon });
      
      const popupThemeText = currentTheme === 'light' ? '#1D1B18' : '#FFFFFF';
      const popupThemeBg = currentTheme === 'light' ? '#FFFFFF' : '#17191C';
      const popupThemeBorder = currentTheme === 'light' ? '#E6DFD5' : '#2A2D31';

      const popupContent = `
        <div style="
          padding: 8px 12px; 
          border-radius: 12px; 
          background-color: ${popupThemeBg}; 
          border: 1px solid ${popupThemeBorder}; 
          font-family: sans-serif; 
          min-width: 140px; 
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        ">
          <p style="
            font-weight: 700; 
            font-size: 13px; 
            color: ${popupThemeText}; 
            margin: 0 0 2px 0 !important;
          ">${marker.title || 'Spot'}</p>
          ${marker.subtitle ? `<p style="font-size: 11px; color: #8E9299; margin: 0 !important;">${marker.subtitle}</p>` : ''}
        </div>
      `;

      leafletMarker.bindPopup(popupContent, {
        className: 'sathi-leaflet-popup',
        closeButton: false,
      });

      leafletMarker.on('click', () => {
        onMarkerClick?.(marker.id);
      });

      leafletMarker.addTo(markersGroup);
    });
  }, [markers, onMarkerClick, currentTheme]);

  return (
    <div
      className={`relative w-full rounded-3xl border border-[#2A2D31] overflow-hidden bg-[#17191C] ${className} shadow-2xl transition-all duration-300`}
      style={{ height }}
    >
      <div ref={mapContainerRef} className="w-full h-full z-10" />

      {/* Map Header Overlay */}
      <div className="absolute top-4 left-4 z-[400] bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl px-3 py-1.5 flex items-center gap-2 pointer-events-none">
        <Compass className="w-4 h-4 text-[#C8A25E] animate-spin" style={{ animationDuration: '6s' }} />
        <span className="text-[10px] md:text-xs font-bold text-white tracking-wide">
          SATHI Live Map • Kathmandu
        </span>
      </div>

      {/* Map Actions Overlay */}
      {markers.length > 0 && (
        <div className="absolute inset-x-0 bottom-4 z-[400] flex justify-center px-4 pointer-events-none">
          <div className="flex flex-wrap justify-center gap-1.5 max-w-full">
            {markers.slice(0, 4).map((marker, i) => (
              <button
                key={`${marker.type || 'marker'}-${marker.id || i}`}
                onClick={() => {
                  onMarkerClick?.(marker.id);
                  const map = mapInstanceRef.current;
                  if (map) {
                    map.setView([marker.position.lat, marker.position.lng], 15, { animate: true });
                  }
                }}
                className="pointer-events-auto flex items-center gap-1 bg-[#17191C]/90 backdrop-blur-md border border-[#2A2D31] rounded-full px-2.5 py-1 text-[10px] text-white hover:bg-[#C8A25E] hover:text-[#0F1113] hover:border-[#C8A25E] transition-all duration-300 shadow-lg"
              >
                <Navigation className="w-2.5 h-2.5" />
                <span className="truncate max-w-[80px] font-medium">{marker.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
