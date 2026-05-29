'use client';

import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { MapPin, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface NominatimResult {
  place_id: string;
  display_name: string;
  address: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    county?: string;
    state?: string;
    country?: string;
  };
}

interface Props {
  value: string;
  onChange: (value: string, isValid: boolean) => void;
  disabled?: boolean;
  placeholder?: string;
  label?: string;
}

export function LocationAutocomplete({ value, onChange, disabled, placeholder, label }: Props) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [isSelected, setIsSelected] = useState(false); // true only when picked from dropdown
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (query.length < 2) {
      setResults([]); setOpen(false); setNotFound(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setNotFound(false);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=6&addressdetails=1`,
          { headers: { 'Accept-Language': 'en' } }
        );
        const data: NominatimResult[] = await res.json();
        setResults(data);
        setOpen(data.length > 0);
        setNotFound(data.length === 0);
      } catch {
        setResults([]);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => clearTimeout(debounceRef.current);
  }, [query]);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    // Block numbers entirely
    const cleaned = e.target.value.replace(/[0-9]/g, '');
    setQuery(cleaned);
    setIsSelected(false);        // user is typing — no longer a valid selection
    onChange(cleaned, false);
    setNotFound(false);
  }

  function handleSelect(r: NominatimResult) {
    const addr = r.address;
    const city = addr.city || addr.town || addr.village || addr.municipality || addr.county || addr.state || '';
    const country = addr.country || '';
    const locationStr = city && country
      ? `${city}, ${country}`
      : r.display_name.split(',').slice(0, 2).join(',').trim();
    setQuery(locationStr);
    setIsSelected(true);
    onChange(locationStr, true);
    setOpen(false);
    setResults([]);
    setNotFound(false);
  }

  const showError = query.length >= 2 && !loading && !isSelected && !open;

  return (
    <div ref={wrapperRef} className="relative">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label} <span className="text-red-500">*</span>
        </label>
      )}
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        <Input
          value={query}
          onChange={handleInputChange}
          placeholder={placeholder || 'Search city or country...'}
          disabled={disabled}
          className={`pl-9 pr-9 ${showError ? 'border-red-400 focus-visible:ring-red-400' : isSelected ? 'border-green-400 focus-visible:ring-green-400' : ''}`}
        />
        {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />}
        {!loading && isSelected && <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />}
        {!loading && showError && query.length > 0 && <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-red-400" />}
      </div>

      {/* Suggestions dropdown */}
      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-xl max-h-64 overflow-auto">
          {results.map((r) => {
            const addr = r.address;
            const city = addr.city || addr.town || addr.village || addr.municipality || addr.county || addr.state || '';
            const country = addr.country || '';
            const main = city || r.display_name.split(',')[0];
            const sub = country || r.display_name.split(',').slice(1, 3).join(',').trim();
            return (
              <button
                key={r.place_id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(r)}
                className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left hover:bg-blue-50 border-b border-gray-100 last:border-0 transition-colors"
              >
                <MapPin className="h-3.5 w-3.5 text-[#0077b6] mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{main}</p>
                  {sub && <p className="text-xs text-gray-400 truncate">{sub}</p>}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Not found */}
      {notFound && !loading && query.length >= 2 && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-red-100 bg-red-50 shadow-xl px-4 py-3 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-500">No location found for &quot;{query}&quot; — try a different name</p>
        </div>
      )}

      {/* Hint: must select from list */}
      {showError && !notFound && query.length >= 2 && (
        <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" /> Please select a location from the suggestions
        </p>
      )}
    </div>
  );
}
