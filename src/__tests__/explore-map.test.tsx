import React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MapPreview } from '../components/maps/MapPreview';

const leaflet = vi.hoisted(() => ({ map: vi.fn(), tileLayer: vi.fn(), marker: vi.fn(), divIcon: vi.fn(), zoom: vi.fn() }));
vi.mock('leaflet', () => ({ default: {
  ...leaflet,
  TileLayer: class {},
  control: { zoom: leaflet.zoom },
  layerGroup: () => ({ addTo: () => ({ clearLayers: vi.fn() }) }),
} }));
beforeEach(() => {
  vi.clearAllMocks();
  leaflet.map.mockReturnValue({ eachLayer: vi.fn(), setView: vi.fn(), remove: vi.fn(), invalidateSize: vi.fn() });
  leaflet.tileLayer.mockReturnValue({ addTo: vi.fn() });
  leaflet.zoom.mockReturnValue({ addTo: vi.fn() });
  leaflet.marker.mockReturnValue({ bindPopup: vi.fn(), on: vi.fn(), addTo: vi.fn() });
});
afterEach(cleanup);

it('uses attributed public tiles for Explore while preserving marker callbacks and zoom controls', () => {
  const onMarkerClick = vi.fn();
  render(<MapPreview presentation="explore" onMarkerClick={onMarkerClick} markers={[{ id: 'activity:1', title: 'Walking tour', position: { lat: 28.2, lng: 83.9 }, type: 'activity' }]} />);
  expect(leaflet.map.mock.calls[0][1]).toMatchObject({ attributionControl: true, scrollWheelZoom: false });
  expect(leaflet.tileLayer).toHaveBeenCalledWith('https://tile.openstreetmap.org/{z}/{x}/{y}.png', expect.objectContaining({
    attribution: expect.stringContaining('OpenStreetMap'), referrerPolicy: 'strict-origin-when-cross-origin', maxZoom: 19,
  }));
  expect(leaflet.zoom).toHaveBeenCalledWith({ position: 'bottomright' });
  expect(leaflet.marker).toHaveBeenCalledWith([28.2, 83.9], expect.objectContaining({ title: 'Walking tour', alt: 'Walking tour' }));
  const onClick = leaflet.marker.mock.results[0].value.on.mock.calls.find((call: any[]) => call[0] === 'click')[1];
  onClick();
  expect(onMarkerClick).toHaveBeenCalledWith('activity:1');
});

it('leaves the default map provider and behavior unchanged for other pages', () => {
  render(<MapPreview />);
  expect(leaflet.map.mock.calls[0][1]).toMatchObject({ attributionControl: false, scrollWheelZoom: true });
  expect(leaflet.tileLayer).toHaveBeenCalledWith(expect.stringContaining('basemaps.cartocdn.com'), { maxZoom: 20 });
});
