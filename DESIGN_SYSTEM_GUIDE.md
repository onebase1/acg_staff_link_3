# 🎨 STAFF PORTAL DESIGN SYSTEM

## 📱 Mobile-First Design System for ACG StaffLink

This design system provides **consistent, professional, touch-friendly** components for the Staff Portal mobile app.

---

## 🎯 DESIGN PRINCIPLES

1. **Mobile-First** - Designed for mobile, scales to desktop
2. **Touch-Friendly** - Minimum 44px touch targets
3. **Consistent** - Unified colors, typography, spacing
4. **Accessible** - High contrast, clear labels, semantic HTML
5. **Professional** - Clean, modern, trustworthy design

---

## 🎨 COLOR PALETTE

### **Primary Colors**
```javascript
Primary:   #0EA5E9  (Cyan-500)   - Main brand color
Secondary: #8B5CF6  (Purple-500) - Accent color
```

### **Status Colors**
```javascript
Success:   #10B981  (Green-500)  - ✅ Confirmed, completed
Warning:   #F59E0B  (Amber-500)  - ⚠️ Important, pending
Error:     #EF4444  (Red-500)    - 🚨 Critical, urgent
Info:      #3B82F6  (Blue-500)   - ℹ️ Information
```

### **Semantic Colors**
```javascript
Earnings:  #10B981  (Green)  - 💰 Money, earnings
Shifts:    #3B82F6  (Blue)   - 📅 Shifts, schedule
Urgent:    #EF4444  (Red)    - 🚨 Urgent actions
Pending:   #F59E0B  (Amber)  - ⏳ Awaiting action
```

### **Text Colors**
```javascript
Primary:   #111827  (Gray-900) - Main text
Secondary: #6B7280  (Gray-500) - Secondary text
Disabled:  #9CA3AF  (Gray-400) - Disabled text
Inverse:   #FFFFFF  (White)    - Text on dark backgrounds
```

---

## 📝 TYPOGRAPHY

### **Font Sizes (Mobile-First)**

| Element | Mobile | Desktop | Usage |
|---------|--------|---------|-------|
| Display | 32px | 48px | Hero text |
| H1 | 24px | 32px | Page titles |
| H2 | 20px | 24px | Section headers |
| H3 | 18px | 20px | Card titles |
| Body Large | 16px | 16px | Important text |
| Body Base | 14px | 14px | Standard text |
| Body Small | 12px | 12px | Secondary text |
| Caption | 10px | 10px | Tiny labels |

### **Font Weights**
```javascript
Light:     300  - Rarely used
Regular:   400  - Body text
Medium:    500  - Emphasized text
Semibold:  600  - Headings
Bold:      700  - Strong emphasis
Extrabold: 800  - Display text
```

---

## 📏 SPACING SYSTEM (8px base)

```javascript
0:  0px
1:  4px   - Tiny gaps
2:  8px   - Small gaps
3:  12px  - Medium gaps
4:  16px  - Standard gaps
5:  20px  - Large gaps
6:  24px  - Section spacing
8:  32px  - Major sections
10: 40px  - Page sections
12: 48px  - Hero spacing
```

---

## 🔘 COMPONENT SIZES

### **Buttons**

| Size | Height | Padding | Usage |
|------|--------|---------|-------|
| Small | 32px | 8px 16px | Inline actions |
| Medium | 44px | 12px 24px | Standard buttons (touch-friendly) |
| Large | 56px | 16px 32px | Primary CTAs |

### **Inputs**

| Size | Height | Padding | Usage |
|------|--------|---------|-------|
| Small | 32px | 8px 12px | Compact forms |
| Medium | 44px | 12px 16px | Standard inputs (touch-friendly) |
| Large | 56px | 16px 20px | Prominent inputs |

### **Badges**

| Size | Height | Padding | Usage |
|------|--------|---------|-------|
| Small | 20px | 2px 8px | Inline status |
| Medium | 24px | 4px 12px | Standard badges |
| Large | 32px | 8px 16px | Prominent status |

