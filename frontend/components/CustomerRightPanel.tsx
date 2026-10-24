import React, { useState } from 'react';
import { ChevronDown, SlidersHorizontal, MapPin } from 'lucide-react';
import { CATEGORIES } from '@shared/constants';

interface CustomerRightPanelProps {
  onFilterChange: (filters: any) => void;
  topCreators: any[];
}

export default function CustomerRightPanel({ onFilterChange, topCreators }: CustomerRightPanelProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [priceRange, setPriceRange] = useState<number>(2000);
  const [onlyNearby, setOnlyNearby] = useState(false);
  const [freeDelivery, setFreeDelivery] = useState(false);

  // Take the first 4 categories for the quick filter
  const topCategories = CATEGORIES.slice(0, 4);

  const handleCategorySelect = (categoryName: string | null) => {
    setSelectedCategory(categoryName);
    onFilterChange({ category: categoryName, priceRange, onlyNearby, freeDelivery });
  };

  return (
    <div className="hidden lg:flex w-[300px] h-[calc(100vh-72px)] bg-white border-l border-[#EAEAEA] flex-col fixed right-0 top-[72px] overflow-y-auto custom-scrollbar z-40 p-5">
      
      {/* Filter & Sort */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-900 text-lg">Filter & Sort</h3>
        <button onClick={() => {
          setSelectedCategory(null);
          setPriceRange(2000);
          setOnlyNearby(false);
          setFreeDelivery(false);
          onFilterChange({});
        }} className="text-xs font-semibold text-blue-600 hover:text-blue-700">Clear All</button>
      </div>

      <div className="mb-4">
        <label className="text-sm font-semibold text-gray-700 block mb-2">Sort By</label>
        <div className="relative">
          <select className="w-full appearance-none bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#FF6B35] focus:border-[#FF6B35]">
            <option>Nearest First</option>
            <option>Top Rated</option>
            <option>Price: Low to High</option>
            <option>Price: High to Low</option>
          </select>
          <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      <div className="bg-[#F8F9FA] rounded-2xl p-5 mb-6 border border-[#EAEAEA]">
        <label className="text-sm font-bold text-[#1F2937] block mb-4">Category</label>
        <div className="flex flex-col gap-2">
          <button 
            onClick={() => handleCategorySelect(null)}
            className="flex items-center gap-3 w-full group"
          >
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${selectedCategory === null ? 'border-[#FF6B35] bg-[#FF6B35]' : 'border-gray-300 group-hover:border-[#FF6B35]'}`}>
              {selectedCategory === null && <div className="w-2 h-2 bg-white rounded-full"></div>}
            </div>
            <span className={`text-[14px] font-medium ${selectedCategory === null ? 'text-[#1F2937]' : 'text-gray-600'}`}>All Products</span>
          </button>
          
          {topCategories.map(cat => {
            const isSelected = selectedCategory === cat.name;
            return (
              <button 
                key={cat.id}
                onClick={() => handleCategorySelect(cat.name)}
                className="flex items-center gap-3 w-full group mt-2"
              >
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? 'border-[#FF6B35] bg-[#FF6B35]' : 'border-gray-300 group-hover:border-[#FF6B35]'}`}>
                  {isSelected && <div className="w-2 h-2 bg-white rounded-full"></div>}
                </div>
                <span className={`text-[14px] font-medium flex items-center gap-2 ${isSelected ? 'text-[#1F2937]' : 'text-gray-600'}`}>
                  <span>{cat.icon}</span> {cat.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-[#F8F9FA] rounded-2xl p-5 mb-6 border border-[#EAEAEA]">
        <label className="text-sm font-bold text-[#1F2937] block mb-2">Price Range</label>
        <div className="relative pt-4 pb-2">
          <input 
            type="range" 
            min="0" 
            max="2000" 
            step="100"
            value={priceRange} 
            onChange={(e) => {
              const val = parseInt(e.target.value);
              setPriceRange(val);
              onFilterChange({ category: selectedCategory, priceRange: val, onlyNearby, freeDelivery });
            }}
            className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#FF6B35]"
          />
          <div className="absolute top-1.5 h-1.5 bg-[#FF6B35] rounded-l-lg pointer-events-none" style={{ width: `${(priceRange / 2000) * 100}%` }} />
        </div>
        <div className="flex justify-between text-[13px] font-bold text-gray-500 mt-2">
          <span>₹0</span>
          <span>₹{priceRange}{priceRange === 2000 ? '+' : ''}</span>
        </div>
      </div>

      <div className="bg-[#F8F9FA] rounded-2xl p-5 mb-8 border border-[#EAEAEA] space-y-5">
        <div className="flex items-center justify-between">
          <span className="text-[14px] font-bold text-[#1F2937]">Only Nearby</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" checked={onlyNearby} onChange={(e) => { setOnlyNearby(e.target.checked); onFilterChange({ category: selectedCategory, priceRange, onlyNearby: e.target.checked, freeDelivery }); }} />
            <div className="w-10 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#FF6B35]"></div>
          </label>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[14px] font-bold text-[#1F2937]">Free Delivery</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" checked={freeDelivery} onChange={(e) => { setFreeDelivery(e.target.checked); onFilterChange({ category: selectedCategory, priceRange, onlyNearby, freeDelivery: e.target.checked }); }} />
            <div className="w-10 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#FF6B35]"></div>
          </label>
        </div>
      </div>

      {/* Free Delivery Promo */}
      <div className="bg-[#FFF4E5] rounded-2xl p-4 mb-8 relative overflow-hidden">
        <h4 className="font-bold text-gray-900 mb-1">Free Delivery</h4>
        <p className="text-xs text-gray-600 mb-3">On orders above ₹499</p>
        <button className="bg-[#FF6B35] text-white text-[11px] font-semibold px-4 py-1.5 rounded-full shadow-sm hover:bg-orange-600 transition-colors">
          Shop Now
        </button>
        {/* Placeholder for scooter illustration */}
        <div className="absolute right-0 bottom-0 text-5xl translate-x-2 translate-y-1">
          🛵
        </div>
      </div>

      {/* Top Creators */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900">Top Creators Near You</h3>
          <button className="text-[11px] font-semibold text-blue-600 hover:text-blue-700">View All</button>
        </div>
        <div className="space-y-4">
          {topCreators.slice(0, 4).map((creator, i) => (
            <div key={i} className="flex items-center gap-3 group cursor-pointer">
              <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden relative">
                <img src={creator.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(creator.businessName)}&background=random`} alt={creator.businessName} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-gray-900 truncate">{creator.businessName}</h4>
                  {i < 2 && (
                    <span className="text-[8px] bg-green-100 text-green-700 font-bold px-1.5 py-0.5 rounded uppercase">Top Rated</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mt-0.5">
                  <span className="text-yellow-400">★</span>
                  <span className="font-medium text-gray-700">{creator.rating || '4.8'} <span className="text-gray-400">({creator.reviews || '120'})</span></span>
                  <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                  <MapPin className="w-3 h-3" />
                  <span>{creator.distance || '1.2 km'}</span>
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-400 -rotate-90 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
