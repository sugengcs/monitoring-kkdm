import { useEffect, useState, useRef } from 'react';
import L from 'leaflet';
import { MapPin, Loader2 } from 'lucide-react';
import api from '../utils/api';

const getCategoryColor = (categoryName) => {
  if (!categoryName) return '#6b7280';
  const upper = categoryName.toUpperCase();
  if (upper === 'PERKERASAN' || upper.includes('PERKERASAN')) return '#f97316';
  if (upper === 'PJU') return '#eab308';
  if (upper === 'CCTV') return '#3b82f6';
  if (upper === 'RAMBU') return '#ef4444';
  if (upper === 'PANEL' || upper.includes('PANEL')) return '#a855f7';
  if (upper === 'KWH' || upper.includes('KWH')) return '#06b6d4';
  const palette = ['#22c55e', '#14b8a6', '#f43f5e', '#84cc16', '#6366f1', '#ec4899'];
  let hash = 0;
  for (let i = 0; i < categoryName.length; i++) {
    hash = categoryName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return palette[Math.abs(hash) % palette.length];
};

const getConditionColor = (condition) => {
  switch (condition) {
    case 'baik': return '#22c55e';
    case 'rusak_ringan':
    case 'rusak_berat': return '#ef4444';
    case 'sedang_diperbaiki': return '#3b82f6';
    case 'selesai_diperbaiki': return '#22c55e';
    default: return '#6b7280';
  }
};

const AssetPickerMap = ({ onAssetSelect }) => {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const userMarkerRef = useRef(null);
  const radiusCircleRef = useRef(null);
  const selectedMarkerRef = useRef(null);
  
  const [userLocation, setUserLocation] = useState(null);
  const [nearbyAssets, setNearbyAssets] = useState([]);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [noAssetsNearby, setNoAssetsNearby] = useState(false);

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  };

  const fetchAssets = async (userLat, userLng) => {
    try {
      const response = await api.get('/assets', { params: { limit: 9999 } });
      const assets = response.data.data || [];

      // Filter assets within 15 meters radius
      const filtered = assets.filter(asset => {
        const distance = calculateDistance(
          userLat,
          userLng,
          parseFloat(asset.location_lat),
          parseFloat(asset.location_lng)
        );
        return distance <= 15;
      });

      setNearbyAssets(filtered);
      setNoAssetsNearby(filtered.length === 0);
    } catch (err) {
      console.error('Error fetching assets:', err);
      setError('Gagal memuat data aset');
    }
  };

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ lat: latitude, lng: longitude });
          setLoading(false);
          fetchAssets(latitude, longitude);
        },
        (err) => {
          console.error('Geolocation error:', err);
          setError('Gagal mendapatkan lokasi. Pastikan izin lokasi diaktifkan.');
          setLoading(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    } else {
      setError('Browser tidak mendukung geolocation');
      setLoading(false);
    }
  };

  useEffect(() => {
    getUserLocation();
  }, []);

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current || !userLocation) return;

    const map = L.map(mapContainerRef.current, {
      center: [userLocation.lat, userLocation.lng],
      zoom: 19, // Maximum zoom for close-up view
      scrollWheelZoom: true,
      zoomControl: true,
    });

    // Dark mode tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20,
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [userLocation]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !userLocation) return;

    // Clear existing markers
    markersRef.current.forEach(marker => map.removeLayer(marker));
    markersRef.current = [];
    if (userMarkerRef.current) map.removeLayer(userMarkerRef.current);
    if (radiusCircleRef.current) map.removeLayer(radiusCircleRef.current);
    if (selectedMarkerRef.current) {
      map.removeLayer(selectedMarkerRef.current);
      selectedMarkerRef.current = null;
    }

    // Add user location marker
    const userIcon = L.divIcon({
      className: 'custom-user-marker',
      html: `<div style="
        width: 20px;
        height: 20px;
        background: #3b82f6;
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.3);
      "></div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });

    userMarkerRef.current = L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
      .addTo(map)
      .bindPopup('Lokasi Anda');

    // Add 15 meter radius circle
    radiusCircleRef.current = L.circle([userLocation.lat, userLocation.lng], {
      radius: 15,
      color: '#3b82f6',
      fillColor: '#3b82f6',
      fillOpacity: 0.1,
      weight: 2,
    }).addTo(map);

    // Add asset markers
    nearbyAssets.forEach(asset => {
      const lat = parseFloat(asset.location_lat);
      const lng = parseFloat(asset.location_lng);
      if (isNaN(lat) || isNaN(lng)) return;

      const color = getCategoryColor(asset.category_name);
      const condColor = getConditionColor(asset.condition_status);

      const isSelected = selectedAsset && selectedAsset.id === asset.id;

      const circle = L.circleMarker([lat, lng], {
        radius: isSelected ? 15 : 10,
        fillColor: isSelected ? '#f97316' : color,
        fillOpacity: isSelected ? 1 : 0.9,
        color: isSelected ? '#ffffff' : condColor,
        weight: isSelected ? 4 : 3,
      });

      circle.on('click', () => {
        setSelectedAsset(asset);
        onAssetSelect({
          assetId: asset.id,
          latitude: lat,
          longitude: lng,
          asset: asset
        });

        // Update marker styles
        markersRef.current.forEach(m => {
          const originalRadius = m.options.radius === 15 ? 10 : m.options.radius;
          const originalFillColor = m.options.fillColor === '#f97316' ? getCategoryColor(m.assetData?.category_name) : m.options.fillColor;
          const originalColor = m.options.color === '#ffffff' ? getConditionColor(m.assetData?.condition_status) : m.options.color;
          const originalWeight = m.options.weight === 4 ? 3 : m.options.weight;
          const originalFillOpacity = m.options.fillOpacity === 1 ? 0.9 : m.options.fillOpacity;

          m.setStyle({
            radius: originalRadius,
            fillColor: originalFillColor,
            color: originalColor,
            weight: originalWeight,
            fillOpacity: originalFillOpacity,
          });
        });

        circle.setStyle({
          radius: 15,
          fillColor: '#f97316',
          color: '#ffffff',
          weight: 4,
          fillOpacity: 1,
        });
        circle.bringToFront();
      });

      circle.assetData = asset;
      circle.addTo(map);
      markersRef.current.push(circle);
    });
  }, [userLocation, nearbyAssets, selectedAsset, onAssetSelect]);

  if (loading) {
    return (
      <div className="h-64 bg-gray-800 border border-gray-700 rounded-xl flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-orange-500 animate-spin mx-auto mb-2" />
          <p className="text-gray-400 text-sm">Mendapatkan lokasi Anda...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-64 bg-gray-800 border border-gray-700 rounded-xl flex items-center justify-center">
        <div className="text-center px-4">
          <MapPin className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="text-gray-400 text-sm">{error}</p>
          <button
            onClick={getUserLocation}
            className="mt-3 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm rounded-lg transition-colors"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-300">
          Pilih Aset (Radius 15m)
        </label>
        {selectedAsset && (
          <span className="text-xs text-orange-400 font-medium">
            {selectedAsset.name}
          </span>
        )}
      </div>
      
      <div 
        ref={mapContainerRef} 
        className="h-64 bg-gray-800 border border-gray-700 rounded-xl overflow-hidden"
      />

      {noAssetsNearby && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
          <p className="text-yellow-400 text-sm text-center">
            Tidak ada aset dalam radius 15 meter dari lokasi Anda
          </p>
        </div>
      )}

      {selectedAsset && (
        <div className="bg-gray-700/50 border border-gray-600 rounded-lg p-3">
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-orange-500 mt-2 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">
                {selectedAsset.name}
              </p>
              <p className="text-gray-400 text-xs mt-1">
                {selectedAsset.category_name} • {selectedAsset.asset_code}
              </p>
              <p className="text-gray-500 text-xs mt-1">
                Lat: {selectedAsset.location_lat}, Lng: {selectedAsset.location_lng}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssetPickerMap;
