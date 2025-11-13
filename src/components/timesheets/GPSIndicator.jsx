import React from "react";
import { Badge } from "@/components/ui/badge";
import { MapPin, CheckCircle, XCircle, AlertTriangle } from "lucide-react";

export default function GPSIndicator({ timesheet, staff }) {
  // FIXED: Proper GPS consent checking
  const hasGPSConsent = staff?.gps_consent === true;
  const hasClockInLocation = !!timesheet.clock_in_location;
  const isGeofenceValidated = timesheet.geofence_validated === true;
  const isGeofenceViolation = timesheet.geofence_validated === false;

  // If no GPS consent, show that
  if (!hasGPSConsent) {
    return (
      <Badge className="bg-gray-100 text-gray-700 border-gray-300 text-xs">
        <XCircle className="w-3 h-3 mr-1" />
        No GPS Consent
      </Badge>
    );
  }

  // If has consent but no location data
  if (!hasClockInLocation) {
    return (
      <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300 text-xs">
        <AlertTriangle className="w-3 h-3 mr-1" />
        No GPS Data
      </Badge>
    );
  }

  // If has location and validated
  if (isGeofenceValidated) {
    return (
      <Badge className="bg-green-100 text-green-700 border-green-300 text-xs">
        <CheckCircle className="w-3 h-3 mr-1" />
        GPS Verified ({Math.round(timesheet.geofence_distance_meters)}m)
      </Badge>
    );
  }

  // If has location but failed geofence
  if (isGeofenceViolation) {
    return (
      <Badge className="bg-red-100 text-red-700 border-red-300 text-xs">
        <XCircle className="w-3 h-3 mr-1" />
        Out of Geofence ({Math.round(timesheet.geofence_distance_meters)}m)
      </Badge>
    );
  }

  // Default fallback
  return (
    <Badge className="bg-gray-100 text-gray-600 border-gray-300 text-xs">
      <MapPin className="w-3 h-3 mr-1" />
      GPS Not Verified
    </Badge>
  );
}

export function GPSDetails({ timesheet }) {
  if (!timesheet.clock_in_location) {
    return (
      <div className="text-sm text-gray-600 p-3 bg-gray-50 rounded">
        <p>No GPS location data available for this timesheet.</p>
      </div>
    );
  }

  // FIXED: Safe date formatting
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return 'Invalid Date';
      return date.toLocaleString();
    } catch (error) {
      console.error('Timestamp formatting error:', timestamp, error);
      return 'Invalid Date';
    }
  };

  return (
    <div className="space-y-3 text-sm">
      {/* Clock-in Location */}
      <div className="p-3 bg-green-50 rounded border border-green-200">
        <h4 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
          <MapPin className="w-4 h-4" />
          Clock-In Location
        </h4>
        <div className="space-y-1 text-green-800">
          <p>
            <strong>Coordinates:</strong>{' '}
            {timesheet.clock_in_location.latitude?.toFixed(6) || 'N/A'},{' '}
            {timesheet.clock_in_location.longitude?.toFixed(6) || 'N/A'}
          </p>
          <p>
            <strong>Accuracy:</strong> ±{Math.round(timesheet.clock_in_location.accuracy || 0)}m
          </p>
          {timesheet.geofence_distance_meters !== undefined && (
            <p>
              <strong>Distance from site:</strong> {Math.round(timesheet.geofence_distance_meters)}m
            </p>
          )}
          <p>
            <strong>Time:</strong> {formatTimestamp(timesheet.clock_in_location.timestamp)}
          </p>
        </div>
      </div>

      {/* Clock-out Location */}
      {timesheet.clock_out_location && (
        <div className="p-3 bg-blue-50 rounded border border-blue-200">
          <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Clock-Out Location
          </h4>
          <div className="space-y-1 text-blue-800">
            <p>
              <strong>Coordinates:</strong>{' '}
              {timesheet.clock_out_location.latitude?.toFixed(6) || 'N/A'},{' '}
              {timesheet.clock_out_location.longitude?.toFixed(6) || 'N/A'}
            </p>
            <p>
              <strong>Accuracy:</strong> ±{Math.round(timesheet.clock_out_location.accuracy || 0)}m
            </p>
            <p>
              <strong>Time:</strong> {formatTimestamp(timesheet.clock_out_location.timestamp)}
            </p>
          </div>
        </div>
      )}

      {/* Geofence Validation */}
      {timesheet.geofence_validated === true && (
        <div className="p-3 bg-green-50 border border-green-200 rounded">
          <CheckCircle className="w-4 h-4 text-green-600 inline mr-2" />
          <span className="text-sm text-green-800 font-medium">
            Staff was within geofence radius at clock-in
          </span>
        </div>
      )}

      {timesheet.geofence_validated === false && (
        <div className="p-3 bg-red-50 border border-red-200 rounded">
          <XCircle className="w-4 h-4 text-red-600 inline mr-2" />
          <div className="inline-block">
            <span className="text-sm text-red-800 font-medium block">
              Outside geofence radius
            </span>
            {timesheet.geofence_violation_reason && (
              <p className="text-xs text-red-700 mt-1">
                {timesheet.geofence_violation_reason}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}