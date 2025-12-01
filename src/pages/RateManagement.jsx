
import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Search,
    Save,
    Building2,
    TrendingUp,
    DollarSign,
    AlertCircle,
    ChevronDown,
    ChevronRight,
    Coins,
    Users,
    AlertTriangle
} from "lucide-react";
import { toast } from "sonner";
import { STAFF_ROLES } from "@/constants/staffRoles";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import RateChangeConfirmationModal from "@/components/rates/RateChangeConfirmationModal";

export default function RateManagement() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [user, setUser] = useState(null);
    const [currentAgency, setCurrentAgency] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState('by_role'); // 'by_role' or 'by_client'
    const [selectedRole, setSelectedRole] = useState(STAFF_ROLES[0].value);
    const [expandedClients, setExpandedClients] = useState({});
    const [pendingChanges, setPendingChanges] = useState({}); // { clientId: { role: { pay_rate, charge_rate } } }
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

    // Navigation Blocking
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (Object.keys(pendingChanges).length > 0) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [pendingChanges]);

    // Auth Check
    useEffect(() => {
        const checkAccess = async () => {
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (!authUser) {
                navigate(createPageUrl('Home'));
                return;
            }

            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', authUser.id)
                .single();

            if (!profile || profile.user_type === 'staff_member') {
                toast.error('Access Denied');
                navigate(createPageUrl('Home'));
                return;
            }

            setUser(profile);
            setCurrentAgency(profile.agency_id);
        };
        checkAccess();
    }, [navigate]);

    // Fetch Clients
    const { data: clients = [], isLoading } = useQuery({
        queryKey: ['clients', currentAgency],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('clients')
                .select('*')
                .eq('agency_id', currentAgency)
                .order('name');
            if (error) throw error;
            return data;
        },
        enabled: !!currentAgency
    });

    // Save Mutation
    const saveMutation = useMutation({
        mutationFn: async (changes) => {
            const promises = Object.entries(changes).map(async ([clientId, rates]) => {
                // 1. Get current client data to merge
                const client = clients.find(c => c.id === clientId);
                if (!client) return;

                const currentRates = client.contract_terms?.rates_by_role || {};

                // 2. Merge changes
                const updatedRates = { ...currentRates };
                Object.entries(rates).forEach(([role, values]) => {
                    updatedRates[role] = {
                        ...updatedRates[role],
                        ...values
                    };
                });

                // 3. Update database
                const { error } = await supabase
                    .from('clients')
                    .update({
                        contract_terms: {
                            ...client.contract_terms,
                            rates_by_role: updatedRates
                        }
                    })
                    .eq('id', clientId);

                if (error) throw error;
            });

            await Promise.all(promises);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['clients']);
            setPendingChanges({});
            setIsReviewModalOpen(false);
            toast.success('Rates updated successfully');
        },
        onError: (error) => {
            toast.error(`Failed to save rates: ${error.message}`);
        }
    });

    const handleRateChange = (clientId, role, type, value) => {
        const numValue = parseFloat(value) || 0;

        setPendingChanges(prev => ({
            ...prev,
            [clientId]: {
                ...prev[clientId],
                [role]: {
                    ...prev[clientId]?.[role],
                    [type]: numValue
                }
            }
        }));
    };

    const getRate = (client, role, type) => {
        // Check pending changes first
        if (pendingChanges[client.id]?.[role]?.[type] !== undefined) {
            return pendingChanges[client.id][role][type];
        }
        // Fallback to existing data
        return client.contract_terms?.rates_by_role?.[role]?.[type] || 0;
    };

    const calculateMargin = (pay, charge) => {
        if (!charge) return 0;
        return ((charge - pay) / charge) * 100;
    };

    const filteredClients = clients.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const toggleClientExpand = (clientId) => {
        setExpandedClients(prev => ({
            ...prev,
            [clientId]: !prev[clientId]
        }));
    };

    const hasPendingChanges = Object.keys(pendingChanges).length > 0;

    // Stats Calculation
    const stats = React.useMemo(() => {
        let totalCharge = 0;
        let totalPay = 0;
        let count = 0;
        let clientsWithMissingRatesCount = 0;

        clients.forEach(client => {
            let clientHasMissing = false;
            // Check all roles for missing rates
            STAFF_ROLES.forEach(role => {
                const pay = getRate(client, role.value, 'pay_rate');
                const charge = getRate(client, role.value, 'charge_rate');

                if (pay === 0 || charge === 0) {
                    clientHasMissing = true;
                }

                if (charge > 0) {
                    totalCharge += charge;
                    totalPay += pay;
                    count++;
                }
            });
            if (clientHasMissing) clientsWithMissingRatesCount++;
        });

        return {
            totalClients: clients.length,
            missingRatesClients: clientsWithMissingRatesCount,
            avgCharge: count ? totalCharge / count : 0,
            avgPay: count ? totalPay / count : 0,
            avgMargin: count ? ((totalCharge - totalPay) / totalCharge) * 100 : 0
        };
    }, [clients, pendingChanges]);

    // Helper to check if a specific client has missing rates for a specific role
    const isRateMissing = (client, roleValue) => {
        const pay = getRate(client, roleValue, 'pay_rate');
        const charge = getRate(client, roleValue, 'charge_rate');
        return pay === 0 || charge === 0;
    };

    // Helper to check if a client has ANY missing rates
    const hasAnyMissingRates = (client) => {
        return STAFF_ROLES.some(role => isRateMissing(client, role.value));
    };

    // Role Color Mapping
    const ROLE_COLORS = {
        nurse: {
            bg: 'bg-cyan-50',
            border: 'border-cyan-200',
            text: 'text-cyan-700',
            badge: 'bg-cyan-100 text-cyan-800',
            icon: 'text-cyan-600',
            accent: 'border-t-cyan-500'
        },
        healthcare_assistant: {
            bg: 'bg-emerald-50',
            border: 'border-emerald-200',
            text: 'text-emerald-700',
            badge: 'bg-emerald-100 text-emerald-800',
            icon: 'text-emerald-600',
            accent: 'border-t-emerald-500'
        },
        senior_care_worker: {
            bg: 'bg-purple-50',
            border: 'border-purple-200',
            text: 'text-purple-700',
            badge: 'bg-purple-100 text-purple-800',
            icon: 'text-purple-600',
            accent: 'border-t-purple-500'
        },
        support_worker: {
            bg: 'bg-amber-50',
            border: 'border-amber-200',
            text: 'text-amber-700',
            badge: 'bg-amber-100 text-amber-800',
            icon: 'text-amber-600',
            accent: 'border-t-amber-500'
        },
        specialist_nurse: {
            bg: 'bg-rose-50',
            border: 'border-rose-200',
            text: 'text-rose-700',
            badge: 'bg-rose-100 text-rose-800',
            icon: 'text-rose-600',
            accent: 'border-t-rose-500'
        }
    };

    const getRoleColor = (roleValue) => ROLE_COLORS[roleValue] || ROLE_COLORS.nurse;

    if (isLoading) return <div className="p-8 text-center">Loading rates...</div>;

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Coins className="w-8 h-8 text-cyan-600" />
                        Rate Management
                    </h1>
                    <p className="text-gray-600">
                        Manage charge rates and staff pay rates across all clients
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {/* Header Button Removed */}
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <Card>
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="p-3 bg-gray-100 rounded-full">
                            <Building2 className="w-6 h-6 text-gray-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Total Clients</p>
                            <h3 className="text-2xl font-bold text-gray-900">{stats.totalClients}</h3>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="p-3 bg-red-100 rounded-full">
                            <AlertTriangle className="w-6 h-6 text-red-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Missing Rates</p>
                            <h3 className="text-2xl font-bold text-red-600">{stats.missingRatesClients}</h3>
                            <p className="text-xs text-gray-400">Clients with incomplete data</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="p-3 bg-green-100 rounded-full">
                            <DollarSign className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Avg. Charge</p>
                            <h3 className="text-2xl font-bold text-gray-900">£{stats.avgCharge.toFixed(2)}</h3>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="p-3 bg-blue-100 rounded-full">
                            <Users className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Avg. Pay</p>
                            <h3 className="text-2xl font-bold text-gray-900">£{stats.avgPay.toFixed(2)}</h3>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="p-3 bg-purple-100 rounded-full">
                            <TrendingUp className="w-6 h-6 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Avg. Margin</p>
                            <h3 className="text-2xl font-bold text-gray-900">{stats.avgMargin.toFixed(1)}%</h3>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content */}
            <Card>
                <CardHeader className="pb-0">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
                        <Tabs value={viewMode} onValueChange={setViewMode} className="w-full md:w-auto">
                            <TabsList>
                                <TabsTrigger value="by_role">By Role</TabsTrigger>
                                <TabsTrigger value="by_client">By Client</TabsTrigger>
                            </TabsList>
                        </Tabs>
                        <div className="relative w-full md:w-64">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <Input
                                placeholder="Search clients..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {viewMode === 'by_role' ? (
                        <Tabs value={selectedRole} onValueChange={setSelectedRole} className="w-full">
                            <TabsList className="w-full justify-start overflow-x-auto mb-4 bg-transparent p-0 gap-2">
                                {STAFF_ROLES.map(role => {
                                    const colors = getRoleColor(role.value);
                                    const isActive = selectedRole === role.value;
                                    return (
                                        <TabsTrigger
                                            key={role.value}
                                            value={role.value}
                                            className={`gap-2 border transition-all ${isActive ? `${colors.bg} ${colors.border} ${colors.text} shadow-sm` : 'bg-white border-transparent hover:bg-gray-50'}`}
                                        >
                                            <span className={isActive ? '' : 'grayscale'}>{role.icon}</span>
                                            {role.label}
                                        </TabsTrigger>
                                    );
                                })}
                            </TabsList>

                            {STAFF_ROLES.map(role => {
                                const colors = getRoleColor(role.value);
                                return (
                                    <TabsContent key={role.value} value={role.value}>
                                        <div className={`rounded-md border border-t-4 ${colors.accent} overflow-hidden shadow-sm`}>
                                            {/* Sticky Header */}
                                            <div className={`sticky top-0 z-10 ${colors.bg} border-b ${colors.border} p-3 flex items-center gap-3`}>
                                                <div className={`p-2 bg-white rounded-full shadow-sm border ${colors.border}`}>
                                                    <span className="text-xl">{role.icon}</span>
                                                </div>
                                                <div>
                                                    <h3 className={`font-bold ${colors.text}`}>Editing Rates: {role.label}</h3>
                                                    <p className={`text-xs ${colors.text} opacity-80`}>{role.description}</p>
                                                </div>
                                            </div>

                                            <Table>
                                                <TableHeader className="bg-white">
                                                    <TableRow>
                                                        <TableHead>Client Name</TableHead>
                                                        <TableHead>Staff Pay Rate (£)</TableHead>
                                                        <TableHead>Client Charge Rate (£)</TableHead>
                                                        <TableHead>Margin</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody className="bg-white">
                                                    {filteredClients.map(client => {
                                                        const payRate = getRate(client, role.value, 'pay_rate');
                                                        const chargeRate = getRate(client, role.value, 'charge_rate');
                                                        const margin = calculateMargin(payRate, chargeRate);
                                                        const isModified = pendingChanges[client.id]?.[role.value];
                                                        const missing = isRateMissing(client, role.value);

                                                        return (
                                                            <TableRow key={client.id} className={isModified ? "bg-blue-50" : ""}>
                                                                <TableCell className="font-medium">
                                                                    <div className="flex items-center gap-2">
                                                                        <Building2 className="w-4 h-4 text-gray-400" />
                                                                        {client.name}
                                                                        {missing && (
                                                                            <TooltipProvider>
                                                                                <Tooltip>
                                                                                    <TooltipTrigger>
                                                                                        <AlertCircle className="w-4 h-4 text-red-500" />
                                                                                    </TooltipTrigger>
                                                                                    <TooltipContent>
                                                                                        <p>Missing rates for this role</p>
                                                                                    </TooltipContent>
                                                                                </Tooltip>
                                                                            </TooltipProvider>
                                                                        )}
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Input
                                                                        type="number"
                                                                        step="0.01"
                                                                        value={payRate}
                                                                        onChange={(e) => handleRateChange(client.id, role.value, 'pay_rate', e.target.value)}
                                                                        className={`w-32 ${payRate === 0 ? 'border-red-300 bg-red-50' : ''}`}
                                                                    />
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Input
                                                                        type="number"
                                                                        step="0.01"
                                                                        value={chargeRate}
                                                                        onChange={(e) => handleRateChange(client.id, role.value, 'charge_rate', e.target.value)}
                                                                        className={`w-32 ${chargeRate === 0 ? 'border-red-300 bg-red-50' : ''}`}
                                                                    />
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Badge variant={margin < 15 ? "destructive" : "secondary"}>
                                                                        {margin.toFixed(1)}%
                                                                    </Badge>
                                                                </TableCell>
                                                            </TableRow>
                                                        );
                                                    })}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </TabsContent>
                                );
                            })}
                        </Tabs>
                    ) : (
                        <div className="space-y-4">
                            {filteredClients.map(client => {
                                const clientHasMissing = hasAnyMissingRates(client);
                                return (
                                    <Card key={client.id} className={`border ${clientHasMissing ? 'border-red-200' : 'border-gray-200'}`}>
                                        <div
                                            className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                                            onClick={() => toggleClientExpand(client.id)}
                                        >
                                            <div className="flex items-center gap-3">
                                                {expandedClients[client.id] ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
                                                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                                    <Building2 className="w-5 h-5 text-blue-600" />
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                                        {client.name}
                                                        {clientHasMissing && (
                                                            <Badge variant="destructive" className="text-xs">
                                                                Missing Rates
                                                            </Badge>
                                                        )}
                                                    </h3>
                                                    <p className="text-sm text-gray-500">{client.type?.replace('_', ' ')}</p>
                                                </div>
                                            </div>
                                            {pendingChanges[client.id] && (
                                                <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                                                    Modified
                                                </Badge>
                                            )}
                                        </div>

                                        {expandedClients[client.id] && (
                                            <div className="p-4 border-t bg-gray-50 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                {STAFF_ROLES.map(role => {
                                                    const payRate = getRate(client, role.value, 'pay_rate');
                                                    const chargeRate = getRate(client, role.value, 'charge_rate');
                                                    const margin = calculateMargin(payRate, chargeRate);
                                                    const roleMissing = payRate === 0 || chargeRate === 0;
                                                    const colors = getRoleColor(role.value);

                                                    return (
                                                        <div key={role.value} className={`bg-white p-4 rounded-lg border shadow-sm ${roleMissing ? 'border-red-200 bg-red-50/10' : ''}`}>
                                                            <h4 className={`font-medium mb-3 flex items-center gap-2 ${colors.text}`}>
                                                                <span>{role.icon}</span> {role.label}
                                                                {roleMissing && <AlertCircle className="w-4 h-4 text-red-500" />}
                                                            </h4>
                                                            <div className="space-y-3">
                                                                <div>
                                                                    <label className="text-xs text-gray-500 block mb-1">Staff Pay (£/hr)</label>
                                                                    <Input
                                                                        type="number"
                                                                        step="0.01"
                                                                        value={payRate}
                                                                        onChange={(e) => handleRateChange(client.id, role.value, 'pay_rate', e.target.value)}
                                                                        className={payRate === 0 ? 'border-red-300 bg-red-50' : ''}
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="text-xs text-gray-500 block mb-1">Client Charge (£/hr)</label>
                                                                    <Input
                                                                        type="number"
                                                                        step="0.01"
                                                                        value={chargeRate}
                                                                        onChange={(e) => handleRateChange(client.id, role.value, 'charge_rate', e.target.value)}
                                                                        className={chargeRate === 0 ? 'border-red-300 bg-red-50' : ''}
                                                                    />
                                                                </div>
                                                                <div className="flex justify-between items-center pt-2 border-t">
                                                                    <span className="text-xs text-gray-500">Margin</span>
                                                                    <span className={`text-sm font-bold ${margin < 15 ? 'text-red-600' : 'text-green-600'}`}>
                                                                        {margin.toFixed(1)}%
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            <RateChangeConfirmationModal
                isOpen={isReviewModalOpen}
                onClose={() => setIsReviewModalOpen(false)}
                onConfirm={() => saveMutation.mutate(pendingChanges)}
                pendingChanges={pendingChanges}
                clients={clients}
            />

            {/* Sticky Footer Actions */}
            {hasPendingChanges && (
                <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-50 flex justify-end items-center gap-4 px-6 md:px-8 animate-in slide-in-from-bottom-2">
                    <div className="flex items-center gap-2 mr-auto">
                        <AlertCircle className="w-5 h-5 text-amber-500" />
                        <span className="font-medium text-gray-700">
                            You have unsaved changes
                        </span>
                    </div>
                    <Button
                        variant="ghost"
                        onClick={() => {
                            if (window.confirm('Are you sure you want to discard all pending changes?')) {
                                setPendingChanges({});
                            }
                        }}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                        Discard Changes
                    </Button>
                    <Button
                        onClick={() => setIsReviewModalOpen(true)}
                        disabled={saveMutation.isPending}
                        className="bg-gradient-to-r from-cyan-600 to-blue-600 shadow-md hover:shadow-lg transition-all"
                    >
                        <Save className="w-4 h-4 mr-2" />
                        Review & Save Changes
                    </Button>
                </div>
            )}
        </div>
    );
}
