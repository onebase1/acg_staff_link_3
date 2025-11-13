import React, { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  UserCheck, Search, Calendar, Clock, MapPin, 
  Star, CheckCircle, XCircle, AlertCircle
} from "lucide-react";

export default function StaffAvailability() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDay, setSelectedDay] = useState(new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase());
  const [currentAgency, setCurrentAgency] = useState(null);

  // Get current user's agency
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

  const { data: staff = [], isLoading } = useQuery({
    queryKey: ['staff', currentAgency],
    queryFn: async () => {
      if (!currentAgency) return [];
      
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .eq('agency_id', currentAgency)
        .eq('status', 'active');
      
      if (error) {
        console.error('❌ Error fetching staff:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!currentAgency,
    refetchOnMount: 'always'
  });

  const { data: shifts = [] } = useQuery({
    queryKey: ['shifts-today', currentAgency],
    queryFn: async () => {
      if (!currentAgency) return [];
      
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .eq('date', today)
        .eq('agency_id', currentAgency)
        .in('status', ['confirmed', 'assigned', 'in_progress']);
      
      if (error) {
        console.error('❌ Error fetching shifts:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!currentAgency,
    refetchOnMount: 'always'
  });

  const { data: compliance = [] } = useQuery({
    queryKey: ['compliance', currentAgency],
    queryFn: async () => {
      if (!currentAgency || staff.length === 0) return [];
      
      const agencyStaffIds = staff.map(s => s.id);
      const { data, error } = await supabase
        .from('compliance')
        .select('*')
        .in('staff_id', agencyStaffIds);
      
      if (error) {
        console.error('❌ Error fetching compliance:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!currentAgency && staff.length > 0,
    refetchOnMount: 'always'
  });

  const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  const getStaffAvailability = (staffMember) => {
    const availability = staffMember.availability || {};
    const dayAvailability = availability[selectedDay] || [];
    
    // Check if working today
    const todayShifts = shifts.filter(s => s.assigned_staff_id === staffMember.id);
    const isWorkingToday = todayShifts.length > 0;

    // Check compliance status
    const staffCompliance = compliance.filter(c => c.staff_id === staffMember.id);
    const hasExpiredDocs = staffCompliance.some(c => {
      if (!c.expiry_date) return false;
      const expiryDate = new Date(c.expiry_date);
      return expiryDate < new Date();
    });

    return {
      available: dayAvailability.length > 0,
      shifts: dayAvailability,
      isWorkingToday,
      todayShifts,
      complianceIssue: hasExpiredDocs,
      rating: staffMember.rating || 0,
      totalShifts: staffMember.total_shifts_completed || 0
    };
  };

  const filteredStaff = useMemo(() => {
    return staff
      .filter(s => {
        const searchLower = searchTerm.toLowerCase();
        const fullName = `${s.first_name} ${s.last_name}`.toLowerCase();
        return fullName.includes(searchLower) || 
               s.role?.toLowerCase().includes(searchLower);
      })
      .map(s => ({
        ...s,
        availabilityInfo: getStaffAvailability(s)
      }))
      .sort((a, b) => {
        // Sort by: available first, then by rating
        if (a.availabilityInfo.available && !b.availabilityInfo.available) return -1;
        if (!a.availabilityInfo.available && b.availabilityInfo.available) return 1;
        return (b.availabilityInfo.rating || 0) - (a.availabilityInfo.rating || 0);
      });
  }, [staff, shifts, compliance, selectedDay, searchTerm]);

  const stats = useMemo(() => {
    const availableToday = filteredStaff.filter(s => s.availabilityInfo.available && !s.availabilityInfo.isWorkingToday).length;
    const workingToday = filteredStaff.filter(s => s.availabilityInfo.isWorkingToday).length;
    const complianceIssues = filteredStaff.filter(s => s.availabilityInfo.complianceIssue).length;

    return { availableToday, workingToday, complianceIssues, total: filteredStaff.length };
  }, [filteredStaff]);

  const getAvailabilityBadge = (info) => {
    if (info.complianceIssue) {
      return <Badge className="bg-red-600 text-white">Compliance Issue</Badge>;
    }
    if (info.isWorkingToday) {
      return <Badge className="bg-purple-600 text-white">Working Today</Badge>;
    }
    if (info.available) {
      return <Badge className="bg-green-600 text-white">Available</Badge>;
    }
    return <Badge className="bg-gray-400 text-white">Not Available</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Staff Availability</h2>
        <p className="text-gray-600 mt-1">Real-time view of staff availability and scheduling</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Total Active</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <UserCheck className="w-8 h-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-2 border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-green-700 font-medium">Available Today</p>
                <p className="text-2xl font-bold text-green-600">{stats.availableToday}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-2 border-purple-200 bg-purple-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-purple-700 font-medium">Working Today</p>
                <p className="text-2xl font-bold text-purple-600">{stats.workingToday}</p>
              </div>
              <Clock className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-2 border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-red-700 font-medium">Issues</p>
                <p className="text-2xl font-bold text-red-600">{stats.complianceIssues}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search staff by name or role..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto">
              {daysOfWeek.map(day => (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    selectedDay === day
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {day.charAt(0).toUpperCase() + day.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Staff List */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredStaff.map(staffMember => {
          const info = staffMember.availabilityInfo;
          
          return (
            <Card key={staffMember.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-lg">
                        {staffMember.first_name[0]}{staffMember.last_name[0]}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {staffMember.first_name} {staffMember.last_name}
                      </h3>
                      <p className="text-xs text-gray-600 capitalize">{staffMember.role?.replace('_', ' ')}</p>
                    </div>
                  </div>
                </div>

                {getAvailabilityBadge(info)}

                <div className="mt-4 space-y-2">
                  {info.available && (
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <Calendar className="w-4 h-4 text-green-600" />
                      <span>Available: {info.shifts.join(', ')}</span>
                    </div>
                  )}

                  {info.isWorkingToday && (
                    <div className="bg-purple-50 p-2 rounded text-xs">
                      <p className="font-semibold text-purple-900 mb-1">Today's Shifts:</p>
                      {info.todayShifts.map(shift => (
                        <div key={shift.id} className="text-purple-700">
                          {shift.start_time} - {shift.end_time}
                        </div>
                      ))}
                    </div>
                  )}

                  {info.complianceIssue && (
                    <div className="bg-red-50 p-2 rounded text-xs text-red-700">
                      <AlertCircle className="w-4 h-4 inline mr-1" />
                      Expired compliance documents
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                      <span className="text-sm font-medium">{info.rating.toFixed(1)}</span>
                    </div>
                    <span className="text-xs text-gray-600">{info.totalShifts} shifts</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredStaff.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <UserCheck className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Staff Found</h3>
            <p className="text-gray-600">Try adjusting your search or filters</p>
          </CardContent>
        </Card>
      )}

      {isLoading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading availability data...</p>
        </div>
      )}
    </div>
  );
}