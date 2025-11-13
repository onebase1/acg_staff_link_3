import React from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, ArrowLeft } from "lucide-react";

export default function BulkShiftCreation() {
  const navigate = useNavigate();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Bulk Shift Creation</h1>
          <p className="text-gray-600">Currently under maintenance</p>
        </div>
      </div>

      <Alert className="border-orange-300 bg-orange-50">
        <AlertTriangle className="h-5 w-5 text-orange-600" />
        <AlertDescription className="text-orange-900">
          <strong>Temporarily Unavailable</strong>
          <p className="mt-2">
            This feature is being updated. Please use the standard "Create Shift" page for now.
          </p>
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Alternative Options</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Create Individual Shifts</h3>
            <p className="text-sm text-gray-600 mb-3">
              Use the standard shift creation form to create shifts one at a time.
            </p>
            <Button onClick={() => navigate('/PostShiftV2')}>
              Go to Create Shift
            </Button>
          </div>

          <div className="pt-4 border-t">
            <h3 className="font-semibold mb-2">Coming Soon</h3>
            <p className="text-sm text-gray-600">
              Bulk shift creation with recurring patterns, CSV import, and advanced scheduling options.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}