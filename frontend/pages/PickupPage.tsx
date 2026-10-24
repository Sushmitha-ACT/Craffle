import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { ArrowLeft, MapPin, Phone, Clock, Navigation, ExternalLink, Info } from 'lucide-react';
import { Seller } from '@shared/types';

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

interface PickupPageProps {
  seller: Seller;
  onBack: () => void;
}



export default function PickupPage({ seller, onBack }: PickupPageProps) {
  // Safe default lat/lon
  const lat = seller.latitude || 12.8450;
  const lon = seller.longitude || 80.2250;

  // Link for direct navigation
  const mapsUrl = `https://maps.google.com/?q=${lat},${lon}`;

  return (
    <div className="space-y-6 pb-12 font-sans text-[#3D3A35] select-none" id="pickup_page_wrapper">
      
      {/* Back Header */}
      <button 
        onClick={onBack}
        className="inline-flex items-center gap-2 px-4 py-2 bg-[#FAF9F7] border border-[#EDE9E3] hover:bg-[#F5F2ED] rounded-xl text-xs font-bold transition-colors cursor-pointer"
        id="btn_pickup_back"
      >
        <ArrowLeft className="w-4 h-4 text-[#FF6B35]" />
        Back to Product Details
      </button>

      {/* Main Grid: Kitchen Details & Map */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 bg-white p-6 md:p-8 rounded-3xl border border-[#EDE9E3] shadow-sm">
        
        {/* LEFT COLUMN: KITCHEN METADATA (5 Columns) */}
        <div className="lg:col-span-5 space-y-6">
          <div>
            <span className="text-[10px] font-extrabold text-[#FF6B35] tracking-widest uppercase block mb-1">
              🟢 APPROVED HOME CREATOR PICKUP
            </span>
            <h2 className="text-2xl font-serif font-extrabold text-[#3D3A35]">
              {seller.name}
            </h2>
            <p className="text-xs text-[#7C756B] mt-1 font-medium">
              You are picking up directly from the creator's kitchen address to enjoy fresh cooking with zero delivery fees.
            </p>
          </div>

          <div className="space-y-4 border-t border-[#EDE9E3] pt-5">
            {/* Address Details */}
            <div className="flex items-start gap-3 text-xs leading-relaxed">
              <div className="p-2 bg-orange-50 text-[#FF6B35] rounded-xl border border-orange-100 shrink-0">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[9px] font-bold text-[#9A948A] uppercase tracking-wider block">KITCHEN PHYSICAL ADDRESS</span>
                <p className="font-extrabold text-[#3D3A35]">{seller.address}</p>
                <p className="text-[#7C756B]">Chennai, Tamil Nadu, India</p>
              </div>
            </div>

            {/* Contact details */}
            <div className="flex items-start gap-3 text-xs leading-relaxed">
              <div className="p-2 bg-orange-50 text-[#FF6B35] rounded-xl border border-orange-100 shrink-0">
                <Phone className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[9px] font-bold text-[#9A948A] uppercase tracking-wider block">CONTACT PHONE NUMBER</span>
                <p className="font-extrabold text-[#3D3A35]">{seller.phone}</p>
                <p className="text-[#7C756B]">Give a call before arriving to ensure hot packing</p>
              </div>
            </div>

            {/* Opening hours */}
            <div className="flex items-start gap-3 text-xs leading-relaxed">
              <div className="p-2 bg-orange-50 text-[#FF6B35] rounded-xl border border-orange-100 shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[9px] font-bold text-[#9A948A] uppercase tracking-wider block">OPENING OPERATIONAL HOURS</span>
                <p className="font-extrabold text-[#3D3A35]">09:00 AM - 09:00 PM</p>
                <p className="text-[#7C756B]">Monday to Sunday (All Days)</p>
              </div>
            </div>
          </div>

          {/* Action Button: Open Google Maps */}
          <div className="pt-4 border-t border-[#EDE9E3]">
            <a 
              href={mapsUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-full py-3 bg-[#FF6B35] hover:bg-orange-600 text-white font-extrabold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-sm text-center"
              id="btn_open_google_maps"
            >
              <Navigation className="w-4.5 h-4.5 text-white fill-white" />
              Open in Google Maps
              <ExternalLink className="w-3.5 h-3.5 opacity-80" />
            </a>
            <p className="text-[10px] text-center text-[#9A948A] mt-2 font-semibold">
              Tap above to get real-time GPS navigation instructions directly inside Google Maps app.
            </p>
          </div>
        </div>

        {/* RIGHT COLUMN: LIVE EMBEDDED MAP (7 Columns) */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <span className="text-[10px] font-extrabold text-[#7C756B] tracking-wider uppercase flex items-center gap-1">
              🗺️ LIVE EMBEDDED NAVIGATION MAP
            </span>
            <p className="text-xs text-[#7C756B] font-semibold">
              Kitchen Coordinates: <strong className="text-[#3D3A35]">{lat.toFixed(4)}, {lon.toFixed(4)}</strong>
            </p>
          </div>

          {/* Google Map Container with explicit Height to avoid Map Height Collapse */}
          <div className="relative w-full h-[360px] bg-[#FAF9F7] border border-[#EDE9E3] rounded-2xl overflow-hidden shadow-inner flex items-center justify-center z-0">
            <MapContainer 
              center={[lat, lon]} 
              zoom={15} 
              scrollWheelZoom={false}
              className="w-full h-full"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Marker position={[lat, lon]}>
                <Popup>{seller.name}</Popup>
              </Marker>
            </MapContainer>
          </div>

          {/* Security details */}
          <div className="p-3 bg-[#FAF9F7] border border-[#EDE9E3] rounded-xl text-xs flex items-center gap-2 text-[#7C756B]">
            <ShieldCheck className="w-4 h-4 text-[#FF6B35] shrink-0" />
            <span>
              All pickup details are verified. In case you face issues locating the kitchen, please call the support helpdesk instantly.
            </span>
          </div>

        </div>

      </div>

    </div>
  );
}

// Inline Icon Fallback to avoid import issues
function ShieldCheck({ className, ...props }: React.ComponentProps<'svg'>) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2.5" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
      {...props}
    >
      <path d="M20 13c0 5-3.5 7.5-7.66 9.7a1 1 0 0 1-.68 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 .76-.97l8-2a1 1 0 0 1 .48 0l8 2A1 1 0 0 1 20 6v7z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