### **Icons**

| Size | Dimension | Usage |
|------|-----------|-------|
| Tiny | 12px | Inline icons |
| Small | 16px | Button icons |
| Medium | 20px | List icons |
| Large | 24px | Card icons |
| XL | 32px | Feature icons |
| XXL | 48px | Hero icons |

---

## 🎯 COMPONENT LIBRARY

### **1. DSButton**
```jsx
import { DSButton } from '@/components/ui/DesignSystemComponents';

// Primary button (default)
<DSButton variant="primary" size="medium">
  Complete Profile
</DSButton>

// Secondary button
<DSButton variant="secondary" size="medium">
  Upload Docs
</DSButton>

// Success button
<DSButton variant="success" size="large" fullWidth>
  Confirm Shift
</DSButton>

// With icon
<DSButton variant="primary" icon={<span>📄</span>}>
  View Documents
</DSButton>
```

**Variants:** `primary`, `secondary`, `success`, `warning`, `outline`  
**Sizes:** `small`, `medium`, `large`  
**Props:** `fullWidth`, `icon`, `disabled`

---

### **2. DSBadge**
```jsx
import { DSBadge } from '@/components/ui/DesignSystemComponents';

// Critical status
<DSBadge variant="critical" size="medium">
  Critical
</DSBadge>

// Important status
<DSBadge variant="important" size="medium">
  Important
</DSBadge>

// Success status
<DSBadge variant="success" size="small">
  Complete
</DSBadge>
```

**Variants:** `critical`, `important`, `success`, `info`  
**Sizes:** `small`, `medium`, `large`

---

### **3. DSCard**
```jsx
import { DSCard } from '@/components/ui/DesignSystemComponents';

// Default card
<DSCard variant="default" padding="medium">
  Card content
</DSCard>

// Elevated card (with shadow)
<DSCard variant="elevated" padding="large">
  Important content
</DSCard>

// Clickable card
<DSCard variant="default" onClick={() => navigate('/details')}>
  Click me
</DSCard>
```

**Variants:** `default`, `elevated`, `flat`  
**Padding:** `small`, `medium`, `large`  
**Props:** `onClick` (makes it clickable)

---

### **4. DSInput**
```jsx
import { DSInput } from '@/components/ui/DesignSystemComponents';

// Standard input
<DSInput 
  size="medium" 
  placeholder="Enter your name"
  fullWidth
/>

// Error state
<DSInput 
  size="medium" 
  error={true}
  placeholder="Invalid email"
/>
```

**Sizes:** `small`, `medium`, `large`  
**Props:** `fullWidth`, `error`, `disabled`

---

### **5. DSComplianceItem**
```jsx
import { DSComplianceItem } from '@/components/ui/DesignSystemComponents';

<DSComplianceItem
  icon="🛡️"
  label="DBS Certificate"
  status="critical"
  onClick={() => navigate('/dbs')}
/>

<DSComplianceItem
  icon="📋"
  label="Mandatory Training"
  status="important"
  count="5/10 - 5 missing"
/>
```

**Status:** `critical`, `important`, `success`
**Props:** `icon`, `label`, `status`, `count`, `onClick`

---

### **6. DSEarningsCard**
```jsx
import { DSEarningsCard } from '@/components/ui/DesignSystemComponents';

// This week earnings (green)
<DSEarningsCard
  title="This Week"
  amount="£0.00"
  subtitle="0 shifts"
  variant="success"
/>

// Total earnings (blue)
<DSEarningsCard
  title="Total Earned"
  amount="£0.00"
  subtitle="All Time"
  variant="info"
/>
```

**Variants:** `success` (green), `info` (blue)
**Props:** `title`, `amount`, `subtitle`, `variant`

---

