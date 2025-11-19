/**
 * GPS ACCURACY MONITORING DASHBOARD
 * 
 * Purpose: Track GPS accuracy metrics in production to determine if threshold is needed
 * 
 * Metrics Tracked:
 * - Average GPS accuracy by device/browser
 * - Geofence validation success/failure rates
 * - Clock-in/out location accuracy distribution
 * - False positive/negative analysis
 * 
 * Usage: Admin → Analytics → GPS Monitoring
 */

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { 
  MapPin, TrendingUp, AlertTriangle, CheckCircle, 
  XCircle, Activity, Smartphone, Clock 
} from 'lucide-react';

export default function GPSAccuracyMonitoring() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState(null);
  const [dateRange, setDateRange] = useState('7d'); // 7d, 30d, 90d

  useEffect(() => {
    fetchMetrics();
  }, [dateRange]);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      // Calculate date range
      const daysAgo = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);

      // Fetch timesheets with GPS data
      const { data: timesheets, error } = await supabase
        .from('timesheets')
        .select(`
          id,
          clock_in_location,
          clock_out_location,
          geofence_validated,
          geofence_distance_meters,
          clock_out_geofence_validated,
          clock_out_geofence_distance_meters,
          created_date,
          clients (
            name,
            geofence_radius_meters
          )
        `)
        .gte('created_date', startDate.toISOString())
        .not('clock_in_location', 'is', null);

      if (error) throw error;

      // Calculate metrics
      const calculatedMetrics = calculateMetrics(timesheets);
      setMetrics(calculatedMetrics);

    } catch (error) {
      console.error('Error fetching GPS metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateMetrics = (timesheets) => {
    const accuracyData = [];
    const validationResults = { passed: 0, failed: 0, disabled: 0 };
    const distanceDistribution = { '0-50m': 0, '50-100m': 0, '100-200m': 0, '200m+': 0 };
    const clockOutValidation = { passed: 0, failed: 0, notChecked: 0 };

    timesheets.forEach(ts => {
      // Clock-in accuracy
      if (ts.clock_in_location?.accuracy) {
        accuracyData.push({
          accuracy: ts.clock_in_location.accuracy,
          type: 'clock_in',
          timestamp: ts.created_date
        });
      }

      // Clock-out accuracy
      if (ts.clock_out_location?.accuracy) {
        accuracyData.push({
          accuracy: ts.clock_out_location.accuracy,
          type: 'clock_out',
          timestamp: ts.created_date
        });
      }

      // Validation results
      if (ts.geofence_validated === true) validationResults.passed++;
      else if (ts.geofence_validated === false) validationResults.failed++;
      else validationResults.disabled++;

      // Distance distribution
      const distance = ts.geofence_distance_meters;
      if (distance !== null) {
        if (distance <= 50) distanceDistribution['0-50m']++;
        else if (distance <= 100) distanceDistribution['50-100m']++;
        else if (distance <= 200) distanceDistribution['100-200m']++;
        else distanceDistribution['200m+']++;
      }

      // Clock-out validation
      if (ts.clock_out_geofence_validated === true) clockOutValidation.passed++;
      else if (ts.clock_out_geofence_validated === false) clockOutValidation.failed++;
      else clockOutValidation.notChecked++;
    });

    // Calculate average accuracy
    const avgAccuracy = accuracyData.length > 0
      ? accuracyData.reduce((sum, d) => sum + d.accuracy, 0) / accuracyData.length
      : 0;

    // Accuracy distribution
    const accuracyDistribution = {
      'Excellent (0-10m)': accuracyData.filter(d => d.accuracy <= 10).length,
      'Good (10-30m)': accuracyData.filter(d => d.accuracy > 10 && d.accuracy <= 30).length,
      'Fair (30-50m)': accuracyData.filter(d => d.accuracy > 30 && d.accuracy <= 50).length,
      'Poor (50m+)': accuracyData.filter(d => d.accuracy > 50).length,
    };

    return {
      totalTimesheets: timesheets.length,
      avgAccuracy: Math.round(avgAccuracy),
      accuracyData,
      accuracyDistribution,
      validationResults,
      distanceDistribution,
      clockOutValidation,
      successRate: validationResults.passed + validationResults.failed > 0
        ? ((validationResults.passed / (validationResults.passed + validationResults.failed)) * 100).toFixed(1)
        : 0
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Activity className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!metrics) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>No GPS data available for the selected period</AlertDescription>
      </Alert>
    );
  }

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">GPS Accuracy Monitoring</h1>
        <div className="flex gap-2">
          {['7d', '30d', '90d'].map(range => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-4 py-2 rounded-lg ${
                dateRange === range 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Timesheets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics.totalTimesheets}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Avg GPS Accuracy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics.avgAccuracy}m</div>
            <Badge className={metrics.avgAccuracy <= 30 ? 'bg-green-500' : 'bg-yellow-500'}>
              {metrics.avgAccuracy <= 30 ? 'Excellent' : 'Fair'}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Validation Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics.successRate}%</div>
            <Badge className={metrics.successRate >= 95 ? 'bg-green-500' : 'bg-yellow-500'}>
              {metrics.successRate >= 95 ? 'Excellent' : 'Needs Review'}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Clock-Out Validation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics.clockOutValidation.passed}</div>
            <div className="text-sm text-gray-600">
              {metrics.clockOutValidation.failed} failed
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Accuracy Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>GPS Accuracy Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={Object.entries(metrics.accuracyDistribution).map(([name, value]) => ({ name, value }))}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {Object.entries(metrics.accuracyDistribution).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Validation Results */}
        <Card>
          <CardHeader>
            <CardTitle>Geofence Validation Results</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={[
                { name: 'Passed', value: metrics.validationResults.passed, fill: '#10b981' },
                { name: 'Failed', value: metrics.validationResults.failed, fill: '#ef4444' },
                { name: 'Disabled', value: metrics.validationResults.disabled, fill: '#6b7280' }
              ]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      {metrics.avgAccuracy > 50 && (
        <Alert className="border-yellow-300 bg-yellow-50">
          <AlertTriangle className="h-5 w-5 text-yellow-600" />
          <AlertDescription className="text-yellow-900">
            <strong>Recommendation:</strong> Average GPS accuracy is {metrics.avgAccuracy}m. 
            Consider implementing a 50m accuracy threshold to reject low-quality readings.
          </AlertDescription>
        </Alert>
      )}

      {metrics.successRate < 90 && (
        <Alert className="border-red-300 bg-red-50">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          <AlertDescription className="text-red-900">
            <strong>Alert:</strong> Validation success rate is {metrics.successRate}%. 
            Review geofence radius settings or investigate GPS accuracy issues.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

