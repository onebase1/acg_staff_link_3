import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabaseAuth } from "@/api/supabaseAuth";
import { Timesheet, AdminWorkflow } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, Zap, Clock, CheckCircle, AlertTriangle, 
  Users, DollarSign, BarChart3, ArrowUpRight, Shield
} from "lucide-react";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { createPageUrl } from "@/utils";

/**
 * 📊 TIMESHEET ANALYTICS DASHBOARD
 * 
 * Tracks auto-approval performance metrics
 * Shows efficiency gains and validation trends
 * 
 * Part of: Priority 2.5 - Analytics & Reporting
 * Created: 2025-01-08
 */

export default function TimesheetAnalytics() {
  const [user, setUser] = useState(null);
  const [dateRange, setDateRange] = useState('month');

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await supabaseAuth.me();
      setUser(currentUser);
    };
    fetchUser();
  }, []);

  const { data: timesheets = [] } = useQuery({
    queryKey: ['timesheets-analytics'],
    queryFn: () => Timesheet.list('-created_date', 500),
    initialData: []
  });

  const { data: workflows = [] } = useQuery({
    queryKey: ['workflows-analytics'],
    queryFn: () => AdminWorkflow.filter({
      type: 'timesheet_discrepancy'
    }),
    initialData: []
  });

  // Filter by date range
  const filterByDateRange = (items) => {
    const today = new Date();
    let start;

    if (dateRange === 'week') {
      start = subDays(today, 7);
    } else if (dateRange === 'month') {
      start = startOfMonth(today);
    } else if (dateRange === 'all') {
      return items;
    }

    return items.filter(item => {
      const itemDate = new Date(item.created_date);
      return itemDate >= start && itemDate <= today;
    });
  };

  const filteredTimesheets = filterByDateRange(timesheets);

  // Calculate metrics
  const totalSubmitted = filteredTimesheets.filter(t => 
    t.status === 'submitted' || t.status === 'approved' || t.status === 'paid'
  ).length;

  const autoApproved = filteredTimesheets.filter(t => 
    t.notes?.includes('[AUTO-APPROVED')
  ).length;

  const manuallyApproved = filteredTimesheets.filter(t => 
    (t.status === 'approved' || t.status === 'paid') && 
    !t.notes?.includes('[AUTO-APPROVED')
  ).length;

  const flaggedForReview = workflows.filter(w => 
    w.status === 'pending' || w.status === 'in_progress'
  ).length;

  const autoApprovalRate = totalSubmitted > 0 
    ? ((autoApproved / totalSubmitted) * 100).toFixed(1) 
    : 0;

  // Time savings calculation
  const manualReviewTime = 5; // minutes per timesheet
  const timeSaved = (autoApproved * manualReviewTime) / 60; // hours

  // Approval speed comparison
  const avgAutoApprovalTime = 0.1; // minutes (instant)
  const avgManualApprovalTime = 120; // minutes (2 hours average)

  // Trend data (last 30 days)
  const trendData = Array.from({ length: 30 }, (_, i) => {
    const date = subDays(new Date(), 29 - i);
    const dateStr = format(date, 'yyyy-MM-dd');
    
    const dayTimesheets = timesheets.filter(t => {
      if (!t.created_date) return false;
      return format(new Date(t.created_date), 'yyyy-MM-dd') === dateStr;
    });

    const autoApprovedDay = dayTimesheets.filter(t => t.notes?.includes('[AUTO-APPROVED')).length;
    const manualDay = dayTimesheets.filter(t => 
      (t.status === 'approved' || t.status === 'paid') && !t.notes?.includes('[AUTO-APPROVED')
    ).length;

    return {
      date: format(date, 'MMM d'),
      auto: autoApprovedDay,
      manual: manualDay,
      total: autoApprovedDay + manualDay
    };
  });

  // Validation failure reasons
  const validationIssues = workflows.reduce((acc, w) => {
    if (w.description?.includes('missing_signature')) {
      acc.signatures = (acc.signatures || 0) + 1;
    }
    if (w.description?.includes('geofence_violation')) {
      acc.gps = (acc.gps || 0) + 1;
    }
    if (w.description?.includes('hours_mismatch')) {
      acc.hours = (acc.hours || 0) + 1;
    }
    if (w.description?.includes('missing_data')) {
      acc.data = (acc.data || 0) + 1;
    }
    return acc;
  }, {});

  const issuesPieData = [
    { name: 'Missing Signatures', value: validationIssues.signatures || 0, color: '#ef4444' },
    { name: 'GPS Issues', value: validationIssues.gps || 0, color: '#f59e0b' },
    { name: 'Hours Mismatch', value: validationIssues.hours || 0, color: '#8b5cf6' },
    { name: 'Missing Data', value: validationIssues.data || 0, color: '#6b7280' }
  ].filter(item => item.value > 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Timesheet Auto-Approval Analytics</h2>
        <p className="text-gray-600 mt-1">Track automation performance and efficiency gains</p>
      </div>

      {/* Date Range Filter */}
      <div className="flex gap-2">
        <Button
          variant={dateRange === 'week' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setDateRange('week')}
        >
          Last 7 Days
        </Button>
        <Button
          variant={dateRange === 'month' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setDateRange('month')}
        >
          This Month
        </Button>
        <Button
          variant={dateRange === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setDateRange('all')}
        >
          All Time
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-purple-900 uppercase">Auto-Approval Rate</p>
              <Zap className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-3xl font-bold text-purple-900">{autoApprovalRate}%</p>
            <p className="text-xs text-purple-700 mt-1">
              {autoApproved} of {totalSubmitted} auto-approved
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-green-900 uppercase">Time Saved</p>
              <Clock className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-green-900">{timeSaved.toFixed(1)}h</p>
            <p className="text-xs text-green-700 mt-1">
              ~{(timeSaved * 60).toFixed(0)} minutes total
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-orange-900 uppercase">Manual Reviews</p>
              <AlertTriangle className="w-5 h-5 text-orange-600" />
            </div>
            <p className="text-3xl font-bold text-orange-900">{flaggedForReview}</p>
            <p className="text-xs text-orange-700 mt-1">
              Flagged for admin review
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-blue-900 uppercase">Avg Approval Time</p>
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-blue-900">{avgAutoApprovalTime}m</p>
            <p className="text-xs text-blue-700 mt-1">
              vs {avgManualApprovalTime}m manual
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>30-Day Approval Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="auto" stroke="#a855f7" name="Auto-Approved" strokeWidth={2} />
              <Line type="monotone" dataKey="manual" stroke="#3b82f6" name="Manual Approved" strokeWidth={2} />
              <Line type="monotone" dataKey="total" stroke="#22c55e" name="Total" strokeWidth={2} strokeDasharray="5 5" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Validation Failure Breakdown */}
      {issuesPieData.length > 0 && (
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Validation Failure Reasons</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={issuesPieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {issuesPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recommendations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {validationIssues.signatures > 5 && (
                <div className="p-3 bg-red-50 border border-red-200 rounded">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5" />
                    <div>
                      <p className="font-semibold text-red-900 text-sm">Missing Signatures Issue</p>
                      <p className="text-xs text-red-700 mt-1">
                        {validationIssues.signatures} timesheets missing signatures. Remind staff and clients to sign digitally.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {validationIssues.gps > 3 && (
                <div className="p-3 bg-orange-50 border border-orange-200 rounded">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-600 mt-0.5" />
                    <div>
                      <p className="font-semibold text-orange-900 text-sm">GPS Validation Failures</p>
                      <p className="text-xs text-orange-700 mt-1">
                        {validationIssues.gps} timesheets failed GPS validation. Check geofence radius settings.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {validationIssues.hours > 5 && (
                <div className="p-3 bg-purple-50 border border-purple-200 rounded">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-purple-600 mt-0.5" />
                    <div>
                      <p className="font-semibold text-purple-900 text-sm">Hours Discrepancies</p>
                      <p className="text-xs text-purple-700 mt-1">
                        {validationIssues.hours} timesheets with hours mismatch. Review shift scheduling accuracy.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {autoApprovalRate > 80 && (
                <div className="p-3 bg-green-50 border border-green-200 rounded">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-semibold text-green-900 text-sm">Excellent Performance! 🎉</p>
                      <p className="text-xs text-green-700 mt-1">
                        {autoApprovalRate}% auto-approval rate is outstanding. System working optimally.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Efficiency Metrics */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-700">Processing Speed</p>
              <ArrowUpRight className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {autoApprovalRate > 0 ? ((avgManualApprovalTime / avgAutoApprovalTime).toFixed(0)) : 0}x
            </p>
            <p className="text-xs text-gray-600 mt-1">Faster than manual</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-700">Staff Benefit</p>
              <Users className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {autoApproved > 0 ? (timeSaved / autoApproved * 60).toFixed(0) : 0}m
            </p>
            <p className="text-xs text-gray-600 mt-1">Faster payment per timesheet</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-700">Error Rate</p>
              <Shield className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {totalSubmitted > 0 ? (((totalSubmitted - autoApproved) / totalSubmitted) * 100).toFixed(1) : 0}%
            </p>
            <p className="text-xs text-gray-600 mt-1">Required manual review</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="border-2 border-purple-300">
        <CardContent className="p-6">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-purple-600" />
            Quick Actions
          </h3>
          <div className="grid md:grid-cols-2 gap-3">
            <Button
              onClick={async () => {
                try {
                  const { data } = await supabase.functions.invoke('scheduled-timesheet-processor', { body: {} });
                  if (data.success) {
                    alert(`✅ Processed ${data.processed} timesheets\n${data.approved} auto-approved\n${data.flagged} flagged for review`);
                  }
                } catch (error) {
                  alert(`❌ Error: ${error.message}`);
                }
              }}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Zap className="w-4 h-4 mr-2" />
              Run Batch Processor Now
            </Button>
            <Button
              variant="outline"
              onClick={() => window.location.href = createPageUrl('Timesheets')}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Go to Timesheets
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}