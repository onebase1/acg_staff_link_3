import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  MapPin, Loader2, CheckCircle, Search, AlertTriangle, Smartphone, FileText
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
  const [coordinates, setCoordinates] = useState(() => {
    const coords = client.location_coordinates;
    // Check if coords exists and has valid numbers for latitude and longitude
    if (coords &&
      typeof coords.latitude === 'number' &&
      typeof coords.longitude === 'number') {
      return coords;
    }
    // Default to UK center if no valid coords found
    return { latitude: 54.7191, longitude: -1.3539 };
  });
  const [radius, setRadius] = useState(
    client?.geofence_radius_meters || 100
  );

  // 🆕 GPS Clock-In Enforcement Toggle
  const [requireGPSClockIn, setRequireGPSClockIn] = useState(
    client?.geofence_enabled !== false // Default to true unless explicitly false
  );

  const [selectedAddressDetails, setSelectedAddressDetails] = useState(null);

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

  const [searchResults, setSearchResults] = useState([]);

  const reverseGeocode = async (lat, lon) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'ACG-StaffLink/1.0'
          }
        }
      );
      const data = await response.json();

      if (data && data.address) {
        const addr = data.address;
        const city = addr.city || addr.town || addr.village || addr.county || '';
        const postcode = addr.postcode || '';
        const line1 = [addr.house_number, addr.road].filter(Boolean).join(' ');

        setSelectedAddressDetails({
          line1: line1,
          line2: '',
          city: city,
          postcode: postcode
        });

        // Update the search box to show the found address
        // This gives the user immediate visual feedback that the address has been "found" and synced
        setSearchAddress(`${line1}, ${city}, ${postcode}`.replace(/^, /, '').replace(/, $/, ''));

        toast.success(`📍 Address identified: ${line1}, ${city}`);
      }
    } catch (error) {
      console.warn('Reverse geocoding failed:', error);
    }
  };

  const handleAddressSearch = async () => {
    if (!searchAddress.trim()) {
      toast.error('Please enter an address');
      return;
    }

    setSearchingAddress(true);
    setSearchResults([]); // Clear previous results

    try {
      // 0a. Check for Google Maps URL
      // Pattern: @54.7221,-1.373463
      const googleMapsMatch = searchAddress.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (googleMapsMatch) {
        const lat = parseFloat(googleMapsMatch[1]);
        const lon = parseFloat(googleMapsMatch[2]);

        if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
          setCoordinates({ latitude: lat, longitude: lon });
          toast.success('📍 Coordinates extracted from Google Maps link!');

          // Reverse geocode to get the address for these coordinates
          await reverseGeocode(lat, lon);

          setSearchingAddress(false);
          return;
        }
      }

      // 0b. Check for Coordinates Input (Lat, Lon)
      // Regex allows: 54.123, -1.123 or 54.123 -1.123
      const coordMatch = searchAddress.match(/^(-?\d+(\.\d+)?)[,\s]+(-?\d+(\.\d+)?)$/);

      if (coordMatch) {
        const lat = parseFloat(coordMatch[1]);
        const lon = parseFloat(coordMatch[3]);

        if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
          setCoordinates({ latitude: lat, longitude: lon });
          toast.success('📍 Coordinates set directly!');

          // Reverse geocode to get the address for these coordinates
          await reverseGeocode(lat, lon);

          setSearchingAddress(false);
          return;
        }
      }

      // 1. Try Postcode Search First (High Accuracy)
      const postcodeMatch = searchAddress.match(/([A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2})/i);

      if (postcodeMatch) {
        const postcode = postcodeMatch[0].replace(/\s/g, '').toUpperCase();

        try {
          const postcodeResponse = await fetch(`https://api.postcodes.io/postcodes/${postcode}`);
          const postcodeData = await postcodeResponse.json();

          if (postcodeData.status === 200 && postcodeData.result) {
            // For postcodes, we trust the result enough to show it as a primary option or auto-set
            // But to be consistent with "user needs to be able to put full address", we can add it to the list
            // or just set it if it's a direct postcode match. 
            // Let's set it directly for pure postcodes as it's usually what they want, 
            // BUT if they typed more than just a postcode, we should search Nominatim too.

            // If the input is JUST the postcode, auto-set.
            if (searchAddress.trim().replace(/\s/g, '').toUpperCase() === postcode) {
              setCoordinates({
                latitude: postcodeData.result.latitude,
                longitude: postcodeData.result.longitude
              });

              // Capture address details from postcode lookup
              setSelectedAddressDetails({
                city: postcodeData.result.admin_district || postcodeData.result.parish || '',
                postcode: postcodeData.result.postcode,
                line1: '', // Postcode lookup doesn't give street line
                line2: ''
              });

              toast.success(`✅ Found Postcode: ${postcodeData.result.admin_district}`);
              setSearchingAddress(false);
              return;
            }
          }
        } catch (postcodeError) {
          console.warn('⚠️ [GPS] Postcode API failed, falling back to Nominatim:', postcodeError);
        }
      }

      // 2. Search Nominatim (Address Search)
      const nominatimUrl = `https://nominatim.openstreetmap.org/search?` +
        `q=${encodeURIComponent(searchAddress)}&` +
        `countrycodes=gb&` +
        `format=json&` +
        `addressdetails=1&` + // Request address details
        `limit=5`; // Increased limit to 5

      const response = await fetch(nominatimUrl, {
        headers: {
          'User-Agent': 'ACG-StaffLink/1.0'
        }
      });

      const data = await response.json();

      if (data && data.length > 0) {
        setSearchResults(data);
        // Don't auto-set coordinates, let user choose from the list
        if (data.length === 1) {
          toast.success(`Found 1 result. Please confirm below.`);
        } else {
          toast.success(`Found ${data.length} results. Please select the correct one.`);
        }
      } else {
        toast.error('❌ Address not found. Try a different search term or postcode.');
      }
    } catch (error) {
      console.error('❌ [GPS] Geocoding error:', error);
      toast.error('❌ Address search failed. Please try again.');
    } finally {
      setSearchingAddress(false);
    }
  };

  const handleSelectLocation = (result) => {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);

    setCoordinates({
      latitude: lat,
      longitude: lon
    });

    // Extract address details from Nominatim result
    const addr = result.address || {};
    const city = addr.city || addr.town || addr.village || addr.county || '';
    const postcode = addr.postcode || '';
    const line1 = [addr.house_number, addr.road].filter(Boolean).join(' ');

    setSelectedAddressDetails({
      line1: line1,
      line2: '',
      city: city,
      postcode: postcode
    });

    setSearchResults([]); // Clear results after selection
    setSearchAddress(result.display_name); // Update input with full address
    toast.success('📍 Location updated');
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
          setSelectedAddressDetails(null);
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

    const payload = {
      location_coordinates: {
        latitude: lat,
        longitude: lng
      },
      geofence_radius_meters: parseInt(radius),
      geofence_enabled: requireGPSClockIn // 🆕 Uses toggle value instead of always true
    };

    // If we have captured address details from the search, update the client address too
    if (selectedAddressDetails) {
      // Only update fields that have values to avoid wiping existing data with empty strings if search was partial
      // But user requested "auto filled with correct address", so we should probably overwrite if we have a valid result.
      // Let's merge with existing address to be safe, but prioritize new values.

      const currentAddress = client.address || {};

      payload.address = {
        line1: selectedAddressDetails.line1 || currentAddress.line1 || '',
        line2: selectedAddressDetails.line2 || currentAddress.line2 || '', // Nominatim rarely gives line 2
        city: selectedAddressDetails.city || currentAddress.city || '',
        postcode: selectedAddressDetails.postcode || currentAddress.postcode || ''
      };
    }

    updateClientMutation.mutate(
      payload,
      {
        onSuccess: () => {
          toast.success('✅ GPS location & Address saved successfully!');
        }
      }
    );
  };

  const handleMapClick = (lat, lng) => {
    setCoordinates({ latitude: lat, longitude: lng });
    toast.success('📍 Location set! Adjust radius if needed.');
    // Also reverse geocode to get the address for this point
    reverseGeocode(lat, lng);
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
            <strong>📍 Precise Location Setup:</strong>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li><strong>Best Method:</strong> Find the building on <a href="https://maps.google.com" target="_blank" rel="noopener noreferrer" className="underline font-semibold hover:text-blue-700">Google Maps</a>, copy the URL (link), and paste it below.</li>
              <li><strong>Alternative:</strong> Enter exact coordinates (e.g., 54.7205089, -1.3734818).</li>
              <li><strong>Basic:</strong> Search by postcode or address.</li>
            </ul>
          </AlertDescription>
        </Alert>

        <div>
          <Label htmlFor="address-search">Paste Google Maps Link, Coordinates, or Address</Label>
          <div className="flex gap-2 mt-2">
            <Input
              id="address-search"
              placeholder="Paste Google Maps Link here..."
              value={searchAddress}
              onChange={(e) => setSearchAddress(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !searchingAddress && handleAddressSearch()}
              className="font-mono text-sm"
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

          {/* Search Results List */}
          {searchResults.length > 0 && (
            <div className="mt-2 border rounded-md max-h-60 overflow-y-auto bg-white shadow-sm z-10 relative">
              {searchResults.map((result, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleSelectLocation(result)}
                  className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b last:border-b-0 text-sm transition-colors flex items-start gap-2"
                >
                  <MapPin className="w-4 h-4 mt-0.5 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-700">{result.display_name}</span>
                </button>
              ))}
            </div>
          )}

          <p className="text-xs text-gray-500 mt-2">
            💡 Tip: Pasting a Google Maps link is the most accurate way to set the location.
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
              zoom={18} // Increased zoom for better precision visibility
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
              <strong>Selected Coordinates:</strong> {coordinates.latitude.toFixed(7)}, {coordinates.longitude.toFixed(7)}
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
          {/* 🆕 GPS Clock-In Enforcement Toggle */}
          <div className="p-4 rounded-lg border bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {requireGPSClockIn ? (
                  <Smartphone className="w-5 h-5 text-blue-600" />
                ) : (
                  <FileText className="w-5 h-5 text-amber-600" />
                )}
                <div>
                  <Label htmlFor="require-gps" className="text-base font-semibold cursor-pointer">
                    Require GPS Clock-In
                  </Label>
                  <p className="text-sm text-gray-600 mt-0.5">
                    {requireGPSClockIn
                      ? "Staff must clock in/out via the app with GPS verification"
                      : "Timesheets managed manually (no GPS clock-in required)"
                    }
                  </p>
                </div>
              </div>
              <Switch
                id="require-gps"
                checked={requireGPSClockIn}
                onCheckedChange={setRequireGPSClockIn}
              />
            </div>

            {!requireGPSClockIn && (
              <Alert className="mt-3 border-amber-300 bg-amber-50">
                <FileText className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-900 text-sm">
                  <strong>Manual Timesheet Mode:</strong> Staff won't receive clock-in/out reminders.
                  Timesheets will be created automatically but hours must be entered by admin.
                </AlertDescription>
              </Alert>
            )}
          </div>

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

          {requireGPSClockIn && (
            <Alert className="border-blue-300 bg-blue-50">
              <Smartphone className="h-5 w-5 text-blue-600" />
              <AlertDescription className="text-blue-900">
                <strong>GPS Mode:</strong> Staff will receive clock-in/out reminders and must use the app to verify attendance.
              </AlertDescription>
            </Alert>
          )}
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
