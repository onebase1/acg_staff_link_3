
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Rocket, CheckCircle, TrendingUp, Zap, Users, MapPin, Clock,
  Shield, FileText, DollarSign, Copy, Sparkles, Calendar, Bell,
  Mail, Download, Phone, AlertCircle // Added new icons
} from "lucide-react";
import { toast } from "sonner";

export default function DominionPresentation() {
  const [copiedSection, setCopiedSection] = useState(null);

  const copyToClipboard = (text, sectionName) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionName);
    toast.success(`${sectionName} copied to clipboard!`);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  // ✅ NEW: Disaster Recovery Slide (Slide 9) - defined as a React component
  const DisasterRecoverySlideComponent = () => (
    <div className="p-12 bg-gradient-to-br from-red-50 to-orange-50">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Shield className="w-12 h-12 text-red-600" />
          <h1 className="text-5xl font-bold text-gray-900">Your Data is Safe</h1>
        </div>
        
        <p className="text-xl text-gray-700 mb-8">
          Moving from manual to digital? We understand your concerns. Here's how we protect your business.
        </p>

        {/* Safety Layers */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card className="border-2 border-green-300 bg-white">
            <CardContent className="p-6">
              <CheckCircle className="w-10 h-10 text-green-600 mb-4" />
              <h3 className="text-2xl font-bold mb-3">Platform Reliability</h3>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span><strong>99.9% Uptime:</strong> Less than 9 hours downtime per year</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span><strong>Multi-Region Backup:</strong> Data replicated UK + EU</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span><strong>Daily Backups:</strong> 30-day recovery window</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span><strong>Zero-Downtime Updates:</strong> Never interrupted</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-2 border-blue-300 bg-white">
            <CardContent className="p-6">
              <Mail className="w-10 h-10 text-blue-600 mb-4" />
              <h3 className="text-2xl font-bold mb-3">Email Audit Trail</h3>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start gap-2">
                  <Mail className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span><strong>Every Action Emailed:</strong> Staff, client, and you get copies</span>
                </li>
                <li className="flex items-start gap-2">
                  <Mail className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span><strong>Timestamped:</strong> Legally binding evidence</span>
                </li>
                <li className="flex items-start gap-2">
                  <Mail className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span><strong>Permanent:</strong> Your inbox is your backup</span>
                </li>
                <li className="flex items-start gap-2">
                  <Mail className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span><strong>Independent:</strong> Works even if system is down</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-2 border-purple-300 bg-white">
            <CardContent className="p-6">
              <Download className="w-10 h-10 text-purple-600 mb-4" />
              <h3 className="text-2xl font-bold mb-3">Data Export (Yours Forever)</h3>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start gap-2">
                  <Download className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                  <span><strong>One-Click CSV Export:</strong> Staff, shifts, timesheets, clients</span>
                </li>
                <li className="flex items-start gap-2">
                  <Download className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                  <span><strong>Your Data, Your Control:</strong> Never locked in</span>
                </li>
                <li className="flex items-start gap-2">
                  <Download className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                  <span><strong>Quarterly Backups:</strong> Save to USB/Google Drive</span>
                </li>
                <li className="flex items-start gap-2">
                  <Download className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                  <span><strong>Excel-Ready:</strong> Open in Excel/Google Sheets</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-2 border-orange-300 bg-white">
            <CardContent className="p-6">
              <Phone className="w-10 h-10 text-orange-600 mb-4" />
              <h3 className="text-2xl font-bold mb-3">Manual Fallback Plan</h3>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start gap-2">
                  <Phone className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                  <span><strong>Phone/SMS Always Works:</strong> Staff have confirmation emails</span>
                </li>
                <li className="flex items-start gap-2">
                  <Phone className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                  <span><strong>Care Home Logbooks:</strong> Independent paper trail</span>
                </li>
                <li className="flex items-start gap-2">
                  <Phone className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                  <span><strong>Mobile Access:</strong> Access from any device</span>
                </li>
                <li className="flex items-start gap-2">
                  <Phone className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                  <span><strong>1-Page BCP Checklist:</strong> Print and keep at desk</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Quick Stats */}
        <div className="bg-white rounded-2xl p-8 border-4 border-gray-200 mb-8">
          <h3 className="text-2xl font-bold mb-6 text-center">Comparison: Manual vs. Digital Resilience</h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-5xl font-bold text-red-600 mb-2">95%</div>
              <p className="text-gray-700">Paper records lost in office fires/floods</p>
              <p className="text-sm text-red-600 mt-2">(Source: FEMA disaster statistics)</p>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold text-green-600 mb-2">99.9%</div>
              <p className="text-gray-700">Cloud data survives disasters</p>
              <p className="text-sm text-green-600 mt-2">(AWS Frankfurt + London centers)</p>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold text-blue-600 mb-2">3 Copies</div>
              <p className="text-700">Every record (System, Email, Care Home)</p>
              <p className="text-sm text-blue-600 mt-2">(Triple redundancy protection)</p>
            </div>
          </div>
        </div>

        {/* Real Scenario */}
        <Card className="border-4 border-amber-300 bg-amber-50">
          <CardContent className="p-8">
            <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <AlertCircle className="w-8 h-8 text-amber-600" />
              Real Scenario: Office Flood at 3am
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-bold text-lg mb-3 text-red-700">❌ Manual System (Paper)</h4>
                <ul className="space-y-2 text-gray-700 text-sm">
                  <li>• Staff rosters destroyed</li>
                  <li>• Client contracts waterlogged</li>
                  <li>• Timesheet copies ruined</li>
                  <li>• 6 months invoicing records lost</li>
                  <li>• <strong>Business stops for 2 weeks</strong></li>
                  <li>• Lost revenue: £15,000+</li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold text-lg mb-3 text-green-700">✅ ACG Staff Link (Cloud)</h4>
                <ul className="space-y-2 text-gray-700 text-sm">
                  <li>• Log in from home at 8am</li>
                  <li>• All shifts visible on screen</li>
                  <li>• Staff already have confirmation emails</li>
                  <li>• Call staff from home: "Shifts still on!"</li>
                  <li>• <strong>Zero business interruption</strong></li>
                  <li>• Lost revenue: £0</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="text-center mt-8">
          <p className="text-2xl font-bold text-gray-800 mb-2">
            Digital is SAFER than paper
          </p>
          <p className="text-gray-600">
            Your biggest risk is staying manual, not going digital.
          </p>
        </div>
      </div>
    </div>
  );

  // Refactored presentationData into an array of slide objects
  const slidesData = [
    {
      id: 'welcomeSlide',
      title: "Slide 1: Welcome",
      icon: Rocket,
      content: `SLIDE 1: WELCOME TO ACG STAFFLINK

DOMINION HEALTHCARE - YOUR NEW OPERATIONS PLATFORM

What This Means For You:
• Say goodbye to Excel spreadsheets
• Say goodbye to manual timesheet calculations
• Say goodbye to invoice disputes
• Say goodbye to 40 hours/week of admin work

What You Get Today:
✅ Real-time shift management
✅ GPS-verified staff attendance
✅ Automated invoice generation
✅ Instant staff notifications
✅ Compliance tracking (CQC-ready)
✅ Financial fraud prevention
✅ Mobile-first design (works anywhere)

Your Investment: £0 (Pilot Program)
Your Time Savings: 32 hours/week
Your ROI: £110,000+/year in savings

Let's transform how you run your agency.`,
      copyText: `SLIDE 1: WELCOME TO ACG STAFFLINK

DOMINION HEALTHCARE - YOUR NEW OPERATIONS PLATFORM

What This Means For You:
• Say goodbye to Excel spreadsheets
• Say goodbye to manual timesheet calculations
• Say goodbye to invoice disputes
• Say goodbye to 40 hours/week of admin work

What You Get Today:
✅ Real-time shift management
✅ GPS-verified staff attendance
✅ Automated invoice generation
✅ Instant staff notifications
✅ Compliance tracking (CQC-ready)
✅ Financial fraud prevention
✅ Mobile-first design (works anywhere)

Your Investment: £0 (Pilot Program)
Your Time Savings: 32 hours/week
Your ROI: £110,000+/year in savings

Let's transform how you run your agency.`
    },
    {
      id: 'yourPainPoints',
      title: "Slide 2: Your Current Pain Points",
      icon: TrendingUp,
      content: `SLIDE 2: YOUR CURRENT PAIN POINTS (We Know Them Well)

THE EXCEL NIGHTMARE:
❌ 8 hours/week manually entering shift data from WhatsApp
❌ Copy-paste errors causing invoice mistakes
❌ No way to see real-time shift status
❌ Searching through hundreds of WhatsApp messages to find info
❌ Staff calling: "When's my next shift?" (30 calls/week)
❌ Care homes emailing: "Where's the invoice?" (10 emails/week)

THE COMPLIANCE CRISIS:
❌ DBS certificates expiring without warning
❌ Manually checking 50+ documents every month
❌ CQC inspection stress (hoping nothing is missed)
❌ Staff working with expired credentials (legal risk)

THE PAYMENT DELAYS:
❌ Invoices sent 7-10 days after shift completion
❌ Care homes disputing hours/locations (delays payment)
❌ Chasing payments via phone/email (wastes time)
❌ Cash flow problems (staff paid before clients pay you)

THE STAFFING CHAOS:
❌ Urgent shifts posted at 6am via WhatsApp group
❌ 20+ "Can you work today?" calls (most say no)
❌ Staff ghosting (accepted shift, didn't show up)
❌ No backup plan when staff cancels last minute

TOTAL COST: 40+ hours/week of admin work = £30,000+/year`,
      copyText: `SLIDE 2: YOUR CURRENT PAIN POINTS (We Know Them Well)

THE EXCEL NIGHTMARE:
❌ 8 hours/week manually entering shift data from WhatsApp
❌ Copy-paste errors causing invoice mistakes
❌ No way to see real-time shift status
❌ Searching through hundreds of WhatsApp messages to find info
❌ Staff calling: "When's my next shift?" (30 calls/week)
❌ Care homes emailing: "Where's the invoice?" (10 emails/week)

THE COMPLIANCE CRISIS:
❌ DBS certificates expiring without warning
❌ Manually checking 50+ documents every month
❌ CQC inspection stress (hoping nothing is missed)
❌ Staff working with expired credentials (legal risk)

THE PAYMENT DELAYS:
❌ Invoices sent 7-10 days after shift completion
❌ Care homes disputing hours/locations (delays payment)
❌ Chasing payments via phone/email (wastes time)
❌ Cash flow problems (staff paid before clients pay you)

THE STAFFING CHAOS:
❌ Urgent shifts posted at 6am via WhatsApp group
❌ 20+ "Can you work today?" calls (most say no)
❌ Staff ghosting (accepted shift, didn't show up)
❌ No backup plan when staff cancels last minute

TOTAL COST: 40+ hours/week of admin work = £30,000+/year`
    },
    {
      id: 'theACGSolution',
      title: "Slide 3: The ACG StaffLink Solution",
      icon: Zap,
      content: `SLIDE 3: THE ACG STAFFLINK SOLUTION

HOW WE ELIMINATE EVERY PAIN POINT:

1. SHIFT MANAGEMENT (Shift Calendar + Quick Actions)
Before: 8 hours/week in Excel
After: 15 minutes/week in ACG StaffLink
✓ Visual calendar shows all shifts at a glance
✓ Drag-and-drop to assign staff
✓ Filters: View by client, date, status, role
✓ Bulk create shifts from CSV or natural language
✓ Staff receive instant notifications (SMS/Email)
SAVINGS: 7.75 hours/week = £10,000/year

2. GPS-VERIFIED TIMESHEETS (Mobile Clock-In)
Before: Care homes dispute hours/locations (delays payment)
After: GPS proves staff was there, when they say
✓ Staff clock in via mobile app (requires GPS)
✓ System validates: Within 100m of care home? ✅
✓ Clock-in/out times recorded automatically
✓ Location appears on invoice ("Room 14, Divine Care")
✓ Care homes can't dispute (GPS proof)
SAVINGS: £8,000/year (fewer payment disputes)

3. AUTOMATED INVOICING (Generate Invoices Page)
Before: 6 hours/week creating invoices in Excel
After: 15 minutes/week (system does 90% automatically)
✓ Select client + date range → Generate invoice
✓ System pulls all approved timesheets
✓ Professional PDF matches your current format
✓ Email sent automatically to care home billing
✓ Payment tracking (sent, viewed, paid)
SAVINGS: 5.75 hours/week = £7,500/year

4. COMPLIANCE TRACKING (Compliance Tracker)
Before: Manual spreadsheet checks every month
After: Automated reminders + risk scoring
✓ Upload staff DBS, Right to Work, training certificates
✓ System extracts expiry dates via AI
✓ Auto-emails staff at 30, 14, 7 days before expiry
✓ Auto-suspends staff with expired critical docs
✓ Admin dashboard shows % compliance per staff
SAVINGS: 4 hours/week = £5,000/year + zero CQC penalties

5. REAL-TIME NOTIFICATIONS (Notification Bell)
Before: 30+ phone calls/week ("When's my shift?")
After: Everyone gets instant updates automatically
✓ Staff: Shift assigned, shift reminder (24h, 2h before)
✓ Managers: Urgent workflows, pending approvals
✓ Care homes: Staff approaching, shift completed
✓ Bell icon shows unread count (click to view)
SAVINGS: 3 hours/week = £4,000/year

6. STAFF AVAILABILITY (My Availability Page)
Before: "Can you work Friday?" → 20 calls, 5 say yes
After: Check availability calendar, assign instantly
✓ System shows who's available before you ask
✓ Staff set availability (days, times, time off)
✓ Shift assignment respects availability
✓ Staff get notified only if they're available
SAVINGS: 2 hours/week = £2,500/year

7. FINANCIAL FRAUD PREVENTION (Financial Locking)
Before: Risk of staff/admin changing hours after invoice sent
After: Invoiced data is permanently locked
✓ Once timesheet approved → rates/hours locked
✓ Once invoice sent → cannot be edited
✓ Audit trail tracks all changes (who, when, why)
✓ Alerts sent to CFO if tampering attempted
SAVINGS: £12,000/year (prevented fraud)

TOTAL SAVINGS: 32 hours/week = £110,000+/year`,
      copyText: `SLIDE 3: THE ACG STAFFLINK SOLUTION

HOW WE ELIMINATE EVERY PAIN POINT:

1. SHIFT MANAGEMENT (Shift Calendar + Quick Actions)
Before: 8 hours/week in Excel
After: 15 minutes/week in ACG StaffLink
✓ Visual calendar shows all shifts at a glance
✓ Drag-and-drop to assign staff
✓ Filters: View by client, date, status, role
✓ Bulk create shifts from CSV or natural language
✓ Staff receive instant notifications (SMS/Email)
SAVINGS: 7.75 hours/week = £10,000/year

2. GPS-VERIFIED TIMESHEETS (Mobile Clock-In)
Before: Care homes dispute hours/locations (delays payment)
After: GPS proves staff was there, when they say
✓ Staff clock in via mobile app (requires GPS)
✓ System validates: Within 100m of care home? ✅
✓ Clock-in/out times recorded automatically
✓ Location appears on invoice ("Room 14, Divine Care")
✓ Care homes can't dispute (GPS proof)
SAVINGS: £8,000/year (fewer payment disputes)

3. AUTOMATED INVOICING (Generate Invoices Page)
Before: 6 hours/week creating invoices in Excel
After: 15 minutes/week (system does 90% automatically)
✓ Select client + date range → Generate invoice
✓ System pulls all approved timesheets
✓ Professional PDF matches your current format
✓ Email sent automatically to care home billing
✓ Payment tracking (sent, viewed, paid)
SAVINGS: 5.75 hours/week = £7,500/year

4. COMPLIANCE TRACKING (Compliance Tracker)
Before: Manual spreadsheet checks every month
After: Automated reminders + risk scoring
✓ Upload staff DBS, Right to Work, training certificates
✓ System extracts expiry dates via AI
✓ Auto-emails staff at 30, 14, 7 days before expiry
✓ Auto-suspends staff with expired critical docs
✓ Admin dashboard shows % compliance per staff
SAVINGS: 4 hours/week = £5,000/year + zero CQC penalties

5. REAL-TIME NOTIFICATIONS (Notification Bell)
Before: 30+ phone calls/week ("When's my shift?")
After: Everyone gets instant updates automatically
✓ Staff: Shift assigned, shift reminder (24h, 2h before)
✓ Managers: Urgent workflows, pending approvals
✓ Care homes: Staff approaching, shift completed
✓ Bell icon shows unread count (click to view)
SAVINGS: 3 hours/week = £4,000/year

6. STAFF AVAILABILITY (My Availability Page)
Before: "Can you work Friday?" → 20 calls, 5 say yes
After: Check availability calendar, assign instantly
✓ System shows who's available before you ask
✓ Staff set availability (days, times, time off)
✓ Shift assignment respects availability
✓ Staff get notified only if they're available
SAVINGS: 2 hours/week = £2,500/year

7. FINANCIAL FRAUD PREVENTION (Financial Locking)
Before: Risk of staff/admin changing hours after invoice sent
After: Invoiced data is permanently locked
✓ Once timesheet approved → rates/hours locked
✓ Once invoice sent → cannot be edited
✓ Audit trail tracks all changes (who, when, why)
✓ Alerts sent to CFO if tampering attempted
SAVINGS: £12,000/year (prevented fraud)

TOTAL SAVINGS: 32 hours/week = £110,000+/year`
    },
    {
      id: 'howItWorks',
      title: "Slide 4: How It Works (Daily Workflow)",
      icon: Calendar,
      content: `SLIDE 4: HOW IT WORKS (Your Daily Workflow)

MONDAY MORNING (9:00am):
1. Log into ACG StaffLink dashboard
2. Check notification bell (3 pending approvals)
3. Review shift calendar for the week
4. See: 2 unfilled shifts (Thursday, Saturday)
5. Click "Quick Actions" → "Broadcast Urgent Shift"
6. Select shift → System sends SMS/WhatsApp to qualified staff
7. First to respond gets assigned automatically
TIME: 10 minutes (vs 2 hours of phone calls)

TUESDAY AFTERNOON (2:00pm):
1. Staff member clocks in via mobile app
2. System captures GPS location
3. Validates: Within 100m of Divine Care? ✅
4. Care home notified: "Emma Smith on-site"
5. Shift status: Open → Assigned → Confirmed → In Progress
6. Admin sees live status on Shift Calendar
TIME: 0 minutes (fully automated)

WEDNESDAY MORNING (8:00am):
1. Staff finishes shift, clocks out via app
2. Timesheet auto-created (clock-in/out times)
3. System validates: Total hours match scheduled? ✅
4. Timesheet sent to care home for digital signature
5. Care home approves via email link
6. Timesheet status: Draft → Submitted → Approved
TIME: 0 minutes (fully automated)

FRIDAY MORNING (10:00am):
1. Navigate to "Generate Invoices"
2. Select client: Divine Care
3. Date range: Last week (7 days)
4. Click "Generate Invoice"
5. System pulls 5 approved timesheets
6. Invoice total: £2,340.00
7. Preview PDF → Looks correct
8. Click "Send Invoice"
9. Email sent to divine.care@billing.com
10. SMS sent to care home manager: "Invoice #INV-0042 ready"
TIME: 5 minutes (vs 2 hours in Excel)

MONDAY MORNING (Next Week):
1. Check compliance tracker
2. Alert: "John Smith - DBS expires in 14 days"
3. System already emailed John (reminder sent)
4. Click "View Document" → See uploaded renewal
5. Click "Verify" → Status changes to "Verified"
6. John's suspension risk: Resolved
TIME: 2 minutes (vs 30 minutes searching files)

YOUR NEW WEEKLY ROUTINE:
• Monday 9am: Review calendar + assign unfilled shifts (30 mins)
• Wednesday 10am: Approve timesheets (15 mins)
• Friday 10am: Generate invoices (30 mins)
• Daily: Check notifications (5 mins/day)
TOTAL: 2 hours/week (vs 40 hours/week in Excel)`,
      copyText: `SLIDE 4: HOW IT WORKS (Your Daily Workflow)

MONDAY MORNING (9:00am):
1. Log into ACG StaffLink dashboard
2. Check notification bell (3 pending approvals)
3. Review shift calendar for the week
4. See: 2 unfilled shifts (Thursday, Saturday)
5. Click "Quick Actions" → "Broadcast Urgent Shift"
6. Select shift → System sends SMS/WhatsApp to qualified staff
7. First to respond gets assigned automatically
TIME: 10 minutes (vs 2 hours of phone calls)

TUESDAY AFTERNOON (2:00pm):
1. Staff member clocks in via mobile app
2. System captures GPS location
3. Validates: Within 100m of Divine Care? ✅
4. Care home notified: "Emma Smith on-site"
5. Shift status: Open → Assigned → Confirmed → In Progress
6. Admin sees live status on Shift Calendar
TIME: 0 minutes (fully automated)

WEDNESDAY MORNING (8:00am):
1. Staff finishes shift, clocks out via app
2. Timesheet auto-created (clock-in/out times)
3. System validates: Total hours match scheduled? ✅
4. Timesheet sent to care home for digital signature
5. Care home approves via email link
6. Timesheet status: Draft → Submitted → Approved
TIME: 0 minutes (fully automated)

FRIDAY MORNING (10:00am):
1. Navigate to "Generate Invoices"
2. Select client: Divine Care
3. Date range: Last week (7 days)
4. Click "Generate Invoice"
5. System pulls 5 approved timesheets
6. Invoice total: £2,340.00
7. Preview PDF → Looks correct
8. Click "Send Invoice"
9. Email sent to divine.care@billing.com
10. SMS sent to care home manager: "Invoice #INV-0042 ready"
TIME: 5 minutes (vs 2 hours in Excel)

MONDAY MORNING (Next Week):
1. Check compliance tracker
2. Alert: "John Smith - DBS expires in 14 days"
3. System already emailed John (reminder sent)
4. Click "View Document" → See uploaded renewal
5. Click "Verify" → Status changes to "Verified"
6. John's suspension risk: Resolved
TIME: 2 minutes (vs 30 minutes searching files)

YOUR NEW WEEKLY ROUTINE:
• Monday 9am: Review calendar + assign unfilled shifts (30 mins)
• Wednesday 10am: Approve timesheets (15 mins)
• Friday 10am: Generate invoices (30 mins)
• Daily: Check notifications (5 mins/day)
TOTAL: 2 hours/week (vs 40 hours/week in Excel)`
    },
    {
      id: 'liveDemo',
      title: "Slide 5: Live Demo Script",
      icon: Users,
      content: `SLIDE 5: LIVE DEMO - LET'S SHOW YOU

WHAT WE'LL DEMONSTRATE:
1. Admin Dashboard (Real-time overview)
2. Shift Calendar (Visual scheduling)
3. Quick Actions (Broadcast urgent shift)
4. Staff Portal (Mobile experience)
5. GPS Clock-In (Location verification)
6. Timesheet Approval (Validation system)
7. Invoice Generation (Automated workflow)
8. Compliance Tracker (Expiry monitoring)
9. Notification Bell (Real-time updates)
10. WhatsApp Integration (Future feature preview)

DEMO SCENARIO:
"Divine Care calls at 6am: Emergency cover needed for 8am-8pm shift.
Let's show you how ACG StaffLink fills this in 10 minutes."

STEP 1: Create shift (Quick Actions → Natural Language)
"Need a care worker for Divine Care today 8am-8pm, Room 14, urgent"
AI extracts: Client, date, times, location, urgency ✓

STEP 2: Broadcast to qualified staff
System sends SMS to 12 care workers within 10 miles
"Urgent shift available: Divine Care, £14/hr, 12 hours, today"

STEP 3: First response accepted
Emma Smith replies: "YES"
System auto-assigns, sends confirmation email + calendar invite

STEP 4: Emma clocks in via mobile
Opens app → Clicks "Clock In"
GPS captured → Within 100m of Divine Care? ✅
Care home receives SMS: "Emma Smith arrived on-site"

STEP 5: Emma clocks out
Timesheet auto-created → Sent to care home for approval
Care home clicks email link → Signs digitally

STEP 6: Generate invoice
Invoice includes: "Emma Smith, 12h, Room 14, Divine Care"
GPS verified: ✓ Location confirmed
Total: £210.00 (Emma pay) | £252.00 (Divine Care charge)
Email sent automatically with PDF attachment

TIME TO FILL SHIFT: 8 minutes
TIME TO INVOICE: 3 minutes (after shift completion)
TOTAL ADMIN TIME: 11 minutes (vs 4+ hours manual)`,
      copyText: `SLIDE 5: LIVE DEMO - LET'S SHOW YOU

WHAT WE'LL DEMONSTRATE:
1. Admin Dashboard (Real-time overview)
2. Shift Calendar (Visual scheduling)
3. Quick Actions (Broadcast urgent shift)
4. Staff Portal (Mobile experience)
5. GPS Clock-In (Location verification)
6. Timesheet Approval (Validation system)
7. Invoice Generation (Automated workflow)
8. Compliance Tracker (Expiry monitoring)
9. Notification Bell (Real-time updates)
10. WhatsApp Integration (Future feature preview)

DEMO SCENARIO:
"Divine Care calls at 6am: Emergency cover needed for 8am-8pm shift.
Let's show you how ACG StaffLink fills this in 10 minutes."

STEP 1: Create shift (Quick Actions → Natural Language)
"Need a care worker for Divine Care today 8am-8pm, Room 14, urgent"
AI extracts: Client, date, times, location, urgency ✓

STEP 2: Broadcast to qualified staff
System sends SMS to 12 care workers within 10 miles
"Urgent shift available: Divine Care, £14/hr, 12 hours, today"

STEP 3: First response accepted
Emma Smith replies: "YES"
System auto-assigns, sends confirmation email + calendar invite

STEP 4: Emma clocks in via mobile
Opens app → Clicks "Clock In"
GPS captured → Within 100m of Divine Care? ✅
Care home receives SMS: "Emma Smith arrived on-site"

STEP 5: Emma clocks out
Timesheet auto-created → Sent to care home for approval
Care home clicks email link → Signs digitally

STEP 6: Generate invoice
Invoice includes: "Emma Smith, 12h, Room 14, Divine Care"
GPS verified: ✓ Location confirmed
Total: £210.00 (Emma pay) | £252.00 (Divine Care charge)
Email sent automatically with PDF attachment

TIME TO FILL SHIFT: 8 minutes
TIME TO INVOICE: 3 minutes (after shift completion)
TOTAL ADMIN TIME: 11 minutes (vs 4+ hours manual)`
    },
    {
      id: 'benefitsSummary',
      title: "Slide 6: Benefits Summary",
      icon: CheckCircle,
      content: `SLIDE 6: BENEFITS SUMMARY - WHY YOU'LL LOVE THIS

TIME SAVINGS:
✓ 32 hours/week saved on admin work
✓ Staff spend time growing business, not doing data entry
✓ Instant visibility (no more searching WhatsApp for info)

REVENUE PROTECTION:
✓ Zero invoice disputes (GPS verification proves everything)
✓ Get paid 40% faster (invoices sent day after shift)
✓ Eliminate timesheet fraud (£12K+/year savings)
✓ Fill urgent shifts faster (15% more revenue)

COMPLIANCE PEACE OF MIND:
✓ CQC-ready at all times
✓ Auto-reminders prevent expiries
✓ Digital audit trail (prove compliance instantly)
✓ Auto-suspension prevents legal risk

STAFF SATISFACTION:
✓ Mobile app (no more phone calls asking about shifts)
✓ WhatsApp integration (natural communication)
✓ Self-service (view schedules, upload docs)
✓ Fewer errors (correct pay, accurate timesheets)

CARE HOME SATISFACTION:
✓ GPS proof (staff really was there)
✓ Real-time updates (staff approaching, on-site, departed)
✓ Faster invoicing (paid within days, not weeks)
✓ Professional image (digital platform vs Excel)

FRAUD PREVENTION:
✓ Financial locking (invoiced data can't be changed)
✓ GPS geofencing (proves location)
✓ Audit trail (tracks all changes)
✓ Alerts (CFO notified of suspicious changes)

SCALABILITY:
✓ Add unlimited staff (no extra work)
✓ Add unlimited clients (same workflow)
✓ Process 1,000+ shifts/month (system handles it)
✓ Multi-location (manage multiple agencies)`,
      copyText: `SLIDE 6: BENEFITS SUMMARY - WHY YOU'LL LOVE THIS

TIME SAVINGS:
✓ 32 hours/week saved on admin work
✓ Staff spend time growing business, not doing data entry
✓ Instant visibility (no more searching WhatsApp for info)

REVENUE PROTECTION:
✓ Zero invoice disputes (GPS verification proves everything)
✓ Get paid 40% faster (invoices sent day after shift)
✓ Eliminate timesheet fraud (£12K+/year savings)
✓ Fill urgent shifts faster (15% more revenue)

COMPLIANCE PEACE OF MIND:
✓ CQC-ready at all times
✓ Auto-reminders prevent expiries
✓ Digital audit trail (prove compliance instantly)
✓ Auto-suspension prevents legal risk

STAFF SATISFACTION:
✓ Mobile app (no more phone calls asking about shifts)
✓ WhatsApp integration (natural communication)
✓ Self-service (view schedules, upload docs)
✓ Fewer errors (correct pay, accurate timesheets)

CARE HOME SATISFACTION:
✓ GPS proof (staff really was there)
✓ Real-time updates (staff approaching, on-site, departed)
✓ Faster invoicing (paid within days, not weeks)
✓ Professional image (digital platform vs Excel)

FRAUD PREVENTION:
✓ Financial locking (invoiced data can't be changed)
✓ GPS geofencing (proves location)
✓ Audit trail (tracks all changes)
✓ Alerts (CFO notified of suspicious changes)

SCALABILITY:
✓ Add unlimited staff (no extra work)
✓ Add unlimited clients (same workflow)
✓ Process 1,000+ shifts/month (system handles it)
✓ Multi-location (manage multiple agencies)`
    },
    {
      id: 'roadmap',
      title: "Slide 7: Roadmap (What's Coming)",
      icon: Sparkles,
      content: `SLIDE 7: WHAT'S COMING NEXT - PHASE 2 & 3 ROADMAP

PHASE 2.1 - COMING IN 12 WEEKS (After Funding):
🚀 WhatsApp Staff Agent
   "Hi ACG, can I work this Friday?"
   "Yes! You have 3 shifts available: Divine Care 8am-8pm..."

🚀 Email Shift Parsing
   Care home emails: "Need cover for Monday, 7am-7pm, 2 staff"
   System auto-creates shifts from email (90%+ accuracy)

🚀 Urgent Shift Broadcast (Enhanced)
   Multi-channel: SMS + WhatsApp + Email simultaneously
   Real-time response tracking
   Auto-assignment to first responder

🚀 Compliance Automation (Progressive Reminders)
   30 days: Friendly email reminder
   14 days: Urgent SMS reminder
   7 days: Critical alert + auto-suspend if not renewed

PHASE 2.2 - COMING IN 24 WEEKS:
🚀 Voice AI Call Center
   Inbound: Care homes can call 24/7 to request shifts
   Outbound: System calls staff to fill urgent shifts
   Natural language: "I need a nurse for tomorrow morning"

🚀 WhatsApp Admin Agent
   "Show me this week's timesheets"
   "Who's working at Divine Care today?"
   "Generate invoice for last month"

🚀 Automated Payroll
   Calculate gross pay, tax, NI, pension
   Generate payslips automatically
   Export BACS file for bank transfer

PHASE 3 - COMING IN 36 WEEKS:
🚀 Predictive Shift Matching
   AI learns: Who's most reliable? Who prefers nights?
   Suggests best staff for each shift
   Forecasts demand 2-4 weeks ahead

🚀 White-Label Branding
   Your logo, your colors, your domain
   Custom email templates
   Branded client portals

YOUR FEEDBACK DRIVES THE ROADMAP:
We're building this FOR you, WITH your input.
Tell us what you need most, we prioritize it.`,
      copyText: `SLIDE 7: WHAT'S COMING NEXT - PHASE 2 & 3 ROADMAP

PHASE 2.1 - COMING IN 12 WEEKS (After Funding):
🚀 WhatsApp Staff Agent
   "Hi ACG, can I work this Friday?"
   "Yes! You have 3 shifts available: Divine Care 8am-8pm..."

🚀 Email Shift Parsing
   Care home emails: "Need cover for Monday, 7am-7pm, 2 staff"
   System auto-creates shifts from email (90%+ accuracy)

🚀 Urgent Shift Broadcast (Enhanced)
   Multi-channel: SMS + WhatsApp + Email simultaneously
   Real-time response tracking
   Auto-assignment to first responder

🚀 Compliance Automation (Progressive Reminders)
   30 days: Friendly email reminder
   14 days: Urgent SMS reminder
   7 days: Critical alert + auto-suspend if not renewed

PHASE 2.2 - COMING IN 24 WEEKS:
🚀 Voice AI Call Center
   Inbound: Care homes can call 24/7 to request shifts
   Outbound: System calls staff to fill urgent shifts
   Natural language: "I need a nurse for tomorrow morning"

🚀 WhatsApp Admin Agent
   "Show me this week's timesheets"
   "Who's working at Divine Care today?"
   "Generate invoice for last month"

🚀 Automated Payroll
   Calculate gross pay, tax, NI, pension
   Generate payslips automatically
   Export BACS file for bank transfer

PHASE 3 - COMING IN 36 WEEKS:
🚀 Predictive Shift Matching
   AI learns: Who's most reliable? Who prefers nights?
   Suggests best staff for each shift
   Forecasts demand 2-4 weeks ahead

🚀 White-Label Branding
   Your logo, your colors, your domain
   Custom email templates
   Branded client portals

YOUR FEEDBACK DRIVES THE ROADMAP:
We're building this FOR you, WITH your input.
Tell us what you need most, we prioritize it.`
    },
    {
      id: 'pricing',
      title: "Slide 8: Pricing & Pilot Program",
      icon: DollarSign,
      content: `SLIDE 8: PRICING & PILOT PROGRAM

STANDARD PRICING (After Pilot):
• Starter: £399/month (1-10 staff)
• Professional: £699/month (11-50 staff) ← You're here
• Enterprise: £1,299/month (51+ staff)

WHAT'S INCLUDED:
✓ Unlimited shifts/month
✓ Unlimited clients
✓ GPS verification
✓ Email/SMS notifications
✓ Invoice automation
✓ Compliance tracking
✓ Financial locking
✓ Real-time notifications
✓ Mobile app (iOS/Android)
✓ Training & onboarding
✓ 24/7 support
✓ Regular feature updates

YOUR PILOT PROGRAM (Special Terms):
💰 Cost: £0/month for 90 days (FREE)
📅 Duration: January - March 2026
🎯 Goal: Validate features, gather feedback
🤝 Agreement: Exclusive pilot (no competitors)
📊 Success: Measure time savings, ROI
💬 Testimonial: Video case study (if you love it)

AFTER PILOT (April 2026):
• If you love it: £699/month (Professional tier)
• Early adopter discount: 10% off (£629/month)
• Contract: Month-to-month (no lock-in)
• Cancel anytime: 30 days notice

ROI CALCULATION:
Cost: £629/month = £7,548/year
Savings: £110,000+/year
NET VALUE: £102,452/year
ROI: 1,358%

PAYBACK PERIOD: 3 days
After 3 days, pure value creation.

WHY WE'RE DOING THIS:
We need real-world validation from a working agency.
Your feedback shapes the product.
You get £110K/year in value for free during pilot.`,
      copyText: `SLIDE 8: PRICING & PILOT PROGRAM

STANDARD PRICING (After Pilot):
• Starter: £399/month (1-10 staff)
• Professional: £699/month (11-50 staff) ← You're here
• Enterprise: £1,299/month (51+ staff)

WHAT'S INCLUDED:
✓ Unlimited shifts/month
✓ Unlimited clients
✓ GPS verification
✓ Email/SMS notifications
✓ Invoice automation
✓ Compliance tracking
✓ Financial locking
✓ Real-time notifications
✓ Mobile app (iOS/Android)
✓ Training & onboarding
✓ 24/7 support
✓ Regular feature updates

YOUR PILOT PROGRAM (Special Terms):
💰 Cost: £0/month for 90 days (FREE)
📅 Duration: January - March 2026
🎯 Goal: Validate features, gather feedback
🤝 Agreement: Exclusive pilot (no competitors)
📊 Success: Measure time savings, ROI
💬 Testimonial: Video case study (if you love it)

AFTER PILOT (April 2026):
• If you love it: £699/month (Professional tier)
• Early adopter discount: 10% off (£629/month)
• Contract: Month-to-month (no lock-in)
• Cancel anytime: 30 days notice

ROI CALCULATION:
Cost: £629/month = £7,548/year
Savings: £110,000+/year
NET VALUE: £102,452/year
ROI: 1,358%

PAYBACK PERIOD: 3 days
After 3 days, pure value creation.

WHY WE'RE DOING THIS:
We need real-world validation from a working agency.
Your feedback shapes the product.
You get £110K/year in value for free during pilot.`
    },
    {
      id: 'disasterRecovery',
      title: "Slide 9: Disaster Recovery & Safety",
      icon: Shield,
      component: DisasterRecoverySlideComponent, // This slide renders the component
      copyText: `SLIDE 9: DISASTER RECOVERY & SAFETY

YOUR DATA IS SAFE

Moving from manual to digital? We understand your concerns. Here's how we protect your business.

PLATFORM RELIABILITY:
• 99.9% Uptime: Less than 9 hours downtime per year
• Multi-Region Backup: Data replicated UK + EU
• Daily Backups: 30-day recovery window
• Zero-Downtime Updates: Never interrupted

EMAIL AUDIT TRAIL:
• Every Action Emailed: Staff, client, and you get copies
• Timestamped: Legally binding evidence
• Permanent: Your inbox is your backup
• Independent: Works even if system is down

DATA EXPORT (YOURS FOREVER):
• One-Click CSV Export: Staff, shifts, timesheets, clients
• Your Data, Your Control: Never locked in
• Quarterly Backups: Save to USB/Google Drive
• Excel-Ready: Open in Excel/Google Sheets

MANUAL FALLBACK PLAN:
• Phone/SMS Always Works: Staff have confirmation emails
• Care Home Logbooks: Independent paper trail
• Mobile Access: Access from any device
• 1-Page BCP Checklist: Print and keep at desk

COMPARISON: MANUAL VS. DIGITAL RESILIENCE
• Paper records lost in office fires/floods: 95% (Source: FEMA disaster statistics)
• Cloud data survives disasters: 99.9% (AWS Frankfurt + London centers)
• Every record has 3 Copies (System, Email, Care Home) (Triple redundancy protection)

REAL SCENARIO: OFFICE FLOOD AT 3AM
❌ Manual System (Paper):
• Staff rosters destroyed
• Client contracts waterlogged
• Timesheet copies ruined
• 6 months invoicing records lost
• Business stops for 2 weeks
• Lost revenue: £15,000+

✅ ACG Staff Link (Cloud):
• Log in from home at 8am
• All shifts visible on screen
• Staff already have confirmation emails
• Call staff from home: "Shifts still on!"
• Zero business interruption
• Lost revenue: £0

Digital is SAFER than paper.
Your biggest risk is staying manual, not going digital.`
    },
    {
      id: 'nextSteps',
      title: "Slide 10: Next Steps - Let's Get You Started", // Updated slide number
      icon: Clock,
      content: `SLIDE 9: NEXT STEPS - LET'S GET YOU STARTED

TODAY (After This Presentation):
✅ Q&A: Ask us anything
✅ Demo walkthrough: See it live
✅ Review features: What matters most to you?
✅ Discuss concerns: What are you worried about?

THIS WEEK (If You're Interested):
📋 Pilot Agreement: Review terms (simple, no commitment)
📧 Data Export: Send us your current staff list (Excel)
📊 Shift History: Send last 3 months of shifts (optional)
🗓️ Schedule Training: 2-hour onboarding session

WEEK 1 (Setup & Import):
1. Create your agency profile (logo, branding)
2. Import staff records (name, email, phone, role)
3. Import clients (Divine Care, others)
4. Set up compliance tracking (upload existing docs)
5. Configure notification preferences
6. Set up GPS geofencing (100m radius per client)

WEEK 2 (Training & Testing):
1. Admin training (2 hours): Dashboard, shifts, invoices
2. Staff training (video): How to use mobile app
3. Test shifts: Create 5 test shifts
4. Test clock-in: Staff test GPS verification
5. Test invoicing: Generate 1 test invoice
6. Review: Does everything work as expected?

WEEK 3 (Go Live):
🚀 Switch from Excel to ACG StaffLink (all new shifts)
🚀 Staff start using mobile app for real shifts
🚀 Care homes receive invoices via ACG StaffLink
🚀 Daily check-ins: Any issues? What's working?

WEEK 4-12 (Pilot Period):
📊 Weekly reports: Time saved, shifts processed, ROI
📞 Weekly calls: Feedback, feature requests, issues
📈 Metrics tracking: Prove 32 hours/week saved
🎥 Case study: Video testimonial (if you love it)

DECISION POINT (End of Pilot):
✅ Love it? → Sign up for Professional tier (£629/month)
❌ Not convinced? → No commitment, walk away

RISK-FREE GUARANTEE:
• £0 upfront cost
• £0 monthly cost during pilot
• No contract during pilot
• Cancel anytime (even during pilot)

WHAT WE NEED FROM YOU:
1. Commitment to use the system daily (not Excel)
2. Honest feedback (what's working, what's not)
3. Train your staff (we provide videos)
4. 30 mins/week for feedback calls
5. Testimonial if it saves you £110K/year

WHAT YOU GET FROM US:
1. Free software for 90 days
2. Dedicated onboarding specialist
3. Priority support (24/7 access to us)
4. Custom feature development (if you need something)
5. £110,000+/year in time savings

READY TO START?
Let's schedule your onboarding call this week.`,
      copyText: `SLIDE 9: NEXT STEPS - LET'S GET YOU STARTED

TODAY (After This Presentation):
✅ Q&A: Ask us anything
✅ Demo walkthrough: See it live
✅ Review features: What matters most to you?
✅ Discuss concerns: What are you worried about?

THIS WEEK (If You're Interested):
📋 Pilot Agreement: Review terms (simple, no commitment)
📧 Data Export: Send us your current staff list (Excel)
📊 Shift History: Send last 3 months of shifts (optional)
🗓️ Schedule Training: 2-hour onboarding session

WEEK 1 (Setup & Import):
1. Create your agency profile (logo, branding)
2. Import staff records (name, email, phone, role)
3. Import clients (Divine Care, others)
4. Set up compliance tracking (upload existing docs)
5. Configure notification preferences
6. Set up GPS geofencing (100m radius per client)

WEEK 2 (Training & Testing):
1. Admin training (2 hours): Dashboard, shifts, invoices
2. Staff training (video): How to use mobile app
3. Test shifts: Create 5 test shifts
4. Test clock-in: Staff test GPS verification
5. Test invoicing: Generate 1 test invoice
6. Review: Does everything work as expected?

WEEK 3 (Go Live):
🚀 Switch from Excel to ACG StaffLink (all new shifts)
🚀 Staff start using mobile app for real shifts
🚀 Care homes receive invoices via ACG StaffLink
🚀 Daily check-ins: Any issues? What's working?

WEEK 4-12 (Pilot Period):
📊 Weekly reports: Time saved, shifts processed, ROI
📞 Weekly calls: Feedback, feature requests, issues
📈 Metrics tracking: Prove 32 hours/week saved
🎥 Case study: Video testimonial (if you love it)

DECISION POINT (End of Pilot):
✅ Love it? → Sign up for Professional tier (£629/month)
❌ Not convinced? → No commitment, walk away

RISK-FREE GUARANTEE:
• £0 upfront cost
• £0 monthly cost during pilot
• No contract during pilot
• Cancel anytime (even during pilot)

WHAT WE NEED FROM YOU:
1. Commitment to use the system daily (not Excel)
2. Honest feedback (what's working, what's not)
3. Train your staff (we provide videos)
4. 30 mins/week for feedback calls
5. Testimonial if it saves you £110K/year

WHAT YOU GET FROM US:
1. Free software for 90 days
2. Dedicated onboarding specialist
3. Priority support (24/7 access to us)
4. Custom feature development (if you need something)
5. £110,000+/year in time savings

READY TO START?
Let's schedule your onboarding call this week.`
    },
    {
      id: 'closingSlide',
      title: "Slide 11: Closing", // Updated slide number
      icon: Rocket,
      content: `SLIDE 10: THANK YOU - LET'S TRANSFORM DOMINION HEALTHCARE

WHAT WE COVERED:
✅ Your pain points (40 hours/week of admin)
✅ Our solution (ACG StaffLink automation)
✅ How it works (your new daily workflow)
✅ Live demo (see it in action)
✅ Benefits (£110K+/year savings)
✅ Roadmap (what's coming next)
✅ Pricing (FREE pilot, then £629/month)
✅ Next steps (get started this week)

THE OPPORTUNITY:
• Save 32 hours/week on admin work
• Get paid 40% faster (automated invoicing)
• Zero invoice disputes (GPS verification)
• CQC-ready at all times (compliance automation)
• Scale your business (handle 10x more shifts)

THE PILOT PROGRAM:
• £0 for 90 days (completely free)
• No commitment (try risk-free)
• Priority support (we're here 24/7)
• Custom features (we build what you need)
• Proven ROI (£110K+/year savings)

WHY DOMINION?
• You're the perfect pilot agency (size, complexity)
• Your feedback shapes the product
• Your success proves market demand
• Your testimonial helps us scale
• We're local (Bishop Auckland - easy to meet)

WHAT HAPPENS NEXT?
1. You say: "Let's try it"
2. We schedule onboarding (this week)
3. We import your data (staff, clients, shifts)
4. We train your team (2 hours)
5. You go live (Week 3)
6. You save £110K/year (forever)

QUESTIONS?
Ask us anything. We're here to help.

READY TO START?
Sign the pilot agreement, let's begin.

Thank you for your time.
Let's transform Dominion Healthcare together.

- Gaurav & The ACG StaffLink Team`,
      copyText: `SLIDE 10: THANK YOU - LET'S TRANSFORM DOMINION HEALTHCARE

WHAT WE COVERED:
✅ Your pain points (40 hours/week of admin)
✅ Our solution (ACG StaffLink automation)
✅ How it works (your new daily workflow)
✅ Live demo (see it in action)
✅ Benefits (£110K+/year savings)
✅ Roadmap (what's coming next)
✅ Pricing (FREE pilot, then £629/month)
✅ Next steps (get started this week)

THE OPPORTUNITY:
• Save 32 hours/week on admin work
• Get paid 40% faster (automated invoicing)
• Zero invoice disputes (GPS verification)
• CQC-ready at all times (compliance automation)
• Scale your business (handle 10x more shifts)

THE PILOT PROGRAM:
• £0 for 90 days (completely free)
• No commitment (try risk-free)
• Priority support (we're here 24/7)
• Custom features (we build what you need)
• Proven ROI (£110K+/year savings)

WHY DOMINION?
• You're the perfect pilot agency (size, complexity)
• Your feedback shapes the product
• Your success proves market demand
• Your testimonial helps us scale
• We're local (Bishop Auckland - easy to meet)

WHAT HAPPENS NEXT?
1. You say: "Let's try it"
2. We schedule onboarding (this week)
3. We import your data (staff, clients, shifts)
4. We train your team (2 hours)
5. You go live (Week 3)
6. You save £110K/year (forever)

QUESTIONS?
Ask us anything. We're here to help.

READY TO START?
Sign the pilot agreement, let's begin.

Thank you for your time.
Let's transform Dominion Healthcare together.

- Gaurav & The ACG StaffLink Team`
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 via-blue-600 to-cyan-600 text-white p-8 rounded-xl">
        <div className="flex items-center gap-3 mb-3">
          <Rocket className="w-10 h-10" />
          <h1 className="text-3xl font-bold">Dominion Healthcare - Client Presentation</h1>
        </div>
        <p className="text-blue-100 text-lg mb-3">
          Everything you need to present ACG StaffLink to your pilot client
        </p>
        <div className="flex gap-3 flex-wrap">
          <Badge className="bg-white/20 text-white border-white/30">Client-Facing</Badge>
          <Badge className="bg-green-500 text-white">£110K/year Value</Badge>
          <Badge className="bg-amber-500 text-white">FREE 90-Day Pilot</Badge>
        </div>
      </div>

      {/* Instructions */}
      <Card className="border-2 border-blue-200 bg-blue-50">
        <CardContent className="p-6">
          <h3 className="text-lg font-bold text-blue-900 mb-3">📋 How to Use This Presentation</h3>
          <ol className="space-y-2 text-sm text-blue-800">
            <li>1. Copy each slide section below (click Copy button)</li>
            <li>2. Paste into Gamma.app or Beautiful.ai</li>
            <li>3. Prompt: "Create client presentation slides from this content"</li>
            <li>4. Add screenshots from the actual Dominion dashboard</li>
            <li>5. Include before/after comparison (Excel vs ACG StaffLink)</li>
            <li>6. Practice the demo (Slides 4-5) before presenting</li>
          </ol>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <CardContent className="p-4 text-center">
            <Clock className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-green-900">32 hrs/week</p>
            <p className="text-sm text-green-700">Time Saved</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
          <CardContent className="p-4 text-center">
            <DollarSign className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-blue-900">£110K+</p>
            <p className="text-sm text-blue-700">Annual Savings</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
          <CardContent className="p-4 text-center">
            <MapPin className="w-8 h-8 text-purple-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-purple-900">GPS Verified</p>
            <p className="text-sm text-purple-700">Zero Disputes</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-50 to-red-50 border-orange-200">
          <CardContent className="p-4 text-center">
            <Shield className="w-8 h-8 text-orange-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-orange-900">£0</p>
            <p className="text-sm text-orange-700">90-Day Pilot</p>
          </CardContent>
        </Card>
      </div>

      {/* Slide Sections */}
      {slidesData.map((slide) => {
        const Icon = slide.icon;

        return (
          <Card key={slide.id} className="border-2 border-gray-200">
            <CardHeader className="border-b bg-gray-50">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Icon className="w-5 h-5 text-blue-600" />
                  {slide.title}
                </CardTitle>
                <Button
                  size="sm"
                  onClick={() => copyToClipboard(slide.copyText, slide.title)}
                  className="bg-blue-600"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  {copiedSection === slide.title ? 'Copied!' : 'Copy'}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {slide.component ? (
                <slide.component /> // Render the component directly
              ) : (
                <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono bg-gray-50 p-4 rounded-lg border max-h-96 overflow-y-auto">
                  {slide.content}
                </pre>
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* Presentation Tips */}
      <Card className="border-2 border-green-300 bg-green-50">
        <CardHeader className="border-b bg-green-100">
          <CardTitle className="text-green-900">Presentation Tips & Demo Guide</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4 text-sm text-green-900">
            <div>
              <h4 className="font-bold mb-2">🎯 Before The Meeting:</h4>
              <ul className="space-y-1 ml-4">
                <li>• Set up test data in Dominion's account (5 staff, 3 clients, 10 shifts)</li>
                <li>• Screenshot key features (calendar, GPS map, invoice)</li>
                <li>• Print comparison chart (Excel vs ACG StaffLink)</li>
                <li>• Prepare pilot agreement (1-page PDF)</li>
                <li>• Test the live demo (practice the flow)</li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-2">⏰ During The Meeting (45 mins):</h4>
              <ul className="space-y-1 ml-4">
                <li>• Introduction (5 mins) - Build rapport, understand their pain</li>
                <li>• Problem slide (5 mins) - Mirror their exact pain points</li>
                <li>• Solution slide (10 mins) - Show how each feature solves a problem</li>
                <li>• Live demo (15 mins) - Walk through the urgent shift scenario</li>
                <li>• Q&A (10 mins) - Answer concerns, address objections</li>
                <li>• Close (5 mins) - Pilot program, next steps, sign agreement</li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-2">🎬 Demo Flow (CRITICAL):</h4>
              <ul className="space-y-1 ml-4">
                <li>1. Show Dashboard (real-time overview)</li>
                <li>2. Create urgent shift via natural language</li>
                <li>3. Broadcast to staff (show SMS sent)</li>
                <li>4. Show Staff Portal mobile view</li>
                <li>5. Demo GPS clock-in (use your phone)</li>
                <li>6. Show live shift map (staff location)</li>
                <li>7. Generate invoice (click "Generate")</li>
                <li>8. Show PDF preview (their logo, their format)</li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-2">💡 Handle Objections:</h4>
              <ul className="space-y-1 ml-4">
                <li>• "Too complex" → Show 10-minute demo, most is automated</li>
                <li>• "Staff won't use it" → Show mobile app, simpler than WhatsApp</li>
                <li>• "What if it breaks?" → 90-day pilot, no commitment, we fix issues</li>
                <li>• "We're too busy" → That's why you need it (32 hrs/week saved)</li>
                <li>• "Not sure about GPS" → Optional feature, prevents disputes</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
