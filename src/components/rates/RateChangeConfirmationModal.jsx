import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ArrowRight, AlertCircle } from "lucide-react";
import { STAFF_ROLES } from "@/constants/staffRoles";

export default function RateChangeConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    pendingChanges,
    clients
}) {
    // Helper to get role label
    const getRoleLabel = (roleValue) => {
        return STAFF_ROLES.find(r => r.value === roleValue)?.label || roleValue;
    };

    // Flatten changes for display
    const changesList = React.useMemo(() => {
        const list = [];
        Object.entries(pendingChanges).forEach(([clientId, roles]) => {
            const client = clients.find(c => c.id === clientId);
            if (!client) return;

            Object.entries(roles).forEach(([role, rates]) => {
                const currentRates = client.contract_terms?.rates_by_role?.[role] || {};

                if (rates.pay_rate !== undefined) {
                    const oldVal = currentRates.pay_rate || 0;
                    const newVal = rates.pay_rate;
                    const diff = newVal - oldVal;
                    const percentChange = oldVal ? (diff / oldVal) * 100 : 100;

                    list.push({
                        clientId,
                        clientName: client.name,
                        role,
                        roleLabel: getRoleLabel(role),
                        type: 'Pay Rate',
                        oldVal,
                        newVal,
                        diff,
                        percentChange,
                        isHighVariance: Math.abs(percentChange) > 20,
                        isNegative: newVal < 0
                    });
                }

                if (rates.charge_rate !== undefined) {
                    const oldVal = currentRates.charge_rate || 0;
                    const newVal = rates.charge_rate;
                    const diff = newVal - oldVal;
                    const percentChange = oldVal ? (diff / oldVal) * 100 : 100;

                    list.push({
                        clientId,
                        clientName: client.name,
                        role,
                        roleLabel: getRoleLabel(role),
                        type: 'Charge Rate',
                        oldVal,
                        newVal,
                        diff,
                        percentChange,
                        isHighVariance: Math.abs(percentChange) > 20,
                        isNegative: newVal < 0
                    });
                }
            });
        });
        return list;
    }, [pendingChanges, clients]);

    const hasNegativeRates = changesList.some(c => c.isNegative);
    const hasHighVariance = changesList.some(c => c.isHighVariance);
    const totalChanges = changesList.length;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        Review Rate Changes
                        <Badge variant="secondary">{totalChanges} updates</Badge>
                    </DialogTitle>
                    <DialogDescription>
                        Please review the following changes carefully before confirming.
                    </DialogDescription>
                </DialogHeader>

                {/* Warnings */}
                <div className="space-y-2 my-4">
                    {hasNegativeRates && (
                        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-md flex items-center gap-2">
                            <AlertCircle className="w-5 h-5" />
                            <span className="font-medium">Error: Negative rates detected. Cannot save.</span>
                        </div>
                    )}
                    {hasHighVariance && (
                        <div className="bg-amber-50 border border-amber-200 text-amber-700 p-3 rounded-md flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5" />
                            <span className="font-medium">Warning: Some rates have changed by more than 20%.</span>
                        </div>
                    )}
                </div>

                {/* Changes Table */}
                <div className="border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Client</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead className="text-right">Old Value</TableHead>
                                <TableHead></TableHead>
                                <TableHead className="text-right">New Value</TableHead>
                                <TableHead className="text-right">Change</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {changesList.map((change, idx) => (
                                <TableRow key={idx} className={change.isHighVariance ? "bg-amber-50/50" : ""}>
                                    <TableCell className="font-medium">{change.clientName}</TableCell>
                                    <TableCell>{change.roleLabel}</TableCell>
                                    <TableCell>{change.type}</TableCell>
                                    <TableCell className="text-right font-mono text-gray-500">
                                        £{change.oldVal.toFixed(2)}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <ArrowRight className="w-4 h-4 text-gray-400 mx-auto" />
                                    </TableCell>
                                    <TableCell className={`text-right font-mono font-bold ${change.isNegative ? 'text-red-600' : 'text-gray-900'}`}>
                                        £{change.newVal.toFixed(2)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Badge variant={change.isHighVariance ? "warning" : "secondary"} className={change.diff > 0 ? "text-green-700 bg-green-50" : "text-red-700 bg-red-50"}>
                                            {change.diff > 0 ? '+' : ''}{change.percentChange.toFixed(1)}%
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>

                <DialogFooter className="gap-2 mt-4">
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button
                        onClick={onConfirm}
                        disabled={hasNegativeRates}
                        className="bg-gradient-to-r from-cyan-600 to-blue-600"
                    >
                        Confirm & Update Rates
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
