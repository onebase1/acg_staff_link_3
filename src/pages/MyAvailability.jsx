import React, { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calendar, Clock, CheckCircle, AlertCircle, Info } from "lucide-react";
import { toast } from "sonner";

/**
 * 📅 MY AVAILABILITY - STAFF SELF-SERVICE
 * 
 * Allows staff to set their own working availability.
 * - Select days they can work
 * - Choose day/night/both shifts
 * - Updates automatically sync to admin view
 * - Used by AI shift matcher to find suitable shifts
 */

export default function MyAvailability() {
  const [user, setUser] = useState(null);
  const [staffProfile, setStaffProfile] = useState(null);
  const [availability, setAvailability] = useState({
    monday: [],
    tuesday: [],
    wednesday: [],
    thursday: [],
    friday: [],
    saturday: [],
    sunday: []
  });
  const [hasChanges, setHasChanges] = useState(false);

  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchData = async () => {
      try {
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

        setUser(profile);

        const { data: allStaff, error: staffError } = await supabase
          .from('staff')
          .select('*');

        if (staffError) {
          console.error('❌ Error fetching staff:', staffError);
          return;
        }

        const staffProfile = allStaff.find(s => 
          s.user_id === authUser.id || 
          s.email?.toLowerCase() === profile.email?.toLowerCase()
        );

        if (staffProfile) {
          setStaffProfile(staffProfile);
          setAvailability(staffProfile.availability || {
            monday: [],
            tuesday: [],
            wednesday: [],
            thursday: [],
            friday: [],
            saturday: [],
            sunday: []
          });
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load availability settings");
      }
    };
    fetchData();
  }, []);

  const updateAvailabilityMutation = useMutation({
    mutationFn: async (newAvailability) => {
      if (!staffProfile?.id) {
        throw new Error("Staff profile not found");
      }
      
      const { error } = await supabase
        .from('staff')
        .update({ availability: newAvailability })
        .eq('id', staffProfile.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['staff']);
      queryClient.invalidateQueries(['available-shifts']);
      setHasChanges(false);
      toast.success('✅ Availability updated successfully!', {
        description: 'New shifts matching your availability will appear in the marketplace'
      });
    },
    onError: (error) => {
      toast.error(`❌ Failed to update: ${error.message}`);
    }
  });

  const toggleShift = (day, shiftType) => {
    const currentShifts = availability[day] || [];
    let newShifts;

    if (currentShifts.includes(shiftType)) {
      // Remove shift
      newShifts = currentShifts.filter(s => s !== shiftType);
    } else {
      // Add shift
      newShifts = [...currentShifts, shiftType];
    }

    setAvailability({
      ...availability,
      [day]: newShifts
    });
    setHasChanges(true);
  };

  const setDayFullAvailability = (day) => {
    setAvailability({
      ...availability,
      [day]: ['day', 'night']
    });
    setHasChanges(true);
  };

  const clearDay = (day) => {
    setAvailability({
      ...availability,
      [day]: []
    });
    setHasChanges(true);
  };

  const handleSave = () => {
    updateAvailabilityMutation.mutate(availability);
  };

  const handleReset = () => {
    if (staffProfile?.availability) {
      setAvailability(staffProfile.availability);
    }
    setHasChanges(false);
    toast.info('Changes discarded');
  };

  const daysOfWeek = [
    { key: 'monday', label: 'Monday', emoji: '📅' },
    { key: 'tuesday', label: 'Tuesday', emoji: '📅' },
    { key: 'wednesday', label: 'Wednesday', emoji: '📅' },
    { key: 'thursday', label: 'Thursday', emoji: '📅' },
    { key: 'friday', label: 'Friday', emoji: '📅' },
    { key: 'saturday', label: 'Saturday', emoji: '🎯' },
    { key: 'sunday', label: 'Sunday', emoji: '🎯' }
  ];

  const countAvailableDays = () => {
    return Object.values(availability).filter(shifts => shifts.length > 0).length;
  };

  const countTotalShifts = () => {
    return Object.values(availability).reduce((sum, shifts) => sum + shifts.length, 0);
  };

  if (!staffProfile) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-8 rounded-xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">My Availability</h1>
            <p className="text-blue-100">Set when you're available to work</p>
          </div>
          <div className="text-right">
            <div className="bg-white/20 rounded-lg p-4">
              <p className="text-sm text-blue-100">Currently Available</p>
              <p className="text-3xl font-bold">{countAvailableDays()} days</p>
              <p className="text-xs text-blue-200 mt-1">{countTotalShifts()} shifts/week</p>
            </div>
          </div>
        </div>
      </div>

      {/* Info Alert */}
      <Alert className="border-blue-300 bg-blue-50">
        <Info className="h-5 w-5 text-blue-600" />
        <AlertDescription className="text-blue-900">
          <strong>How it works:</strong> Set your availability below, and our system will automatically match you with suitable shifts. 
          You'll see matched shifts in the <strong>Shift Marketplace</strong>.
        </AlertDescription>
      </Alert>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const allAvailable = {
                monday: ['day', 'night'],
                tuesday: ['day', 'night'],
                wednesday: ['day', 'night'],
                thursday: ['day', 'night'],
                friday: ['day', 'night'],
                saturday: ['day', 'night'],
                sunday: ['day', 'night']
              };
              setAvailability(allAvailable);
              setHasChanges(true);
              toast.success('Set to available all days');
            }}
          >
            ✅ Available All Week
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const weekdaysOnly = {
                monday: ['day', 'night'],
                tuesday: ['day', 'night'],
                wednesday: ['day', 'night'],
                thursday: ['day', 'night'],
                friday: ['day', 'night'],
                saturday: [],
                sunday: []
              };
              setAvailability(weekdaysOnly);
              setHasChanges(true);
              toast.success('Set to weekdays only');
            }}
          >
            📅 Weekdays Only
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const weekendsOnly = {
                monday: [],
                tuesday: [],
                wednesday: [],
                thursday: [],
                friday: [],
                saturday: ['day', 'night'],
                sunday: ['day', 'night']
              };
              setAvailability(weekendsOnly);
              setHasChanges(true);
              toast.success('Set to weekends only');
            }}
          >
            🎯 Weekends Only
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const clearAll = {
                monday: [],
                tuesday: [],
                wednesday: [],
                thursday: [],
                friday: [],
                saturday: [],
                sunday: []
              };
              setAvailability(clearAll);
              setHasChanges(true);
              toast.info('Cleared all availability');
            }}
          >
            ❌ Clear All
          </Button>
        </CardContent>
      </Card>

      {/* Days Grid */}
      <div className="space-y-4">
        {daysOfWeek.map(day => {
          const dayShifts = availability[day.key] || [];
          const isAvailable = dayShifts.length > 0;
          const isDayAvailable = dayShifts.includes('day');
          const isNightAvailable = dayShifts.includes('night');

          return (
            <Card key={day.key} className={`border-2 transition-all ${
              isAvailable ? 'border-green-300 bg-green-50' : 'border-gray-200'
            }`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl ${
                      isAvailable ? 'bg-green-600 text-white' : 'bg-gray-200'
                    }`}>
                      {day.emoji}
                    </div>
                    <div>
                      <h3 className={`text-xl font-semibold ${
                        isAvailable ? 'text-green-900' : 'text-gray-900'
                      }`}>
                        {day.label}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {isAvailable ? (
                          dayShifts.length === 2 ? 'Available all day' : `${dayShifts[0]} shift only`
                        ) : (
                          'Not available'
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant={isDayAvailable ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => toggleShift(day.key, 'day')}
                      className={isDayAvailable ? 'bg-amber-600 hover:bg-amber-700' : ''}
                    >
                      ☀️ Day (8am-8pm)
                    </Button>
                    <Button
                      variant={isNightAvailable ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => toggleShift(day.key, 'night')}
                      className={isNightAvailable ? 'bg-indigo-600 hover:bg-indigo-700' : ''}
                    >
                      🌙 Night (8pm-8am)
                    </Button>
                    {isAvailable && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => clearDay(day.key)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Save/Cancel Actions */}
      {hasChanges && (
        <div className="sticky bottom-6 z-10">
          <Card className="border-2 border-yellow-400 bg-yellow-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-6 h-6 text-yellow-600" />
                  <div>
                    <p className="font-semibold text-yellow-900">You have unsaved changes</p>
                    <p className="text-sm text-yellow-700">Save your availability to update shift matching</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={handleReset}
                    disabled={updateAvailabilityMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={updateAvailabilityMutation.isPending}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {updateAvailabilityMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Save Availability
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Summary Card */}
      <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-600" />
            Your Availability Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-white rounded-lg">
              <p className="text-3xl font-bold text-purple-600">{countAvailableDays()}</p>
              <p className="text-sm text-gray-600 mt-1">Days Available</p>
            </div>
            <div className="text-center p-4 bg-white rounded-lg">
              <p className="text-3xl font-bold text-pink-600">{countTotalShifts()}</p>
              <p className="text-sm text-gray-600 mt-1">Total Shifts/Week</p>
            </div>
            <div className="text-center p-4 bg-white rounded-lg">
              <p className="text-3xl font-bold text-cyan-600">
                {countAvailableDays() === 0 ? '0%' : Math.round((countAvailableDays() / 7) * 100) + '%'}
              </p>
              <p className="text-sm text-gray-600 mt-1">Week Coverage</p>
            </div>
          </div>

          <Alert className="mt-4 border-purple-300 bg-white">
            <Clock className="h-5 w-5 text-purple-600" />
            <AlertDescription className="text-purple-900">
              <strong>💡 Tip:</strong> The more availability you set, the more shift opportunities you'll see in the marketplace. 
              Weekend and night shifts often have higher rates!
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}