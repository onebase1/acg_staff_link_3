# AGENT 3 - PHASE 3 TEMPLATES

**Priority:** 🟡 MEDIUM (Phase 3 - Feature Enhancement)
**Complexity:** Medium-High
**Estimated Time:** 10 hours
**Skills Required:** React, Supabase, localStorage, JSON schemas

---

## 🎯 MISSION OBJECTIVE

Implement template system allowing users to save and reuse shift patterns. This eliminates repetitive data entry for recurring schedules.

---

## 📋 YOUR TASKS

### Task P3.1: Save as Template (6 hours)

**User Story:**
**As a** care home admin
**I want to** save my current shift pattern as a template
**So that** I can reuse it next week/month without re-entering

**Features:**
1. "Save as Template" button in Step 2
2. Template name input modal
3. Save grid data + metadata to database
4. List saved templates
5. Load template button
6. Template preview before loading
7. Delete template option

---

### Task P3.2: Recurring Schedule Generator (4 hours)

**User Story:**
**As a** care home admin
**I want to** auto-generate shifts for next 4 weeks using a template
**So that** I don't have to manually create shifts every week

**Features:**
1. "Generate Recurring" button
2. Select template
3. Select recurrence: Weekly, Bi-weekly, Monthly
4. Select number of occurrences (max 12)
5. Preview all shifts before creation
6. Batch create all shifts

---

## 🏗️ TECHNICAL SPECIFICATIONS

### Database Schema

**New Table: `shift_templates`**

```sql
CREATE TABLE shift_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id TEXT NOT NULL REFERENCES auth.users(id),
  client_id UUID NOT NULL REFERENCES clients(id),
  name TEXT NOT NULL,
  description TEXT,

  -- Grid data structure
  template_data JSONB NOT NULL,
  -- Example:
  -- {
  --   "roles": ["nurse_day", "nurse_night", "hca_day"],
  --   "gridData": {
  --     "monday": { "nurse_day": 2, "nurse_night": 2, "hca_day": 3 },
  --     "tuesday": { "nurse_day": 2, "nurse_night": 2, "hca_day": 3 }
  --   },
  --   "metadata": {
  --     "totalShifts": 109,
  --     "daysInPattern": 7
  --   }
  -- }

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  use_count INTEGER DEFAULT 0,

  UNIQUE(agency_id, client_id, name)
);

-- RLS Policies
ALTER TABLE shift_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own templates"
  ON shift_templates FOR SELECT
  USING (agency_id = auth.uid()::text);

CREATE POLICY "Users can create their own templates"
  ON shift_templates FOR INSERT
  WITH CHECK (agency_id = auth.uid()::text);

CREATE POLICY "Users can update their own templates"
  ON shift_templates FOR UPDATE
  USING (agency_id = auth.uid()::text);

CREATE POLICY "Users can delete their own templates"
  ON shift_templates FOR DELETE
  USING (agency_id = auth.uid()::text);

-- Index for fast lookups
CREATE INDEX idx_shift_templates_agency_client
  ON shift_templates(agency_id, client_id);
```

---

## 💻 IMPLEMENTATION GUIDE

### Part 1: Save Template Component

**File:** `src/components/bulk-shifts/SaveTemplateModal.jsx`

