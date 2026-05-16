import { useState, useRef, useEffect } from 'react';
import L from 'leaflet';
import { MapPin, Camera, AlertTriangle, Send, Crosshair } from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

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

const Karyawan = () => {
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
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const assetMarkersRef = useRef([]);

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
      
      // Try to get user's location
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            mapInstanceRef.current.setView([latitude, longitude], 18); // Auto zoom to level 18
            addMarker(latitude, longitude);
          },
          (error) => {
            console.log('Geolocation error:', error);
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      }

      // Fetch assets
      fetchAssets();
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (mapInstanceRef.current && assets.length > 0) {
      renderAssetMarkers();
    }
  }, [assets]);

  const handleMapClick = (e) => {
    const { lat, lng } = e.latlng;
    addMarker(lat, lng);
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

  const fetchAssets = async () => {
    try {
      const response = await api.get('/assets', { params: { limit: 9999 } });
      setAssets(response.data.data || []);
    } catch (error) {
      console.error('Error fetching assets:', error);
    }
  };

  const renderAssetMarkers = () => {
    // Remove existing asset markers
    assetMarkersRef.current.forEach(marker => {
      mapInstanceRef.current.removeLayer(marker);
    });
    assetMarkersRef.current = [];

    if (assets.length === 0) return;

    assets.forEach(asset => {
      const lat = parseFloat(asset.location_lat);
      const lng = parseFloat(asset.location_lng);

      if (isNaN(lat) || isNaN(lng)) return;

      const geoType = getGeometryType(asset);
      const geometry = parseGeometry(asset);
      const color = getCategoryColor(asset.category_name);

      let marker;

      if (geoType === 'Polygon' && geometry) {
        const latLngs = geometry.coordinates.map(c => [c[1], c[0]]);
        marker = L.polygon(latLngs, {
          color: color,
          weight: 2,
          opacity: 0.9,
          fillColor: color,
          fillOpacity: 0.2,
        });
      } else if (geoType === 'LineString' && geometry) {
        const latLngs = geometry.coordinates.map(c => [c[1], c[0]]);
        marker = L.polyline(latLngs, {
          color: color,
          weight: 3,
          opacity: 0.9,
        });
      } else {
        marker = L.circleMarker([lat, lng], {
          radius: 5,
          fillColor: color,
          fillOpacity: 0.9,
          color: '#ffffff',
          weight: 2,
        });
      }

      const geoLabel = geoType === 'Polygon' ? '⬡ Polygon' : geoType === 'LineString' ? '╌ Garis' : '● Titik';
      const popupContent = `
        <div style="min-width:150px;font-family:Inter,sans-serif">
          <h3 style="font-weight:700;color:#1f2937;font-size:14px;margin:0 0 4px 0">${asset.name || asset.category_name || 'N/A'}</h3>
          <p style="font-size:11px;color:#6b7280;margin:0"><b>Layer:</b> ${asset.category_name || '-'}</p>
          <p style="font-size:11px;color:#6b7280;margin:2px 0"><b>Tipe:</b> ${geoLabel}</p>
          <p style="font-size:11px;color:#10b981;margin:2px 0">Klik untuk pilih aset</p>
        </div>
      `;

      marker.bindPopup(popupContent);
      marker.bindTooltip(asset.name || asset.category_name || 'N/A', {
        direction: 'top',
        offset: [0, geoType === 'Point' ? -10 : 0],
      });

      // Add click handler to auto-fill form
      marker.on('click', () => handleAssetClick(asset));

      marker.addTo(mapInstanceRef.current);
      assetMarkersRef.current.push(marker);
    });
  };

  const handleAssetClick = (asset) => {
    let assetLat = asset.location_lat;
    let assetLng = asset.location_lng;

    // For polygons and linestrings, use centroid/midpoint
    const geoType = getGeometryType(asset);
    const geometry = parseGeometry(asset);
    
    if (geoType === 'Polygon' && geometry) {
      const coordinates = geometry.coordinates;
      let sumLat = 0, sumLng = 0;
      coordinates.forEach(coord => {
        sumLat += coord[1];
        sumLng += coord[0];
      });
      assetLat = sumLat / coordinates.length;
      assetLng = sumLng / coordinates.length;
    } else if (geoType === 'LineString' && geometry) {
      const coordinates = geometry.coordinates;
      const midIndex = Math.floor(coordinates.length / 2);
      assetLat = coordinates[midIndex][1];
      assetLng = coordinates[midIndex][0];
    }

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
  };

  const handleGPSClick = () => {
    if (!navigator.geolocation) {
      alert('Browser Anda tidak mendukung geolocation');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        mapInstanceRef.current.setView([latitude, longitude], 18); // Auto zoom to level 18
        addMarker(latitude, longitude);
      },
      (error) => {
        console.error('Geolocation error:', error);
        alert('Gagal mendapatkan lokasi. Pastikan GPS aktif.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
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
      alert('Silakan pilih lokasi pada peta');
      return;
    }

    if (!formData.damage_level) {
      alert('Silakan pilih tingkat kerusakan');
      return;
    }

    if (!formData.description || formData.description.trim() === '') {
      alert('Silakan isi deskripsi kerusakan');
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

      console.log('Submitting report with data:', {
        damage_level: formData.damage_level,
        description: formData.description,
        location_lat: formData.latitude,
        location_lng: formData.longitude,
        asset_id: formData.asset_id
      });

      const response = await api.post('/reports', formDataToSend, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      // Check if response indicates success
      if (response.data && response.data.success) {
        alert('Laporan berhasil dikirim!');
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
        alert(response.data?.message || 'Gagal mengirim laporan. Response tidak valid.');
      }
    } catch (error) {
      console.error('Error submitting report:', error);
      console.error('Error response:', error.response);
      console.error('Error data:', error.response?.data);
      console.error('Error status:', error.response?.status);
      const errorMessage = error.response?.data?.message || error.message || 'Gagal mengirim laporan. Silakan coba lagi.';
      alert(errorMessage);
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
                Nama Karyawan
              </label>
              <input
                type="text"
                value={user?.full_name || user?.username}
                disabled
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-300"
              />
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
              Pilih Lokasi Kerusakan
            </h2>
            <button
              type="button"
              onClick={handleGPSClick}
              className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center"
            >
              <Crosshair className="w-4 h-4" />
            </button>
          </div>
          <div ref={mapRef} style={{ width: '100%', height: '500px' }} />
        </div>
      </div>
    </div>
  );
};

export default Karyawan;
