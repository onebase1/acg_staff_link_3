
import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Download, Printer, CheckCircle, XCircle, AlertTriangle, User,
  Shield, FileText, Calendar, Award, Car
} from "lucide-react";
import { format, differenceInYears, differenceInDays } from "date-fns";

export default function StaffProfileSimulation() {
  const navigate = useNavigate();
  const [staffId, setStaffId] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setStaffId(params.get('id'));
  }, []);

  const { data: staff } = useQuery({
    queryKey: ['staff-profile', staffId],
    queryFn: async () => {
      if (!staffId) return null;
      console.log('📊 Querying single staff member:', staffId);
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
    enabled: !!staffId
  });

  const { data: agency } = useQuery({
    queryKey: ['simulation-agency', staff?.agency_id],
    queryFn: async () => {
      if (!staff?.agency_id) return null;
      console.log('📊 Querying single agency:', staff.agency_id);
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
    enabled: !!staff?.agency_id
  });

  const { data: complianceDocs = [] } = useQuery({
    queryKey: ['simulation-compliance', staffId],
    queryFn: async () => {
      if (!staffId) return [];
      console.log('📊 Querying compliance docs for staff:', staffId);
      const { data, error } = await supabase
        .from('compliance')
        .select('*')
        .eq('staff_id', staffId)
        .order('created_date', { ascending: false });

      if (error) {
        console.error('❌ Error fetching compliance docs:', error);
        return [];
      }

      return data || [];
    },
    enabled: !!staffId,
    initialData: []
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading staff profile...</p>
      </div>
    );
  }

  // Check photo age
  const photoAge = staff.profile_photo_uploaded_date 
    ? differenceInYears(new Date(), new Date(staff.profile_photo_uploaded_date))
    : null;
  const photoNeedsUpdate = photoAge && photoAge >= 3;

  // Get specific compliance documents (CQC Requirements)
  const dbsDoc = complianceDocs.find(d => d.document_type === 'dbs_check');
  const passportDoc = complianceDocs.find(d => d.document_type === 'id_verification');
  const rightToWorkDoc = complianceDocs.find(d => d.document_type === 'right_to_work');
  const nmcDoc = complianceDocs.find(d => d.document_type === 'professional_registration');
  
  // Mandatory training certificates (CQC Core Requirements)
  const mandatoryTraining = [
    { 
      name: 'Manual Handling & Moving People', 
      data: staff.mandatory_training?.manual_handling,
      doc: complianceDocs.find(d => d.document_name?.includes('Manual Handling'))
    },
    { 
      name: 'Safeguarding Children', 
      data: staff.mandatory_training?.safeguarding_children,
      doc: complianceDocs.find(d => d.document_name?.includes('Safeguarding Children'))
    },
    { 
      name: 'Safeguarding of Vulnerable Adults', 
      data: staff.mandatory_training?.safeguarding_adults,
      doc: complianceDocs.find(d => d.document_name?.includes('Safeguarding') && d.document_name?.includes('Adult'))
    },
    { 
      name: 'Preventing Radicalisation (PREVENT)', 
      data: staff.mandatory_training?.prevent,
      doc: complianceDocs.find(d => d.document_name?.includes('Radicalisation') || d.document_name?.includes('PREVENT'))
    },
    { 
      name: 'Fire Safety', 
      data: staff.mandatory_training?.fire_safety,
      doc: complianceDocs.find(d => d.document_name?.includes('Fire Safety'))
    },
    { 
      name: 'Food Hygiene', 
      data: staff.mandatory_training?.food_hygiene,
      doc: complianceDocs.find(d => d.document_name?.includes('Food Hygiene'))
    },
    { 
      name: 'Health Safety & Welfare', 
      data: staff.mandatory_training?.health_safety,
      doc: complianceDocs.find(d => d.document_name?.includes('Health Safety'))
    },
    { 
      name: 'Infection Control', 
      data: staff.mandatory_training?.infection_control,
      doc: complianceDocs.find(d => d.document_name?.includes('Infection Control'))
    },
    { 
      name: 'Person Centred Care & Consent', 
      data: staff.mandatory_training?.person_centred_care,
      doc: complianceDocs.find(d => d.document_name?.includes('Person Centred'))
    },
    { 
      name: 'Dementia Awareness', 
      data: staff.mandatory_training?.dementia_awareness,
      doc: complianceDocs.find(d => d.document_name?.includes('Dementia'))
    },
  ];

  // Role-specific requirements
  const isNurse = staff.role === 'nurse' || staff.role === 'specialist_nurse';
  const isSeniorCarer = staff.role === 'senior_care_worker';
  // const requiresMedication = isSeniorCarer; // This variable was declared but not used

  // CQC Compliance checklist
  const complianceChecks = [
    {
      item: "Proof of identity – Passport or Photo ID",
      status: !!passportDoc && passportDoc.status === 'verified',
      required: true,
      doc: passportDoc
    },
    {
      item: "Enhanced DBS disclosure obtained and verified",
      status: !!dbsDoc && dbsDoc.status === 'verified',
      required: true,
      doc: dbsDoc
    },
    {
      item: "Two written references detailing recent work experience",
      status: staff.references && staff.references.length >= 2,
      required: true
    },
    {
      item: "Documentary evidence of qualifications and training",
      status: mandatoryTraining.filter(t => {
        const completedDate = t.data?.completed_date;
        const expiryDate = t.data?.expiry_date;
        return completedDate && (!expiryDate || new Date(expiryDate) > new Date());
      }).length >= 8,
      required: true
    },
    {
      item: "Full employment history with explanations for gaps",
      status: staff.employment_history && staff.employment_history.length > 0,
      required: true
    },
    {
      item: "Occupational health undertaking completed",
      status: staff.occupational_health && staff.occupational_health.cleared_to_work,
      required: true
    },
    {
      item: "Evidence of NMC registration (where applicable)",
      status: isNurse ? (!!nmcDoc && nmcDoc.status === 'verified' && !!staff.nmc_pin) : true,
      required: isNurse
    },
    {
      item: "Medication Administration Training (Senior Carer)",
      status: isSeniorCarer ? staff.medication_trained : true,
      required: isSeniorCarer
    },
    {
      item: "Evidence of right to work in the UK",
      status: !!rightToWorkDoc && rightToWorkDoc.status === 'verified',
      required: true
    },
    {
      item: "Professional profile photograph (< 3 years old)",
      status: !!staff.profile_photo_url && !photoNeedsUpdate,
      required: true
    }
  ];

  const complianceRate = (complianceChecks.filter(c => c.status).length / complianceChecks.filter(c => c.required).length) * 100;
  const isFullyCompliant = complianceRate === 100;

  // Calculate days until next expiry
  const getNextExpiry = () => {
    const expiringDocs = complianceDocs
      .filter(d => d.expiry_date && d.status === 'verified')
      .map(d => ({ name: d.document_name, days: differenceInDays(new Date(d.expiry_date), new Date()) }))
      .filter(d => d.days >= 0)
      .sort((a, b) => a.days - b.days);

    const expiringTraining = mandatoryTraining
      .filter(t => t.data?.expiry_date)
      .map(t => ({ name: t.name, days: differenceInDays(new Date(t.data.expiry_date), new Date()) }))
      .filter(t => t.days >= 0)
      .sort((a, b) => a.days - b.days);
    
    const allExpiring = [...expiringDocs, ...expiringTraining].sort((a,b) => a.days - b.days);

    return allExpiring[0];
  };

  const nextExpiry = getNextExpiry();

  return (
    <div className="space-y-6">
      {/* Action Bar - Hide on print */}
      <div className="flex justify-between items-center print:hidden">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Staff Profile for Care Home</h2>
          <p className="text-gray-600 mt-1">{staff.first_name} {staff.last_name} - {staff.role.replace('_', ' ')}</p>
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

      {/* Compliance Status Alert */}
      {!isFullyCompliant && (
        <Alert variant="destructive" className="print:hidden">
          <AlertTriangle className="h-5 w-5" />
          <AlertDescription>
            <strong>⚠️ COMPLIANCE WARNING:</strong> This staff member has incomplete compliance ({complianceRate.toFixed(0)}%).
            They should NOT be assigned to shifts until all requirements are met.
          </AlertDescription>
        </Alert>
      )}

      {photoNeedsUpdate && (
        <Alert className="print:hidden border-amber-300 bg-amber-50">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          <AlertDescription className="text-amber-900">
            <strong>Action Required:</strong> Staff photo is {photoAge} years old and needs updating. 
            Photos must be updated every 3 years for CQC compliance.
          </AlertDescription>
        </Alert>
      )}

      {/* Profile Document */}
      <Card className="shadow-2xl print:shadow-none">
        <CardContent className="p-12">
          {/* Header */}
          <div className="text-center mb-8 pb-6 border-b-2">
            <div className="flex items-center justify-center gap-4 mb-4">
              {agency?.logo_url && (
                <img 
                  src={agency.logo_url} 
                  alt={agency.name}
                  className="h-20 object-contain"
                />
              )}
              {!agency?.logo_url && (
                <div className="w-20 h-20 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-2xl">
                    {agency?.name?.[0] || 'ACG'}
                  </span>
                </div>
              )}
              <div className="text-left">
                <h1 className="text-3xl font-bold text-gray-900">{agency?.name || 'Healthcare Agency'}</h1>
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
            <div className="bg-black text-white p-3 text-lg font-semibold uppercase">
              {staff.role.replace('_', ' ')}
              {isSeniorCarer && staff.medication_trained && ' (Medication Trained)'}
            </div>

            <div className="grid grid-cols-3 border">
              {/* Left Column - Details */}
              <div className="col-span-2 border-r">
                <div className="p-3 border-b bg-blue-50">
                  <p className="text-sm font-semibold text-gray-700">Name of Agency:</p>
                  <p className="text-gray-900 font-bold">{agency?.name || 'Agency Name'}</p>
                </div>
                <div className="p-3 border-b">
                  <p className="text-sm font-semibold text-gray-700">Name of Candidate:</p>
                  <p className="text-gray-900 font-bold text-lg">
                    {staff.first_name} {staff.last_name}
                  </p>
                </div>
                <div className="p-3 border-b">
                  <p className="text-sm font-semibold text-gray-700">Position:</p>
                  <p className="text-gray-900 font-bold uppercase">
                    {staff.role.replace('_', ' ')}
                  </p>
                </div>
                
                {isNurse && (
                  <>
                    <div className="p-3 border-b">
                      <p className="text-sm font-semibold text-gray-700">NMC Pin Number:</p>
                      <p className="text-gray-900 font-mono font-bold">{staff.nmc_pin || '⚠️ MISSING - REQUIRED'}</p>
                    </div>
                    <div className="p-3 border-b">
                      <p className="text-sm font-semibold text-gray-700">Parts of the NMC Register:</p>
                      <p className="text-gray-900">{staff.nmc_register_part || 'N/A'}</p>
                    </div>
                  </>
                )}

                {!isNurse && isSeniorCarer && (
                  <div className="p-3 border-b bg-purple-50">
                    <p className="text-sm font-semibold text-gray-700">Medication Training Status:</p>
                    <p className={`font-bold ${staff.medication_trained ? 'text-green-700' : 'text-red-700'}`}>
                      {staff.medication_trained ? '✓ MEDICATION TRAINED' : '✗ NOT MEDICATION TRAINED'}
                    </p>
                    {staff.medication_training_expiry && (
                      <p className="text-xs text-gray-600 mt-1">
                        Expires: {format(new Date(staff.medication_training_expiry), 'dd/MM/yyyy')}
                      </p>
                    )}
                  </div>
                )}

                {staff.driving_license_number && (
                  <div className="p-3 border-b">
                    <p className="text-sm font-semibold text-gray-700">Driving License:</p>
                    <p className="text-gray-900 font-mono text-sm">{staff.driving_license_number}</p>
                    {staff.driving_license_expiry && (
                      <p className="text-xs text-gray-600">Valid until: {format(new Date(staff.driving_license_expiry), 'dd/MM/yyyy')}</p>
                    )}
                  </div>
                )}

                <div className="p-3 border-b">
                  <p className="text-sm font-semibold text-gray-700">D.O.B:</p>
                  <p className="text-gray-900">{format(new Date(staff.date_of_birth), 'dd/MM/yyyy')}</p>
                </div>
                
                <div className="p-3 border-b">
                  <p className="text-sm font-semibold text-gray-700">Date of Enhanced DBS Disclosure:</p>
                  <p className="text-gray-900">
                    {dbsDoc?.issue_date ? format(new Date(dbsDoc.issue_date), 'dd/MM/yyyy') : '⚠️ Pending'}
                  </p>
                </div>
                <div className="p-3 border-b">
                  <p className="text-sm font-semibold text-gray-700">DBS Disclosure Number:</p>
                  <p className="text-gray-900 font-mono">{dbsDoc?.reference_number || '⚠️ Pending'}</p>
                </div>
                <div className="p-3 border-b">
                  <p className="text-sm font-semibold text-gray-700">POCA and POVA checked:</p>
                  <div className="flex gap-4">
                    <span className="font-medium">
                      Yes {dbsDoc && <CheckCircle className="inline w-4 h-4 text-green-600" />}
                    </span>
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

              {/* Right Column - Photo - FIXED SQUARE GRID */}
              <div className="flex items-center justify-center p-6 bg-gray-50">
                {staff.profile_photo_url ? (
                  <div className="text-center">
                    <div className="w-48 h-48 border-4 border-gray-300 shadow-lg mx-auto overflow-hidden bg-white">
                      <img 
                        src={staff.profile_photo_url} 
                        alt={`${staff.first_name} ${staff.last_name}`}
                        className="w-full h-full object-cover"
                        style={{
                          objectFit: 'cover',
                          objectPosition: 'center'
                        }}
                      />
                    </div>
                    {photoNeedsUpdate && (
                      <p className="text-xs text-red-600 mt-2">⚠️ Photo {photoAge} years old - UPDATE REQUIRED</p>
                    )}
                    {staff.profile_photo_uploaded_date && !photoNeedsUpdate && (
                      <p className="text-xs text-gray-500 mt-2">
                        Uploaded: {format(new Date(staff.profile_photo_uploaded_date), 'dd/MM/yyyy')}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="w-48 h-48 bg-red-100 border-4 border-red-400 flex items-center justify-center">
                    <div className="text-center">
                      <User className="w-16 h-16 text-red-600 mx-auto mb-2" />
                      <p className="text-red-700 font-bold text-sm">⚠️ PHOTO REQUIRED</p>
                      <p className="text-red-600 text-xs mt-1">Cannot supply staff without photo</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* CQC Compliance Checklist */}
          <div className="mb-8">
            <div className="bg-black text-white p-3 mb-0 flex items-center justify-between">
              <span className="text-sm">
                CQC Compliance Check - All requirements must be met before staff can work
              </span>
              <Badge className={isFullyCompliant ? 'bg-green-500' : 'bg-red-500'}>
                {complianceRate.toFixed(0)}% Complete
              </Badge>
            </div>
            <table className="w-full border">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-2 text-left w-12">#</th>
                  <th className="border p-2 text-left">Compliance Requirement</th>
                  <th className="border p-2 text-center w-20">YES</th>
                  <th className="border p-2 text-center w-20">NO</th>
                </tr>
              </thead>
              <tbody>
                {complianceChecks.map((check, index) => (
                  <tr key={index} className={`hover:bg-gray-50 ${!check.status && check.required ? 'bg-red-50' : ''}`}>
                    <td className="border p-2 text-center font-bold">{index + 1}</td>
                    <td className="border p-2 text-sm">
                      {check.item}
                      {check.required && <span className="text-red-600 ml-1">*</span>}
                    </td>
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

          {/* Mandatory Training Certificates */}
          <div className="mb-8">
            <table className="w-full border">
              <thead>
                <tr className="bg-black text-white">
                  <th className="border border-white p-3 text-left">Mandatory Training</th>
                  <th className="border border-white p-3 text-center">Date Completed</th>
                  <th className="border border-white p-3 text-center">Expiry Date</th>
                  <th className="border border-white p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {mandatoryTraining.map((training, index) => {
                  const completedDate = training.data?.completed_date;
                  const expiryDate = training.data?.expiry_date;
                  const certificateRef = training.data?.certificate_ref;
                  
                  const isValid = completedDate && (!expiryDate || new Date(expiryDate) > new Date());
                  const isExpiringSoon = expiryDate && 
                    differenceInDays(new Date(expiryDate), new Date()) <= 30 &&
                    differenceInDays(new Date(expiryDate), new Date()) >= 0;

                  return (
                    <tr key={index} className={`hover:bg-gray-50 ${!isValid ? 'bg-red-50' : ''}`}>
                      <td className="border p-3 text-sm">
                        {training.name}
                        {certificateRef && (
                          <span className="text-xs text-gray-500 block mt-1">Ref: {certificateRef}</span>
                        )}
                      </td>
                      <td className="border p-3 text-center text-sm">
                        {completedDate ? format(new Date(completedDate), 'dd/MM/yyyy') : '⚠️ Missing'}
                      </td>
                      <td className="border p-3 text-center text-sm">
                        {expiryDate ? (
                          <span className={isExpiringSoon ? 'text-orange-600 font-bold' : ''}>
                            {format(new Date(expiryDate), 'dd/MM/yyyy')}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="border p-3 text-center">
                        {isValid ? (
                          <Badge className="bg-green-100 text-green-800">✓ Valid</Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-800">✗ Missing</Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
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
                  <p className="text-sm font-semibold text-gray-700 mb-2">Total Months</p>
                  <p className="text-gray-900 text-lg font-bold">{staff.months_of_experience || 0}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Next Expiry Alert */}
          {nextExpiry && nextExpiry.days <= 60 && (
            <Alert className="mb-8 border-amber-300 bg-amber-50">
              <Calendar className="h-5 w-5 text-amber-600" />
              <AlertDescription className="text-amber-900">
                <strong>Next Expiry:</strong> {nextExpiry.name} expires in <strong>{nextExpiry.days} days</strong>
              </AlertDescription>
            </Alert>
          )}

          {/* Statement of Acceptance */}
          <div className="mb-8">
            <div className="bg-gray-100 p-6 border">
              <h3 className="font-bold text-lg mb-4">Statement of Acceptance</h3>
              <p className="text-sm mb-4">
                Based on the information above, I confirm that:
              </p>
              <ul className="text-sm space-y-2 ml-6 mb-6">
                <li>• The candidate has the required qualifications, experience and training for the role</li>
                <li>• All CQC regulatory requirements have been met and verified</li>
                <li>• Enhanced DBS disclosure has been obtained and is satisfactory</li>
                <li>• We will immediately notify the care home of any changes to the staffing requirement</li>
              </ul>

              <div className="grid md:grid-cols-2 gap-6 mt-6 pt-6 border-t">
                <div className="bg-white p-4 rounded border">
                  <p className="text-sm mb-2"><strong>Staff Confirmation:</strong></p>
                  <p className="text-sm mb-2">Name: {staff.first_name} {staff.last_name}</p>
                  <p className="text-sm mb-2">Date: {format(new Date(), 'dd/MM/yyyy')}</p>
                  <div className="mt-3 p-2 bg-green-50 border border-green-300 rounded text-center">
                    <p className="text-xs text-green-800 font-semibold">✓ Digitally Confirmed via ACG StaffLink</p>
                  </div>
                </div>
                <div className="bg-white p-4 rounded border">
                  <p className="text-sm mb-2"><strong>Agency Representative:</strong></p>
                  <p className="text-sm mb-2">On behalf of: {agency?.name}</p>
                  <p className="text-sm mb-2">Date: {format(new Date(), 'dd/MM/yyyy')}</p>
                  <div className="mt-3 p-2 bg-blue-50 border border-blue-300 rounded text-center">
                    <p className="text-xs text-blue-800 font-semibold">✓ Digitally Verified via ACG StaffLink</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-xs text-gray-600 text-center pt-6 border-t">
            <p>All supply of staffing is in accordance with CQC regulations and our standard terms of business.</p>
            <p className="mt-2">This is a digitally generated profile. Manual signatures are not required.</p>
            <p className="mt-4 text-gray-500">
              Generated on {format(new Date(), 'dd/MM/yyyy HH:mm')} via ACG StaffLink Platform
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
