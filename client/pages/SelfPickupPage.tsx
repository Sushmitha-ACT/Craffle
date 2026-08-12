import React, { useState } from 'react';
import { MapPin, ArrowLeft, User, Phone, Mail } from 'lucide-react';
import { CartItem } from '@shared/types';

interface SelfPickupPageProps {
  items: CartItem[];
  user: any;
  gps: { lat: number; lon: number; name: string };
  onPlaceOrder: (details: any) => void;
  onBack: () => void;
}

export default function SelfPickupPage({ items, user, gps, onPlaceOrder, onBack }: SelfPickupPageProps) {
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [email, setEmail] = useState(user?.email || '');
  const [locationRevealed, setLocationRevealed] = useState(false);
  const [sellerLocation, setSellerLocation] = useState<{lat: number, lon: number, address: string} | null>(null);

  if (!items || items.length === 0) return null;
  const item = items[0];

  const handleRevealLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) {
      alert("Please enter your name and phone number.");
      return;
    }
    
    // Fetch seller location
    try {
      const actualSellerId = typeof item.sellerId === 'object' && item.sellerId !== null 
        ? ((item.sellerId as any)._id || (item.sellerId as any).id || item.sellerId) 
        : item.sellerId;
        
      const res = await fetch(`/api/sellers/detail/${actualSellerId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.address) {
          setSellerLocation({
            lat: data.latitude ? parseFloat(data.latitude) : 0,
            lon: data.longitude ? parseFloat(data.longitude) : 0,
            address: data.address
          });
        }
      }
    } catch (err) {
      console.error(err);
    }

    setLocationRevealed(true);
  };

  const handleConfirmOrder = () => {
    onPlaceOrder({
      fulfillmentMethod: 'SELF_PICKUP',
      address: 'Self Pickup',
      phone,
      total: item.price * item.quantity,
      customerName: name,
      customerEmail: email
    });
  };

  return (
    <div className="page-enter bg-gray-50/50 min-h-screen pb-24 lg:pb-8 animate-fade-in w-full">
      <div className="max-w-xl mx-auto px-4 py-8">
        <button onClick={onBack} className="flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-gray-900 mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Product
        </button>

        <div className="bg-white rounded-[32px] p-8 lg:p-10 shadow-sm border border-gray-100">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-orange-100 text-[#FF6B35] rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
              <MapPin className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Request Self Pickup</h1>
            <p className="text-gray-600 font-medium">
              You're requesting to pick up <strong className="text-gray-900">{item.name}</strong> from <strong className="text-[#FF6B35]">{item.sellerName}</strong>.
            </p>
          </div>

          {!locationRevealed && (
            <div className="p-4 bg-orange-50 text-orange-800 rounded-2xl border border-orange-100 text-sm font-semibold mb-8 text-center leading-relaxed">
              Fill in your details below to reveal the exact pickup location and get directions.
            </div>
          )}

          <form onSubmit={handleRevealLocation} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">Your Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="w-5 h-5 text-gray-400" />
                </div>
                <input 
                  type="text" 
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:border-[#FF6B35] focus:ring-1 focus:ring-[#FF6B35] transition-all"
                  placeholder="Enter your name"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">Phone Number</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Phone className="w-5 h-5 text-gray-400" />
                </div>
                <input 
                  type="tel" 
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:border-[#FF6B35] focus:ring-1 focus:ring-[#FF6B35] transition-all"
                  placeholder="Enter your phone number"
                />
              </div>
            </div>

            <div className="pb-4">
              <label className="block text-sm font-bold text-gray-700 mb-1.5">Email Address (Optional)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="w-5 h-5 text-gray-400" />
                </div>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:border-[#FF6B35] focus:ring-1 focus:ring-[#FF6B35] transition-all"
                  placeholder="Enter your email"
                />
              </div>
            </div>

            {!locationRevealed ? (
              <button 
                type="submit"
                className="w-full bg-[#FF6B35] hover:bg-[#e65a2a] text-white py-4 rounded-xl font-extrabold text-base transition-all hover:-translate-y-0.5 shadow-md flex items-center justify-center gap-2"
              >
                Get Seller Location
              </button>
            ) : (
              <div className="space-y-4 pt-2">
                <div className="p-5 bg-green-50 rounded-2xl border border-green-100 space-y-3">
                  <h3 className="font-bold text-green-900 text-sm flex items-center gap-2">
                    <MapPin className="w-4 h-4" /> Pickup Location Revealed
                  </h3>
                  <p className="text-sm text-green-800 font-medium">
                    {sellerLocation?.address || 'Address not available.'}
                  </p>
                  {sellerLocation && sellerLocation.lat !== 0 && (
                    <button 
                      type="button"
                      onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${sellerLocation.lat},${sellerLocation.lon}`, '_blank')}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors w-full mt-2"
                    >
                      Open in Google Maps
                    </button>
                  )}
                </div>
                <button 
                  type="button"
                  onClick={handleConfirmOrder}
                  className="w-full bg-[#FF6B35] hover:bg-[#e65a2a] text-white py-4 rounded-xl font-extrabold text-base transition-all hover:-translate-y-0.5 shadow-md flex items-center justify-center gap-2"
                >
                  Confirm Order Request
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
