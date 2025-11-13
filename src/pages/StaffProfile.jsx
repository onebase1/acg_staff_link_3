import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Download, Printer, CheckCircle, XCircle, AlertTriangle, User
} from "lucide-react";
import { format } from "date-fns";

export default function StaffProfile() {
  const [staffId, setStaffId] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setStaffId(params.get('id'));
  }, []);

  const { data: staff } = useQuery({
    queryKey: ['staff-profile', staffId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .eq('id', staffId)
        .single();
      
      if (error) {
        console.error('❌ Error fetching staff:', error);
        return null;
      }
      return data;
    },
    enabled: !!staffId,
    refetchOnMount: 'always'
  });

  const { data: agency } = useQuery({
    queryKey: ['agency', staff?.agency_id],
    queryFn: async () => {
      if (!staff?.agency_id) return null;
      
      const { data, error } = await supabase
        .from('agencies')
        .select('*')
        .eq('id', staff.agency_id)
        .single();
      
      if (error) {
        console.error('❌ Error fetching agency:', error);
        return null;
      }
      return data;
    },
    enabled: !!staff?.agency_id,
    refetchOnMount: 'always'
  });

  const { data: complianceDocs = [] } = useQuery({
    queryKey: ['compliance-docs', staffId],
    queryFn: async () => {
      if (!staffId) return [];
      
      const { data, error } = await supabase
        .from('compliance')
        .select('*')
        .eq('staff_id', staffId);
      
      if (error) {
        console.error('❌ Error fetching compliance docs:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!staffId,
    refetchOnMount: 'always'
  });

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    window.print(); // In production, this would generate a proper PDF
  };

  if (!staff) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-600">Loading staff profile...</p>
      </div>
    );
  }

  // Check photo age
  const photoAge = staff.profile_photo_uploaded_date 
    ? Math.floor((new Date() - new Date(staff.profile_photo_uploaded_date)) / (1000 * 60 * 60 * 24 * 365))
    : null;

  const photoNeedsUpdate = photoAge && photoAge >= 3;

  // Get specific compliance documents
  const dbsDoc = complianceDocs.find(d => d.document_type === 'dbs_check');
  const passportDoc = complianceDocs.find(d => d.document_type === 'id_verification');
  const rightToWorkDoc = complianceDocs.find(d => d.document_type === 'right_to_work');
  const nmcDoc = complianceDocs.find(d => d.document_type === 'professional_registration');
  
  // Training certificates
  const trainingDocs = complianceDocs.filter(d => d.document_type === 'training_certificate');

  // Compliance checklist
  const complianceChecks = [
    {
      item: "Proof of identity – Passport",
      status: !!passportDoc && passportDoc.status === 'verified'
    },
    {
      item: "Enhanced DBS disclosure obtained and verified",
      status: !!dbsDoc && dbsDoc.status === 'verified'
    },
    {
      item: "Two written references detailing recent work experience",
      status: staff.references && staff.references.length >= 2
    },
    {
      item: "Documentary evidence of qualifications and training",
      status: trainingDocs.length >= 5
    },
    {
      item: "Full employment history with explanations for gaps",
      status: staff.employment_history && staff.employment_history.length > 0
    },
    {
      item: "Occupational health undertaking completed",
      status: staff.occupational_health && staff.occupational_health.cleared_to_work
    },
    {
      item: "Evidence of NMC registration (where applicable)",
      status: staff.role === 'nurse' ? !!nmcDoc && nmcDoc.status === 'verified' : true
    },
    {
      item: "Evidence of right to work in the UK",
      status: !!rightToWorkDoc && rightToWorkDoc.status === 'verified'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Action Bar - Hide on print */}
      <div className="flex justify-between items-center print:hidden">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Staff Profile</h2>
          <p className="text-gray-600 mt-1">{staff.first_name} {staff.last_name}</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => window.history.back()}>
            Back
          </Button>
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
          <Button onClick={handleDownload} className="bg-gradient-to-r from-cyan-500 to-blue-600">
            <Download className="w-4 h-4 mr-2" />
            Download PDF
          </Button>
        </div>
      </div>

      {/* Photo Update Warning */}
      {photoNeedsUpdate && (
        <Alert variant="destructive" className="print:hidden">
          <AlertTriangle className="h-5 w-5" />
          <AlertDescription>
            <strong>Action Required:</strong> Staff photo is {photoAge} years old and needs updating. 
            Photos must be updated every 3 years for compliance.
          </AlertDescription>
        </Alert>
      )}

      {/* Profile Document */}
      <Card className="shadow-lg print:shadow-none">
        <CardContent className="p-12">
          {/* Header */}
          <div className="text-center mb-8 pb-6 border-b-2">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-20 h-20 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-3xl">ACG</span>
              </div>
              <div className="text-left">
                <h1 className="text-3xl font-bold text-gray-900">{agency?.name || 'Agile Care Group'}</h1>
                <p className="text-sm text-gray-600 italic">Changing lives and Providing Solutions</p>
                {agency?.registration_number && (
                  <p className="text-xs text-gray-500">Company No.: {agency.registration_number}</p>
                )}
              </div>
            </div>
          </div>

          {/* Main Profile Section */}
          <div className="mb-8">
            <div className="bg-gray-900 text-white p-4 text-center text-xl font-bold mb-0">
              Details of Staff for Proposed Supply
            </div>
            <div className="bg-black text-white p-3 text-lg font-semibold">
              {staff.role.toUpperCase().replace('_', ' ')}
            </div>

            <div className="grid grid-cols-3 border">
              {/* Left Column - Details */}
              <div className="col-span-2 border-r">
                <div className="p-3 border-b">
                  <p className="text-sm font-semibold text-gray-700">Name of Client:</p>
                  <p className="text-gray-900">[To be completed by agency]</p>
                </div>
                <div className="p-3 border-b">
                  <p className="text-sm font-semibold text-gray-700">Name of Candidate:</p>
                  <p className="text-gray-900 font-bold text-lg">
                    {staff.first_name} {staff.last_name}
                  </p>
                </div>
                <div className="p-3 border-b">
                  <p className="text-sm font-semibold text-gray-700">Position:</p>
                  <p className="text-gray-900">{staff.role.toUpperCase().replace('_', ' ')}</p>
                </div>
                <div className="p-3 border-b">
                  <p className="text-sm font-semibold text-gray-700">NMC Pin Number:</p>
                  <p className="text-gray-900">{staff.nmc_pin || 'N/A'}</p>
                </div>
                <div className="p-3 border-b">
                  <p className="text-sm font-semibold text-gray-700">D.O.B:</p>
                  <p className="text-gray-900">{format(new Date(staff.date_of_birth), 'dd/MM/yyyy')}</p>
                </div>
                <div className="p-3 border-b">
                  <p className="text-sm font-semibold text-gray-700">Parts of the NMC Register:</p>
                  <p className="text-gray-900">{staff.nmc_register_part || 'N/A'}</p>
                </div>
                <div className="p-3 border-b">
                  <p className="text-sm font-semibold text-gray-700">Date of Enhanced Disclosure:</p>
                  <p className="text-gray-900">
                    {dbsDoc?.issue_date ? format(new Date(dbsDoc.issue_date), 'dd/MM/yyyy') : 'Pending'}
                  </p>
                </div>
                <div className="p-3 border-b">
                  <p className="text-sm font-semibold text-gray-700">DBS Disclosure Number:</p>
                  <p className="text-gray-900 font-mono">{dbsDoc?.reference_number || 'Pending'}</p>
                </div>
                <div className="p-3 border-b">
                  <p className="text-sm font-semibold text-gray-700">POCA and POVA checked:</p>
                  <div className="flex gap-4">
                    <span className="font-medium">Yes, <CheckCircle className="inline w-4 h-4 text-green-600" /></span>
                    <span>No</span>
                  </div>
                </div>
                <div className="p-3">
                  <p className="text-sm font-semibold text-gray-700">Proposed First Shift Date:</p>
                  <p className="text-gray-900">
                    {staff.proposed_first_shift_date 
                      ? format(new Date(staff.proposed_first_shift_date), 'dd/MM/yyyy')
                      : '[To be confirmed]'}
                  </p>
                </div>
              </div>

              {/* Right Column - Photo */}
              <div className="flex items-center justify-center p-4 bg-gray-50">
                {staff.profile_photo_url ? (
                  <img 
                    src={staff.profile_photo_url} 
                    alt={`${staff.first_name} ${staff.last_name}`}
                    className="w-full h-auto max-w-[200px] border-4 border-white shadow-lg"
                  />
                ) : (
                  <div className="w-40 h-48 bg-gray-200 flex items-center justify-center border-4 border-white">
                    <User className="w-16 h-16 text-gray-400" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Compliance Checklist */}
          <div className="mb-8">
            <div className="bg-black text-white p-3 mb-0">
              <p className="text-sm">
                I confirm that in accordance with current regulations, the following information 
                and documents have been obtained in respect of the above-named candidate and has 
                undergone compliance check
              </p>
            </div>
            <table className="w-full border">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-2 text-left w-12"></th>
                  <th className="border p-2 text-left">Compliance Item</th>
                  <th className="border p-2 text-center w-20">YES</th>
                  <th className="border p-2 text-center w-20">NO</th>
                </tr>
              </thead>
              <tbody>
                {complianceChecks.map((check, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="border p-2 text-center font-bold">{index + 1}</td>
                    <td className="border p-2 text-sm">{check.item}</td>
                    <td className="border p-2 text-center">
                      {check.status && <CheckCircle className="w-5 h-5 text-green-600 mx-auto" />}
                    </td>
                    <td className="border p-2 text-center">
                      {!check.status && <XCircle className="w-5 h-5 text-red-600 mx-auto" />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Training & Qualifications */}
          <div className="mb-8">
            <table className="w-full border">
              <thead>
                <tr className="bg-black text-white">
                  <th className="border border-white p-3 text-left">Qualification</th>
                  <th className="border border-white p-3 text-center">Date Completed</th>
                  <th className="border border-white p-3 text-center">Expiry Date</th>
                </tr>
              </thead>
              <tbody>
                {trainingDocs.length > 0 ? (
                  trainingDocs.map((doc, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="border p-3">{doc.document_name}</td>
                      <td className="border p-3 text-center">
                        {doc.issue_date ? format(new Date(doc.issue_date), 'dd/MM/yyyy') : '-'}
                      </td>
                      <td className="border p-3 text-center">
                        {doc.expiry_date ? format(new Date(doc.expiry_date), 'dd/MM/yyyy') : '-'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" className="border p-4 text-center text-gray-500">
                      No training certificates on record
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Experience */}
          <div className="mb-8">
            <div className="border p-4">
              <div className="grid grid-cols-2">
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">Relevant Experience</p>
                  <p className="text-gray-900">Healthcare - {staff.months_of_experience || 0} months</p>
                </div>
                <div className="border-l pl-4">
                  <p className="text-sm font-semibold text-gray-700 mb-2">Number of months</p>
                  <p className="text-gray-900 text-lg font-bold">{staff.months_of_experience || 0}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Statement of Acceptance */}
          <div className="mb-8">
            <div className="bg-gray-100 p-6 border">
              <h3 className="font-bold text-lg mb-4">Statement of Acceptance</h3>
              <p className="text-sm mb-4">
                Based on the information on pages 1 and 2 above, I confirm that:
              </p>
              <ul className="text-sm space-y-2 ml-6 mb-6">
                <li>• The candidate has the required qualifications, experience and training</li>
                <li>• We will immediately notify the client of any changes to the staffing requirement</li>
              </ul>

              <div className="grid md:grid-cols-2 gap-6 mt-6">
                <div>
                  <p className="text-sm mb-2"><strong>Staff Name:</strong> {staff.first_name} {staff.last_name}</p>
                  <p className="text-sm mb-2"><strong>Signature:</strong> _________________</p>
                  <p className="text-sm"><strong>Date:</strong> {format(new Date(), 'dd/MM/yy')}</p>
                </div>
                <div>
                  <p className="text-sm mb-2"><strong>Recruitment Consultant:</strong> [To be completed]</p>
                  <p className="text-sm mb-2"><strong>On behalf of:</strong> {agency?.name}</p>
                  <p className="text-sm mb-2"><strong>Signed:</strong> _________________</p>
                  <p className="text-sm"><strong>Date:</strong> {format(new Date(), 'dd/MM/yy')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-xs text-gray-600 text-center pt-6 border-t">
            <p>All supply of staffing is in accordance with our standard terms of business.</p>
            <p className="mt-2">A further copy is available upon request.</p>
            <p className="mt-4 text-gray-500">
              Generated on {format(new Date(), 'dd/MM/yyyy HH:mm')} via ACG StaffLink Platform
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}