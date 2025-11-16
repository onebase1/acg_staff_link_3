import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const TRAINING_FIELDS = [
  { key: "manual_handling", label: "Manual Handling & Moving People" },
  { key: "safeguarding_children", label: "Safeguarding Children" },
  { key: "safeguarding_adults", label: "Safeguarding of Vulnerable Adults" },
  { key: "prevent", label: "Preventing Radicalisation (PREVENT)" },
  { key: "fire_safety", label: "Fire Safety" },
  { key: "food_hygiene", label: "Food Hygiene" },
  { key: "health_safety", label: "Health Safety & Welfare" },
  { key: "infection_control", label: "Infection Control" },
  { key: "person_centred_care", label: "Person Centred Care & Consent" },
  { key: "dementia_awareness", label: "Dementia Awareness" },
];

function MandatoryTrainingSection({
  training = {},
  onChange,
  onOpenTrainingModal,
  additionalTraining = [],
}) {
  const handleFieldChange = (key, field, value) => {
    const existing = training?.[key] || {};
    const updated = {
      ...training,
      [key]: {
        completed_date: existing.completed_date || "",
        expiry_date: existing.expiry_date || "",
        certificate_ref: existing.certificate_ref || "",
        [field]: value,
      },
    };
    onChange(updated);
  };

  const validCount = TRAINING_FIELDS.filter(({ key }) => {
    const t = training?.[key];
    if (!t?.completed_date) return false;
    if (!t.expiry_date) return true;
    return new Date(t.expiry_date) > new Date();
  }).length;

  return (
    <Card>
      <CardHeader className="bg-gray-50 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-lg">Mandatory Training (CQC Core)</CardTitle>
        <Badge className={validCount >= 8 ? "bg-green-600" : "bg-yellow-600"}>
          {validCount}/10 valid
        </Badge>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        <p className="text-xs text-gray-700">
          These entries feed directly into the Staff Profile Simulation PDF that care homes see.
          Keep them in sync with your uploaded certificates.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2 text-left">Training</th>
                <th className="border p-2 text-center">Completed</th>
                <th className="border p-2 text-center">Expiry</th>
                <th className="border p-2 text-center">Certificate Ref</th>
                {onOpenTrainingModal && (
                  <th className="border p-2 text-center">Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {TRAINING_FIELDS.map(({ key, label }) => {
                const value = training?.[key] || {};
                const hasDetails = !!(
                  value.completed_date ||
                  value.expiry_date ||
                  value.certificate_ref
                );
                const hasCertificate =
                  Array.isArray(value.certificate_ids) &&
                  value.certificate_ids.length > 0;
                return (
                  <tr key={key} className="hover:bg-gray-50">
                    <td className="border p-2 align-top w-1/3">
                      <span className="font-medium text-[11px] leading-snug">{label}</span>
                    </td>
                    <td className="border p-1 text-center">
                      <Input
                        type="date"
                        value={value.completed_date || ""}
                        onChange={(e) => handleFieldChange(key, "completed_date", e.target.value)}
                        className="h-8 text-xs"
                      />
                    </td>
                    <td className="border p-1 text-center">
                      <Input
                        type="date"
                        value={value.expiry_date || ""}
                        onChange={(e) => handleFieldChange(key, "expiry_date", e.target.value)}
                        className="h-8 text-xs"
                      />
                    </td>
                    <td className="border p-1 text-center">
                      <Input
                        type="text"
                        placeholder="e.g. REF-123456"
                        value={value.certificate_ref || ""}
                        onChange={(e) => handleFieldChange(key, "certificate_ref", e.target.value)}
                        className="h-8 text-xs"
                      />
                    </td>
                    {onOpenTrainingModal && (
                      <td className="border p-1 text-center">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-8 px-2 text-[11px]"
                          onClick={() =>
                            onOpenTrainingModal({ mode: "core", key, label })
                          }
                        >
                          {hasCertificate
                            ? "View / Edit"
                            : hasDetails
                            ? "Edit / Attach"
                            : "Add / Attach"}
                        </Button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {onOpenTrainingModal && (
          <div className="mt-4 space-y-2">
            {Array.isArray(additionalTraining) && additionalTraining.length > 0 && (
              <div className="border rounded-md p-3 bg-gray-50">
                <Label className="text-xs font-semibold">
                  Other training &amp; qualifications
                </Label>
                <ul className="mt-2 space-y-1 text-xs text-gray-700">
                  {additionalTraining.slice(0, 3).map((item, index) => (
                    <li key={item.id || `${item.name}-${index}`}>
                      <span className="font-medium">{item.name}</span>
                      {item.completed_date && (
                        <span className="ml-1">
                          ({item.completed_date}
                          {item.expiry_date ? ` exp: ${item.expiry_date}` : ""})
                        </span>
                      )}
                    </li>
                  ))}
                  {additionalTraining.length > 3 && (
                    <li className="text-[11px] text-gray-500">
                      + {additionalTraining.length - 3} more recorded
                    </li>
                  )}
                </ul>
              </div>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => onOpenTrainingModal({ mode: "additional" })}
            >
              <Plus className="w-3 h-3 mr-1" />
              Add other training / qualification
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default MandatoryTrainingSection;

