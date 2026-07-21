import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Search, MapPin, Check, Navigation, AlertCircle, Lock, Unlock } from 'lucide-react';
import { useToast } from '../ui/Toast';

interface MeetingLocationSelectorProps {
  initialPosition?: { lat: number; lng: number };
  onLocationSelected: (address: string, coordinates: { latitude: number; longitude: number }) => void;
  height?: string;
}

export const MeetingLocationSelector: React.FC<MeetingLocationSelectorProps> = ({
  initialPosition = { lat: 27.7172, lng: 85.3240 }, // Kathmandu Default
  onLocationSelected,
  height = '300px',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [address, setAddress] = useState('');
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number }>(initialPosition);
  const [currentTheme, setCurrentTheme] = useState<'dark' | 'light'>('dark');
  
  // Autocomplete / Suggestions State
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

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

  // Reverse Geocoding via OSM Nominatim API
  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            'Accept-Language': 'en',
            'User-Agent': 'SathiCompanionApp/1.0',
          },
        }
      );
      if (!response.ok) throw new Error('Geocoding response failed');
      const data = await response.json();
      
      const displayName = data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      // Simplify display to prevent super long OSM strings
      const parts = displayName.split(',');
      const shortAddress = parts.slice(0, 3).join(',').trim();
      
      setAddress(shortAddress);
      onLocationSelected(shortAddress, { latitude: lat, longitude: lng });
    } catch (err) {
      const fallbackAddress = `Coordinates: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      setAddress(fallbackAddress);
      onLocationSelected(fallbackAddress, { latitude: lat, longitude: lng });
    }
  };

  // Fetch Autocomplete Suggestions
  const fetchSuggestions = async (val: string) => {
    if (!val.trim()) {
      setSuggestions([]);
      return;
    }
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          val + ', Nepal'
        )}&limit=5`,
        {
          headers: {
            'Accept-Language': 'en',
            'User-Agent': 'SathiCompanionApp/1.0',
          },
        }
      );
      if (response.ok) {
        const data = await response.json();
        setSuggestions(data || []);
      }
    } catch (err) {
      console.error('Error fetching suggestions:', err);
    }
  };

  // Suggestions Fetcher Debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim().length > 2) {
        fetchSuggestions(searchQuery);
      } else {
        setSuggestions([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [selectedCoords.lat, selectedCoords.lng],
      zoom: 15,
      zoomControl: false,
      attributionControl: false,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);
    mapInstanceRef.current = map;

    // Create marker
    const markerIcon = L.divIcon({
      html: `
        <div class="relative flex items-center justify-center w-8 h-8 group">
          <div class="absolute w-8 h-8 rounded-full bg-[#2563EB]/20 animate-ping"></div>
          <div class="absolute w-5 h-5 rounded-full bg-[#2563EB] border-2 border-white shadow-lg flex items-center justify-center transition-transform scale-110">
            <div class="w-1.5 h-1.5 rounded-full bg-white"></div>
          </div>
        </div>
      `,
      className: 'custom-meeting-marker',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    const marker = L.marker([selectedCoords.lat, selectedCoords.lng], {
      icon: markerIcon,
      draggable: true,
    }).addTo(map);

    markerRef.current = marker;

    // Drag events
    marker.on('dragend', () => {
      if (isLocked) {
        // Snap back if locked
        marker.setLatLng([selectedCoords.lat, selectedCoords.lng]);
        showToast('Please unlock the location to change meeting point.', 'error');
        return;
      }
      const position = marker.getLatLng();
      setSelectedCoords({ lat: position.lat, lng: position.lng });
      reverseGeocode(position.lat, position.lng);
    });

    // Double-click to place marker
    map.on('dblclick', (e: L.LeafletMouseEvent) => {
      if (isLocked) {
        showToast('Please unlock the location to change meeting point.', 'error');
        return;
      }
      const { lat, lng } = e.latlng;
      marker.setLatLng([lat, lng]);
      setSelectedCoords({ lat, lng });
      reverseGeocode(lat, lng);
    });

    // Fix quick rendering issues
    setTimeout(() => {
      map.invalidateSize();
    }, 250);

    // Run initial reverse geocode
    reverseGeocode(selectedCoords.lat, selectedCoords.lng);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Sync marker draggable status and click events with isLocked state
  useEffect(() => {
    const marker = markerRef.current;
    if (marker) {
      if (isLocked) {
        marker.dragging?.disable();
      } else {
        marker.dragging?.enable();
      }
    }
  }, [isLocked]);

  // Update tile layer based on active theme
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

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

  // Select Suggestion / Handle Search Match
  const handleSelectSuggestion = (item: any) => {
    if (isLocked) {
      showToast('Unlock the location first to change meeting point.', 'error');
      return;
    }
    const latitude = parseFloat(item.lat);
    const longitude = parseFloat(item.lon);
    setSelectedCoords({ lat: latitude, lng: longitude });
    
    // Update marker
    if (markerRef.current) {
      markerRef.current.setLatLng([latitude, longitude]);
    }

    // Center map
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([latitude, longitude], 16, { animate: true });
    }

    const simplified = item.display_name.split(',').slice(0, 3).join(',').trim();
    setAddress(simplified);
    onLocationSelected(simplified, { latitude, longitude });
    setSearchQuery(simplified);
    setSuggestions([]);
    setShowSuggestions(false);
    showToast(`Located: ${simplified}`, 'success');
  };

  // Search places via OpenStreetMap Nominatim
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;
    if (isLocked) {
      showToast('Please unlock the location to change meeting point.', 'error');
      return;
    }

    setSearching(true);
    try {
      // Append ', Nepal' instead of ', Kathmandu, Nepal' to query all of Nepal
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery + ', Nepal'
        )}&limit=1`,
        {
          headers: {
            'Accept-Language': 'en',
            'User-Agent': 'SathiCompanionApp/1.0',
          },
        }
      );
      if (!response.ok) throw new Error('Search failed');
      const results = await response.json();

      if (results && results.length > 0) {
        const { lat, lon, display_name } = results[0];
        const latitude = parseFloat(lat);
        const longitude = parseFloat(lon);

        setSelectedCoords({ lat: latitude, lng: longitude });
        
        // Update marker
        if (markerRef.current) {
          markerRef.current.setLatLng([latitude, longitude]);
        }

        // Center map
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([latitude, longitude], 16, { animate: true });
        }

        const simplified = display_name.split(',').slice(0, 3).join(',').trim();
        setAddress(simplified);
        onLocationSelected(simplified, { latitude, longitude });
        showToast(`Located: ${simplified}`, 'success');
        setSuggestions([]);
        setShowSuggestions(false);
      } else {
        showToast('No locations found in Nepal. Try a different spot.', 'error');
      }
    } catch (err) {
      showToast('Error searching for location.', 'error');
    } finally {
      setSearching(false);
    }
  };

  // Geolocation trigger
  const handleGetCurrentLocation = () => {
    if (isLocked) {
      showToast('Please unlock the location to change meeting point.', 'error');
      return;
    }
    if (!navigator.geolocation) {
      showToast('Geolocation is not supported by your browser.', 'error');
      return;
    }

    showToast('Getting current location...', 'info');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setSelectedCoords({ lat: latitude, lng: longitude });

        // Update marker
        if (markerRef.current) {
          markerRef.current.setLatLng([latitude, longitude]);
        }

        // Center map
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([latitude, longitude], 16, { animate: true });
        }

        reverseGeocode(latitude, longitude);
        showToast('Location updated to current position.', 'success');
      },
      (error) => {
        showToast('Unable to retrieve your location.', 'error');
      }
    );
  };

  const toggleLockLocation = () => {
    setIsLocked(!isLocked);
    showToast(isLocked ? 'Location unlocked' : 'Location locked successfully!', isLocked ? 'info' : 'success');
  };

  return (
    <div className="space-y-3">
      {/* Search Input Bar */}
      <div className="relative">
        <form onSubmit={handleSearch} className="relative flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search meeting point in Nepal (e.g. Pokhara Lake, Thamel)..."
              value={searchQuery}
              disabled={isLocked}
              onFocus={() => setShowSuggestions(true)}
              onChange={e => {
                setSearchQuery(e.target.value);
                setShowSuggestions(true);
              }}
              className="w-full bg-[#1E2124] border border-[#2A2D31] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#2563EB] disabled:opacity-50"
            />
            <Search className="w-4 h-4 text-[#8E9299] absolute left-3 top-3" />
          </div>
          
          <button
            type="button"
            onClick={handleGetCurrentLocation}
            disabled={isLocked}
            title="Use current location"
            className="bg-[#1E2124] hover:bg-[#2A2D31] text-white border border-[#2A2D31] p-2.5 rounded-xl transition-colors shrink-0 flex items-center justify-center disabled:opacity-50"
          >
            <Navigation className="w-4 h-4 text-[#C8A25E]" />
          </button>

          <button
            type="submit"
            disabled={searching || isLocked}
            className="bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-colors shrink-0"
          >
            {searching ? 'Locating...' : 'Search'}
          </button>
        </form>

        {/* Autocomplete Suggestions drop-down */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute left-0 right-0 z-[500] mt-1 bg-[#1E2124] border border-[#2A2D31] rounded-xl overflow-hidden shadow-2xl max-h-56 overflow-y-auto">
            {suggestions.map((item, index) => {
              const shortName = item.display_name.split(',').slice(0, 3).join(',').trim();
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleSelectSuggestion(item)}
                  className="w-full text-left px-4 py-2.5 text-xs text-white hover:bg-[#2563EB]/10 border-b border-[#2A2D31] last:border-0 flex items-start gap-2 transition-colors"
                >
                  <MapPin className="w-3.5 h-3.5 text-[#C8A25E] shrink-0 mt-0.5" />
                  <div className="truncate">
                    <div className="font-semibold truncate text-[11px]">{shortName}</div>
                    <div className="text-[9px] text-[#8E9299] truncate">{item.display_name}</div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Map Element */}
      <div
        className="relative w-full rounded-2xl border border-[#2A2D31] overflow-hidden bg-[#17191C] shadow-md"
        style={{ height }}
      >
        <div ref={mapContainerRef} className="w-full h-full z-10" />

        {/* Tip Badge */}
        <div className="absolute bottom-3 left-3 z-[400] bg-[#0F1113]/90 backdrop-blur-md border border-[#2A2D31] rounded-lg px-2.5 py-1 flex items-center gap-1.5 pointer-events-none">
          <AlertCircle className="w-3.5 h-3.5 text-[#2563EB]" />
          <span className="text-[10px] text-white">
            {isLocked ? 'Location is locked' : 'Drag marker or double click to set meeting point'}
          </span>
        </div>
      </div>

      {/* Selected Spot Details & Lock Trigger */}
      {address && (
        <div className="bg-[#1E2124] border border-[#2A2D31] rounded-xl p-3.5 flex items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-[#2563EB]/10 flex items-center justify-center text-[#2563EB] shrink-0 mt-0.5">
              <MapPin className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                Meeting Address
                {isLocked && <span className="bg-[#10B981]/15 text-[#10B981] text-[9px] px-1.5 py-0.5 rounded-full border border-[#10B981]/25 flex items-center gap-1"><Lock className="w-2.5 h-2.5" /> Locked</span>}
              </h4>
              <p className="text-xs text-[#8E9299] line-clamp-2">{address}</p>
              <div className="text-[9px] text-[#8E9299] font-mono mt-1">
                Lat: {selectedCoords.lat.toFixed(5)} • Lng: {selectedCoords.lng.toFixed(5)}
              </div>
            </div>
          </div>
          
          <button
            type="button"
            onClick={toggleLockLocation}
            className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 border ${
              isLocked
                ? 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30 hover:bg-[#10B981]/20'
                : 'bg-transparent text-[#8E9299] border-[#2A2D31] hover:border-[#C8A25E] hover:text-white'
            }`}
          >
            {isLocked ? (
              <>
                <Lock className="w-3.5 h-3.5" />
                <span>Locked</span>
              </>
            ) : (
              <>
                <Unlock className="w-3.5 h-3.5" />
                <span>Lock</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