```jsx
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/config/supabaseClient';
import { toast } from 'sonner';
import { Save, X } from 'lucide-react';

export default function SaveTemplateModal({
  isOpen,
  onClose,
  clientId,
  clientName,
  gridData,
  activeRoles,
  dateArray
}) {
  const [templateName, setTemplateName] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      toast.error('Please enter a template name');
      return;
    }

    setIsSaving(true);

    try {
      // Calculate metadata
      const totalShifts = Object.values(gridData).reduce((sum, dateData) => {
        return sum + Object.values(dateData).reduce((s, qty) => s + (qty || 0), 0);
      }, 0);

      // Convert grid data to day-of-week pattern
      const patternData = convertGridToPattern(gridData, dateArray, activeRoles);

      const templateData = {
        roles: activeRoles.map(r => r.key),
        gridData: patternData,
        metadata: {
          totalShifts,
          daysInPattern: dateArray.length,
          rolesCount: activeRoles.length
        }
      };

      const { data, error } = await supabase
        .from('shift_templates')
        .insert({
          client_id: clientId,
          name: templateName,
          description: description || null,
          template_data: templateData
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          throw new Error('A template with this name already exists for this client');
        }
        throw error;
      }

      toast.success(`Template "${templateName}" saved successfully!`);
      onClose();
      setTemplateName('');
      setDescription('');

    } catch (error) {
      console.error('Error saving template:', error);
      toast.error(`Failed to save template: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Save Shift Pattern as Template</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium">Client</label>
            <p className="text-sm text-gray-600">{clientName}</p>
          </div>

          <div>
            <label className="text-sm font-medium">Template Name *</label>
            <Input
              placeholder="e.g., Standard Week, Holiday Pattern"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              maxLength={100}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Description (Optional)</label>
            <Textarea
              placeholder="Notes about this pattern..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={500}
            />
          </div>

          <div className="bg-gray-50 p-3 rounded text-sm">
            <p className="font-medium mb-1">Pattern Summary:</p>
            <ul className="text-gray-600 space-y-1">
              <li>• {dateArray.length} days</li>
              <li>• {activeRoles.length} roles</li>
              <li>• {Object.keys(gridData).length} dates with shifts</li>
            </ul>
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            <X className="w-4 h-4 mr-1" />
            Cancel
          </Button>
          <Button onClick={handleSaveTemplate} disabled={isSaving}>
            <Save className="w-4 h-4 mr-1" />
            {isSaving ? 'Saving...' : 'Save Template'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Helper: Convert grid data to day-of-week pattern
function convertGridToPattern(gridData, dateArray, activeRoles) {
  const pattern = {};

  dateArray.forEach(dateStr => {
    const date = new Date(dateStr + 'T00:00:00');
    const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][date.getDay()];

    if (gridData[dateStr]) {
      if (!pattern[dayOfWeek]) {
        pattern[dayOfWeek] = {};
      }

      // Merge quantities for same day-of-week
      activeRoles.forEach(role => {
        const qty = gridData[dateStr][role.key] || 0;
        pattern[dayOfWeek][role.key] = (pattern[dayOfWeek][role.key] || 0) + qty;
      });
    }
  });

  // Average if multiple same days
  Object.keys(pattern).forEach(day => {
    const count = dateArray.filter(d => {
      const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][new Date(d + 'T00:00:00').getDay()];
      return dayName === day;
    }).length;

    if (count > 1) {
      Object.keys(pattern[day]).forEach(role => {
        pattern[day][role] = Math.round(pattern[day][role] / count);
      });
    }
  });

  return pattern;
}
```

---

### Part 2: Load Template Component

**File:** `src/components/bulk-shifts/LoadTemplateModal.jsx`

```jsx
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/config/supabaseClient';
import { toast } from 'sonner';
import { FileText, Trash2, Clock, Calendar } from 'lucide-react';

