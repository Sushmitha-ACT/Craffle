import React, { useState, useEffect } from 'react';
import { Navigation, Loader2, MapPin, AlertCircle, MapPin as MapPinIcon } from 'lucide-react';
import { Product } from '@shared/types';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

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

const userIcon = new L.DivIcon({
  className: 'custom-user-marker',
  html: `<div style="background-color: #ef4444; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8]
});

import ProductCard from '../components/ProductCard';

interface NearbyPageProps {
  onViewProduct: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
  onToggleWishlist?: (productId: string) => void;
  wishlistIds?: Set<string>;
}

function LocationSelector({ setLocation, setSkipReverseGeocode }: { setLocation: (loc: {lat: number, lng: number}) => void, setSkipReverseGeocode: (skip: boolean) => void }) {
  useMapEvents({
    click(e) {
      setSkipReverseGeocode(false); // Enable reverse geocoding when clicking the map
      setLocation({ lat: e.latlng.lat, lng: e.latlng.lng });
    }
  });
  return null;
}

// Custom hook component to recenter the map smoothly
function MapCenterUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, map.getZoom(), { animate: true, duration: 1.5 });
  }, [center, map]);
  return null;
}

export default function NearbyPage({ onViewProduct, onAddToCart, showToast, onToggleWishlist, wishlistIds = new Set() }: NearbyPageProps) {
  const [mapRadius, setMapRadius] = useState<number>(5);
  const [userLocation, setUserLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [userAddress, setUserAddress] = useState<string>('Locating...');
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [locationSearchQuery, setLocationSearchQuery] = useState('');
  const [locationGranted, setLocationGranted] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [skipReverseGeocode, setSkipReverseGeocode] = useState(false);
  
  const [nearbyProducts, setNearbyProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = ['All', 'Beauty & Personal Care', 'Jewelry & Accessories', 'Home Decor', 'Clothing & Textiles', 'Food & Beverages'];

  const filteredProducts = nearbyProducts.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Fetch nearby products when location or radius changes
  useEffect(() => {
    if (!userLocation) return;
    
    const fetchNearby = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/products/nearby?lat=${userLocation.lat}&lng=${userLocation.lng}&radius=${mapRadius}`);
        if (res.ok) {
          const data = await res.json();
          setNearbyProducts(data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchNearby();
  }, [userLocation, mapRadius]);

  // Reverse Geocoding
  useEffect(() => {
    if (!userLocation || isEditingLocation) return;
    
    // If the location came from a text search, don't overwrite it with the raw municipal GPS string!
    if (skipReverseGeocode) return;

    const fetchAddress = async () => {
      try {
        setUserAddress('Updating location...');
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${userLocation.lat}&lon=${userLocation.lng}`);
        const data = await res.json();
        setUserAddress(data.display_name || 'Selected Location');
      } catch (e) {
        setUserAddress('Unknown Location');
      }
    };
    
    // add small delay so we don't spam the free api if they click fast
    const timeout = setTimeout(fetchAddress, 800);
    return () => clearTimeout(timeout);
  }, [userLocation, isEditingLocation, skipReverseGeocode]);

  const requestLocation = () => {
    setLocationError('');
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      return;
    }
    
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setSkipReverseGeocode(false);
        setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
        setLocationGranted(true);
        setLoading(false);
      },
      (error) => {
        console.error("Error getting location", error);
        setLocationError("Location access denied. Please allow location access in your browser settings to find creators near you.");
        setLoading(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleSearchLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locationSearchQuery.trim()) return;
    setLoading(true);
    try {
      let res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationSearchQuery)}&limit=1`);
      let data = await res.json();
      
      // Fallback: If not found, try appending the city/country context
      if (!data || data.length === 0) {
         res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationSearchQuery + ', Chennai, India')}&limit=1`);
         data = await res.json();
      }

      if (data && data.length > 0) {
        // We found a location! Don't let reverse geocoding ruin the clean display name
        setSkipReverseGeocode(true);
        setUserLocation({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) });
        
        // Clean up the display name slightly if it's too long, but let's just use what they gave us
        setUserAddress(data[0].display_name);
        setIsEditingLocation(false);
      } else {
        if (showToast) showToast("Location not found. Please check spelling or add your city name.", "error");
      }
    } catch (err) {
      console.error(err);
      if (showToast) showToast("Failed to search location due to a network error.", "error");
    } finally {
      setLoading(false);
    }
  };

  if (!locationGranted) {
    return (
      <div className="p-4 lg:p-8 animate-fade-in w-full max-w-7xl mx-auto h-[80vh] flex flex-col items-center justify-center">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-gray-200 shadow-xl text-center space-y-6">
          <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto text-[#FF6B35]">
            <MapPin className="w-10 h-10" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Find Local Creators</h1>
            <p className="text-sm text-gray-500">We need your location to show you homemade food and crafts available in your neighborhood.</p>
          </div>
          
          {locationError && (
            <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs font-semibold flex items-center gap-2 text-left">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {locationError}
            </div>
          )}

          <button 
            onClick={requestLocation}
            disabled={loading}
            className="w-full bg-[#FF6B35] hover:bg-[#e65a2a] text-white px-6 py-3.5 rounded-xl text-sm font-bold transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Navigation className="w-5 h-5" />}
            {loading ? 'Finding you...' : 'Allow Location Access'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 animate-fade-in w-full max-w-7xl mx-auto h-full flex flex-col transition-colors duration-200">
      <div className="mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)] mb-1 transition-colors duration-200">Creators Near You</h1>
          <p className="text-sm text-[var(--text-secondary)] transition-colors duration-200">Explore verified home creators within {mapRadius}km of your location.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <input 
            type="text" 
            placeholder="Search products or shops..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-64 px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text)] text-sm focus:outline-none focus:border-[#FF6B35] transition-colors duration-200"
          />
          <select 
            value={selectedCategory} 
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full sm:w-auto px-4 py-2 rounded-xl border border-[var(--border)] text-sm bg-[var(--bg-secondary)] text-[var(--text)] focus:outline-none focus:border-[#FF6B35] transition-colors duration-200"
          >
            {categories.map(c => <option key={c} value={c} className="bg-[var(--panel)] text-[var(--text)]">{c}</option>)}
          </select>
        </div>
      </div>

      {/* Address Bar UI */}
      <div className="mb-6 bg-[var(--panel)] p-4 rounded-2xl border border-[var(--border)] shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative overflow-hidden min-h-[80px] transition-colors duration-200">
        <div className="absolute top-0 left-0 w-1 h-full bg-[#FF6B35]" />
        
        <div className="flex items-center gap-4 w-full overflow-hidden">
          <div className="w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center text-[#FF6B35] shrink-0">
            <MapPinIcon className="w-6 h-6" />
          </div>
          
          {isEditingLocation ? (
            <form onSubmit={handleSearchLocation} className="min-w-0 flex-1 flex flex-col sm:flex-row gap-2">
              <input 
                type="text" 
                value={locationSearchQuery}
                onChange={(e) => setLocationSearchQuery(e.target.value)}
                placeholder="Enter city, neighborhood, or zip code..." 
                className="w-full flex-1 px-4 py-2 rounded-xl border border-[#FF6B35] focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/20 text-sm"
                autoFocus
              />
              <div className="flex gap-2">
                <button type="submit" disabled={loading} className="bg-[#FF6B35] text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-1 min-w-[80px] justify-center">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
                </button>
                <button type="button" onClick={() => setIsEditingLocation(false)} className="bg-gray-100 text-gray-600 hover:bg-gray-200 px-4 py-2 rounded-xl text-sm font-bold">
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <p className="text-[11px] font-extrabold text-[var(--muted)] uppercase tracking-wider mb-0.5 transition-colors duration-200">Your Current Target Location</p>
                <p className="text-[15px] font-semibold text-[var(--text)] line-clamp-2 leading-tight transition-colors duration-200">
                  {userAddress}
                </p>
              </div>
              <button 
                onClick={() => { setLocationSearchQuery(userAddress === 'Unknown Location' ? '' : userAddress); setIsEditingLocation(true); }}
                className="shrink-0 text-sm font-bold text-[#FF6B35] hover:underline self-start sm:self-center"
              >
                Change Location
              </button>
            </div>
          )}
        </div>
        
        {!isEditingLocation && (
          <button 
            onClick={requestLocation}
            className="shrink-0 flex items-center gap-2 bg-[#FFF4E6] text-[#FF6B35] hover:bg-[#FFE8CC] px-4 py-2.5 rounded-xl text-sm font-bold transition-colors shadow-sm w-full md:w-auto justify-center"
          >
            <Navigation className="w-4 h-4" />
            Reset to GPS
          </button>
        )}
      </div>

      {/* Real Map Section */}
      <div className="w-full h-[400px] rounded-3xl overflow-hidden border border-gray-200 shadow-sm relative bg-[#E8F0FE] mb-8 z-0">
        {userLocation && (
          <MapContainer 
            center={[userLocation.lat, userLocation.lng]} 
            zoom={13} 
            scrollWheelZoom={false}
            className="w-full h-full"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            <MapCenterUpdater center={[userLocation.lat, userLocation.lng]} />
            <LocationSelector setLocation={setUserLocation} setSkipReverseGeocode={setSkipReverseGeocode} />
            
            {/* User Marker */}
            <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
              <Popup>You are here!</Popup>
            </Marker>
            
            {/* Radius Circle */}
            <Circle 
              center={[userLocation.lat, userLocation.lng]} 
              radius={mapRadius * 1000} 
              pathOptions={{ color: '#FF6B35', fillColor: '#FF6B35', fillOpacity: 0.1 }}
            />

            {/* Creator Markers */}
            {filteredProducts.map((p: any) => {
              if (!p.location || !p.location.coordinates) return null;
              return (
                <Marker 
                  key={p.id} 
                  position={[
                    p.location.coordinates[1], 
                    p.location.coordinates[0] 
                  ]} 
                >
                  <Popup className="custom-shop-popup">
                    <div className="w-48 text-xs font-sans text-slate-700">
                      <div className="font-bold text-sm text-slate-900 mb-0.5 truncate">{p.sellerName || "Local Creator"}</div>
                      <div className="text-slate-500 mb-2 truncate">📍 {p.distance} km away</div>
                      
                      <div className="flex gap-2 items-center mb-2 bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                        {p.images && p.images[0] ? (
                          <img src={p.images[0]} alt={p.name} className="w-8 h-8 rounded object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded bg-slate-200 flex-shrink-0" />
                        )}
                        <div className="truncate">
                          <span className="font-bold block truncate text-slate-800">{p.name}</span>
                          <span className="text-[#FF6B35] font-bold">₹{p.price}</span>
                        </div>
                      </div>

                      <div className="flex gap-2 mt-3">
                        <button 
                          onClick={(e) => { e.stopPropagation(); onViewProduct(p); }}
                          className="flex-1 bg-slate-900 hover:bg-slate-800 text-white py-1.5 rounded-md font-bold transition-colors"
                        >
                          View Shop
                        </button>
                        <a 
                          href={`https://maps.google.com/?q=${p.location.coordinates[1]},${p.location.coordinates[0]}`}
                          target="_blank" rel="noopener noreferrer"
                          className="flex-1 bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-100 py-1.5 rounded-md font-bold text-center transition-colors block"
                        >
                          Directions
                        </a>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              )
            })}
          </MapContainer>
        )}
        
        {/* Radius Controls Overlay */}
        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm p-1 rounded-full border border-gray-200 shadow-sm flex items-center z-[1000]">
          {[1, 5, 10, 20].map(r => (
            <button
              key={r}
              onClick={() => setMapRadius(r)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${mapRadius === r ? 'bg-[#FF6B35] text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              {r} km
            </button>
          ))}
        </div>
        
        {/* Helper text overlay */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-gray-900/80 text-white px-4 py-2 rounded-full text-xs font-semibold backdrop-blur-sm z-[1000] pointer-events-none shadow-lg">
          Click anywhere on the map to change your location
        </div>
      </div>

      {/* Products Below Map */}
      <div>
        <div className="flex items-center gap-4 mb-6">
          <h2 className="text-[24px] font-extrabold text-[#1F2937]">Found {filteredProducts.length} Products</h2>
          {loading && <Loader2 className="w-5 h-5 text-[#FF6B35] animate-spin" />}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 pb-6">
          {filteredProducts.map(p => (
            <ProductCard 
              key={p.id} 
              product={p} 
              onView={onViewProduct} 
              onAddToCart={onAddToCart} 
              onToggleWishlist={onToggleWishlist}
              isWishlisted={wishlistIds.has(p.id || '')}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
