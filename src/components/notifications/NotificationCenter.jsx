import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Bell, AlertCircle, Calendar, FileText, CheckCircle, 
  Clock, Star, TrendingUp
} from "lucide-react";
import { format } from "date-fns";

export default function NotificationCenter({ userId, userType }) {
  const { data: shifts = [] } = useQuery({
    queryKey: ['shifts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .order('date', { ascending: false });

      if (error) {
        console.error('❌ Error fetching shifts for NotificationCenter:', error);
        return [];
      }

      return data || [];
    },
    initialData: []
  });

  const { data: compliance = [] } = useQuery({
    queryKey: ['compliance'],
    queryFn: async () => {
      const { data, error } = await supabase.from('compliance').select('*');
      if (error) {
        console.error('❌ Error fetching compliance for NotificationCenter:', error);
        return [];
      }
      return data || [];
    },
    initialData: []
  });

  const { data: timesheets = [] } = useQuery({
    queryKey: ['timesheets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('timesheets')
        .select('*')
        .order('created_date', { ascending: false });
      if (error) {
        console.error('❌ Error fetching timesheets for NotificationCenter:', error);
        return [];
      }
      return data || [];
    },
    initialData: []
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['staff'],
    queryFn: async () => {
      const { data, error } = await supabase.from('staff').select('*');
      if (error) {
        console.error('❌ Error fetching staff for NotificationCenter:', error);
        return [];
      }
      return data || [];
    },
    initialData: []
  });

  // Generate smart notifications
  const notifications = [];

  // Urgent shifts
  const urgentOpenShifts = shifts.filter(s => 
    s.status === 'open' && (s.urgency === 'urgent' || s.urgency === 'critical')
  );
  if (urgentOpenShifts.length > 0) {
    notifications.push({
      type: 'urgent',
      icon: AlertCircle,
      title: `${urgentOpenShifts.length} Urgent Shifts Need Coverage`,
      description: 'Critical staffing gaps require immediate attention',
      action: 'View Shifts',
      time: 'Now',
      color: 'red'
    });
  }

  // Expired compliance
  const expiredDocs = compliance.filter(d => d.status === 'expired');
  if (expiredDocs.length > 0) {
    const staffIds = [...new Set(expiredDocs.map(d => d.staff_id))];
    notifications.push({
      type: 'compliance',
      icon: FileText,
      title: `${staffIds.length} Staff with Expired Documents`,
      description: `${expiredDocs.length} documents need renewal`,
      action: 'Review',
      time: 'Critical',
      color: 'red'
    });
  }

  // Expiring soon
  const expiringSoon = compliance.filter(d => {
    if (!d.expiry_date || d.status === 'expired') return false;
    const days = Math.floor((new Date(d.expiry_date) - new Date()) / (1000 * 60 * 60 * 24));
    return days > 0 && days <= 7;
  });
  if (expiringSoon.length > 0) {
    notifications.push({
      type: 'compliance',
      icon: Clock,
      title: `${expiringSoon.length} Documents Expiring This Week`,
      description: 'Renewal reminders sent to affected staff',
      action: 'View',
      time: '1d ago',
      color: 'orange'
    });
  }

  // Pending timesheets
  const pendingTimesheets = timesheets.filter(t => t.status === 'submitted');
  if (pendingTimesheets.length > 0) {
    notifications.push({
      type: 'approval',
      icon: CheckCircle,
      title: `${pendingTimesheets.length} Timesheets Awaiting Approval`,
      description: 'Review and approve to process payments',
      action: 'Review',
      time: '2h ago',
      color: 'blue'
    });
  }

  // Low-rated staff
  const lowRatedStaff = staff.filter(s => s.rating && s.rating < 4.0 && s.total_shifts_completed > 3);
  if (lowRatedStaff.length > 0) {
    notifications.push({
      type: 'performance',
      icon: Star,
      title: `${lowRatedStaff.length} Staff Below 4.0 Rating`,
      description: 'Consider performance review or additional training',
      action: 'View Details',
      time: '1d ago',
      color: 'yellow'
    });
  }

  // Fill rate achievement
  const fillRate = shifts.length > 0 ? ((shifts.filter(s => s.status !== 'open').length / shifts.length) * 100) : 0;
  if (fillRate >= 90) {
    notifications.push({
      type: 'success',
      icon: TrendingUp,
      title: `Excellent Fill Rate: ${fillRate.toFixed(0)}%`,
      description: 'Your agency is performing above industry average!',
      action: 'View Analytics',
      time: '3h ago',
      color: 'green'
    });
  }

  const getColorClasses = (color) => {
    const classes = {
      red: 'bg-red-100 text-red-600 border-red-300',
      orange: 'bg-orange-100 text-orange-600 border-orange-300',
      blue: 'bg-blue-100 text-blue-600 border-blue-300',
      green: 'bg-green-100 text-green-600 border-green-300',
      yellow: 'bg-yellow-100 text-yellow-600 border-yellow-300',
      purple: 'bg-purple-100 text-purple-600 border-purple-300'
    };
    return classes[color] || classes.blue;
  };

  return (
    <Card className="shadow-lg">
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Notifications
          {notifications.length > 0 && (
            <Badge className="bg-red-600 text-white ml-2">{notifications.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {notifications.length > 0 ? (
          <div className="divide-y max-h-96 overflow-y-auto">
            {notifications.map((notification, index) => {
              const Icon = notification.icon;
              return (
                <div key={index} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${getColorClasses(notification.color)}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900">{notification.title}</p>
                      <p className="text-sm text-gray-600 mt-1">{notification.description}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <Button variant="link" size="sm" className="p-0 h-auto text-cyan-600">
                          {notification.action}
                        </Button>
                        <span className="text-xs text-gray-400">{notification.time}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
            <p>All caught up! No new notifications.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}