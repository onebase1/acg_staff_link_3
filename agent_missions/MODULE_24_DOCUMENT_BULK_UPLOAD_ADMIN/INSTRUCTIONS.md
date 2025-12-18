# MODULE 24: DOCUMENT BULK UPLOAD FOR ADMIN

## 🎯 Mission Objective
Enable admin to upload documents on behalf of staff (for existing staff with documents already on file).

## 📊 Priority: P1 - HIGH
**Duration:** 2-3 hours

---

## 🚀 Quick Implementation

### 1. Add "Upload Documents" Button to Staff.jsx

**In Staff table row actions (around line 700):**
```jsx
<Button
  size="sm"
  variant="outline"
  onClick={() => {
    setUploadingDocsForStaff(staffMember);
    setShowDocUploadModal(true);
  }}
>
  <Upload className="w-4 h-4 mr-2" />
  Upload Docs
</Button>
```

### 2. Create AdminDocumentUpload Component

**File:** `src/components/compliance/AdminDocumentUpload.jsx` (NEW)

```jsx
import { useState } from 'react';
import { supabase } from '@/supabaseClient';
import { toast } from 'sonner';
import { Upload, X } from 'lucide-react';

const DOCUMENT_TYPES = [
  'dbs_check',
  'right_to_work',
  'id_verification',
  'professional_registration',
  'training_certificate'
];

export default function AdminDocumentUpload({ staff, onClose, onSuccess }) {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async () => {
    if (files.length === 0) {
      toast.error('Please select files to upload');
      return;
    }

    setUploading(true);

    try {
      for (const fileData of files) {
        // Upload to storage
        const fileName = `${staff.id}/${Date.now()}-${fileData.file.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('compliance')
          .upload(fileName, fileData.file);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('compliance')
          .getPublicUrl(fileName);

        // Create compliance record
        const { error: dbError } = await supabase
          .from('compliance')
          .insert({
            staff_id: staff.id,
            agency_id: staff.agency_id,
            document_type: fileData.type,
            document_name: fileData.file.name,
            document_url: publicUrl,
            expiry_date: fileData.expiryDate || null,
            reference_number: fileData.referenceNumber || null,
            status: 'verified', // Admin uploaded = pre-verified
            notes: 'Uploaded by admin on behalf of staff'
          });

        if (dbError) throw dbError;
      }

      toast.success(`✅ ${files.length} documents uploaded successfully!`);
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(`Failed to upload: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
        <h2 className="text-xl font-bold mb-4">Upload Documents for {staff.full_name}</h2>

        <input
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={(e) => {
            const newFiles = Array.from(e.target.files).map(file => ({
              file,
              type: 'dbs_check',
              expiryDate: '',
              referenceNumber: ''
            }));
            setFiles([...files, ...newFiles]);
          }}
          className="mb-4"
        />

        <div className="space-y-2 max-h-96 overflow-y-auto mb-4">
          {files.map((fileData, index) => (
            <div key={index} className="border p-3 rounded-lg">
              <div className="flex justify-between items-start">
                <span className="font-semibold">{fileData.file.name}</span>
                <button onClick={() => setFiles(files.filter((_, i) => i !== index))}>
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-2">
                <select
                  value={fileData.type}
                  onChange={(e) => {
                    const updated = [...files];
                    updated[index].type = e.target.value;
                    setFiles(updated);
                  }}
                  className="border rounded px-2 py-1 text-sm"
                >
                  {DOCUMENT_TYPES.map(type => (
                    <option key={type} value={type}>{type.replace('_', ' ')}</option>
                  ))}
                </select>

                <input
                  type="date"
                  placeholder="Expiry Date"
                  value={fileData.expiryDate}
                  onChange={(e) => {
                    const updated = [...files];
                    updated[index].expiryDate = e.target.value;
                    setFiles(updated);
                  }}
                  className="border rounded px-2 py-1 text-sm"
                />

                <input
                  type="text"
                  placeholder="Reference #"
                  value={fileData.referenceNumber}
                  onChange={(e) => {
                    const updated = [...files];
                    updated[index].referenceNumber = e.target.value;
                    setFiles(updated);
                  }}
                  className="border rounded px-2 py-1 text-sm"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleUpload}
            disabled={uploading || files.length === 0}
            className="flex-1 bg-cyan-600 text-white px-4 py-2 rounded-lg disabled:opacity-50"
          >
            {uploading ? 'Uploading...' : `Upload ${files.length} Documents`}
          </button>
          <button
            onClick={onClose}
            disabled={uploading}
            className="px-4 py-2 border rounded-lg"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
```

### 3. Add Modal State to Staff.jsx

```jsx
const [showDocUploadModal, setShowDocUploadModal] = useState(false);
const [uploadingDocsForStaff, setUploadingDocsForStaff] = useState(null);

// In return JSX:
{showDocUploadModal && uploadingDocsForStaff && (
  <AdminDocumentUpload
    staff={uploadingDocsForStaff}
    onClose={() => {
      setShowDocUploadModal(false);
      setUploadingDocsForStaff(null);
    }}
    onSuccess={() => {
      queryClient.invalidateQueries(['compliance']);
    }}
  />
)}
```

### 4. Add "Uploaded by Agency" Badge in ComplianceTracker

**File:** `src/pages/ComplianceTracker.jsx`

```jsx
{doc.notes?.includes('Uploaded by admin') && (
  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
    ✓ Uploaded by agency
  </Badge>
)}
```

---

## ✅ Success Criteria

✅ Admin can upload multiple documents at once
✅ Documents auto-marked as 'verified' (status)
✅ Staff can see "Uploaded by agency" badge
✅ Staff can replace documents if incorrect

**MODULE 24 COMPLETE!**
