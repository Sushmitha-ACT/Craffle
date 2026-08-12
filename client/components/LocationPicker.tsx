import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet marker icons in Vite
// @ts-ignore
import icon from 'leaflet/dist/images/marker-icon.png';
// @ts-ignore
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

interface LocationPickerProps {
  initialLocation?: { lat: number; lng: number };
  onLocationSelect: (lat: number, lng: number) => void;
}

function LocationMarker({ position, setPosition, onLocationSelect }: any) {
  const map = useMapEvents({
    click(e) {
      setPosition(e.latlng);
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });

  // Automatically fly to new position when position changes externally
  useEffect(() => {
    if (position) {
      map.flyTo(position, map.getZoom());
    }
  }, [position, map]);

  return position === null ? null : (
    <Marker position={position}></Marker>
  );
}

export default function LocationPicker({ initialLocation, onLocationSelect }: LocationPickerProps) {
  const [position, setPosition] = useState<L.LatLng | null>(
    initialLocation ? new L.LatLng(initialLocation.lat, initialLocation.lng) : null
  );

  // Sync with parent when initialLocation changes (e.g. from Autocomplete)
  useEffect(() => {
    if (initialLocation) {
      setPosition(new L.LatLng(initialLocation.lat, initialLocation.lng));
    }
  }, [initialLocation?.lat, initialLocation?.lng]);

  const defaultCenter = initialLocation 
    ? [initialLocation.lat, initialLocation.lng] as [number, number]
    : [13.0827, 80.2707] as [number, number];

  return (
    <div className="w-full h-[300px] rounded-xl overflow-hidden border border-slate-200 shadow-inner bg-slate-50 relative z-0 mt-4">
      <MapContainer 
        center={defaultCenter} 
        zoom={16} 
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationMarker position={position} setPosition={setPosition} onLocationSelect={onLocationSelect} />
      </MapContainer>
      <div className="absolute bottom-2 left-2 right-2 bg-white/90 backdrop-blur-sm p-2 rounded-lg border border-slate-200 text-[11px] font-bold text-[#8C4A1D] text-center pointer-events-none z-[1000] shadow-sm">
        📍 Visually confirm your location. You can drag the map and click to adjust the exact pin if needed.
      </div>
    </div>
  );
}
