import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    Bell, BellOff, Save, Info, Calendar, DollarSign,
    AlertTriangle, Megaphone, CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';

/**
 * NotificationPreferences Component
 * Allows clients to manage their notification preferences
 * 
 * Preferences stored in: client_contacts.notification_preferences (JSONB)
 * 
 * Categories:
 * - Shift Notifications
 * - Payment/Invoice Notifications
 * - Compliance/Document Notifications
 * - System/Feature Notifications
 */
export default function NotificationPreferences() {
    const queryClient = useQueryClient();
    const [hasChanges, setHasChanges] = useState(false);

    // Fetch current user's notification preferences
    const { data: preferences, isLoading } = useQuery({
        queryKey: ['notification-preferences'],
        queryFn: async () => {
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            if (authError || !user) throw new Error('Not authenticated');

            const { data: contactData, error: contactError } = await supabase
                .from('client_contacts')
                .select('id, notification_preferences')
                .eq('profile_id', user.id)
                .eq('is_active', true)
                .single();

            if (contactError || !contactData) {
                throw new Error('Client contact not found');
            }

            return {
                contactId: contactData.id,
                preferences: contactData.notification_preferences || getDefaultPreferences(),
            };
        },
    });

    const [localPreferences, setLocalPreferences] = useState(
        preferences?.preferences || getDefaultPreferences()
    );

    // Update local preferences when data loads
    React.useEffect(() => {
        if (preferences?.preferences) {
            setLocalPreferences(preferences.preferences);
        }
    }, [preferences]);

    // Save preferences mutation
    const savePreferencesMutation = useMutation({
        mutationFn: async (newPreferences: any) => {
            if (!preferences?.contactId) {
                throw new Error('Contact ID not found');
            }

            const { error } = await supabase
                .from('client_contacts')
                .update({ notification_preferences: newPreferences })
                .eq('id', preferences.contactId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['notification-preferences']);
            setHasChanges(false);
            toast.success('✅ Notification preferences saved!');
        },
        onError: (error: any) => {
            toast.error(`Failed to save: ${error.message}`);
        },
    });

    const handleToggle = (key: string) => {
        setLocalPreferences((prev: any) => ({
            ...prev,
            [key]: !prev[key],
        }));
        setHasChanges(true);
    };

    const handleSave = () => {
        savePreferencesMutation.mutate(localPreferences);
    };

    const handleEnableAll = () => {
        const allEnabled = Object.keys(localPreferences).reduce((acc, key) => ({
            ...acc,
            [key]: true,
        }), {});
        setLocalPreferences(allEnabled);
        setHasChanges(true);
    };

    const handleDisableAll = () => {
        const allDisabled = Object.keys(localPreferences).reduce((acc, key) => ({
            ...acc,
            [key]: false,
        }), {});
        setLocalPreferences(allDisabled);
        setHasChanges(true);
    };

    if (isLoading) {
        return (
            <Card className="max-w-4xl mx-auto">
                <CardContent className="p-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2" />
                    <p className="text-gray-600">Loading preferences...</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="max-w-4xl mx-auto">
            <CardHeader className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
                <CardTitle className="flex items-center gap-2">
                    <Bell className="w-6 h-6" />
                    Notification Preferences
                </CardTitle>
                <p className="text-purple-100 text-sm mt-1">
                    Choose which notifications you want to receive
                </p>
            </CardHeader>

            <CardContent className="p-6">
                {/* Info Alert */}
                <Alert className="mb-6 border-blue-200 bg-blue-50">
                    <Info className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-900">
                        These preferences apply to in-app notifications. Email and SMS preferences can be managed separately.
                    </AlertDescription>
                </Alert>

                {/* Quick Actions */}
                <div className="flex gap-3 mb-6">
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={handleEnableAll}
                    >
                        <Bell className="w-4 h-4 mr-1" />
                        Enable All
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={handleDisableAll}
                    >
                        <BellOff className="w-4 h-4 mr-1" />
                        Disable All
                    </Button>
                </div>

                {/* Shift Notifications */}
                <div className="space-y-6">
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <Calendar className="w-5 h-5 text-blue-600" />
                            <h3 className="text-lg font-semibold text-gray-900">Shift Notifications</h3>
                        </div>
                        <div className="space-y-4 pl-7">
                            <PreferenceToggle
                                label="Shift Assigned"
                                description="When a new shift is assigned to your facility"
                                checked={localPreferences.shift_assigned}
                                onChange={() => handleToggle('shift_assigned')}
                            />
                            <PreferenceToggle
                                label="24-Hour Reminder"
                                description="Reminder 24 hours before shift starts"
                                checked={localPreferences.shift_24h_reminder}
                                onChange={() => handleToggle('shift_24h_reminder')}
                            />
                            <PreferenceToggle
                                label="2-Hour Reminder"
                                description="Reminder 2 hours before shift starts"
                                checked={localPreferences.shift_2h_reminder}
                                onChange={() => handleToggle('shift_2h_reminder')}
                            />
                            <PreferenceToggle
                                label="Shift Complete"
                                description="When a shift is marked as completed"
                                checked={localPreferences.shift_complete}
                                onChange={() => handleToggle('shift_complete')}
                            />
                            <PreferenceToggle
                                label="Rating Reminder"
                                description="Reminder to rate staff performance after shift"
                                checked={localPreferences.rating_reminder}
                                onChange={() => handleToggle('rating_reminder')}
                            />
                        </div>
                    </div>

                    <hr className="border-gray-200" />

                    {/* Invoice/Payment Notifications */}
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <DollarSign className="w-5 h-5 text-green-600" />
                            <h3 className="text-lg font-semibold text-gray-900">Payment Notifications</h3>
                        </div>
                        <div className="space-y-4 pl-7">
                            <PreferenceToggle
                                label="Invoice Generated"
                                description="When a new invoice is created"
                                checked={localPreferences.invoice_notification}
                                onChange={() => handleToggle('invoice_notification')}
                            />
                            <PreferenceToggle
                                label="Payment Reminder"
                                description="Reminder when payment is due soon"
                                checked={localPreferences.payment_reminder}
                                onChange={() => handleToggle('payment_reminder')}
                            />
                        </div>
                    </div>

                    <hr className="border-gray-200" />

                    {/* Compliance Notifications */}
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <AlertTriangle className="w-5 h-5 text-orange-600" />
                            <h3 className="text-lg font-semibold text-gray-900">Compliance Notifications</h3>
                        </div>
                        <div className="space-y-4 pl-7">
                            <PreferenceToggle
                                label="Compliance Warnings"
                                description="Important compliance and regulatory alerts"
                                checked={localPreferences.compliance_warning}
                                onChange={() => handleToggle('compliance_warning')}
                                recommended
                            />
                        </div>
                    </div>

                    <hr className="border-gray-200" />

                    {/* System Notifications */}
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <Megaphone className="w-5 h-5 text-purple-600" />
                            <h3 className="text-lg font-semibold text-gray-900">System Notifications</h3>
                        </div>
                        <div className="space-y-4 pl-7">
                            <PreferenceToggle
                                label="System Updates"
                                description="Platform updates and new features"
                                checked={localPreferences.system_updates}
                                onChange={() => handleToggle('system_updates')}
                            />
                            <PreferenceToggle
                                label="Promotional"
                                description="Special offers and promotional content"
                                checked={localPreferences.promotional}
                                onChange={() => handleToggle('promotional')}
                            />
                        </div>
                    </div>
                </div>

                {/* Save Button */}
                <div className="flex items-center justify-between mt-8 pt-6 border-t">
                    <div>
                        {hasChanges && (
                            <p className="text-sm text-orange-600 flex items-center gap-1">
                                <Info className="w-4 h-4" />
                                You have unsaved changes
                            </p>
                        )}
                    </div>
                    <Button
                        onClick={handleSave}
                        disabled={!hasChanges || savePreferencesMutation.isPending}
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        {savePreferencesMutation.isPending ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4 mr-2" />
                                Save Preferences
                            </>
                        )}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

// Helper component for preference toggles
function PreferenceToggle({
    label,
    description,
    checked,
    onChange,
    recommended = false
}: {
    label: string;
    description: string;
    checked: boolean;
    onChange: () => void;
    recommended?: boolean;
}) {
    return (
        <div className="flex items-start justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
            <div className="flex-1 mr-4">
                <div className="flex items-center gap-2">
                    <Label htmlFor={label} className="font-medium text-gray-900 cursor-pointer">
                        {label}
                    </Label>
                    {recommended && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                            Recommended
                        </span>
                    )}
                </div>
                <p className="text-sm text-gray-600 mt-0.5">{description}</p>
            </div>
            <Switch
                id={label}
                checked={checked}
                onCheckedChange={onChange}
            />
        </div>
    );
}

// Default notification preferences
function getDefaultPreferences() {
    return {
        shift_assigned: true,
        shift_24h_reminder: true,
        shift_2h_reminder: true,
        shift_complete: true,
        rating_reminder: true,
        invoice_notification: true,
        payment_reminder: true,
        compliance_warning: true,
        system_updates: false,
        promotional: false,
    };
}