### **7. DSShiftCard**
```jsx
import { DSShiftCard } from '@/components/ui/DesignSystemComponents';

<DSShiftCard
  client="Sunrise Care Home"
  date="Mon, 15 Nov 2025"
  time="08:00 - 20:00"
  role="Healthcare Assistant"
  status="confirmed"
  earnings="£120.00"
  onClick={() => navigate('/shift/123')}
/>
```

**Status:** `confirmed`, `pending`, `completed`
**Props:** `client`, `date`, `time`, `role`, `status`, `earnings`, `onClick`

---

### **8. DSSectionHeader**
```jsx
import { DSSectionHeader } from '@/components/ui/DesignSystemComponents';

<DSSectionHeader
  title="Confirmed Upcoming Shifts"
  subtitle="Shifts you've confirmed attendance for"
  icon="📅"
  action={
    <button className="text-cyan-500 text-sm">View All</button>
  }
/>
```

**Props:** `title`, `subtitle`, `icon`, `action`

---

### **9. DSMobileHeader**
```jsx
import { DSMobileHeader } from '@/components/ui/DesignSystemComponents';

<DSMobileHeader
  title="StaffPortal"
  subtitle="Dominion Healthcare Services Ltd"
  avatar={<img src="/avatar.jpg" alt="User" />}
  notifications={3}
  onNotificationClick={() => navigate('/notifications')}
/>
```

**Props:** `title`, `subtitle`, `avatar`, `notifications`, `onNotificationClick`

---

### **10. DSNotificationBadge**
```jsx
import { DSNotificationBadge } from '@/components/ui/DesignSystemComponents';

<div className="relative">
  <span>🔔</span>
  <DSNotificationBadge count={5} />
</div>
```

**Props:** `count` (shows "99+" if count > 99)

---

## 🎨 USAGE EXAMPLES

### **Example 1: Compliance Dashboard**
```jsx
import {
  DSMobileHeader,
  DSComplianceItem,
  DSButton
} from '@/components/ui/DesignSystemComponents';

function ComplianceDashboard() {
  return (
    <div className="min-h-screen bg-gray-50">
      <DSMobileHeader
        title="StaffPortal"
        subtitle="Dominion Healthcare Services Ltd"
        notifications={3}
      />

      <div className="p-4 space-y-3">
        <DSComplianceItem
          icon="🛡️"
          label="DBS Certificate"
          status="critical"
          onClick={() => navigate('/dbs')}
        />

        <DSComplianceItem
          icon="📄"
          label="Right to Work"
          status="critical"
          onClick={() => navigate('/rtw')}
        />

        <DSComplianceItem
          icon="✍️"
          label="References (min 2)"
          status="critical"
          onClick={() => navigate('/references')}
        />

        <div className="flex gap-3 mt-6">
          <DSButton variant="primary" size="large" fullWidth>
            Complete Profile
          </DSButton>
          <DSButton variant="outline" size="large" fullWidth>
            Upload Docs
          </DSButton>
        </div>
      </div>
    </div>
  );
}
```

---

### **Example 2: Earnings Dashboard**
```jsx
import {
  DSSectionHeader,
  DSEarningsCard,
  DSShiftCard
} from '@/components/ui/DesignSystemComponents';

function EarningsDashboard() {
  return (
    <div className="p-4 space-y-6">
      {/* Earnings Summary */}
      <div className="grid grid-cols-2 gap-3">
        <DSEarningsCard
          title="This Week"
          amount="£240.00"
          subtitle="2 shifts"
          variant="success"
        />
        <DSEarningsCard
          title="Total Earned"
          amount="£1,450.00"
          subtitle="All Time"
          variant="info"
        />
      </div>

      {/* Upcoming Shifts */}
      <div>
        <DSSectionHeader
          title="Confirmed Upcoming Shifts"
          icon="📅"
        />

        <div className="space-y-3">
          <DSShiftCard
            client="Sunrise Care Home"
            date="Mon, 15 Nov 2025"
            time="08:00 - 20:00"
            role="Healthcare Assistant"
            status="confirmed"
            earnings="£120.00"
          />

          <DSShiftCard
            client="Meadow View Nursing Home"
            date="Wed, 17 Nov 2025"
            time="20:00 - 08:00"
            role="Night Nurse"
            status="confirmed"
            earnings="£150.00"
          />
        </div>
      </div>
    </div>
  );
}
```

