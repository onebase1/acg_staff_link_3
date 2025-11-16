/**
 * ✅ ROLE SELECTOR COMPONENT
 * 
 * Clean checkbox-based role selection for bulk shift creation
 * Only shows roles enabled for the selected client
 * Replaces cluttered grid with simple, clear UI
 */

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { STAFF_ROLES, getRoleLabel, getRoleIcon } from '@/constants/staffRoles';
import { getEnabledRoles } from '@/utils/clientHelpers';
import { CheckCircle2, Circle, ArrowRight } from 'lucide-react';

export default function RoleSelector({ client, onContinue }) {
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [selectedShiftTypes, setSelectedShiftTypes] = useState({});

  // Get only enabled roles for this client
  const enabledRoles = useMemo(() => {
    if (!client) return [];
    const enabled = getEnabledRoles(client);
    return STAFF_ROLES.filter(role => enabled.includes(role.value));
  }, [client]);

  // Toggle role selection
  const toggleRole = (roleValue) => {
    setSelectedRoles(prev => {
      if (prev.includes(roleValue)) {
        // Remove role
        const newSelected = prev.filter(r => r !== roleValue);
        // Remove shift type selections for this role
        const newShiftTypes = { ...selectedShiftTypes };
        delete newShiftTypes[roleValue];
        setSelectedShiftTypes(newShiftTypes);
        return newSelected;
      } else {
        // Add role with default shift types (both day and night)
        setSelectedShiftTypes(prev => ({
          ...prev,
          [roleValue]: { day: true, night: true }
        }));
        return [...prev, roleValue];
      }
    });
  };

  // Toggle shift type for a role
  const toggleShiftType = (roleValue, shiftType) => {
    setSelectedShiftTypes(prev => ({
      ...prev,
      [roleValue]: {
        ...prev[roleValue],
        [shiftType]: !prev[roleValue]?.[shiftType]
      }
    }));
  };

  // Select all roles
  const selectAll = () => {
    const allRoles = enabledRoles.map(r => r.value);
    setSelectedRoles(allRoles);
    const allShiftTypes = {};
    allRoles.forEach(role => {
      allShiftTypes[role] = { day: true, night: true };
    });
    setSelectedShiftTypes(allShiftTypes);
  };

  // Clear all selections
  const clearAll = () => {
    setSelectedRoles([]);
    setSelectedShiftTypes({});
  };

  // Handle continue
  const handleContinue = () => {
    // Build role configurations
    const roleConfigs = selectedRoles.map(roleValue => {
      const shiftTypes = selectedShiftTypes[roleValue] || { day: true, night: true };
      return {
        role: roleValue,
        includeDay: shiftTypes.day,
        includeNight: shiftTypes.night
      };
    }).filter(config => config.includeDay || config.includeNight);

    onContinue(roleConfigs);
  };

  const canContinue = selectedRoles.length > 0 && 
    selectedRoles.some(role => selectedShiftTypes[role]?.day || selectedShiftTypes[role]?.night);

  if (!client) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-gray-500">
          Please select a client first
        </CardContent>
      </Card>
    );
  }

  if (enabledRoles.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-amber-600 font-semibold mb-2">⚠️ No Roles Configured</p>
          <p className="text-sm text-gray-600">
            This client has no roles with configured rates. Please edit the client to add rates first.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">Select Roles & Shift Types</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={selectAll}>
              Select All
            </Button>
            <Button variant="outline" size="sm" onClick={clearAll}>
              Clear All
            </Button>
          </div>
        </div>
        <p className="text-sm text-gray-600 mt-2">
          Choose which roles and shift types to include in your bulk shift creation
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Role Selection List */}
        <div className="space-y-3">
          {enabledRoles.map(role => {
            const isSelected = selectedRoles.includes(role.value);
            const shiftTypes = selectedShiftTypes[role.value] || {};

            return (
              <div
                key={role.value}
                className={`p-4 border-2 rounded-lg transition-all ${
                  isSelected ? 'border-cyan-500 bg-cyan-50' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {/* Role Checkbox */}
                <div className="flex items-center gap-3 mb-3">
                  <Checkbox
                    id={`role-${role.value}`}
                    checked={isSelected}
                    onCheckedChange={() => toggleRole(role.value)}
                  />
                  <Label
                    htmlFor={`role-${role.value}`}
                    className="flex items-center gap-2 cursor-pointer flex-1"
                  >
                    <span className="text-2xl">{role.icon}</span>
                    <span className="font-semibold">{role.label}</span>
                  </Label>
                  {isSelected && <CheckCircle2 className="w-5 h-5 text-cyan-600" />}
                </div>

                {/* Shift Type Selection (only if role is selected) */}
                {isSelected && (
                  <div className="ml-8 flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={shiftTypes.day}
                        onCheckedChange={() => toggleShiftType(role.value, 'day')}
                      />
                      <span className="text-sm">☀️ Day Shifts</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={shiftTypes.night}
                        onCheckedChange={() => toggleShiftType(role.value, 'night')}
                      />
                      <span className="text-sm">🌙 Night Shifts</span>
                    </label>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Summary */}
        {selectedRoles.length > 0 && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="font-semibold text-blue-900 mb-2">Selected:</p>
            <div className="flex flex-wrap gap-2">
              {selectedRoles.map(roleValue => {
                const role = STAFF_ROLES.find(r => r.value === roleValue);
                const shiftTypes = selectedShiftTypes[roleValue] || {};
                const types = [];
                if (shiftTypes.day) types.push('Day');
                if (shiftTypes.night) types.push('Night');
                
                return (
                  <Badge key={roleValue} className="bg-cyan-600 text-white">
                    {role?.icon} {role?.label} ({types.join(' + ')})
                  </Badge>
                );
              })}
            </div>
          </div>
        )}

        {/* Continue Button */}
        <Button
          onClick={handleContinue}
          disabled={!canContinue}
          className="w-full bg-gradient-to-r from-cyan-500 to-blue-600"
          size="lg"
        >
          Continue to Grid
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </CardContent>
    </Card>
  );
}

