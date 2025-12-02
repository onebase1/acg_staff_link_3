import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Bell, BellOff, Check, X, Eye, Calendar, DollarSign,
    AlertTriangle, Info, Megaphone, Wrench, Package, Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';

/**
 * NotificationCenter Component
 * In-app notification hub for client portal users
 * 
 * Features:
 * - Unread/All notifications filtering
 * - Notification type filtering (shifts, payments, compliance, system)
 * - Mark as read/dismissed
 * - Click to navigate to related entity
 * - Real-time unread count
 */
export default function NotificationCenter({ onClose }) {
    const queryClient = useQueryClient();
    const [filter, setFilter] = useState('all'); // all, unread
    const [typeFilter, setTypeFilter] = useState('all'); // all, shift, payment, compliance, system

    // Fetch notifications
    const { data: notifications = [], isLoading } = useQuery({
        queryKey: ['client-notifications', filter, typeFilter],
        queryFn: async () => {
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            if (authError || !user) throw new Error('Not authenticated');

            const { data: contactData, error: contactError } = await supabase
                .from('client_contacts')
                .select('id, client_id')
                .eq('profile_id', user.id)
                .eq('is_active', true)
                .single();

            if (contactError || !contactData) throw new Error('Client contact not found');

            let query = supabase
                .from('client_notifications')
                .select('*')
                .or(`client_id.eq.${contactData.client_id},contact_id.eq.${contactData.id}`)
                .order('created_at', { ascending: false })
                .limit(50);

            // Filter by read status
            if (filter === 'unread') {
                query = query.is('read_at', null).is('dismissed_at', null);
            }

            // Filter by type
            if (typeFilter !== 'all') {
                const typePatterns = {
                    shift: 'shift_%',
                    payment: 'payment_%,invoice_%',
                    compliance: 'compliance_%,document_%',
                    system: 'system_%,feature_%,maintenance_%'
                };
                const pattern = typePatterns[typeFilter];
                if (pattern) {
                    query = query.or(pattern.split(',').map(p => `type.like.${p}`).join(','));
                }
            }

            const { data, error } = await query;
            if (error) throw error;

            return data || [];
        },
        refetchInterval: 30000, // Refresh every 30 seconds
    });

    // Mark as read mutation
    const markAsReadMutation = useMutation({
        mutationFn: async (notificationId) => {
            const { error } = await supabase
                .from('client_notifications')
                .update({ read_at: new Date().toISOString() })
                .eq('id', notificationId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['client-notifications']);
        },
    });

    // Dismiss notification mutation
    const dismissMutation = useMutation({
        mutationFn: async (notificationId) => {
            const { error } = await supabase
                .from('client_notifications')
                .update({ dismissed_at: new Date().toISOString() })
                .eq('id', notificationId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['client-notifications']);
            toast.success('Notification dismissed');
        },
    });

    // Mark all as read mutation
    const markAllReadMutation = useMutation({
        mutationFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            const { data: contactData } = await supabase
                .from('client_contacts')
                .select('id, client_id')
                .eq('profile_id', user.id)
                .eq('is_active', true)
                .single();

            const { error } = await supabase
                .from('client_notifications')
                .update({ read_at: new Date().toISOString() })
                .or(`client_id.eq.${contactData.client_id},contact_id.eq.${contactData.id}`)
                .is('read_at', null);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['client-notifications']);
            toast.success('All notifications marked as read');
        },
    });

    const handleNotificationClick = (notification) => {
        // Mark as read
        if (!notification.read_at) {
            markAsReadMutation.mutate(notification.id);
        }

        // Navigate to related entity (future enhancement)
        // if (notification.related_entity_type === 'shift') { ... }
    };

    const getNotificationIcon = (type) => {
        if (type.startsWith('shift_')) return <Calendar className="w-5 h-5 text-blue-600" />;
        if (type.startsWith('payment_') || type.startsWith('invoice_')) return <DollarSign className="w-5 h-5 text-green-600" />;
        if (type.startsWith('compliance_') || type.startsWith('document_')) return <AlertTriangle className="w-5 h-5 text-orange-600" />;
        if (type.startsWith('system_') || type.startsWith('feature_')) return <Info className="w-5 h-5 text-purple-600" />;
        return <Bell className="w-5 h-5 text-gray-600" />;
    };

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'urgent': return 'bg-red-100 border-red-300 text-red-900';
            case 'high': return 'bg-orange-100 border-orange-300 text-orange-900';
            case 'normal': return 'bg-blue-50 border-blue-200 text-blue-900';
            case 'low': return 'bg-gray-50 border-gray-200 text-gray-900';
            default: return 'bg-gray-50 border-gray-200 text-gray-900';
        }
    };

    const unreadCount = notifications.filter(n => !n.read_at && !n.dismissed_at).length;

    return (
        <Card className="max-w-4xl mx-auto h-[600px] flex flex-col">
            <CardHeader className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <Bell className="w-6 h-6" />
                        Notifications
                        {unreadCount > 0 && (
                            <Badge className="bg-red-500 text-white ml-2">
                                {unreadCount} new
                            </Badge>
                        )}
                    </CardTitle>
                    <div className="flex gap-2">
                        {unreadCount > 0 && (
                            <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => markAllReadMutation.mutate()}
                                disabled={markAllReadMutation.isPending}
                            >
                                <Check className="w-4 h-4 mr-1" />
                                Mark All Read
                            </Button>
                        )}
                        {onClose && (
                            <Button size="sm" variant="ghost" onClick={onClose} className="text-white hover:bg-white/20">
                                <X className="w-4 h-4" />
                            </Button>
                        )}
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-4 flex-1 overflow-hidden flex flex-col">
                {/* Filters */}
                <div className="flex gap-2 mb-4 flex-wrap">
                    <Button
                        size="sm"
                        variant={filter === 'all' ? 'default' : 'outline'}
                        onClick={() => setFilter('all')}
                    >
                        All
                    </Button>
                    <Button
                        size="sm"
                        variant={filter === 'unread' ? 'default' : 'outline'}
                        onClick={() => setFilter('unread')}
                    >
                        Unread ({unreadCount})
                    </Button>

                    <div className="w-px bg-gray-300 mx-2" />

                    <Button
                        size="sm"
                        variant={typeFilter === 'all' ? 'default' : 'outline'}
                        onClick={() => setTypeFilter('all')}
                    >
                        <Package className="w-4 h-4 mr-1" />
                        All Types
                    </Button>
                    <Button
                        size="sm"
                        variant={typeFilter === 'shift' ? 'default' : 'outline'}
                        onClick={() => setTypeFilter('shift')}
                    >
                        <Calendar className="w-4 h-4 mr-1" />
                        Shifts
                    </Button>
                    <Button
                        size="sm"
                        variant={typeFilter === 'payment' ? 'default' : 'outline'}
                        onClick={() => setTypeFilter('payment')}
                    >
                        <DollarSign className="w-4 h-4 mr-1" />
                        Payments
                    </Button>
                    <Button
                        size="sm"
                        variant={typeFilter === 'compliance' ? 'default' : 'outline'}
                        onClick={() => setTypeFilter('compliance')}
                    >
                        <AlertTriangle className="w-4 h-4 mr-1" />
                        Compliance
                    </Button>
                </div>

                {/* Notification List */}
                <div className="flex-1 overflow-y-auto space-y-2">
                    {isLoading ? (
                        <div className="text-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2" />
                            <p className="text-gray-600">Loading notifications...</p>
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="text-center py-12">
                            <BellOff className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                            <p className="text-gray-600 font-medium">No notifications</p>
                            <p className="text-sm text-gray-500 mt-1">
                                {filter === 'unread' ? "You're all caught up!" : 'Notifications will appear here'}
                            </p>
                        </div>
                    ) : (
                        notifications.map((notification) => (
                            <div
                                key={notification.id}
                                onClick={() => handleNotificationClick(notification)}
                                className={`
                  p-4 rounded-lg border-2 cursor-pointer transition-all
                  ${!notification.read_at
                                        ? 'bg-blue-50 border-blue-300 hover:bg-blue-100'
                                        : 'bg-white border-gray-200 hover:bg-gray-50'
                                    }
                  ${getPriorityColor(notification.priority)}
                `}
                            >
                                <div className="flex items-start gap-3">
                                    <div className="flex-shrink-0 mt-1">
                                        {getNotificationIcon(notification.type)}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <h4 className="font-semibold text-sm">
                                                {notification.title}
                                                {!notification.read_at && (
                                                    <span className="ml-2 inline-flex items-center justify-center w-2 h-2 bg-blue-600 rounded-full" />
                                                )}
                                            </h4>
                                            <div className="flex items-center gap-1 flex-shrink-0">
                                                {notification.priority === 'urgent' && (
                                                    <Badge variant="destructive" className="text-xs">URGENT</Badge>
                                                )}
                                                {notification.priority === 'high' && (
                                                    <Badge variant="warning" className="text-xs">HIGH</Badge>
                                                )}
                                            </div>
                                        </div>

                                        <p className="text-sm text-gray-700 mt-1">
                                            {notification.message}
                                        </p>

                                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                                            </span>
                                            {notification.channel && (
                                                <Badge variant="outline" className="text-xs">
                                                    {notification.channel}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>

                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            dismissMutation.mutate(notification.id);
                                        }}
                                        className="flex-shrink-0"
                                    >
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