export default function LoadTemplateModal({
  isOpen,
  onClose,
  clientId,
  dateArray,
  onLoadTemplate
}) {
  const [templates, setTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  useEffect(() => {
    if (isOpen && clientId) {
      fetchTemplates();
    }
  }, [isOpen, clientId]);

  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('shift_templates')
        .select('*')
        .eq('client_id', clientId)
        .order('last_used_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('Failed to load templates');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadTemplate = async () => {
    if (!selectedTemplate) {
      toast.error('Please select a template');
      return;
    }

    try {
      // Convert day-of-week pattern to current date range
      const gridData = applyPatternToDateRange(
        selectedTemplate.template_data.gridData,
        dateArray
      );

      // Update usage stats
      await supabase
        .from('shift_templates')
        .update({
          last_used_at: new Date().toISOString(),
          use_count: selectedTemplate.use_count + 1
        })
        .eq('id', selectedTemplate.id);

      onLoadTemplate(gridData);
      toast.success(`Loaded template "${selectedTemplate.name}"`);
      onClose();
    } catch (error) {
      console.error('Error loading template:', error);
      toast.error('Failed to load template');
    }
  };

  const handleDeleteTemplate = async (templateId, templateName) => {
    if (!confirm(`Delete template "${templateName}"?`)) return;

    try {
      const { error } = await supabase
        .from('shift_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;

      toast.success('Template deleted');
      fetchTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Failed to delete template');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Load Shift Template</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 max-h-96 overflow-y-auto">
          {isLoading ? (
            <p>Loading templates...</p>
          ) : templates.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No templates saved for this client</p>
            </div>
          ) : (
            templates.map(template => (
              <div
                key={template.id}
                className={`border rounded-lg p-4 cursor-pointer hover:bg-gray-50 ${
                  selectedTemplate?.id === template.id ? 'border-cyan-500 bg-cyan-50' : ''
                }`}
                onClick={() => setSelectedTemplate(template)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-medium text-lg">{template.name}</h4>
                    {template.description && (
                      <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                    )}

                    <div className="flex gap-4 mt-3 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {template.template_data.metadata?.daysInPattern || 0} days
                      </span>
                      <span className="flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        {template.template_data.metadata?.totalShifts || 0} shifts
                      </span>
                      {template.use_count > 0 && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Used {template.use_count}x
                        </span>
                      )}
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteTemplate(template.id, template.name);
                    }}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex gap-2 justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleLoadTemplate}
            disabled={!selectedTemplate}
          >
            Load Template
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Helper: Apply day-of-week pattern to specific date range
function applyPatternToDateRange(pattern, dateArray) {
  const gridData = {};

  dateArray.forEach(dateStr => {
    const date = new Date(dateStr + 'T00:00:00');
    const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][date.getDay()];

    if (pattern[dayOfWeek]) {
      gridData[dateStr] = { ...pattern[dayOfWeek] };
    }
  });

  return gridData;
}
```

---

### Part 3: Recurring Schedule Generator

**File:** `src/components/bulk-shifts/RecurringScheduleModal.jsx`

```jsx
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/config/supabaseClient';
import { toast } from 'sonner';
import { Repeat, Calendar } from 'lucide-react';

export default function RecurringScheduleModal({
  isOpen,
  onClose,
  clientId,
  clientName
}) {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [recurrenceType, setRecurrenceType] = useState('weekly');
  const [occurrences, setOccurrences] = useState(4);
  const [startDate, setStartDate] = useState('');
  const [previewShifts, setPreviewShifts] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (isOpen && clientId) {
      fetchTemplates();
      setStartDate(new Date().toISOString().split('T')[0]);
    }
  }, [isOpen, clientId]);

  const fetchTemplates = async () => {
    const { data } = await supabase
      .from('shift_templates')
      .select('*')
      .eq('client_id', clientId)
      .order('name');

    setTemplates(data || []);
  };

  const generatePreview = () => {
    if (!selectedTemplate || !startDate) return;

    const shifts = [];
    const pattern = selectedTemplate.template_data.gridData;
    const intervalDays = recurrenceType === 'weekly' ? 7 : recurrenceType === 'biweekly' ? 14 : 30;

    for (let i = 0; i < occurrences; i++) {
      const weekStartDate = new Date(startDate);
      weekStartDate.setDate(weekStartDate.getDate() + (i * intervalDays));

      // Generate 7 days from this start date
      for (let day = 0; day < 7; day++) {
        const currentDate = new Date(weekStartDate);
        currentDate.setDate(currentDate.getDate() + day);
        const dateStr = currentDate.toISOString().split('T')[0];
        const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][currentDate.getDay()];

        if (pattern[dayOfWeek]) {
          Object.entries(pattern[dayOfWeek]).forEach(([roleKey, quantity]) => {
            for (let q = 0; q < quantity; q++) {
              shifts.push({
                date: dateStr,
                role: roleKey.split('_')[0],
                shift_type: roleKey.split('_')[1],
                occurrence: i + 1
              });
            }
          });
        }
      }
    }

    setPreviewShifts(shifts);
  };

  useEffect(() => {
    generatePreview();
  }, [selectedTemplate, recurrenceType, occurrences, startDate]);

  const handleGenerateShifts = async () => {
    setIsGenerating(true);
    try {
      // TODO: Implement actual shift creation
      // This would call the same batch insert logic from BulkShiftCreation

      toast.success(`Generated ${previewShifts.length} shifts for ${occurrences} ${recurrenceType} periods`);
      onClose();
    } catch (error) {
      toast.error('Failed to generate shifts');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Generate Recurring Schedule</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Template Selection */}
          <div>
            <label className="text-sm font-medium">Select Template</label>
            <Select value={selectedTemplate?.id} onValueChange={(id) => {
              setSelectedTemplate(templates.find(t => t.id === id));
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map(t => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name} ({t.template_data.metadata?.totalShifts || 0} shifts)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Recurrence Type */}
          <div>
            <label className="text-sm font-medium">Recurrence</label>
            <Select value={recurrenceType} onValueChange={setRecurrenceType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly (every 7 days)</SelectItem>
                <SelectItem value="biweekly">Bi-weekly (every 14 days)</SelectItem>
                <SelectItem value="monthly">Monthly (every 30 days)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Start Date & Occurrences */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Start Date</label>
              <input
                type="date"
                className="w-full border rounded px-3 py-2"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Number of Occurrences</label>
              <Select value={String(occurrences)} onValueChange={(v) => setOccurrences(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 6, 8, 12].map(n => (
                    <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Preview */}
          {previewShifts.length > 0 && (
            <div className="bg-gray-50 rounded p-4">
              <h4 className="font-medium mb-2">Preview</h4>
              <div className="text-sm text-gray-600 space-y-1">
                <p>• Total shifts: {previewShifts.length}</p>
                <p>• Date range: {previewShifts[0]?.date} to {previewShifts[previewShifts.length - 1]?.date}</p>
                <p>• Occurrences: {occurrences}</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleGenerateShifts}
            disabled={!selectedTemplate || isGenerating}
          >
            <Repeat className="w-4 h-4 mr-1" />
            {isGenerating ? 'Generating...' : `Generate ${previewShifts.length} Shifts`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

---

### Part 4: Integration with Step2MultiRoleGrid

**Modify:** `src/components/bulk-shifts/Step2MultiRoleGrid.jsx`

```jsx
// Add imports
import SaveTemplateModal from './SaveTemplateModal';
import LoadTemplateModal from './LoadTemplateModal';

// Add state
const [showSaveTemplate, setShowSaveTemplate] = useState(false);
const [showLoadTemplate, setShowLoadTemplate] = useState(false);

// Add handler
const handleLoadTemplate = (templateGridData) => {
  setFormData(prev => ({
    ...prev,
    gridData: {
      ...prev.gridData,
      ...templateGridData
    }
  }));
};

// Add buttons in action bar
<div className="flex gap-2">
  <Button
    variant="outline"
    size="sm"
    onClick={() => setShowLoadTemplate(true)}
  >
    <FileText className="w-3 h-3 mr-1" />
    Load Template
  </Button>
  <Button
    variant="outline"
    size="sm"
    onClick={() => setShowSaveTemplate(true)}
    disabled={Object.keys(formData.gridData).length === 0}
  >
    <Save className="w-3 h-3 mr-1" />
    Save as Template
  </Button>
</div>

// Add modals at end of component
<SaveTemplateModal
  isOpen={showSaveTemplate}
  onClose={() => setShowSaveTemplate(false)}
  clientId={formData.client_id}
  clientName={formData.client?.name}
  gridData={formData.gridData}
  activeRoles={formData.activeRoles}
  dateArray={dateArray}
/>

<LoadTemplateModal
  isOpen={showLoadTemplate}
  onClose={() => setShowLoadTemplate(false)}
  clientId={formData.client_id}
  dateArray={dateArray}
  onLoadTemplate={handleLoadTemplate}
/>
```

---

## 🧪 TESTING REQUIREMENTS

### Manual Tests

**Test 1: Save Template**
1. Fill grid with pattern
2. Click "Save as Template"
3. Enter name "Standard Week"
4. Verify saved to database
5. Reload page
6. Verify template appears in list

**Test 2: Load Template**
1. Clear grid
2. Click "Load Template"
3. Select "Standard Week"
4. Verify grid populated correctly
5. Verify day-of-week mapping works

**Test 3: Recurring Generation**
1. Click "Generate Recurring"
2. Select template
3. Choose "Weekly" for 4 occurrences
4. Verify preview shows 4 weeks of shifts
5. Generate and verify database

---

## ✅ DEFINITION OF DONE

- [ ] shift_templates table created with RLS
- [ ] SaveTemplateModal component complete
- [ ] LoadTemplateModal component complete
- [ ] RecurringScheduleModal component complete
- [ ] Integration with Step2MultiRoleGrid complete
- [ ] All manual tests passed
- [ ] No console errors
- [ ] Completion report submitted

---

## 📝 COMPLETION REPORT TEMPLATE

**Save to:** `PROJECT_DELEGATION/COMPLETION_REPORTS/AGENT_3_COMPLETION.md`

```markdown
# AGENT 3 - PHASE 3 TEMPLATES - COMPLETION REPORT

**Status:** Complete
**Date:** [Date]
**Time Spent:** [X hours]

## Implementation Summary

[What you built]

## Files Created

- src/components/bulk-shifts/SaveTemplateModal.jsx
- src/components/bulk-shifts/LoadTemplateModal.jsx
- src/components/bulk-shifts/RecurringScheduleModal.jsx
- supabase/migrations/[timestamp]_create_shift_templates.sql

## Files Modified

- src/components/bulk-shifts/Step2MultiRoleGrid.jsx

## Testing Results

- [x] Test 1: Save template - PASSED
- [x] Test 2: Load template - PASSED
- [x] Test 3: Recurring generation - PASSED

## Known Issues

1. [Issue if any]

## Ready for Review

- [ ] All features working
- [ ] Tests passing
- [ ] No blockers
```

---

**ASSIGNED TO:** Agent 3
**DUE DATE:** Phase 3 Timeline
**PROJECT LEADER:** Lead AI Agent

Templates will save users hours every month! 📋
