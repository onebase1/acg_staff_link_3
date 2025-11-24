# Rate Flow Investigation: Contract → Shift → Timesheet → Invoice

**Date:** 2025-11-24  
**Client:** Divine Care Center  
**Contract Ref:** 4568999

---

## 📊 **Rate Flow Architecture**

### **1. Client Contract (Source)**
**Table:** `clients.contract_terms.rates_by_role`  
**Set By:** Client onboarding / contract management

```json
{
  "healthcare_assistant": { "pay_rate": 14.00, "charge_rate": 16.00 },
  "senior_care_worker": { "pay_rate": 16.50, "charge_rate": 21.45 },
  "support_worker": { "pay_rate": 15.00, "charge_rate": 17.00 },
  "nurse": { "pay_rate": 22.00, "charge_rate": 25.00 }
}
```

---

### **2. Shift Creation (Rates Copied from Contract)**
**Table:** `shifts` (columns: `pay_rate`, `charge_rate`)  
**Set By:** Shift creator (multiple UI entry points)

**Code Locations:**
- `src/components/shifts/NaturalLanguageShiftRequest.jsx` line 228-229
- `src/utils/bulkShifts/shiftGenerator.js` line 97-98
- `src/pages/PostShiftV3.jsx` line 158-159
- `src/pages/NaturalLanguageShiftCreator.jsx` line 244-245

**Logic:**
```javascript
// Fetch rate from client contract based on role
pay_rate: client.contract_terms?.rates_by_role?.[role]?.pay_rate || 0
charge_rate: client.contract_terms?.rates_by_role?.[role]?.charge_rate || 0

// Store in shifts table on creation
INSERT INTO shifts (pay_rate, charge_rate, ...) VALUES (...)
```

**Rates CAN be overridden:**
- Admin can manually edit shift rates after creation
- Used for: Special agreements, premium rates, negotiations

---

### **3. Timesheet Creation (Inherits from Shift)**
**Table:** `timesheets` (columns: `pay_rate`, `charge_rate`)  
**Set By:** Auto-timesheet-creator Edge Function OR manual creation

**Code Location:**
- `supabase/functions/auto-timesheet-creator/index.ts` line 269-288

**Logic:**
```javascript
// Copy rates from shift to timesheet
const timesheetData = {
  pay_rate: shift.pay_rate,  // ← Copied from shift
  charge_rate: shift.charge_rate,  // ← Copied from shift
  ...
}
```

**Rates CAN be overridden:**
- Admin can adjust rates at timesheet level
- Used for: Corrections, disputes, special circumstances

---

### **4. Invoice Generation (Uses Timesheet Rates)**
**Function:** `auto-invoice-generator`  
**Code Location:** `supabase/functions/auto-invoice-generator/index.ts` line 329-331

**Logic:**
```javascript
const lineItem = {
  hours: timesheet.total_hours,
  rate: timesheet.charge_rate,  // ← Uses timesheet rate
  amount: timesheet.client_charge_amount  // ← Pre-calculated
}
```

**Invoice uses:** `timesheet.charge_rate` (NOT shift.charge_rate)

---

## 🔍 **Current Invoice Analysis**

### **Invoice:** INV-TEST-20251124070245

| Date | Staff | Shift Rate | Timesheet Rate | Invoice Rate | Contract Match? |
|------|-------|------------|----------------|--------------|-----------------|
| Nov 20 | Theresa Atomi | £21.45 | £21.45 | £21.45 | ✅ Senior Care Worker |
| Nov 21 | Chadaira Basera | £19.18 | £19.18 | £19.18 | ❓ **NOT IN CONTRACT** |
| Nov 18 | Chadaira Basera | £19.18 | £19.18 | £19.18 | ❓ **NOT IN CONTRACT** |
| Nov 18 | Liam Osei | £25.00 | £25.00 | £25.00 | ✅ Nurse |
| Nov 19 | Liam Osei | £25.00 | £25.00 | £25.00 | ✅ Nurse |

---

## 🚨 **Issue Identified: Chadaira Basera £19.18**

### **Contract Rates Available:**
- Healthcare Assistant: £16.00
- Senior Care Worker: £21.45
- Support Worker: £17.00
- Nurse: £25.00

### **Current Invoice Rate:** £19.18
- ❌ NOT in contract
- ❓ Where did this come from?

### **Possible Explanations:**
1. **Manual Override:** Admin manually set custom rate on shift/timesheet
2. **Legacy Rate:** Old contract rate before update
3. **Negotiated Rate:** Special agreement for this staff member
4. **Data Entry Error:** Typo during shift creation

---

## ✅ **Verification Steps**

### **Check if rate was overridden:**
```sql
SELECT 
  sh.date,
  staff.name,
  sh.role_required,
  sh.charge_rate,
  sh.created_date,
  sh.updated_date,
  CASE 
    WHEN sh.updated_date > sh.created_date 
    THEN '⚠️ Modified after creation'
    ELSE '✅ Original'
  END as status
FROM shifts sh
WHERE sh.charge_rate = 19.18;
```

### **Check change logs:**
```sql
SELECT * FROM change_logs
WHERE entity_type = 'shift'
  AND changes::text LIKE '%charge_rate%'
  AND changes::text LIKE '%19.18%';
```

---

## 🎯 **Best Practice Recommendations**

### **1. Rate Validation on Shift Creation**
Add validation to ensure rates match contract:
```javascript
// In shift creation logic
const contractRate = client.contract_terms?.rates_by_role?.[role]?.charge_rate;
if (!contractRate) {
  throw new Error(`No contract rate found for role: ${role}`);
}
```

### **2. Audit Trail for Rate Overrides**
If admin manually changes rate:
```javascript
// Log to change_logs
{
  entity_type: 'shift',
  old_value: { charge_rate: 21.45 },
  new_value: { charge_rate: 19.18 },
  reason: 'Special agreement for this shift',
  changed_by: admin_id
}
```

### **3. Rate Mismatch Alerts**
Before invoice generation, check for rates not in contract:
```javascript
const contractRates = [16, 21.45, 17, 25];
if (!contractRates.includes(timesheet.charge_rate)) {
  console.warn(`⚠️ Non-contract rate detected: £${timesheet.charge_rate}`);
}
```

---

## 📋 **Rate Flow Summary**

```
CLIENT CONTRACT (rates_by_role)
       ↓
    (Shift Creator copies rate)
       ↓
SHIFT TABLE (pay_rate, charge_rate)
       ↓
    (Auto-timesheet-creator copies)
       ↓
TIMESHEET TABLE (pay_rate, charge_rate)
       ↓
    (Invoice generator reads)
       ↓
INVOICE (line_items with rate & amount)
```

**Override Points:**
1. ✅ During shift creation (rare - usually auto-filled)
2. ✅ After shift creation (admin edit)
3. ✅ During timesheet approval (admin adjustment)
4. ❌ Never during invoice generation (uses final timesheet rate)

---

## ✅ **Conclusion**

**Rate Flow is Working Correctly:**
- ✅ Rates copied from contract to shift
- ✅ Rates inherited from shift to timesheet
- ✅ Invoice uses final timesheet rates

**Issue Found:**
- ❓ Chadaira Basera's rate (£19.18) not in contract
- Need to investigate if this was a manual override or error

**Next Steps:**
1. Check if £19.18 was manually set
2. Verify with client if this is an approved rate
3. Add validation to prevent non-contract rates without approval
4. Add audit trail for rate changes

