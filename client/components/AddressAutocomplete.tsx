import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Search, Loader2 } from 'lucide-react';

interface AddressSuggestion {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
}

interface AddressAutocompleteProps {
  initialValue?: string;
  onSelect: (address: string, lat: number, lng: number) => void;
}

export default function AddressAutocomplete({ initialValue = '', onSelect }: AddressAutocompleteProps) {
  const [query, setQuery] = useState(initialValue);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Sync initialValue when it changes (e.g. initial load)
  useEffect(() => {
    setQuery(initialValue);
  }, [initialValue]);

  // Debounced Search
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (query.length < 4) {
        setSuggestions([]);
        return;
      }
      
      // Prevent fetching if they just selected a suggestion (exact match check)
      if (suggestions.some(s => s.display_name === query)) {
        return;
      }

      setIsLoading(true);
      try {
        let currentQuery = query;
        let data: any[] = [];
        // Try 1: Exact query
        let res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=in`);
        data = await res.json();

        // Try 2: Cleaned query (remove leading house numbers, common OSM strict words, and pincodes)
        if (data.length === 0) {
          const cleaned = query
            .replace(/^(no\.?\s*\d+[\/\w]*|flat\s*\w+|door\s*no\.?\s*\d+[\/\w]*|#\s*\d+[\/\w]*|\d+[\/\w]+\s*)\s*/i, '')
            .replace(/\b(street|st|cross|main|road|nagar|puram)\b/ig, '')
            .replace(/\b\d{6}\b/g, '')
            .replace(/-\s*,?/g, '')
            .replace(/\s+/g, ' ')
            .replace(/,\s*,/g, ',')
            .trim();
            
          if (cleaned !== query && cleaned.length > 3) {
            res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleaned)}&limit=5&countrycodes=in`);
            data = await res.json();
          }
        }

        // Try 3: Drop parts iteratively
        if (data.length === 0) {
          let parts = query.split(',');
          while (parts.length > 1 && data.length === 0) {
            parts.shift();
            let fallback = parts.join(',').trim();
            fallback = fallback.replace(/\b\d{6}\b/g, '').replace(/-\s*,?/g, '').trim();
            
            if (fallback.length > 3) {
              res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fallback)}&limit=5&countrycodes=in`);
              data = await res.json();
            }
          }
        }

        // Always show the user's typed address, even if we had to strip it to find the location
        if (data.length > 0) {
          data = data.map((item: any) => ({
            ...item,
            display_name: `${query.split(',')[0].trim()}, ${item.display_name}`
          }));
        }

        setSuggestions(data);
        setIsOpen(true);
      } catch (err) {
        console.error("Autocomplete failed:", err);
      } finally {
        setIsLoading(false);
      }
    };

    const timer = setTimeout(() => {
      fetchSuggestions();
    }, 600); // 600ms debounce to respect Nominatim limits

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (suggestion: AddressSuggestion) => {
    setQuery(suggestion.display_name);
    setIsOpen(false);
    onSelect(suggestion.display_name, Number(suggestion.lat), Number(suggestion.lon));
  };

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          <Search className="w-5 h-5" />
        </div>
        <input 
          type="text" 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { if (suggestions.length > 0) setIsOpen(true); }}
          placeholder="Start typing your full address..."
          required
          className="w-full pl-10 pr-10 py-3 bg-white border border-[#F0E6D8] rounded-xl text-[14px] text-gray-800 focus:outline-none focus:border-[#FF6B35] focus:ring-2 focus:ring-[#FF6B35]/20 transition-all"
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        )}
      </div>

      {/* Dropdown menu */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-[#F0E6D8] rounded-xl shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.place_id}
              type="button"
              onClick={() => handleSelect(suggestion)}
              className="w-full text-left px-4 py-3 hover:bg-[#FFF4E6] flex items-start gap-3 border-b border-[#F0E6D8] last:border-0 transition-colors"
            >
              <MapPin className="w-4 h-4 mt-1 flex-shrink-0 text-[#8C4A1D]" />
              <div className="flex-1">
                <span className="text-[13px] text-gray-800 block line-clamp-2">
                  {suggestion.display_name}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
