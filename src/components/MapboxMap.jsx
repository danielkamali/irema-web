import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// Read public token from environment
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';

export default function MapboxMap({
  latitude,
  longitude,
  address,
  interactive = true,
  editable = false,
  onChange,
  height = '240px'
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  const [geocodingError, setGeocodingError] = useState(false);
  const [geocodingLoading, setGeocodingLoading] = useState(false);

  // Default Kigali center
  const KIGALI_LNG = 30.0619;
  const KIGALI_LAT = -1.9441;

  useEffect(() => {
    if (!MAPBOX_TOKEN) return;

    // Initialize mapbox access token
    mapboxgl.accessToken = MAPBOX_TOKEN;

    const initialLat = latitude ? Number(latitude) : null;
    const initialLng = longitude ? Number(longitude) : null;
    const hasCoords = initialLat !== null && !isNaN(initialLat) && initialLng !== null && !isNaN(initialLng);

    // 1. Setup Mapbox instance
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/streets-v11',
      center: hasCoords ? [initialLng, initialLat] : [KIGALI_LNG, KIGALI_LAT],
      zoom: hasCoords ? 15 : 12,
      interactive: interactive
    });

    mapRef.current = map;

    // Add navigation controls (zoom, rotate)
    if (interactive) {
      map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');
    }

    // 2. Setup Marker
    const marker = new mapboxgl.Marker({
      draggable: editable,
      color: '#2d8f6f' // Branded green color
    });

    if (hasCoords) {
      marker.setLngLat([initialLng, initialLat]).addTo(map);
    }
    markerRef.current = marker;

    // If editable, listen to drag events to update coordinates
    if (editable) {
      marker.on('dragend', () => {
        const lngLat = marker.getLngLat();
        if (onChange) {
          onChange({ lat: lngLat.lat, lng: lngLat.lng });
        }
      });

      // Allow clicking on map to place/move the marker
      map.on('click', (e) => {
        const { lng, lat } = e.lngLat;
        marker.setLngLat([lng, lat]).addTo(map);
        if (onChange) {
          onChange({ lat, lng });
        }
      });
    }

    // 3. Fallback Geocoding (if coordinates are missing but address is provided)
    if (!hasCoords && address) {
      geocodeAddress(address, map, marker);
    }

    // Clean up map resources on unmount
    return () => {
      map.remove();
    };
  }, [latitude, longitude, editable, interactive]);

  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (address && mapRef.current && markerRef.current) {
      geocodeAddress(address);
    }
  }, [address]);

  // Handle dynamic geocoding update when address changes (e.g. click "Find on Map")
  const geocodeAddress = async (searchAddress, mapInstance, markerInstance) => {
    if (!MAPBOX_TOKEN || !searchAddress?.trim()) return;

    const map = mapInstance || mapRef.current;
    const marker = markerInstance || markerRef.current;
    if (!map || !marker) return;

    setGeocodingLoading(true);
    setGeocodingError(false);

    try {
      // Clean query and append Rwanda for localization context
      const cleanAddress = searchAddress.toLowerCase().includes('rwanda')
        ? searchAddress
        : `${searchAddress}, Rwanda`;

      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(cleanAddress)}.json?access_token=${MAPBOX_TOKEN}&limit=1&country=rw`
      );

      if (!response.ok) throw new Error('Geocoding response failed');

      const data = await response.json();

      if (data.features && data.features.length > 0) {
        const [lng, lat] = data.features[0].center;
        
        // Center map & place marker
        map.flyTo({ center: [lng, lat], zoom: 15 });
        marker.setLngLat([lng, lat]).addTo(map);

        // Update parent state
        if (editable && onChange) {
          onChange({ lat, lng });
        }
      } else {
        setGeocodingError(true);
      }
    } catch (err) {
      console.warn('Geocoding error:', err);
      setGeocodingError(true);
    } finally {
      setGeocodingLoading(false);
    }
  };

  // Expose manual trigger function if needed via standard React patterns,
  // but triggering via address prop changes or clicking "Find on Map" is cleaner.
  // We handle manual search via this helper wrapper
  const handleManualSearch = (e) => {
    e?.preventDefault();
    if (address) {
      geocodeAddress(address);
    }
  };

  // If token is missing, show an elegant notification banner
  if (!MAPBOX_TOKEN) {
    return (
      <div style={{
        height,
        background: 'var(--bg-2, #f3f4f6)',
        border: '1px dashed var(--border, #d1d5db)',
        borderRadius: '12px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        textAlign: 'center',
        gap: '8px'
      }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-4, #9ca3af)" strokeWidth="2">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-2, #4b5563)' }}>
          Mapbox Token Missing
        </span>
        <span style={{ fontSize: '11px', color: 'var(--text-4, #9ca3af)', maxWidth: '280px' }}>
          Please set the <code>VITE_MAPBOX_TOKEN</code> environment variable in your local environment.
        </span>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%', height, borderRadius: '12px', overflow: 'hidden' }}>
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

      {/* Geocoding Loading Indicator */}
      {geocodingLoading && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(255, 255, 255, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px',
          fontWeight: 600,
          color: '#1f6b52',
          zIndex: 2
        }}>
          <div className="spinner" style={{ marginRight: '8px' }} /> Locating address…
        </div>
      )}

      {/* Geocoding Error Message Overlay */}
      {geocodingError && editable && (
        <div style={{
          position: 'absolute',
          bottom: '10px',
          left: '10px',
          right: '10px',
          background: 'rgba(239, 68, 68, 0.95)',
          color: 'white',
          padding: '8px 12px',
          borderRadius: '8px',
          fontSize: '11px',
          fontWeight: 500,
          textAlign: 'center',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          zIndex: 2,
          animation: 'fadeIn 0.3s ease'
        }}>
          Address location not found automatically. Please click on the map to place your pin manually.
        </div>
      )}

      {/* Instructions overlay for Edit Mode */}
      {editable && !geocodingLoading && !geocodingError && (
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          background: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(4px)',
          border: '1px solid var(--border, #e5e7eb)',
          padding: '6px 10px',
          borderRadius: '6px',
          fontSize: '10px',
          color: '#444',
          pointerEvents: 'none',
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
          zIndex: 2
        }}>
          📍 Click map or drag marker to select location
        </div>
      )}
    </div>
  );
}
