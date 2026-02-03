import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Phone, RefreshCw } from "lucide-react";
import { toast } from "sonner";

// ✅ Phone normalization (same as StaffForm)
function normalizePhoneNumber(phone) {
  if (!phone) return '';
  let cleaned = phone.replace(/[\s\-()]/g, '');
  if (cleaned.startsWith('07')) return '+44' + cleaned.substring(1);
  if (cleaned.startsWith('447')) return '+' + cleaned;
  if (cleaned.startsWith('+44')) return cleaned;
  if (cleaned.startsWith('44') && cleaned.length >= 12) return '+' + cleaned;
  return cleaned.startsWith('+') ? cleaned : '+' + cleaned;
}

export default function PhoneDiagnostic() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fixing, setFixing] = useState(false);

  useEffect(() => {
    loadStaff();
  }, []);

  const loadStaff = async () => {
    setLoading(true);
    try {
      const { data: allStaff, error } = await supabase
        .from('staff')
        .select('*');
      
      if (error) throw error;
      setStaff(allStaff || []);
    } catch (error) {
      toast.error('Failed to load staff: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fixAllPhones = async () => {
    if (!confirm('This will normalize ALL staff phone numbers to +44 format. Continue?')) {
      return;
    }

    setFixing(true);
    let fixed = 0;
    let errors = 0;

    for (const s of staff) {
      if (!s.phone) continue;

      const normalized = normalizePhoneNumber(s.phone);
      
      if (normalized !== s.phone) {
        try {
          const { error } = await supabase
            .from('staff')
            .update({ phone: normalized })
            .eq('id', s.id);
          
          if (error) throw error;
          fixed++;
        } catch (error) {
          console.error(`Failed to update ${s.first_name} ${s.last_name}:`, error);
          errors++;
        }
      }
    }

    setFixing(false);
    
    if (fixed > 0) {
      toast.success(`✅ Fixed ${fixed} phone numbers!`);
      await loadStaff();
    } else {
      toast.info('No phone numbers needed fixing.');
    }

    if (errors > 0) {
      toast.error(`⚠️ ${errors} updates failed. Check console.`);
    }
  };

  const getPhoneStatus = (phone) => {
    if (!phone) return { valid: false, normalized: 'N/A' };
    
    const normalized = normalizePhoneNumber(phone);
    const valid = /^\+44[127]\d{9}$/.test(normalized);
    
    return { valid, normalized, needsFix: phone !== normalized };
  };

  const needsFixCount = staff.filter(s => {
    if (!s.phone) return false;
    const { needsFix } = getPhoneStatus(s.phone);
    return needsFix;
  }).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="w-8 h-8 animate-spin text-cyan-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-cyan-300 bg-cyan-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="w-6 h-6" />
            Phone Number Diagnostic Tool
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-gray-600">Total Staff</p>
                  <p className="text-3xl font-bold">{staff.length}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-gray-600">Need Fixing</p>
                  <p className="text-3xl font-bold text-orange-600">{needsFixCount}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-gray-600">Valid Format</p>
                  <p className="text-3xl font-bold text-green-600">
                    {staff.filter(s => s.phone && getPhoneStatus(s.phone).valid).length}
                  </p>
                </CardContent>
              </Card>
            </div>

            {needsFixCount > 0 && (
              <Button
                onClick={fixAllPhones}
                disabled={fixing}
                className="w-full bg-orange-600 hover:bg-orange-700"
              >
                {fixing ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Fixing {needsFixCount} phone numbers...
                  </>
                ) : (
                  <>
                    Fix All {needsFixCount} Phone Numbers
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Staff Phone Numbers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {staff.map(s => {
              const { valid, normalized, needsFix } = getPhoneStatus(s.phone);
              
              return (
                <div
                  key={s.id}
                  className={`p-4 rounded-lg border-2 ${
                    !s.phone ? 'border-red-300 bg-red-50' :
                    needsFix ? 'border-orange-300 bg-orange-50' :
                    'border-green-300 bg-green-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold">
                          {s.first_name} {s.last_name}
                        </h4>
                        {!s.phone ? (
                          <Badge className="bg-red-600 text-white">No Phone</Badge>
                        ) : valid && !needsFix ? (
                          <Badge className="bg-green-600 text-white">Valid</Badge>
                        ) : (
                          <Badge className="bg-orange-600 text-white">Needs Fix</Badge>
                        )}
                      </div>
                      
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600">Current:</span>
                          <code className="bg-gray-100 px-2 py-1 rounded font-mono">
                            {s.phone || 'N/A'}
                          </code>
                        </div>
                        
                        {needsFix && (
                          <div className="flex items-center gap-2">
                            <span className="text-gray-600">Will become:</span>
                            <code className="bg-green-100 px-2 py-1 rounded font-mono text-green-800">
                              {normalized}
                            </code>
                          </div>
                        )}

                        <div className="flex items-center gap-2 mt-2">
                          {valid ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-600" />
                          )}
                          <span className="text-xs text-gray-600">
                            {valid ? 'Valid UK phone format' : 'Invalid format'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}