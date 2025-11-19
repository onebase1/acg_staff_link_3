import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  MapPin, Loader2, CheckCircle, Search, AlertTriangle
} from "lucide-react";
import { MapContainer, TileLayer, Marker, Circle, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { toast } from "sonner";

// Fix Leaflet default icon issues with Webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function MapClickHandler({ onLocationSet }) {
  useMapEvents({
    click: (e) => {
      onLocationSet(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function ClientGPSSetup({ client, onComplete }) {
  const queryClient = useQueryClient();
  const [mapReady, setMapReady] = useState(false);
  const [searchAddress, setSearchAddress] = useState(
    client.address ? `${client.address.line1 || ''}, ${client.address.city || ''}, ${client.address.postcode || ''}` : ''
  );
  const [searchingAddress, setSearchingAddress] = useState(false);
  const [coordinates, setCoordinates] = useState(
    client.location_coordinates || { latitude: 54.7191, longitude: -1.3539 }
  );
  const [radius, setRadius] = useState(
    client?.geofence_radius_meters || 100
  );

  // Ensure map is ready before rendering
  useEffect(() => {
    // Small delay to ensure DOM is ready for Leaflet
    const timer = setTimeout(() => {
      setMapReady(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  const updateClientMutation = useMutation({
    mutationFn: async (data) => {
      if (!client || !client.id) {
        throw new Error('Client ID is missing');
      }
      const { data: updated, error } = await supabase
        .from('clients')
        .update(data)
        .eq('id', client.id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return updated;
    },
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries(['clients']);
      if (onComplete) onComplete();
    },
    onError: (error) => {
      toast.error(`Failed to update GPS settings: ${error.message}`);
    }
  });

  const handleAddressSearch = async () => {
    if (!searchAddress.trim()) {
      toast.error('Please enter an address');
      return;
    }

    setSearchingAddress(true);
    
    try {
      const postcodeMatch = searchAddress.match(/([A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2})/i);
      
      if (postcodeMatch) {
        const postcode = postcodeMatch[0].replace(/\s/g, '').toUpperCase();
        
        try {
          const postcodeResponse = await fetch(`https://api.postcodes.io/postcodes/${postcode}`);
          const postcodeData = await postcodeResponse.json();
          
          if (postcodeData.status === 200 && postcodeData.result) {
            setCoordinates({
              latitude: postcodeData.result.latitude,
              longitude: postcodeData.result.longitude
            });
            toast.success(`✅ Found: ${postcodeData.result.admin_district}, ${postcodeData.result.region}`);
            setSearchingAddress(false);
            return;
          }
        } catch (postcodeError) {
          console.warn('⚠️ [GPS] Postcode API failed, falling back to Nominatim:', postcodeError);
        }
      }

      const nominatimUrl = `https://nominatim.openstreetmap.org/search?` + 
        `q=${encodeURIComponent(searchAddress)}&` +
        `countrycodes=gb&` +
        `format=json&` +
        `limit=1`;
      
      const response = await fetch(nominatimUrl, {
        headers: {
          'User-Agent': 'ACG-StaffLink/1.0'
        }
      });
      
      const data = await response.json();

      if (data && data.length > 0) {
        const result = data[0];
        
        setCoordinates({
          latitude: parseFloat(result.lat),
          longitude: parseFloat(result.lon)
        });
        
        toast.success(`✅ Found: ${result.display_name}`);
      } else {
        toast.error('❌ Address not found. Try entering just the postcode (e.g., TS28 5EN) or click on the map.');
      }
    } catch (error) {
      console.error('❌ [GPS] Geocoding error:', error);
      toast.error('❌ Address search failed. Try entering just the postcode or click on the map to set location manually.');
    } finally {
      setSearchingAddress(false);
    }
  };

  const handleClearGPS = () => {
    if (!window.confirm('Remove GPS location for this client? Geofencing will be disabled.')) {
      return;
    }
    
    updateClientMutation.mutate(
      {
        location_coordinates: null,
        geofence_enabled: false
      },
      {
        onSuccess: () => {
          toast.success('❌ GPS location removed successfully!');
          setCoordinates({ latitude: 54.7191, longitude: -1.3539 });
        }
      }
    );
  };

  const handleSave = () => {
    if (!coordinates.latitude || !coordinates.longitude) {
      toast.error('Please set a location on the map');
      return;
    }

    const lat = parseFloat(coordinates.latitude);
    const lng = parseFloat(coordinates.longitude);

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      toast.error('Invalid coordinates. Latitude: -90 to 90, Longitude: -180 to 180');
      return;
    }

    updateClientMutation.mutate(
      {
        location_coordinates: {
          latitude: lat,
          longitude: lng
        },
        geofence_radius_meters: parseInt(radius),
        geofence_enabled: true
      },
      {
        onSuccess: () => {
          toast.success('✅ GPS location saved successfully!');
        }
      }
    );
  };

  const handleMapClick = (lat, lng) => {
    setCoordinates({ latitude: lat, longitude: lng });
    toast.success('📍 Location set! Adjust radius if needed.');
  };

  const hasCoordinates = client?.location_coordinates?.latitude;

  return (
    <Card className="w-full">
      <CardHeader className="bg-gradient-to-r from-cyan-50 to-blue-50 border-b">
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-cyan-600" />
          GPS Location Setup - {client.name}
          {hasCoordinates && (
            <Badge className="bg-green-100 text-green-800 ml-auto">
              <CheckCircle className="w-3 h-3 mr-1" />
              Configured
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <Alert className="border-blue-300 bg-blue-50">
          <MapPin className="h-5 w-5 text-blue-600" />
          <AlertDescription className="text-blue-900">
            <strong>📍 UK Address Lookup:</strong> Enter the postcode (e.g., TS28 5EN) or full address below, 
            OR click directly on the map to set the location manually.
          </AlertDescription>
        </Alert>

        <div>
          <Label htmlFor="address-search">Search Address or Postcode</Label>
          <div className="flex gap-2 mt-2">
            <Input
              id="address-search"
              placeholder="e.g., TS28 5EN or 72 Newholme Estate, Wingate"
              value={searchAddress}
              onChange={(e) => setSearchAddress(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !searchingAddress && handleAddressSearch()}
            />
            <Button
              type="button"
              onClick={handleAddressSearch}
              disabled={searchingAddress || !searchAddress.trim()}
              className="min-w-[120px]"
            >
              {searchingAddress ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Find
                </>
              )}
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            💡 Tip: Just the postcode works best (e.g., TS28 5EN). Or click on the map.
          </p>
        </div>

        <div className="rounded-lg overflow-hidden border">
          {!mapReady ? (
            <div className="flex items-center justify-center h-[400px] bg-gray-50">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : (
            <MapContainer
              center={[coordinates.latitude, coordinates.longitude]}
              zoom={13}
              scrollWheelZoom={true}
              style={{ height: '400px', width: '100%' }}
              key={`map-${coordinates.latitude}-${coordinates.longitude}`}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {coordinates.latitude && coordinates.longitude && (
                <>
                  <Marker position={[coordinates.latitude, coordinates.longitude]} />
                  <Circle
                    center={[coordinates.latitude, coordinates.longitude]}
                    radius={radius}
                    pathOptions={{ color: 'blue', fillColor: '#30f', fillOpacity: 0.2 }}
                  />
                </>
              )}
              <MapClickHandler onLocationSet={handleMapClick} />
            </MapContainer>
          )}
        </div>

        {coordinates.latitude && coordinates.longitude && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-900 mb-2">
              <CheckCircle className="w-4 h-4 inline mr-1" />
              <strong>Selected Coordinates:</strong> {coordinates.latitude.toFixed(6)}, {coordinates.longitude.toFixed(6)}
            </p>
            <a
              href={`https://www.google.com/maps?q=${coordinates.latitude},${coordinates.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
            >
              📍 Preview on Google Maps →
            </a>
          </div>
        )}

        <div className="space-y-4 pt-4 border-t">
          <div>
            <Label htmlFor="geofence-radius">Geofence Radius (meters)</Label>
            <div className="flex items-center gap-4">
              <Input
                id="geofence-radius"
                type="number"
                min="10"
                max="500"
                value={radius}
                onChange={(e) => setRadius(parseInt(e.target.value) || 0)}
                className="w-32"
              />
              <span className="text-sm text-gray-600">
                Staff must be within <strong>{radius}m</strong> to clock in
              </span>
            </div>

            {/* ✨ IMPROVEMENT 5: Geofence Radius Guidance */}
            <div className="text-sm text-gray-600 space-y-2 mt-3">
              <p className="font-medium">Recommended values:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li><strong>50-100m:</strong> Small care homes, residential properties</li>
                <li><strong>100-200m:</strong> Medium facilities, hospitals</li>
                <li><strong>200-500m:</strong> Large campuses, multi-building sites</li>
              </ul>

              {radius < 50 && (
                <Alert className="border-yellow-300 bg-yellow-50 mt-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-yellow-900 text-xs">
                    <strong>Warning:</strong> Radius below 50m may cause false rejections due to GPS accuracy variations (typically 10-30m).
                  </AlertDescription>
                </Alert>
              )}

              {radius > 300 && (
                <Alert className="border-yellow-300 bg-yellow-50 mt-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-yellow-900 text-xs">
                    <strong>Note:</strong> Large radius ({radius}m) reduces location verification effectiveness. Staff could clock in from quite far away.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>

          <Alert className="border-blue-300 bg-blue-50">
            <AlertTriangle className="h-5 w-5 text-blue-600" />
            <AlertDescription className="text-blue-900">
              <strong>Info:</strong> Geofencing will be enabled automatically for this client upon saving.
            </AlertDescription>
          </Alert>
        </div>

        <div className="flex gap-3">
          {hasCoordinates && (
            <Button
              type="button"
              variant="outline"
              onClick={handleClearGPS}
              disabled={updateClientMutation.isPending}
              className="text-red-600 border-red-600 hover:bg-red-50"
            >
              Remove GPS
            </Button>
          )}
          
          <Button
            onClick={handleSave}
            disabled={updateClientMutation.isPending || !coordinates.latitude || !coordinates.longitude}
            className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700"
          >
            {updateClientMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Save GPS Settings
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}