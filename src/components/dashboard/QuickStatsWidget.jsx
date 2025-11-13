import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  TrendingUp, TrendingDown, Calendar, Users, 
  DollarSign, AlertTriangle, CheckCircle
} from "lucide-react";

export default function QuickStatsWidget() {
  const today = new Date().toISOString().split('T')[0];
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const { data: todayShifts = [] } = useQuery({
    queryKey: ['shifts-today'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .eq('date', today);

      if (error) {
        console.error('❌ Error fetching today shifts:', error);
        return [];
      }

      return data || [];
    },
    initialData: []
  });

  const { data: weekShifts = [] } = useQuery({
    queryKey: ['shifts-week'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .gte('date', weekAgo)
        .lte('date', today);

      if (error) {
        console.error('❌ Error fetching weekly shifts:', error);
        return [];
      }

      return data || [];
    },
    initialData: []
  });

  const { data: activeStaff = [] } = useQuery({
    queryKey: ['staff-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .eq('status', 'active');

      if (error) {
        console.error('❌ Error fetching active staff:', error);
        return [];
      }

      return data || [];
    },
    initialData: []
  });

  const { data: weekTimesheets = [] } = useQuery({
    queryKey: ['timesheets-week'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('timesheets')
        .select('*')
        .gte('shift_date', weekAgo)
        .lte('shift_date', today)
        .in('status', ['approved', 'invoiced', 'paid']);

      if (error) {
        console.error('❌ Error fetching weekly timesheets:', error);
        return [];
      }

      return data || [];
    },
    initialData: []
  });

  const stats = {
    todayShifts: todayShifts.length,
    openShifts: todayShifts.filter(s => s.status === 'open').length,
    weekShifts: weekShifts.length,
    completedShifts: weekShifts.filter(s => s.status === 'completed').length,
    activeStaff: activeStaff.length,
    weekRevenue: weekTimesheets.reduce((sum, t) => sum + (t.client_charge_amount || 0), 0),
    fillRate: weekShifts.length > 0 
      ? ((weekShifts.filter(s => s.status !== 'open').length / weekShifts.length) * 100).toFixed(1)
      : 0
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card className="hover:shadow-lg transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <Calendar className="w-8 h-8 text-blue-600" />
            {stats.todayShifts > stats.openShifts ? (
              <TrendingUp className="w-5 h-5 text-green-500" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-orange-500" />
            )}
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.todayShifts}</p>
          <p className="text-xs text-gray-600">Shifts Today</p>
          {stats.openShifts > 0 && (
            <p className="text-xs text-red-600 mt-1">{stats.openShifts} unfilled</p>
          )}
        </CardContent>
      </Card>

      <Card className="hover:shadow-lg transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="w-8 h-8 text-green-600" />
            <span className="text-xs font-semibold text-green-600">{stats.fillRate}%</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.completedShifts}</p>
          <p className="text-xs text-gray-600">Completed (7d)</p>
          <p className="text-xs text-gray-500 mt-1">of {stats.weekShifts} total</p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-lg transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <Users className="w-8 h-8 text-purple-600" />
            <CheckCircle className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.activeStaff}</p>
          <p className="text-xs text-gray-600">Active Staff</p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-lg transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-8 h-8 text-green-600" />
            <TrendingUp className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">£{stats.weekRevenue.toFixed(0)}</p>
          <p className="text-xs text-gray-600">Revenue (7d)</p>
        </CardContent>
      </Card>
    </div>
  );
}