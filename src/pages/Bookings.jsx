
import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Calendar, User, Building2, Clock, Archive, AlertCircle, Eye, Briefcase, MapPin
} from "lucide-react";
import { format, isPast, parseISO } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function Bookings() {
  const [statusFilter, setStatusFilter] = useState('upcoming');
  const [user, setUser] = useState(null);
  const [currentAgency, setCurrentAgency] = useState(null);

  // ✅ FIX 1: Fetch real user and agency using Supabase
  useEffect(() => {
    const fetchUserAndAgency = async () => {
      try {
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
        if (authError || !authUser) {
          console.error('❌ [Bookings] Not authenticated:', authError);
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single();

        if (profileError || !profile) {
          console.error('❌ [Bookings] Profile not found:', profileError);
          return;
        }

        setUser(profile);
        
        if (profile.agency_id) {
          setCurrentAgency(profile.agency_id);
          console.log('✅ [Bookings] Loaded agency:', profile.agency_id);
        } else {
          console.warn('⚠️ [Bookings] No agency_id found for user');
        }
      } catch (error) {
        console.error('❌ [Bookings] Error loading user:', error);
      }
    };
    fetchUserAndAgency();
  }, []);

  const { data: bookings = [], isLoading: isLoadingBookings } = useQuery({
    queryKey: ['bookings', currentAgency],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('agency_id', currentAgency)
        .order('created_date', { ascending: false });

      if (error) {
        console.error('❌ Error fetching bookings:', error);
        return [];
      }

      console.log('✅ Loaded bookings for agency:', data?.length || 0);
      return data || [];
    },
    enabled: !!currentAgency,
    refetchOnMount: 'always'
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['staff', currentAgency],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .eq('agency_id', currentAgency)
        .order('first_name', { ascending: true });

      if (error) {
        console.error('❌ Error fetching staff:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!currentAgency,
    refetchOnMount: 'always'
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients', currentAgency],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('agency_id', currentAgency)
        .order('name', { ascending: true});

      if (error) {
        console.error('❌ Error fetching clients:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!currentAgency,
    refetchOnMount: 'always'
  });

  const { data: shifts = [] } = useQuery({
    queryKey: ['shifts', currentAgency],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .eq('agency_id', currentAgency)
        .order('date', { ascending: false });

      if (error) {
        console.error('❌ Error fetching shifts:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!currentAgency,
    refetchOnMount: 'always'
  });

  const getStaffName = (staffId) => {
    const staffMember = staff.find(s => s.id === staffId);
    return staffMember ? `${staffMember.first_name} ${staffMember.last_name}` : 'Unknown Staff';
  };

  const getClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client?.name || 'Unknown Client';
  };

  // ✅ FIX: Safe date filtering with null checks
  const upcomingBookings = bookings.filter(b => {
    if (!b.shift_date) return false; // Skip if no date
    try {
      const shiftDate = parseISO(b.shift_date);
      return !isPast(shiftDate);
    } catch (error) {
      console.error('Invalid shift_date in booking for upcoming check:', b.id, b.shift_date);
      return false;
    }
  });

  const pastBookings = bookings.filter(b => {
    if (!b.shift_date) return false; // Skip if no date
    try {
      const shiftDate = parseISO(b.shift_date);
      return isPast(shiftDate);
    } catch (error) {
      console.error('Invalid shift_date in booking for past check:', b.id, b.shift_date);
      return false;
    }
  });

  const filteredBookings = statusFilter === 'upcoming' ? upcomingBookings :
                          statusFilter === 'past' ? pastBookings :
                          statusFilter === 'all' ? bookings :
                          bookings.filter(b => b.status === statusFilter);

  // ✅ FIX: Calculate filter counts safely
  const filterCounts = {
    upcoming: upcomingBookings.length,
    past: pastBookings.length,
    confirmed: bookings.filter(b => b.status === 'confirmed').length,
    awaiting_verification: bookings.filter(b => b.status === 'awaiting_verification').length,
    all: bookings.length
  };

  // ✅ FIX: Safe status badge with date validation
  const getStatusBadge = (status, shiftDate) => {
    if (!shiftDate) {
      return { className: 'bg-gray-100 text-gray-800', label: status ? status.replace('_', ' ') : 'Unknown Status' };
    }

    try {
      const parsedDate = parseISO(shiftDate);
      if (isPast(parsedDate) && !['completed', 'no_show', 'cancelled'].includes(status)) {
        return { className: 'bg-amber-100 text-amber-800', label: 'Past - Needs Review' };
      }
    } catch (error) {
      console.error('Date parsing error in getStatusBadge:', shiftDate);
      return { className: 'bg-red-100 text-red-800', label: 'Invalid Date' };
    }
    
    const variants = {
      pending: { className: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
      confirmed: { className: 'bg-green-100 text-green-800', label: 'Confirmed' },
      staff_confirmed: { className: 'bg-blue-100 text-blue-800', label: 'Staff Confirmed' },
      client_confirmed: { className: 'bg-cyan-100 text-cyan-800', label: 'Client Confirmed' },
      in_progress: { className: 'bg-indigo-100 text-indigo-800', label: 'In Progress' },
      completed: { className: 'bg-green-100 text-green-800', label: 'Completed' },
      cancelled: { className: 'bg-gray-100 text-gray-600', label: 'Cancelled' },
      no_show: { className: 'bg-red-100 text-red-800', label: 'No Show' },
      awaiting_verification: { className: 'bg-amber-100 text-amber-800', label: 'Awaiting Verification' }
    };
    return variants[status] || { className: 'bg-gray-100 text-gray-800', label: status ? status.replace('_', ' ') : 'Unknown' };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Bookings (Read-Only)</h2>
        <p className="text-gray-600 mt-1">View shift assignments and booking history</p>
      </div>

      {/* Info Banner */}
      <Alert className="border-blue-300 bg-blue-50">
        <AlertCircle className="h-5 w-5 text-blue-600" />
        <AlertDescription className="text-blue-900">
          <p className="font-semibold mb-1">📖 Bookings are now read-only</p>
          <ul className="text-sm space-y-1 ml-4 list-disc list-inside">
            <li><strong>To assign/modify shifts:</strong> Go to <Link to={createPageUrl('Shifts')} className="underline font-semibold">Shift Management</Link></li>
            <li><strong>To resolve issues:</strong> Go to <Link to={createPageUrl('AdminWorkflows')} className="underline font-semibold">Admin Workflows</Link></li>
          </ul>
          <p className="text-xs mt-2 text-blue-700">This page is for viewing booking history and tracking shift assignments only.</p>
        </AlertDescription>
      </Alert>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-2 overflow-x-auto">
            <Button 
              variant={statusFilter === 'upcoming' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('upcoming')}
            >
              Upcoming ({filterCounts.upcoming})
            </Button>
            <Button 
              variant={statusFilter === 'past' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('past')}
            >
              Past ({filterCounts.past})
            </Button>
            <Button 
              variant={statusFilter === 'confirmed' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('confirmed')}
            >
              Confirmed ({filterCounts.confirmed})
            </Button>
            <Button 
              variant={statusFilter === 'awaiting_verification' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('awaiting_verification')}
            >
              Awaiting Verification ({filterCounts.awaiting_verification})
            </Button>
            <Button 
              variant={statusFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('all')}
            >
              All ({filterCounts.all})
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bookings List */}
      {isLoadingBookings ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => ( // Render more skeletons for better visual
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                  <div className="h-4 bg-gray-200 rounded w-4/5"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBookings.map(booking => {
            const badge = getStatusBadge(booking.status, booking.shift_date);
            const staffName = getStaffName(booking.staff_id);
            const clientName = getClientName(booking.client_id);
            const shift = shifts.find(s => s.id === booking.shift_id);

            // ✅ FIX: Safe date display
            let displayDate = 'Invalid Date';
            try {
              if (booking.shift_date) {
                displayDate = format(parseISO(booking.shift_date), 'EEE, MMM d, yyyy');
              }
            } catch (error) {
              console.error('Date display error for booking:', booking.id, booking.shift_date);
            }

            return (
              <Card key={booking.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-sm text-gray-500">Booking</p>
                      <p className="text-sm font-mono text-gray-600">#{booking.id?.substring(0, 8)}</p>
                    </div>
                    <Badge className={badge.className}>
                      {badge.label}
                    </Badge>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex items-center gap-2 text-sm">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="font-medium">{staffName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Building2 className="w-4 h-4 text-gray-400" />
                      <span>{clientName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span>{displayDate}</span>
                    </div>
                    {booking.start_time && booking.end_time && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span>{booking.start_time} - {booking.end_time}</span>
                      </div>
                    )}
                    {shift?.role_required && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Briefcase className="w-4 h-4 text-gray-400" />
                        <span className="capitalize">{shift.role_required.replace('_', ' ')}</span>
                      </div>
                    )}
                    {shift?.work_location_within_site && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span>{shift.work_location_within_site}</span>
                      </div>
                    )}
                  </div>

                  {/* Placeholder for Confirmation Method and timestamps if needed */}
                  {/* For example:
                  {(booking.confirmation_method || booking.created_at || booking.updated_at) && (
                    <div className="text-xs text-gray-500 mt-4 space-y-1">
                      {booking.confirmation_method && <p>Confirmed via: {booking.confirmation_method}</p>}
                      {booking.created_at && <p>Created: {format(parseISO(booking.created_at), 'PPP')}</p>}
                      {booking.updated_at && <p>Last Updated: {format(parseISO(booking.updated_at), 'PPP')}</p>}
                    </div>
                  )}
                  */}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {filteredBookings.length === 0 && !isLoadingBookings && (
        <Card>
          <CardContent className="p-12 text-center">
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Bookings Found</h3>
            <p className="text-gray-600">
              {statusFilter === 'upcoming' ? 'No upcoming bookings.' : 
               statusFilter === 'past' ? 'No past bookings.' :
               'No bookings found matching your criteria.'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
