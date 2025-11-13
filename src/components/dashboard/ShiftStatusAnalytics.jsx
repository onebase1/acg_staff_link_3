import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  CheckCircle, XCircle, Clock, AlertTriangle, TrendingDown, DollarSign 
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

export default function ShiftStatusAnalytics({ agencyId }) {
  const { data: shifts = [] } = useQuery({
    queryKey: ['shifts', agencyId],
    queryFn: async () => {
      const query = supabase.from('shifts').select('*');

      if (agencyId) {
        query.eq('agency_id', agencyId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Error fetching shifts for analytics:', error);
        return [];
      }

      return data || [];
    },
    initialData: []
  });

  // Calculate status breakdown
  const statusCounts = {
    completed: shifts.filter(s => s.status === 'completed').length,
    in_progress: shifts.filter(s => s.status === 'in_progress').length,
    awaiting_verification: shifts.filter(s => s.status === 'awaiting_verification').length,
    disputed: shifts.filter(s => s.status === 'disputed').length,
    cancelled: shifts.filter(s => s.status === 'cancelled').length,
    no_show: shifts.filter(s => s.status === 'no_show').length,
    open: shifts.filter(s => s.status === 'open').length,
    unfilled_escalated: shifts.filter(s => s.status === 'unfilled_escalated').length
  };

  // Calculate revenue loss
  const avgShiftValue = shifts.length > 0 
    ? shifts.reduce((sum, s) => sum + ((s.charge_rate || 0) * (s.duration_hours || 0)), 0) / shifts.length 
    : 0;

  const revenueLoss = {
    no_shows: statusCounts.no_show * avgShiftValue,
    cancellations: statusCounts.cancelled * avgShiftValue * 0.3, // 30% loss on cancellations
    unfilled: statusCounts.unfilled_escalated * avgShiftValue,
    disputed: statusCounts.disputed * avgShiftValue * 0.5 // 50% risk on disputes
  };

  const totalLoss = Object.values(revenueLoss).reduce((sum, val) => sum + val, 0);

  // Chart data
  const chartData = [
    { name: 'Completed', value: statusCounts.completed, color: '#10b981' },
    { name: 'In Progress', value: statusCounts.in_progress, color: '#3b82f6' },
    { name: 'Awaiting Verification', value: statusCounts.awaiting_verification, color: '#f59e0b' },
    { name: 'Disputed', value: statusCounts.disputed, color: '#ef4444' },
    { name: 'Cancelled', value: statusCounts.cancelled, color: '#6b7280' },
    { name: 'No Show', value: statusCounts.no_show, color: '#dc2626' },
    { name: 'Open', value: statusCounts.open, color: '#8b5cf6' },
    { name: 'Unfilled (Escalated)', value: statusCounts.unfilled_escalated, color: '#f97316' }
  ].filter(item => item.value > 0);

  const completionRate = shifts.length > 0 
    ? ((statusCounts.completed / shifts.length) * 100).toFixed(1) 
    : 0;

  return (
    <div className="space-y-6">
      {/* Revenue Loss Alert */}
      {totalLoss > 0 && (
        <Alert className="border-red-300 bg-red-50">
          <TrendingDown className="h-5 w-5 text-red-600" />
          <AlertDescription className="text-red-900">
            <strong>⚠️ Revenue at Risk: £{totalLoss.toFixed(0)}</strong>
            <div className="mt-2 text-sm space-y-1">
              {revenueLoss.no_shows > 0 && (
                <p>• No-shows: £{revenueLoss.no_shows.toFixed(0)} ({statusCounts.no_show} shifts)</p>
              )}
              {revenueLoss.cancellations > 0 && (
                <p>• Cancellations: £{revenueLoss.cancellations.toFixed(0)} ({statusCounts.cancelled} shifts)</p>
              )}
              {revenueLoss.unfilled > 0 && (
                <p>• Unfilled: £{revenueLoss.unfilled.toFixed(0)} ({statusCounts.unfilled_escalated} shifts)</p>
              )}
              {revenueLoss.disputed > 0 && (
                <p>• Disputed: £{revenueLoss.disputed.toFixed(0)} ({statusCounts.disputed} shifts)</p>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-green-600">{statusCounts.completed}</p>
              <p className="text-xs text-gray-600">Completed</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <Clock className="w-8 h-8 text-orange-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-orange-600">{statusCounts.awaiting_verification}</p>
              <p className="text-xs text-gray-600">Awaiting Verification</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <AlertTriangle className="w-8 h-8 text-red-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-red-600">{statusCounts.disputed}</p>
              <p className="text-xs text-gray-600">Disputed</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <XCircle className="w-8 h-8 text-gray-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-600">{statusCounts.no_show}</p>
              <p className="text-xs text-gray-600">No-Shows</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle>Shift Status Distribution</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-3">
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm text-green-700 font-medium">Completion Rate</p>
                <p className="text-3xl font-bold text-green-600">{completionRate}%</p>
                <p className="text-xs text-green-600 mt-1">{statusCounts.completed} of {shifts.length} shifts</p>
              </div>

              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <p className="text-sm text-red-700 font-medium">Revenue at Risk</p>
                <p className="text-3xl font-bold text-red-600">£{totalLoss.toFixed(0)}</p>
                <p className="text-xs text-red-600 mt-1">
                  {statusCounts.no_show + statusCounts.cancelled + statusCounts.disputed} problem shifts
                </p>
              </div>

              <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                <p className="text-sm text-orange-700 font-medium">Awaiting Action</p>
                <p className="text-3xl font-bold text-orange-600">{statusCounts.awaiting_verification}</p>
                <p className="text-xs text-orange-600 mt-1">Require manual verification</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Items */}
      {(statusCounts.awaiting_verification > 0 || statusCounts.disputed > 0) && (
        <Card className="border-2 border-orange-300">
          <CardHeader className="border-b bg-orange-50">
            <CardTitle className="flex items-center gap-2 text-orange-900">
              <AlertTriangle className="w-5 h-5" />
              Action Required
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3">
              {statusCounts.awaiting_verification > 0 && (
                <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                  <div>
                    <p className="font-semibold text-gray-900">{statusCounts.awaiting_verification} shifts awaiting verification</p>
                    <p className="text-sm text-gray-600">Review and confirm these shifts were actually worked</p>
                  </div>
                  <Badge className="bg-orange-100 text-orange-800">Pending</Badge>
                </div>
              )}
              
              {statusCounts.disputed > 0 && (
                <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                  <div>
                    <p className="font-semibold text-gray-900">{statusCounts.disputed} disputed shifts</p>
                    <p className="text-sm text-gray-600">Resolve disputes to release payment</p>
                  </div>
                  <Badge className="bg-red-100 text-red-800">Urgent</Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}