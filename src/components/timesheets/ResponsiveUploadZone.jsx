import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';

/**
 * ResponsiveUploadZone - Mobile-friendly upload component
 *
 * Desktop (md+): Full drag-and-drop zone with hover effects
 * Mobile (< md): Compact file input button (no drag-and-drop)
 */
export default function ResponsiveUploadZone({
  onFileSelect,
  uploading = false,
  acceptedFormats = '.pdf,.jpg,.jpeg,.png',
  maxSizeMB = 10
}) {
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  };

  return (
    <>
      {/* Mobile: Compact File Input Button */}
      <div className="md:hidden">
        <label className="block w-full cursor-pointer">
          <Button
            type="button"
            size="sm"
            disabled={uploading}
            className="w-full"
            asChild
          >
            <span className="flex items-center justify-center gap-2">
              <Upload className="w-4 h-4" />
              {uploading ? 'Uploading...' : 'Upload Timesheet Document'}
            </span>
          </Button>
          <input
            type="file"
            className="hidden"
            accept={acceptedFormats}
            onChange={handleFileChange}
            disabled={uploading}
          />
        </label>
        <p className="text-xs text-gray-500 text-center mt-2">
          PDF, JPG, PNG - max {maxSizeMB}MB
        </p>
      </div>

      {/* Desktop: Drag & Drop Zone */}
      <div
        className={`hidden md:block border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive
            ? 'border-cyan-500 bg-cyan-50'
            : 'border-gray-300 hover:border-cyan-400 hover:bg-gray-50'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <Upload className={`w-12 h-12 mx-auto mb-4 ${dragActive ? 'text-cyan-600' : 'text-gray-400'}`} />
        <p className="text-sm font-semibold text-gray-700 mb-2">
          {dragActive ? 'Drop file here' : 'Drag & drop timesheet document'}
        </p>
        <p className="text-xs text-gray-500 mb-4">
          or click to browse (PDF, JPG, PNG - max {maxSizeMB}MB)
        </p>
        <label className="cursor-pointer">
          <Button
            type="button"
            size="sm"
            disabled={uploading}
            asChild
          >
            <span>
              <Upload className="w-4 h-4 mr-2" />
              {uploading ? 'Uploading...' : 'Browse Files'}
            </span>
          </Button>
          <input
            type="file"
            className="hidden"
            accept={acceptedFormats}
            onChange={handleFileChange}
            disabled={uploading}
          />
        </label>
      </div>
    </>
  );
}
