
import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Settings2, ArrowUpDown, UserPlus } from "lucide-react";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card"; // Added Card imports

export default function ShiftTable({ shifts, clients, staff, onAssignStaff, onEditShift, getStatusBadge }) {
  // Removed useState for sortField, sortDirection, and visibleColumns
  // Removed handleSort, sortedShifts, toggleColumn, and SortableHeader components.
  // Removed Column Customizer UI.

  const getClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client?.name || '⚠️ Unknown Client';
  };

  const getStaffName = (staffId) => {
    if (!staffId) return 'Unassigned';
    const staffMember = staff.find(s => s.id === staffId);
    return staffMember ? `${staffMember.first_name} ${staffMember.last_name}` : 'Unknown Staff';
  };

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-3 text-sm font-semibold">Date</th>
                <th className="text-left p-3 text-sm font-semibold">Client</th>
                <th className="text-left p-3 text-sm font-semibold">Location</th>
                <th className="text-left p-3 text-sm font-semibold">Role</th>
                <th className="text-left p-3 text-sm font-semibold">Time</th>
                <th className="text-left p-3 text-sm font-semibold">Duration</th>
                <th className="text-left p-3 text-sm font-semibold">Status</th>
                <th className="text-left p-3 text-sm font-semibold">Assigned Staff</th>
                <th className="text-left p-3 text-sm font-semibold">Urgency</th>
                <th className="text-left p-3 text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {shifts.map(shift => {
                const clientName = getClientName(shift.client_id);
                const isOrphaned = clientName.includes('Unknown'); // Check for the specific "Unknown Client" string
                
                return (
                  <tr key={shift.id} className={`hover:bg-gray-50 ${isOrphaned ? 'bg-red-50' : ''}`}>
                    <td className="p-3 text-sm">{format(new Date(shift.date), 'MMM dd, yyyy')}</td>
                    <td className="p-3 text-sm">
                      {isOrphaned ? (
                        <span className="text-red-600 font-semibold">{clientName}</span>
                      ) : (
                        clientName
                      )}
                    </td>
                    <td className="p-3">
                      {shift.work_location_within_site ? (
                        <Badge className="bg-cyan-100 text-cyan-800 hover:bg-cyan-100 text-xs">
                          📍 {shift.work_location_within_site}
                        </Badge>
                      ) : (
                        <span className="text-xs text-gray-400">Not specified</span>
                      )}
                    </td>
                    <td className="p-3 text-sm capitalize">{shift.role_required?.replace('_', ' ')}</td>
                    <td className="p-3 text-sm">{shift.start_time} - {shift.end_time}</td>
                    <td className="p-3 text-sm">{shift.duration_hours}h</td>
                    <td className="p-3">
                      <Badge {...getStatusBadge(shift.status)}>
                        {shift.status}
                      </Badge>
                    </td>
                    <td className="p-3 text-sm">{getStaffName(shift.assigned_staff_id)}</td>
                    <td className="p-3">
                      {shift.urgency === 'urgent' && (
                        <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">URGENT</Badge>
                      )}
                      {shift.urgency === 'critical' && (
                        <Badge className="bg-red-100 text-red-800 hover:bg-red-100">CRITICAL</Badge>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => onEditShift(shift)}
                        >
                          Edit
                        </Button>
                        {shift.status === 'open' && (
                          <Button 
                            size="sm" 
                            onClick={() => onAssignStaff(shift)}
                          >
                            Assign
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>

      {shifts.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg border">
          <p className="text-gray-600">No shifts found</p>
        </div>
      )}
    </Card>
  );
}
