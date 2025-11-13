import React from "react";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp } from "lucide-react";

/**
 * 💰 SIMPLIFIED SHIFT RATE DISPLAY (ROLLBACK VERSION)
 * Basic rate display without advanced calculations
 */

export default function ShiftRateDisplay({ shift, client, compact = false }) {
  if (!shift) return null;

  const payRate = shift.pay_rate || 0;
  const chargeRate = shift.charge_rate || 0;
  const hours = shift.duration_hours || 0;
  
  const staffCost = (payRate * hours).toFixed(2);
  const clientCharge = (chargeRate * hours).toFixed(2);
  const margin = (parseFloat(clientCharge) - parseFloat(staffCost)).toFixed(2);
  const marginPercent = parseFloat(clientCharge) > 0 
    ? ((parseFloat(margin) / parseFloat(clientCharge)) * 100).toFixed(1) 
    : '0';

  // Compact version (for tables/lists)
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-xs">
          Standard Rate
        </Badge>
        <span className="text-sm font-semibold text-green-600">
          £{chargeRate}/hr
        </span>
      </div>
    );
  }

  // Full version (for detail views)
  return (
    <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-green-600" />
          <h4 className="font-semibold text-green-900">Rate Breakdown</h4>
        </div>
        <Badge className="bg-green-600 text-white">
          Standard Rate
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-white rounded border border-green-200">
          <p className="text-xs text-gray-600 mb-1">Staff Pay Rate</p>
          <p className="text-xl font-bold text-gray-900">
            £{payRate.toFixed(2)}/hr
          </p>
        </div>
        <div className="p-3 bg-white rounded border border-green-200">
          <p className="text-xs text-gray-600 mb-1">Client Charge Rate</p>
          <p className="text-xl font-bold text-green-600">
            £{chargeRate.toFixed(2)}/hr
          </p>
        </div>
      </div>

      {hours > 0 && (
        <div className="mt-3 pt-3 border-t border-green-200">
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div>
              <p className="text-gray-600">Staff Cost</p>
              <p className="font-semibold text-gray-900">£{staffCost}</p>
            </div>
            <div>
              <p className="text-gray-600">Client Charge</p>
              <p className="font-semibold text-green-600">£{clientCharge}</p>
            </div>
            <div>
              <p className="text-gray-600 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                Margin ({marginPercent}%)
              </p>
              <p className="font-semibold text-blue-600">£{margin}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}