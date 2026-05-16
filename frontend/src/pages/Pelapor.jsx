import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import L from 'leaflet';
import api from '../utils/api';
import { MapPin, Upload, X, AlertCircle, Navigation, Camera, Crosshair } from 'lucide-react';
import toast from 'react-hot-toast';

// Helper functions from MonitoringMap
const getCategoryColor = (categoryName) => {
  if (!categoryName) return '#6b7280';
  const upper = categoryName.toUpperCase();
  if (upper === 'PERKERASAN' || upper.includes('PERKERASAN')) return '#f97316';
  if (upper === 'PJU') return '#eab308';
  if (upper === 'CCTV' || upper === 'PENGAWAS' || upper === 'KAMERA') return '#3b82f6';
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

const getGeometryType = (asset) => {
  const code = asset.asset_code || '';
  if (code.startsWith('KML-POLY-') || code.startsWith('GEO-POLY-') || code.startsWith('SHP-POLY-')) return 'Polygon';
  if (code.startsWith('KML-LINE-') || code.startsWith('GEO-LINE-') || code.startsWith('SHP-LINE-') || code.startsWith('GPX-LINE-')) return 'LineString';
  return 'Point';
};

const parseGeometry = (asset) => {
  if (!asset.description) return null;
  try {
    const geo = JSON.parse(asset.description);
    if (geo && geo.geometryType && Array.isArray(geo.coordinates)) return geo;
  } catch (_) {}
  return null;
};

// Haversine formula for distance calculation (in meters)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Calculate centroid of polygon coordinates
const calculateCentroid = (coordinates) => {
  if (!coordinates || coordinates.length === 0) return null;
  let sumLat = 0, sumLng = 0;
  coordinates.forEach(coord => {
    sumLat += coord[1]; // lat is second element in [lng, lat]
    sumLng += coord[0]; // lng is first element in [lng, lat]
  });
  return [sumLat / coordinates.length, sumLng / coordinates.length];
};

// Calculate midpoint of linestring coordinates
const calculateMidpoint = (coordinates) => {
  if (!coordinates || coordinates.length === 0) return null;
  const midIndex = Math.floor(coordinates.length / 2);
  return [coordinates[midIndex][1], coordinates[midIndex][0]]; // [lat, lng]
};

const Pelapor = () => {
  const { user } = useUser();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    asset_type: '',
    description: '',
    damage_level: 'ringan',
    latitude: null,
    longitude: null,
    photo: null,
    asset_id: null,
    asset_name: '',
    asset_layer: '',
    sta: ''
  });
  const [loading, setLoading] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [videoStream, setVideoStream] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [assets, setAssets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [nearbyAssets, setNearbyAssets] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [locationDenied, setLocationDenied] = useState(false);
  const [noAssetsNearby, setNoAssetsNearby] = useState(false);
  const [currentRadius, setCurrentRadius] = useState(100);
  const [usingFallback, setUsingFallback] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const userMarkerRef = useRef(null);
  const radiusCircleRef = useRef(null);
  const assetMarkersRef = useRef([]);
  const watchIdRef = useRef(null);
  const isKaryawan = user?.role === 'karyawan';

  useEffect(() => {
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapRef.current, {
        center: [-6.2347001, 106.9321978],
        zoom: 14,
        scrollWheelZoom: true,
        layers: [],
      });

      // Use Topographic layer only
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri &amp; the GIS User Community',
        maxZoom: 19,
      }).addTo(mapInstanceRef.current);

      mapInstanceRef.current.on('click', handleMapClick);

      setTimeout(() => {
        mapInstanceRef.current.invalidateSize();
      }, 100);
    }

    // For Karyawan: enable smart location detection
    if (isKaryawan && navigator.geolocation) {
      console.log('[DEBUG] Starting geolocation for Karyawan role');
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          console.log('[DEBUG] Geolocation success:', latitude, longitude);
          setUserLocation({ lat: latitude, lng: longitude });
          mapInstanceRef.current.setView([latitude, longitude], 18); // Auto zoom to level 18
          updateUserLocationMarker(latitude, longitude);
          updateRadiusCircle(latitude, longitude, 100);
        },
        (error) => {
          console.log('[DEBUG] Geolocation error:', error);
          setLocationDenied(true);
          toast.error('Izin lokasi ditolak. Menggunakan lokasi default area proyek.');
          // Fallback to default project location
          const DEFAULT_LAT = -6.2088;
          const DEFAULT_LNG = 106.8456;
          setUserLocation({ lat: DEFAULT_LAT, lng: DEFAULT_LNG });
          mapInstanceRef.current.setView([DEFAULT_LAT, DEFAULT_LNG], 13);
          updateUserLocationMarker(DEFAULT_LAT, DEFAULT_LNG);
          updateRadiusCircle(DEFAULT_LAT, DEFAULT_LNG, 100);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );

      // Watch position for real-time updates
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          console.log('[DEBUG] Geolocation watch update:', latitude, longitude);
          setUserLocation({ lat: latitude, lng: longitude });
          updateUserLocationMarker(latitude, longitude);
          // Radius circle will be updated by filterAssetsByRadius
          filterAssetsByRadius(latitude, longitude);
        },
        (error) => {
          console.log('[DEBUG] Geolocation watch error:', error);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
      );
    } else if (!isKaryawan) {
      // Non-karyawan: use original behavior
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            mapInstanceRef.current.setView([latitude, longitude], 15);
            addMarker(latitude, longitude);
          },
          (error) => {
            console.log('Geolocation error:', error);
          }
        );
      }
    }

    // Fetch assets for Karyawan
    if (isKaryawan) {
      fetchAssets();
      fetchCategories();
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [isKaryawan]);

  useEffect(() => {
    if (isKaryawan && userLocation) {
      filterAssetsByRadius(userLocation.lat, userLocation.lng);
    }
  }, [assets, userLocation, isKaryawan, selectedCategory]);

  const handleMapClick = (e) => {
    const { lat, lng } = e.latlng;
    addMarker(lat, lng);
  };

  const handleGPSClick = () => {
    if (!navigator.geolocation) {
      toast.error('Browser Anda tidak mendukung geolocation');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        mapInstanceRef.current.setView([latitude, longitude], 18); // Auto zoom to level 18
        addMarker(latitude, longitude);
        setUserLocation({ lat: latitude, lng: longitude });
        updateUserLocationMarker(latitude, longitude);
        updateRadiusCircle(latitude, longitude, 100);
        filterAssetsByRadius(latitude, longitude);
      },
      (error) => {
        console.error('Geolocation error:', error);
        toast.error('Gagal mendapatkan lokasi. Pastikan GPS aktif.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const fetchAssets = async () => {
    try {
      console.log('[DEBUG] Fetching assets from API...');
      const response = await api.get('/assets', { params: { limit: 9999 } });
      const data = response.data.data || [];
      console.log('[DEBUG] API Response - Total assets fetched:', data.length);
      console.log('[DEBUG] Sample asset data:', data[0]);
      setAssets(data);
    } catch (error) {
      console.error('[DEBUG] Error fetching assets:', error);
      toast.error('Gagal mengambil data aset');
    }
  };

  const fetchCategories = async () => {
    try {
      console.log('[DEBUG] Fetching categories from API...');
      const response = await api.get('/categories', { params: { limit: 9999 } });
      const data = response.data.data || [];
      console.log('[DEBUG] API Response - Total categories fetched:', data.length);
      console.log('[DEBUG] Categories:', data);
      setCategories(data);
    } catch (error) {
      console.error('[DEBUG] Error fetching categories:', error);
    }
  };

  const updateUserLocationMarker = (lat, lng) => {
    console.log('[DEBUG] updateUserLocationMarker called:', lat, lng);
    if (userMarkerRef.current) {
      mapInstanceRef.current.removeLayer(userMarkerRef.current);
    }

    const userIcon = L.divIcon({
      className: 'custom-user-icon',
      html: `<div style="background: #3b82f6; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });

    userMarkerRef.current = L.marker([lat, lng], { icon: userIcon }).addTo(mapInstanceRef.current);
    console.log('[DEBUG] User marker added to map');
  };

  const updateRadiusCircle = (lat, lng, radius = 50) => {
    console.log('[DEBUG] updateRadiusCircle called:', lat, lng, 'radius:', radius);
    if (radiusCircleRef.current) {
      mapInstanceRef.current.removeLayer(radiusCircleRef.current);
    }

    radiusCircleRef.current = L.circle([lat, lng], {
      color: '#3b82f6',
      fillColor: '#3b82f6',
      fillOpacity: 0.1,
      radius: radius
    }).addTo(mapInstanceRef.current);
    console.log('[DEBUG] Radius circle added to map');
  };

  const filterAssetsByRadius = (userLat, userLng) => {
    console.log('[DEBUG] filterAssetsByRadius called with user location:', userLat, userLng);
    console.log('[DEBUG] Selected category filter:', selectedCategory);
    console.log('[DEBUG] Total assets loaded:', assets?.length || 0);

    if (!assets || assets.length === 0) {
      console.log('[DEBUG] No assets to filter');
      return;
    }

    const RADIUS_METERS = 100; // 100 meters for clickable area
    let assetsToFilter = assets;

    // Filter by category if selected
    if (selectedCategory) {
      assetsToFilter = assets.filter(asset => asset.category_id === selectedCategory);
      console.log('[DEBUG] Assets after category filter:', assetsToFilter.length);
    }

    const nearby = [];
    const allAssets = [];

    assetsToFilter.forEach((asset, index) => {
      let assetLat = asset.location_lat;
      let assetLng = asset.location_lng;
      let assetCenter = null;

      // For polygons and linestrings, calculate centroid/midpoint
      const geoType = getGeometryType(asset);
      const geometry = parseGeometry(asset);
      
      if (geoType === 'Polygon' && geometry) {
        assetCenter = calculateCentroid(geometry.coordinates);
      } else if (geoType === 'LineString' && geometry) {
        assetCenter = calculateMidpoint(geometry.coordinates);
      }

      if (assetCenter) {
        assetLat = assetCenter[0];
        assetLng = assetCenter[1];
      }

      if (assetLat === null || assetLng === null) {
        console.log(`[DEBUG] Asset ${index} (${asset.name}) has no valid coordinates`);
        return;
      }

      const distance = calculateDistance(userLat, userLng, assetLat, assetLng);
      console.log(`[DEBUG] Asset ${index} (${asset.name}): distance = ${distance.toFixed(2)}m, category: ${asset.category_name}`);

      const assetWithDistance = { ...asset, distance, lat: assetLat, lng: assetLng };
      allAssets.push(assetWithDistance);

      if (distance <= RADIUS_METERS) {
        nearby.push(assetWithDistance);
      }
    });

    console.log('[DEBUG] Total assets to render:', allAssets.length);
    console.log('[DEBUG] Assets within 100m radius (clickable):', nearby.length);

    setCurrentRadius(100);
    updateRadiusCircle(userLat, userLng, 100);
    setUsingFallback(false);

    setNearbyAssets(nearby);
    setNoAssetsNearby(nearby.length === 0);

    // Update asset markers on map - show ALL markers
    updateAssetMarkers(allAssets, nearby);
  };

  const updateAssetMarkers = (assetsToShow, nearbyAssets) => {
    console.log('[DEBUG] updateAssetMarkers called with', assetsToShow.length, 'assets to show');
    console.log('[DEBUG] Nearby assets (clickable):', nearbyAssets?.length || 0);
  
    // Remove existing asset markers
    assetMarkersRef.current.forEach(marker => {
      mapInstanceRef.current.removeLayer(marker);
    });
    assetMarkersRef.current = [];

    if (assetsToShow.length === 0) {
      console.log('[DEBUG] No assets to render');
      return;
    }

    // Create a set of nearby asset IDs for quick lookup
    const nearbyIds = new Set(nearbyAssets?.map(a => a.id) || []);

    // Add new markers for all assets
    assetsToShow.forEach((asset, index) => {
      const lat = parseFloat(asset.location_lat);
      const lng = parseFloat(asset.location_lng);

      if (isNaN(lat) || isNaN(lng)) {
        console.log(`[DEBUG] Asset ${index} has no valid coordinates, skipping`);
        return;
      }

      const geoType = getGeometryType(asset);
      const geometry = parseGeometry(asset);
      const color = getCategoryColor(asset.category_name);
      const isClickable = nearbyIds.has(asset.id);
      const distance = asset.distance;

      console.log(`[DEBUG] Rendering marker ${index} (${asset.name}): type=${geoType}, clickable=${isClickable}`);

      // Popup content
      const geoLabel = geoType === 'Polygon' ? '⬡ Polygon' : geoType === 'LineString' ? '╌ Garis' : '● Titik';
      const popupContent = `
        <div style="min-width:150px;font-family:Inter,sans-serif">
          <h3 style="font-weight:700;color:#1f2937;font-size:14px;margin:0 0 4px 0">${asset.name || asset.category_name || 'N/A'}</h3>
          <p style="font-size:11px;color:#6b7280;margin:0"><b>Layer:</b> ${asset.category_name || '-'}</p>
          <p style="font-size:11px;color:#6b7280;margin:2px 0"><b>Tipe:</b> ${geoLabel}</p>
          <p style="margin: 4px 0; font-size: 11px; color: ${isClickable ? '#10b981' : '#9ca3af'};">
            ${isClickable ? '✓ Dalam radius 100m (klik untuk pilih)' : `✗ Diluar radius 100m (${distance?.toFixed(0)}m)`}
          </p>
        </div>
      `;

      let marker;

      if (geoType === 'Polygon' && geometry) {
        // Render as L.polygon
        const latLngs = geometry.coordinates.map(c => [c[1], c[0]]);
        marker = L.polygon(latLngs, {
          color: isClickable ? color : '#9ca3af',
          weight: isClickable ? 2 : 1,
          opacity: isClickable ? 0.9 : 0.5,
          fillColor: isClickable ? color : '#9ca3af',
          fillOpacity: isClickable ? 0.2 : 0.1,
        });
      } else if (geoType === 'LineString' && geometry) {
        // Render as L.polyline
        const latLngs = geometry.coordinates.map(c => [c[1], c[0]]);
        marker = L.polyline(latLngs, {
          color: isClickable ? color : '#9ca3af',
          weight: isClickable ? 3 : 2,
          opacity: isClickable ? 0.9 : 0.5,
        });
      } else {
        // Default: circleMarker for Point
        marker = L.circleMarker([lat, lng], {
          radius: isClickable ? 5 : 4,
          fillColor: isClickable ? color : '#9ca3af',
          fillOpacity: isClickable ? 0.9 : 0.5,
          color: isClickable ? '#ffffff' : '#9ca3af',
          weight: isClickable ? 2 : 1,
        });
      }

      // Only add click handler if within radius
      if (isClickable) {
        marker.on('click', () => handleAssetClick(asset));
      }

      marker.bindPopup(popupContent);

      // Add tooltip for better UX
      marker.bindTooltip(asset.name || asset.category_name || 'N/A', {
        direction: 'top',
        offset: [0, geoType === 'Point' ? -10 : 0],
        className: 'asset-tooltip'
      });

      marker.addTo(mapInstanceRef.current);
      assetMarkersRef.current.push(marker);
    });

    console.log('[DEBUG] Total markers rendered:', assetMarkersRef.current.length);
  };

  const handleAssetClick = (asset) => {
    // Use pre-calculated coordinates from filterAssetsByRadius
    const assetLat = asset.lat || asset.location_lat;
    const assetLng = asset.lng || asset.location_lng;

    console.log('[DEBUG] handleAssetClick called for asset:', asset.name);
    console.log('[DEBUG] Asset coordinates:', assetLat, assetLng);

    setFormData(prev => ({
      ...prev,
      latitude: assetLat,
      longitude: assetLng,
      asset_id: asset.id,
      asset_name: asset.name || '',
      asset_layer: asset.category_name || '',
      sta: asset.sta || '',
      asset_type: asset.category_name || prev.asset_type
    }));

    // Add marker at asset location
    addMarker(assetLat, assetLng);

    toast.success(`Aset "${asset.name}" dipilih`);
  };

  const mapCategoryToAssetType = (categoryName) => {
    if (!categoryName) return '';
    const category = categoryName.toLowerCase();
    if (category.includes('perkerasan')) return 'Perkerasan';
    if (category.includes('pju')) return 'PJU';
    if (category.includes('cctv') || category.includes('pengawas') || category.includes('kamera')) return 'CCTV';
    if (category.includes('rambu')) return 'Rambu';
    if (category.includes('panel')) return 'Panel';
    if (category.includes('kwh')) return 'KWH';
    return '';
  };

  const addMarker = (lat, lng) => {
    if (markerRef.current) {
      mapInstanceRef.current.removeLayer(markerRef.current);
    }

    markerRef.current = L.marker([lat, lng]).addTo(mapInstanceRef.current);
    setFormData(prev => ({
      ...prev,
      latitude: lat,
      longitude: lng
    }));
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('File harus berupa gambar (JPG, PNG, dll)');
      return;
    }
    
    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error('Ukuran file terlalu besar. Maksimal 5MB');
      return;
    }
    
    // Create preview
    try {
      const previewUrl = URL.createObjectURL(file);
      setFormData(prev => ({ ...prev, photo: file }));
      setPreviewPhoto(previewUrl);
      console.log('Photo selected:', { name: file.name, size: file.size, type: file.type });
    } catch (error) {
      console.error('Error creating preview:', error);
      toast.error('Gagal memuat preview foto');
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      
      setVideoStream(stream);
      setShowCamera(true);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Camera error:', error);
      toast.error('Gagal mengakses kamera: ' + error.message);
    }
  };

  const stopCamera = () => {
    if (videoStream) {
      videoStream.getTracks().forEach(track => track.stop());
      setVideoStream(null);
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (!video || !canvas) {
      toast.error('Video atau canvas tidak tersedia');
      return;
    }
    
    try {
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' });
          setFormData(prev => ({ ...prev, photo: file }));
          setPreviewPhoto(URL.createObjectURL(file));
          stopCamera();
          toast.success('Foto berhasil diambil');
        } else {
          toast.error('Gagal menangkap foto');
        }
      }, 'image/jpeg', 0.9);
    } catch (error) {
      console.error('Capture error:', error);
      toast.error('Gagal menangkap foto: ' + error.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.latitude || !formData.longitude) {
      toast.error('Silakan pilih lokasi pada peta');
      return;
    }

    setLoading(true);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('type', 'reports');
      formDataToSend.append('damage_level', formData.damage_level);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('location_lat', formData.latitude);
      formDataToSend.append('location_lng', formData.longitude);
      if (formData.photo) {
        formDataToSend.append('photo', formData.photo);
      }
      if (formData.asset_id) {
        formDataToSend.append('asset_id', formData.asset_id);
      }

      const response = await api.post('/reports', formDataToSend, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      // Check if response indicates success
      if (response.data && response.data.success) {
        toast.success('Laporan berhasil dikirim!');
        setFormData({
          asset_type: '',
          description: '',
          damage_level: 'ringan',
          latitude: null,
          longitude: null,
          photo: null,
          asset_id: null,
          asset_name: '',
          asset_layer: '',
          sta: ''
        });
        setPreviewPhoto(null);
        if (markerRef.current) {
          mapInstanceRef.current.removeLayer(markerRef.current);
          markerRef.current = null;
        }
      } else {
        toast.error(response.data?.message || 'Gagal mengirim laporan. Response tidak valid.');
      }
    } catch (error) {
      console.error('Error submitting report:', error);
      toast.error('Gagal mengirim laporan. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Form Laporan Kerusakan</h1>
        <p className="text-gray-400 mt-1">Laporkan kerusakan aset jalan tol yang Anda temukan</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Nama Pelapor
              </label>
              <input
                type="text"
                value={user?.full_name || user?.username}
                disabled
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-300"
              />
            </div>

            {isKaryawan && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Filter Kategori
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">Semua Kategori</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Nama Aset (Auto)
                  </label>
                  <input
                    type="text"
                    value={formData.asset_name}
                    disabled
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-300"
                    placeholder="Klik aset pada peta"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Jenis Aset / Layer (Auto)
                  </label>
                  <input
                    type="text"
                    value={formData.asset_layer}
                    disabled
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-300"
                    placeholder="Klik aset pada peta"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Tingkat Kerusakan *
              </label>
              <select
                value={formData.damage_level}
                onChange={(e) => setFormData(prev => ({ ...prev, damage_level: e.target.value }))}
                required
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="ringan">Ringan</option>
                <option value="sedang">Sedang</option>
                <option value="berat">Berat</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Deskripsi Kerusakan *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                required
                rows={4}
                placeholder="Jelaskan detail kerusakan yang Anda temukan..."
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Foto Kerusakan
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-orange-600 file:text-white file:cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <Camera className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
                <button
                  type="button"
                  onClick={startCamera}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  <Camera className="w-5 h-5" />
                </button>
              </div>
              {previewPhoto && (
                <div className="mt-3 relative">
                  <img src={previewPhoto} alt="Preview" className="w-full h-48 object-cover rounded-lg" />
                  <button
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, photo: null }));
                      setPreviewPhoto(null);
                    }}
                    className="absolute top-2 right-2 p-2 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {showCamera && (
              <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
                <div className="bg-gray-800 rounded-lg p-4 max-w-lg w-full mx-4">
                  <div className="relative mb-4 bg-black rounded-lg overflow-hidden">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full"
                      style={{ minHeight: '300px', objectFit: 'cover' }}
                      onLoadedMetadata={() => {
                        console.log('Video loaded, dimensions:', videoRef.current?.videoWidth, 'x', videoRef.current?.videoHeight);
                      }}
                    />
                    <canvas ref={canvasRef} className="hidden" />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={capturePhoto}
                      className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                    >
                      Ambil Foto
                    </button>
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-gray-700/50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-300 mb-2">
                <MapPin className="w-5 h-5 text-orange-500" />
                <span className="font-medium">Lokasi Terpilih:</span>
              </div>
              {formData.latitude && formData.longitude ? (
                <div className="text-sm text-gray-400">
                  <p>Latitude: {formData.latitude.toFixed(6)}</p>
                  <p>Longitude: {formData.longitude.toFixed(6)}</p>
                </div>
              ) : (
                <p className="text-sm text-gray-500">Klik pada peta untuk memilih lokasi</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
              {loading ? 'Mengirim...' : 'Kirim Laporan'}
            </button>
          </form>
        </div>

        {/* Map */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-700 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <MapPin className="w-5 h-5 text-orange-500" />
              {isKaryawan ? 'Pilih Aset Terdekat' : 'Pilih Lokasi Kerusakan'}
            </h2>
            {isKaryawan && (
              <button
                type="button"
                onClick={handleGPSClick}
                className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center"
              >
                <Crosshair className="w-4 h-4" />
              </button>
            )}
          </div>
            <p className="text-sm text-gray-400 mt-1">
              {isKaryawan ? 'Klik aset dalam radius 100m untuk melaporkan kerusakan' : 'Klik pada peta untuk menandai lokasi kerusakan'}
            </p>
            {isKaryawan && (
              <div className="mt-3 space-y-2">
                {locationDenied && (
                  <div className="flex items-center gap-2 text-yellow-400 text-sm bg-yellow-400/10 p-2 rounded-lg">
                    <AlertCircle className="w-4 h-4" />
                    <span>Izin lokasi ditolak. Menggunakan lokasi default area proyek.</span>
                  </div>
                )}
                {noAssetsNearby && userLocation && (
                  <div className="flex items-center gap-2 text-yellow-400 text-sm bg-yellow-400/10 p-2 rounded-lg">
                    <AlertCircle className="w-4 h-4" />
                    <span>Tidak ada aset dalam radius 100 meter dari lokasi Anda</span>
                  </div>
                )}
                {nearbyAssets.length > 0 && (
                  <div className="flex items-center gap-2 text-green-400 text-sm bg-green-400/10 p-2 rounded-lg">
                    <Navigation className="w-4 h-4" />
                    <span>{nearbyAssets.length} aset dapat dipilih dalam radius 100m</span>
                  </div>
                )}
                {assets.length > 0 && (
                  <div className="flex items-center gap-2 text-blue-400 text-sm bg-blue-400/10 p-2 rounded-lg">
                    <MapPin className="w-4 h-4" />
                    <span>Total {assets.length} aset tampil di peta</span>
                  </div>
                )}
              </div>
            )}
          </div>
          <div ref={mapRef} style={{ width: '100%', height: '500px' }} />
        </div>
      </div>
    </div>
  );
};

export default Pelapor;