---

## 📱 MOBILE-FIRST BEST PRACTICES

### **1. Touch Targets**
✅ **DO:** Use minimum 44px height for all interactive elements
```jsx
<DSButton size="medium">  {/* 44px height */}
  Tap Me
</DSButton>
```

❌ **DON'T:** Use small buttons on mobile
```jsx
<button className="h-6 px-2">  {/* Too small! */}
  Tap Me
</button>
```

---

### **2. Full Width on Mobile**
✅ **DO:** Use full-width buttons on mobile
```jsx
<DSButton size="large" fullWidth>
  Complete Profile
</DSButton>
```

❌ **DON'T:** Use narrow buttons that are hard to tap
```jsx
<button className="px-4">  {/* Too narrow! */}
  Complete Profile
</button>
```

---

### **3. Proper Spacing**
✅ **DO:** Use adequate spacing between elements
```jsx
<div className="space-y-3">  {/* 12px gaps */}
  <DSComplianceItem ... />
  <DSComplianceItem ... />
</div>
```

❌ **DON'T:** Cram elements together
```jsx
<div className="space-y-1">  {/* Too tight! */}
  <DSComplianceItem ... />
  <DSComplianceItem ... />
</div>
```

---

### **4. Readable Text**
✅ **DO:** Use appropriate font sizes
```jsx
<p className="text-sm">  {/* 14px - readable */}
  This is body text
</p>
```

❌ **DON'T:** Use tiny text
```jsx
<p className="text-[10px]">  {/* Too small! */}
  This is body text
</p>
```

---

## 🎯 DESIGN TOKENS REFERENCE

### **Quick Access**
```javascript
import {
  colors,
  typography,
  spacing,
  components,
  shadows,
  tokens,
  utilities
} from '@/styles/staffPortalDesignSystem';

// Use in components
<div style={{ color: colors.primary.main }}>
  Primary color text
</div>

<div className={utilities.flexBetween}>
  Flex layout
</div>
```

---

## 📊 COMPONENT CHECKLIST

When creating new components, ensure:

- [ ] **Touch-friendly** - Minimum 44px touch targets
- [ ] **Responsive** - Works on mobile and desktop
- [ ] **Consistent colors** - Uses design system colors
- [ ] **Proper spacing** - Uses 8px spacing system
- [ ] **Accessible** - High contrast, semantic HTML
- [ ] **Reusable** - Can be used in multiple contexts
- [ ] **Well-documented** - Clear props and examples

---

## 🚀 GETTING STARTED

### **1. Import Design System**
```javascript
import {
  DSButton,
  DSBadge,
  DSCard
} from '@/components/ui/DesignSystemComponents';
```

### **2. Use Components**
```jsx
<DSCard variant="default" padding="medium">
  <DSBadge variant="critical">Critical</DSBadge>
  <DSButton variant="primary" size="large" fullWidth>
    Take Action
  </DSButton>
</DSCard>
```

### **3. Customize with Tokens**
```javascript
import { colors, spacing } from '@/styles/staffPortalDesignSystem';

<div style={{
  backgroundColor: colors.primary.main,
  padding: spacing[4]
}}>
  Custom styled element
</div>
```

---

## 📚 FILES REFERENCE

| File | Purpose |
|------|---------|
| `src/styles/staffPortalDesignSystem.js` | Design tokens (colors, typography, spacing) |
| `src/components/ui/DesignSystemComponents.jsx` | Reusable components |
| `DESIGN_SYSTEM_GUIDE.md` | This documentation |

---

**🎉 You now have a complete, professional design system for the Staff Portal!**

Use these components to build consistent, mobile-friendly interfaces that look professional and work great on all devices. 📱✨

