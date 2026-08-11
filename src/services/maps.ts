export type LatLng = {
  lat: number;
  lng: number;
};

export const MAP_CENTER: LatLng = {
  lat: 27.7172,
  lng: 85.324,
};

export const DEFAULT_ZOOM = 12;

export type MapMarker = {
  id: string;
  position: LatLng;
  title: string;
  subtitle?: string;
  type?: 'companion' | 'event' | 'partner';
};

export interface RouteInfo {
  distance: string;
  duration: string;
  coordinates: LatLng[];
}

export const mapsService = {
  calculateDistance(from: LatLng, to: LatLng): number {
    const R = 6371;
    const dLat = this.toRad(to.lat - from.lat);
    const dLng = this.toRad(to.lng - from.lng);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRad(from.lat)) * Math.cos(this.toRad(to.lat)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  },

  formatDistance(km: number): string {
    if (km < 1) {
      return `${Math.round(km * 1000)} m`;
    }
    return `${km.toFixed(1)} km`;
  },

  formatDuration(minutes: number): string {
    if (minutes < 60) {
      return `${Math.round(minutes)} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  },

  estimateWalkingDuration(km: number): number {
    return (km / 5) * 60;
  },

  estimateDrivingDuration(km: number): number {
    return (km / 25) * 60;
  },

  getBearing(from: LatLng, to: LatLng): number {
    const dLng = this.toRad(to.lng - from.lng);
    const y = Math.sin(dLng) * Math.cos(this.toRad(to.lat));
    const x = Math.cos(this.toRad(from.lat)) * Math.sin(this.toRad(to.lat)) -
              Math.sin(this.toRad(from.lat)) * Math.cos(this.toRad(to.lat)) * Math.cos(dLng);
    const bearing = Math.atan2(y, x);
    return (this.toDeg(bearing) + 360) % 360;
  },

  isWithinRadius(center: LatLng, point: LatLng, radiusKm: number): boolean {
    return this.calculateDistance(center, point) <= radiusKm;
  },

  toRad(deg: number): number {
    return deg * (Math.PI / 180);
  },

  toDeg(rad: number): number {
    return rad * (180 / Math.PI);
  },
};
