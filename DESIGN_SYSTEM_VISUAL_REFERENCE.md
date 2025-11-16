# 🎨 DESIGN SYSTEM VISUAL REFERENCE

## 📱 Staff Portal Mobile Design System - Visual Guide

This document shows **exactly** how the design system matches your screenshot and provides visual examples.

---

## 🎯 YOUR SCREENSHOT ANALYSIS

Based on your screenshot, here's what I've identified:

### **✅ Colors Used**
```
Primary Brand:    #0EA5E9 (Cyan-500)     - Buttons, accents
Critical Status:  #EF4444 (Red-500)      - "Critical" badges
Important Status: #F59E0B (Amber-500)    - "Important" badges
Success/Earnings: #10B981 (Green-500)    - "This Week" card
Info/Total:       #3B82F6 (Blue-500)     - "Total Earned" card
Background:       #F9FAFB (Gray-50)      - Page background
Card Background:  #FFFFFF (White)        - Card backgrounds
Text Primary:     #111827 (Gray-900)     - Main text
Text Secondary:   #6B7280 (Gray-500)     - Subtitle text
```

### **✅ Typography**
```
Header Title:     20px, Bold           - "StaffPortal"
Header Subtitle:  14px, Regular        - "Dominion Healthcare..."
Card Label:       16px, Medium          - "DBS Certificate"
Badge Text:       14px, Semibold        - "Critical", "Important"
Button Text:      16px, Medium          - "Complete Profile"
Earnings Amount:  32px, Bold            - "£0.00"
Earnings Label:   12px, Medium          - "This Week"
Section Title:    16px, Bold            - "Confirmed Upcoming Shifts"
```

### **✅ Spacing**
```
Page Padding:     16px (spacing[4])
Card Gaps:        12px (spacing[3])
Card Padding:     16px (spacing[4])
Button Height:    56px (components.button.large)
Badge Height:     24px (components.badge.medium)
Icon Size:        24px (components.icon.large)
```

---

## 🎨 COLOR PALETTE VISUAL

### **Status Colors**
```
🚨 CRITICAL (Red)
┌─────────────────────────────────────┐
│ ⚠️ DBS Certificate        [Critical]│  ← #EF4444 (Red-500)
└─────────────────────────────────────┘

⚠️ IMPORTANT (Amber)
┌─────────────────────────────────────┐
│ 📋 Mandatory Training   [Important] │  ← #F59E0B (Amber-500)
└─────────────────────────────────────┘

✅ SUCCESS (Green)
┌─────────────────────────────────────┐
│ ✓ All Documents        [Complete]   │  ← #10B981 (Green-500)
└─────────────────────────────────────┘
```

### **Earnings Colors**
```
💰 THIS WEEK (Green)
┌─────────────────────────────────────┐
│ This Week                           │
│ £240.00                             │  ← #10B981 (Green)
│ 2 shifts                            │
└─────────────────────────────────────┘

📊 TOTAL EARNED (Blue)
┌─────────────────────────────────────┐
│ Total Earned                        │
│ £1,450.00                           │  ← #3B82F6 (Blue)
│ All Time                            │
└─────────────────────────────────────┘
```

---

## 🔘 BUTTON STYLES

### **Primary Button (Cyan)**
```
┌─────────────────────────────────────┐
│        Complete Profile             │  ← #0EA5E9 (Cyan-500)
└─────────────────────────────────────┘
Height: 56px (touch-friendly)
Text: 16px, Medium, White
Padding: 16px 32px
Border Radius: 8px
```

### **Outline Button (White)**
```
┌─────────────────────────────────────┐
│        Upload Docs                  │  ← Border: #D1D5DB
└─────────────────────────────────────┘
Height: 56px (touch-friendly)
Text: 16px, Medium, Gray-900
Border: 1px solid Gray-300
Background: White
```

---

## 🏷️ BADGE STYLES

### **Critical Badge**
```
┌──────────┐
│ Critical │  ← Background: #EF4444 (Red-500)
└──────────┘    Text: White, 14px, Semibold
                Height: 24px
                Padding: 4px 12px
                Border Radius: 9999px (fully rounded)
```

### **Important Badge**
```
┌───────────┐
│ Important │  ← Background: #F59E0B (Amber-500)
└───────────┘    Text: White, 14px, Semibold
                 Height: 24px
                 Padding: 4px 12px
                 Border Radius: 9999px (fully rounded)
```

---

## 📦 CARD STYLES

### **Compliance Item Card**
```
┌─────────────────────────────────────┐
│ 🛡️  DBS Certificate      [Critical] │
│                                     │
└─────────────────────────────────────┘

Background: White
Border: 1px solid #E5E7EB (Gray-200)
Border Radius: 8px
Padding: 16px
Shadow: 0 1px 3px rgba(0,0,0,0.1)
Hover: Border changes to #0EA5E9 (Cyan-500)
```

### **Earnings Card**
```
┌─────────────────────────────────────┐
│ This Week                           │
│ £240.00                             │
│ 2 shifts                            │
└─────────────────────────────────────┘

Background: #F0FDF4 (Green-50)
Border: None
Border Radius: 8px
Padding: 16px
Shadow: None
```

---

## 📱 MOBILE HEADER

```
┌─────────────────────────────────────┐
│ StaffPortal              🔔  [👤]   │
│ Dominion Healthcare Services Ltd    │
└─────────────────────────────────────┘

Title: 20px, Bold, Gray-900
Subtitle: 14px, Regular, Gray-600
Background: White
Border Bottom: 1px solid Gray-200
Padding: 16px
Height: Auto (content-based)

Notification Bell: 24px icon
Notification Badge: Red circle with count
Avatar: 40px circle with border
```

