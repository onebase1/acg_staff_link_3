import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Bell, Clock, CheckCircle, XCircle, Zap, RefreshCw, Send, Search, Mail,
  AlertCircle, Timer, Inbox, Archive
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

export default function NotificationMonitor() {
  const [statusFilter, setStatusFilter] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  const queryClient = useQueryClient();

  // Auto-refresh every 30 seconds if enabled
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      queryClient.invalidateQueries(['notification-queue']);
    }, 30000);
    
    return () => clearInterval(interval);
  }, [autoRefresh, queryClient]);

  const { data: queues = [], isLoading } = useQuery({
    queryKey: ['notification-queue'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notification_queue')
        .select('*')
        .order('created_date', { ascending: false });

      if (error) {
        console.error('❌ Error fetching notification queue:', error);
        return [];
      }

      return data || [];
    },
    initialData: [],
    refetchInterval: autoRefresh ? 30000 : false
  });

  const forceSendMutation = useMutation({
    mutationFn: async (queueId) => {
      // Call digest engine but pass specific queue ID to process
      const { data, error } = await supabase.functions.invoke('notification-digest-engine', {
        body: {
          force_queue_id: queueId
        }
      });

      if (error) {
        throw error;
      }

      return data;
    },
    onSuccess: (data, queueId) => {
      queryClient.invalidateQueries(['notification-queue']);
      toast.success('✅ Email sent immediately!');
      console.log('Force send result:', data);
    },
    onError: (error) => {
      toast.error(`❌ Failed to send: ${error.message}`);
    }
  });

  const filteredQueues = queues.filter(q => {
    const statusMatch = statusFilter === 'all' || q.status === statusFilter;
    
    if (!searchTerm.trim()) return statusMatch;
    
    const search = searchTerm.toLowerCase();
    const emailMatch = q.recipient_email?.toLowerCase().includes(search);
    const typeMatch = q.notification_type?.toLowerCase().includes(search);
    
    return statusMatch && (emailMatch || typeMatch);
  });

  const filterCounts = {
    all: queues.length,
    pending: queues.filter(q => q.status === 'pending').length,
    sent: queues.filter(q => q.status === 'sent').length,
    failed: queues.filter(q => q.status === 'failed').length,
    cancelled: queues.filter(q => q.status === 'cancelled').length
  };

  const getStatusBadge = (status) => {
    const variants = {
      pending: { className: 'bg-yellow-100 text-yellow-800', icon: Clock },
      sent: { className: 'bg-green-100 text-green-800', icon: CheckCircle },
      failed: { className: 'bg-red-100 text-red-800', icon: XCircle },
      cancelled: { className: 'bg-gray-100 text-gray-600', icon: Archive }
    };
    return variants[status] || variants.pending;
  };

  const getRecipientTypeBadge = (type) => {
    const variants = {
      staff: { className: 'bg-blue-100 text-blue-800' },
      client: { className: 'bg-purple-100 text-purple-800' },
      admin: { className: 'bg-orange-100 text-orange-800' }
    };
    return variants[type] || { className: 'bg-gray-100 text-gray-800' };
  };

  const TimeUntilSend = ({ scheduledTime }) => {
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
      const updateTimer = () => {
        const now = new Date();
        const scheduled = new Date(scheduledTime);
        const diff = scheduled - now;

        if (diff <= 0) {
          setTimeLeft('Ready to send');
        } else {
          const mins = Math.floor(diff / 60000);
          const secs = Math.floor((diff % 60000) / 1000);
          setTimeLeft(`${mins}m ${secs}s`);
        }
      };

      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    }, [scheduledTime]);

    return (
      <div className="flex items-center gap-1 text-sm text-gray-600">
        <Timer className="w-3 h-3" />
        <span>{timeLeft}</span>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="w-8 h-8 text-cyan-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Notification Monitor</h2>
          <p className="text-gray-600 mt-1">
            Real-time monitoring of email notification batching system
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={autoRefresh ? 'default' : 'outline'}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
            {autoRefresh ? 'Auto-Refresh ON' : 'Auto-Refresh OFF'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => queryClient.invalidateQueries(['notification-queue'])}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Now
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{filterCounts.pending}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Sent</p>
                <p className="text-2xl font-bold text-green-600">{filterCounts.sent}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Failed</p>
                <p className="text-2xl font-bold text-red-600">{filterCounts.failed}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total</p>
                <p className="text-2xl font-bold text-gray-900">{filterCounts.all}</p>
              </div>
              <Inbox className="w-8 h-8 text-gray-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search by email or notification type..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Status Filter */}
            <div className="flex gap-2 overflow-x-auto">
              <Button
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('all')}
              >
                All ({filterCounts.all})
              </Button>
              <Button
                variant={statusFilter === 'pending' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('pending')}
                className={statusFilter === 'pending' ? 'bg-yellow-600' : ''}
              >
                Pending ({filterCounts.pending})
              </Button>
              <Button
                variant={statusFilter === 'sent' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('sent')}
                className={statusFilter === 'sent' ? 'bg-green-600' : ''}
              >
                Sent ({filterCounts.sent})
              </Button>
              <Button
                variant={statusFilter === 'failed' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('failed')}
                className={statusFilter === 'failed' ? 'bg-red-600' : ''}
              >
                Failed ({filterCounts.failed})
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Queue List */}
      <div className="space-y-4">
        {filteredQueues.map(queue => {
          const statusBadge = getStatusBadge(queue.status);
          const recipientBadge = getRecipientTypeBadge(queue.recipient_type);
          const StatusIcon = statusBadge.icon;

          return (
            <Card key={queue.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    {/* Header Row */}
                    <div className="flex items-center gap-3 flex-wrap">
                      <Badge {...statusBadge}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {queue.status}
                      </Badge>
                      <Badge {...recipientBadge}>
                        {queue.recipient_type}
                      </Badge>
                      <Badge variant="outline" className="capitalize">
                        {queue.notification_type?.replace('_', ' ')}
                      </Badge>
                      <span className="text-xs text-gray-500 font-mono">
                        #{queue.id.substring(0, 8)}
                      </span>
                    </div>

                    {/* Recipient */}
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <span className="font-medium text-gray-900">{queue.recipient_email}</span>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Bell className="w-4 h-4" />
                        <span>{queue.item_count} {queue.item_count === 1 ? 'item' : 'items'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>
                          Created {formatDistanceToNow(new Date(queue.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>

                    {/* Scheduled/Sent Time */}
                    {queue.status === 'pending' && queue.scheduled_send_at && (
                      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-yellow-900">
                              ⏰ Scheduled for {format(new Date(queue.scheduled_send_at), 'h:mm:ss a')}
                            </p>
                            <p className="text-xs text-yellow-700 mt-1">
                              Will send in approximately 5 minutes from creation
                            </p>
                          </div>
                          <TimeUntilSend scheduledTime={queue.scheduled_send_at} />
                        </div>
                      </div>
                    )}

                    {queue.status === 'sent' && queue.sent_at && (
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-green-900">
                              ✅ Sent {formatDistanceToNow(new Date(queue.sent_at), { addSuffix: true })}
                            </p>
                            {queue.email_message_id && (
                              <p className="text-xs text-green-700 mt-1 font-mono">
                                Message ID: {queue.email_message_id}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {queue.status === 'failed' && queue.error_message && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-red-900">Error Details:</p>
                            <p className="text-xs text-red-700 mt-1">{queue.error_message}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Items Preview */}
                    {queue.pending_items && queue.pending_items.length > 0 && (
                      <details className="text-sm">
                        <summary className="cursor-pointer text-cyan-600 hover:text-cyan-700 font-medium">
                          View {queue.item_count} queued {queue.item_count === 1 ? 'shift' : 'shifts'}
                        </summary>
                        <div className="mt-2 space-y-2 pl-4">
                          {queue.pending_items.map((item, idx) => (
                            <div key={idx} className="p-2 bg-gray-50 rounded text-xs">
                              <p><strong>Client:</strong> {item.client_name}</p>
                              <p><strong>Date:</strong> {item.date} • {item.start_time} - {item.end_time}</p>
                              {item.location && <p><strong>Location:</strong> {item.location}</p>}
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 min-w-[160px]">
                    {queue.status === 'pending' && (
                      <Button
                        size="sm"
                        onClick={() => forceSendMutation.mutate(queue.id)}
                        disabled={forceSendMutation.isPending}
                        className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700"
                      >
                        {forceSendMutation.isPending ? (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Zap className="w-4 h-4 mr-2" />
                            Force Send Now
                          </>
                        )}
                      </Button>
                    )}
                    
                    {queue.status === 'sent' && queue.email_message_id && (
                      <a
                        href={`https://resend.com/emails/${queue.email_message_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button size="sm" variant="outline" className="w-full">
                          <Send className="w-4 h-4 mr-2" />
                          View in Resend
                        </Button>
                      </a>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredQueues.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Inbox className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Notifications Found</h3>
            <p className="text-gray-600">
              {statusFilter === 'pending' 
                ? 'No notifications are currently queued. Assign shifts to see them here.' 
                : `No ${statusFilter} notifications to display.`}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Help Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-semibold mb-1">How Batching Works:</p>
              <ul className="list-disc list-inside space-y-1 text-blue-800">
                <li>Staff assignments are queued for <strong>5 minutes</strong> after first assignment</li>
                <li>Multiple assignments to same person are <strong>batched into ONE email</strong></li>
                <li>Reduces email spam and costs by ~90%</li>
                <li>Use "Force Send Now" to bypass wait time during testing</li>
                <li>Auto-refresh checks for updates every 30 seconds</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}