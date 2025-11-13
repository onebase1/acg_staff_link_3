import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";
import { 
  MapPin, Users, CheckCircle, Navigation, AlertTriangle, 
  RefreshCw, Calendar, Clock, Shield 
} from "lucide-react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { toast } from "sonner";

// Fix leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const clientIcon = L.divIcon({
  className: 'custom-div-icon',
  html: `<div style="background-color: #3b82f6; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/></svg></div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

const staffApproachingIcon = L.divIcon({
  className: 'custom-div-icon',
  html: `<div style="background-color: #f97316; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

const staffClockedInIcon = L.divIcon({
  className: 'custom-div-icon',
  html: `<div style="background-color: #10b981; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

export default function LiveShiftMap() {
  const [currentAgency, setCurrentAgency] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (authError || !authUser) {
        console.error('❌ Not authenticated:', authError);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (profileError || !profile) {
        console.error('❌ Profile not found:', profileError);
        return;
      }

      setCurrentAgency(profile.agency_id);
    };
    fetchUser();
  }, []);

  const today = new Date();
  const todayString = today.toISOString().split('T')[0];
  console.log('🗓️ Querying shifts for date:', todayString);
  
  const { data: activeShifts = [], isLoading: shiftsLoading, refetch: refetchShifts } = useQuery({
    queryKey: ['active-shifts', currentAgency, todayString],
    queryFn: async () => {
      let query = supabase
        .from('shifts')
        .select('*')
        .eq('date', todayString)
        .in('status', ['confirmed', 'in_progress']);
      
      if (currentAgency) {
        query = query.eq('agency_id', currentAgency);
      }
      
      const { data: shifts, error } = await query;
      
      if (error) {
        console.error('❌ Error fetching active shifts:', error);
        return [];
      }
      
      console.log(`📍 Live Map - Found ${shifts?.length || 0} shift(s) for ${todayString}${currentAgency ? ` (agency: ${currentAgency})` : ' (all agencies)'}`);
      return shifts || [];
    },
    enabled: true,
    refetchInterval: 30000,
    refetchOnMount: 'always'
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients', currentAgency],
    queryFn: async () => {
      let query = supabase.from('clients').select('*');
      
      if (currentAgency) {
        query = query.eq('agency_id', currentAgency);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('❌ Error fetching clients:', error);
        return [];
      }
      return data || [];
    },
    enabled: true,
    refetchOnMount: 'always'
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['staff', currentAgency],
    queryFn: async () => {
      let query = supabase.from('staff').select('*');
      
      if (currentAgency) {
        query = query.eq('agency_id', currentAgency);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('❌ Error fetching staff:', error);
        return [];
      }
      return data || [];
    },
    enabled: true,
    refetchOnMount: 'always'
  });

  const { data: timesheets = [] } = useQuery({
    queryKey: ['timesheets-today', currentAgency, todayString],
    queryFn: async () => {
      let query = supabase
        .from('timesheets')
        .select('*')
        .eq('shift_date', todayString);
      
      if (currentAgency) {
        query = query.eq('agency_id', currentAgency);
      }
      
      const { data: allTimesheets, error } = await query;
      
      if (error) {
        console.error('❌ Error fetching timesheets:', error);
        return [];
      }
      
      console.log(`⏰ Found ${allTimesheets?.length || 0} timesheet(s) for ${todayString}`);
      
      // 🔒 LOG DUPLICATE CHECK
      const timesheetsByBooking = {};
      (allTimesheets || []).forEach(t => {
        if (!timesheetsByBooking[t.booking_id]) {
          timesheetsByBooking[t.booking_id] = [];
        }
        timesheetsByBooking[t.booking_id].push(t);
      });
      
      Object.entries(timesheetsByBooking).forEach(([bookingId, sheets]) => {
        if (sheets.length > 1) {
          console.error(`🚨 DUPLICATE TIMESHEETS DETECTED for booking ${bookingId}:`, sheets.map(s => s.id));
        }
      });
      
      return allTimesheets || [];
    },
    enabled: true,
    refetchInterval: 30000,
    refetchOnMount: 'always'
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ['bookings-today', currentAgency, todayString],
    queryFn: async () => {
      let query = supabase
        .from('bookings')
        .select('*')
        .eq('shift_date', todayString);
      
      if (currentAgency) {
        query = query.eq('agency_id', currentAgency);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('❌ Error fetching bookings:', error);
        return [];
      }
      return data || [];
    },
    enabled: true,
    refetchInterval: 30000,
    refetchOnMount: 'always'
  });

  // 🔒 BUILD MAP DATA WITH DEDUPLICATION
  const clientGroupedData = {};
  
  activeShifts.forEach(shift => {
    const client = clients.find(c => c.id === shift.client_id);
    if (!client?.location_coordinates) return;
    
    const clientId = client.id;
    if (!clientGroupedData[clientId]) {
      clientGroupedData[clientId] = {
        client,
        shifts: [],
        approachingStaff: [],
        clockedInStaff: []
      };
    }
    
    const assignedStaff = shift.assigned_staff_id ? staff.find(s => s.id === shift.assigned_staff_id) : null;
    
    // 🔒 CRITICAL FIX: Match timesheet via booking with DEDUPLICATION
    let timesheet = null;
    if (shift.booking_id) {
      const shiftTimesheets = timesheets.filter(t => t.booking_id === shift.booking_id);
      if (shiftTimesheets.length > 0) {
        // 🔒 Take most recent if duplicates exist
        timesheet = shiftTimesheets.sort((a, b) => 
          new Date(b.created_date) - new Date(a.created_date)
        )[0];
        
        if (shiftTimesheets.length > 1) {
          console.warn(`⚠️ ${shiftTimesheets.length} timesheets for booking ${shift.booking_id}, using latest: ${timesheet.id}`);
        }
      }
    } else {
      // Otherwise, find booking for this shift, then find timesheet
      const booking = bookings.find(b => b.shift_id === shift.id);
      if (booking) {
        const bookingTimesheets = timesheets.filter(t => t.booking_id === booking.id);
        if (bookingTimesheets.length > 0) {
          timesheet = bookingTimesheets.sort((a, b) => 
            new Date(b.created_date) - new Date(a.created_date)
          )[0];
          
          if (bookingTimesheets.length > 1) {
            console.warn(`⚠️ ${bookingTimesheets.length} timesheets for booking ${booking.id}, using latest: ${timesheet.id}`);
          }
        }
      }
    }
    
    clientGroupedData[clientId].shifts.push({
      shift,
      assignedStaff,
      timesheet,
      hasGPS: !!timesheet?.clock_in_location,
      geofenceValidated: timesheet?.geofence_validated,
      distance: timesheet?.geofence_distance_meters,
      approaching: shift.approaching_staff_location
    });
    
    // Track approaching/clocked-in staff separately (with dedup check)
    if (shift.approaching_staff_location && !timesheet?.clock_in_location) {
      clientGroupedData[clientId].approachingStaff.push({
        ...shift.approaching_staff_location,
        staffMember: assignedStaff,
        shiftId: shift.id
      });
    }
    
    if (timesheet?.clock_in_location) {
      // 🔒 Only add if not already in array (prevent duplicate markers)
      const alreadyAdded = clientGroupedData[clientId].clockedInStaff.some(
        s => s.staffMember?.id === assignedStaff?.id && s.timesheetId === timesheet.id
      );
      
      if (!alreadyAdded) {
        clientGroupedData[clientId].clockedInStaff.push({
          ...timesheet.clock_in_location,
          staffMember: assignedStaff,
          geofenceValidated: timesheet.geofence_validated,
          distance: timesheet.geofence_distance_meters,
          timesheetId: timesheet.id
        });
      }
    }
  });

  const mapData = Object.values(clientGroupedData);

  // 🔒 CALCULATE STATS WITH DEDUPLICATION
  const stats = {
    totalShifts: activeShifts.length,
    shiftsWithGPS: [...new Set(timesheets.filter(t => t.clock_in_location).map(t => t.booking_id))].length,
    geofencePassed: [...new Set(timesheets.filter(t => t.geofence_validated === true).map(t => t.booking_id))].length,
    geofenceFailed: [...new Set(timesheets.filter(t => t.geofence_validated === false).map(t => t.booking_id))].length,
    clientsWithGPS: clients.filter(c => c.location_coordinates?.latitude).length,
    clientsTotal: clients.length,
    approaching: activeShifts.filter(s => {
      if (!s.approaching_staff_location) return false;
      
      // Check if staff has clocked in via booking chain
      let hasClockIn = false;
      if (s.booking_id) {
        const shiftTimesheets = timesheets.filter(t => t.booking_id === s.booking_id);
        hasClockIn = shiftTimesheets.some(t => t.clock_in_location);
      } else {
        const booking = bookings.find(b => b.shift_id === s.id);
        if (booking) {
          const bookingTimesheets = timesheets.filter(t => t.booking_id === booking.id);
          hasClockIn = bookingTimesheets.some(t => t.clock_in_location);
        }
      }
      
      return !hasClockIn;
    }).length
  };

  const notifications = mapData
    .flatMap(site => 
      site.clockedInStaff
        .filter(s => !s.geofenceValidated)
        .map(s => ({
          type: 'geofence_violation',
          client: site.client.name,
          staff: s.staffMember?.first_name + ' ' + s.staffMember?.last_name,
          distance: s.distance
        }))
    );

  const defaultCenter = mapData.length > 0 && mapData[0].client.location_coordinates
    ? [mapData[0].client.location_coordinates.latitude, mapData[0].client.location_coordinates.longitude]
    : [51.5074, -0.1278];

  const handleRefresh = () => {
    refetchShifts();
    toast.success('Map refreshed');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Live Shift Map</h2>
          <p className="text-gray-600 mt-1">Real-time GPS tracking of active shifts</p>
        </div>
        <Button onClick={handleRefresh} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Calendar className="w-6 h-6 text-blue-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-blue-600">{stats.totalShifts}</p>
            <p className="text-sm text-gray-600">Active Shifts</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Navigation className="w-6 h-6 text-orange-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-orange-600">{stats.approaching}</p>
            <p className="text-sm text-gray-600">Approaching</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle className="w-6 h-6 text-green-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-green-600">{stats.shiftsWithGPS}</p>
            <p className="text-sm text-gray-600">Clocked In</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Shield className="w-6 h-6 text-green-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-green-600">{stats.geofencePassed}</p>
            <p className="text-sm text-gray-600">Verified ✓</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <AlertTriangle className="w-6 h-6 text-red-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-red-600">{stats.geofenceFailed}</p>
            <p className="text-sm text-gray-600">Out of Bounds</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <MapPin className="w-6 h-6 text-blue-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-blue-600">{stats.clientsWithGPS}/{stats.clientsTotal}</p>
            <p className="text-sm text-gray-600">Clients GPS</p>
          </CardContent>
        </Card>
      </div>

      {notifications.length > 0 && (
        <Card className="border-red-300 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              ⚠️ Geofence Violations ({notifications.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {notifications.map((notif, idx) => (
                <div key={idx} className="p-3 bg-white rounded border border-red-200">
                  <p className="text-sm text-red-900">
                    <strong>{notif.staff}</strong> at <strong>{notif.client}</strong> is{' '}
                    <strong>{Math.round(notif.distance)}m</strong> outside geofence
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="border-b">
          <CardTitle>Live Tracking Map</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div style={{ height: '600px', width: '100%' }}>
            <MapContainer 
              center={defaultCenter} 
              zoom={12} 
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              {mapData.map((site, idx) => {
                const coords = site.client.location_coordinates;
                const geofenceRadius = site.client.geofence_radius_meters || 100;
                
                return (
                  <React.Fragment key={idx}>
                    <Circle
                      center={[coords.latitude, coords.longitude]}
                      radius={geofenceRadius}
                      pathOptions={{ 
                        color: '#3b82f6', 
                        fillColor: '#3b82f6', 
                        fillOpacity: 0.1 
                      }}
                    />
                    
                    <Marker 
                      position={[coords.latitude, coords.longitude]} 
                      icon={clientIcon}
                    >
                      <Popup>
                        <div className="p-2">
                          <h3 className="font-bold text-blue-900">{site.client.name}</h3>
                          <p className="text-sm text-gray-600 mt-1">
                            {site.shifts.length} active shift(s)
                          </p>
                          <div className="mt-2 space-y-1">
                            {site.shifts.map((s, i) => (
                              <div key={i} className="text-xs">
                                <p className="font-semibold">
                                  {s.assignedStaff?.first_name} {s.assignedStaff?.last_name}
                                </p>
                                <p className="text-gray-600">
                                  {s.shift.start_time} - {s.shift.end_time}
                                </p>
                                {s.hasGPS && (
                                  <Badge className={s.geofenceValidated ? 'bg-green-100 text-green-800 text-xs' : 'bg-red-100 text-red-800 text-xs'}>
                                    {s.geofenceValidated ? '✓ Verified' : `⚠️ ${Math.round(s.distance)}m away`}
                                  </Badge>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </Popup>
                    </Marker>

                    {site.approachingStaff.map((staff, staffIdx) => (
                      <Marker
                        key={`approaching-${staffIdx}`}
                        position={[staff.latitude, staff.longitude]}
                        icon={staffApproachingIcon}
                      >
                        <Popup>
                          <div className="p-2">
                            <h4 className="font-bold text-orange-900">
                              🟠 Approaching
                            </h4>
                            <p className="text-sm">
                              {staff.staffMember?.first_name} {staff.staffMember?.last_name}
                            </p>
                            <p className="text-xs text-gray-600">
                              {Math.round(staff.distance_from_site)}m from site
                            </p>
                            <p className="text-xs text-gray-500">
                              Accuracy: ±{Math.round(staff.accuracy)}m
                            </p>
                          </div>
                        </Popup>
                      </Marker>
                    ))}

                    {site.clockedInStaff.map((staff, staffIdx) => (
                      <Marker
                        key={`clocked-in-${staffIdx}`}
                        position={[staff.latitude, staff.longitude]}
                        icon={staffClockedInIcon}
                      >
                        <Popup>
                          <div className="p-2">
                            <h4 className="font-bold text-green-900">
                              🟢 LIVE NOW
                            </h4>
                            <p className="text-sm">
                              {staff.staffMember?.first_name} {staff.staffMember?.last_name}
                            </p>
                            <Badge className={staff.geofenceValidated ? 'bg-green-100 text-green-800 text-xs' : 'bg-red-100 text-red-800 text-xs'}>
                              {staff.geofenceValidated ? '✓ Geofence Verified' : `⚠️ ${Math.round(staff.distance)}m outside`}
                            </Badge>
                            <p className="text-xs text-gray-500 mt-1">
                              Accuracy: ±{Math.round(staff.accuracy)}m
                            </p>
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                  </React.Fragment>
                );
              })}
            </MapContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Map Legend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                <MapPin className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="font-semibold text-sm">Client Site</p>
                <p className="text-xs text-gray-600">Care home location</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center animate-pulse">
                <Users className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="font-semibold text-sm">Approaching</p>
                <p className="text-xs text-gray-600">Staff on the way</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="font-semibold text-sm">Clocked In</p>
                <p className="text-xs text-gray-600">Staff on-site now</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-blue-500 bg-blue-50 flex items-center justify-center">
                <span className="text-xs text-blue-600">100m</span>
              </div>
              <div>
                <p className="font-semibold text-sm">Geofence</p>
                <p className="text-xs text-gray-600">Site boundary</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}