---

## 📏 SPACING EXAMPLES

### **Card Spacing**
```
┌─────────────────────────────────────┐
│ [Card 1]                            │  ← 16px padding
└─────────────────────────────────────┘
         ↕ 12px gap
┌─────────────────────────────────────┐
│ [Card 2]                            │  ← 16px padding
└─────────────────────────────────────┘
         ↕ 12px gap
┌─────────────────────────────────────┐
│ [Card 3]                            │  ← 16px padding
└─────────────────────────────────────┘
```

### **Button Spacing**
```
┌─────────────────────────────────────┐
│        Complete Profile             │  ← 16px padding
└─────────────────────────────────────┘
         ↕ 12px gap
┌─────────────────────────────────────┐
│        Upload Docs                  │  ← 16px padding
└─────────────────────────────────────┘
```

---

## 🎯 COMPONENT MAPPING

### **Your Screenshot → Design System Components**

| Screenshot Element | Component | Props |
|-------------------|-----------|-------|
| "StaffPortal" header | `DSMobileHeader` | `title`, `subtitle`, `notifications`, `avatar` |
| "DBS Certificate" card | `DSComplianceItem` | `icon="🛡️"`, `label`, `status="critical"` |
| "Critical" badge | `DSBadge` | `variant="critical"`, `size="medium"` |
| "Complete Profile" button | `DSButton` | `variant="primary"`, `size="large"`, `fullWidth` |
| "This Week £0.00" card | `DSEarningsCard` | `title`, `amount`, `subtitle`, `variant="success"` |
| "Filter Shifts" section | `DSSectionHeader` | `title`, `icon` |

---

## 📱 EXACT RECREATION CODE

Here's how to recreate your screenshot using the design system:

```jsx
import {
  DSMobileHeader,
  DSComplianceItem,
  DSButton,
  DSEarningsCard,
  DSSectionHeader,
} from '@/components/ui/DesignSystemComponents';

function StaffPortalHome() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <DSMobileHeader
        title="StaffPortal"
        subtitle="Dominion Healthcare Services Ltd"
        notifications={24}
        avatar={<img src="/avatar.jpg" alt="User" className="w-full h-full object-cover" />}
      />
      
      {/* Main Content */}
      <div className="p-4 space-y-3">
        {/* Compliance Items */}
        <DSComplianceItem
          icon="🛡️"
          label="DBS Certificate"
          status="critical"
        />
        
        <DSComplianceItem
          icon="📄"
          label="Right to Work"
          status="critical"
        />
        
        <DSComplianceItem
          icon="✍️"
          label="References (min 2)"
          status="critical"
        />
        
        <DSComplianceItem
          icon="💼"
          label="Employment History"
          status="important"
        />
        
        <DSComplianceItem
          icon="📚"
          label="Mandatory Training (5/10 - 5 missing)"
          status="important"
        />
        
        {/* Action Buttons */}
        <div className="flex gap-3 mt-6">
          <DSButton variant="primary" size="large" fullWidth>
            Complete Profile
          </DSButton>
          <DSButton variant="outline" size="large" fullWidth>
            Upload Docs
          </DSButton>
        </div>
        
        {/* Earnings Cards */}
        <div className="grid grid-cols-2 gap-3 mt-6">
          <DSEarningsCard
            title="This Week"
            amount="£0.00"
            subtitle="0 shifts"
            variant="success"
          />
          <DSEarningsCard
            title="Total Earned"
            amount="£0.00"
            subtitle="All Time"
            variant="info"
          />
        </div>
        
        {/* Filter Section */}
        <div className="mt-6">
          <DSSectionHeader
            title="Filter Shifts"
            icon="🔍"
          />
        </div>
        
        {/* Upcoming Shifts Section */}
        <div className="mt-6">
          <DSSectionHeader
            title="Confirmed Upcoming Shifts"
            subtitle="Shifts you've confirmed attendance for"
          />
          <div className="text-center text-gray-500 py-8">
            No confirmed shifts yet
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## 🎨 DESIGN CONSISTENCY CHECKLIST

When building new screens, ensure:

### **✅ Colors**
- [ ] Use `colors.primary.main` (#0EA5E9) for primary actions
- [ ] Use `colors.status.error` (#EF4444) for critical items
- [ ] Use `colors.status.warning` (#F59E0B) for important items
- [ ] Use `colors.status.success` (#10B981) for success/earnings
- [ ] Use `colors.text.primary` (#111827) for main text
- [ ] Use `colors.text.secondary` (#6B7280) for secondary text

### **✅ Typography**
- [ ] Page titles: 20px, Bold
- [ ] Section headers: 16px, Bold
- [ ] Body text: 14px, Regular
- [ ] Small text: 12px, Regular
- [ ] Button text: 16px, Medium

### **✅ Spacing**
- [ ] Page padding: 16px
- [ ] Card gaps: 12px
- [ ] Card padding: 16px
- [ ] Section gaps: 24px

### **✅ Components**
- [ ] Buttons: 56px height (touch-friendly)
- [ ] Inputs: 44px height (touch-friendly)
- [ ] Badges: 24px height
- [ ] Icons: 24px size
- [ ] Cards: 8px border radius

---

**🎉 Your design system is now fully documented and ready to use!**

Every component matches your screenshot and follows professional design principles. Use this guide to build consistent, beautiful interfaces! 📱✨

