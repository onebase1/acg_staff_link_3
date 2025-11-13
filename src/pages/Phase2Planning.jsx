
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Sparkles, Zap, Brain, MessageSquare, Calendar, Clock, 
  TrendingUp, Shield, FileText, ChevronRight, CheckCircle,
  AlertTriangle, Workflow, Phone, Mail, DollarSign, Target,
  Users, Award, Rocket
} from "lucide-react";

export default function Phase2Planning() {
  const [expandedCategory, setExpandedCategory] = useState(null);

  const phase2Capabilities = [
    {
      category: "AI Call Center & Voice Agents",
      icon: Phone,
      color: "purple",
      status: "planned",
      priority: "CRITICAL",
      businessImpact: "This single feature will make your pitch unbeatable. 'Your agency runs itself - AI answers calls 24/7'",
      features: [
        {
          title: "Inbound Call Router (Voice AI)",
          description: "Voice AI answers client calls, parses shift requirements (date, time, skills, rate), creates shift records automatically in database",
          impact: "Zero missed calls. Clients call anytime, AI handles it. Competitors still use voicemail.",
          implementation: "Vapi/Bland AI → Webhook → Base44 API. Voice transcription → GPT-4 parsing → Create Shift entity",
          priority: "CRITICAL",
          stack: "n8n + Vapi/Bland AI + Base44 Webhooks"
        },
        {
          title: "Outbound Staff Calling (Automated Recruitment)",
          description: "AI calls available staff for urgent shifts, records responses (yes/no/maybe), updates booking status in real-time",
          impact: "Fill urgent shifts in 15 minutes instead of 4 hours. Staff love it - no missed opportunities.",
          implementation: "Shift marked urgent → n8n triggers → Vapi calls top 5 matches → Records responses → Updates Base44",
          priority: "CRITICAL",
          stack: "n8n + Vapi + Base44 API"
        },
        {
          title: "Emergency Escalation Protocol",
          description: "If no staff accept within 30 mins, AI increases rate by 20%, expands search radius, calls wider pool",
          impact: "98%+ urgent shift fill rate. Never tell a client 'we couldn't find anyone'",
          implementation: "Timer node → Rate increase → Wider geo search → Send SMS blast → Human override if still unfilled",
          priority: "HIGH",
          stack: "n8n workflow with conditional logic"
        }
      ]
    },
    {
      category: "Intelligent Email/WhatsApp Parsing",
      icon: MessageSquare,
      color: "blue",
      status: "planned",
      priority: "CRITICAL",
      businessImpact: "Clients text/email shift needs. AI creates bookings. Zero data entry. This is the dream.",
      features: [
        {
          title: "Email Shift Extraction",
          description: "Monitor agency email inbox. AI parses 'Need 2 RGNs tomorrow 8am-8pm £20/hr' → Creates shifts automatically",
          impact: "Zero manual shift entry. Client emails = instant database records. Save 20+ hours/week.",
          implementation: "IMAP/Gmail API → GPT-4 extraction (structured JSON) → Validation → Base44 Create Shift",
          priority: "CRITICAL",
          stack: "n8n IMAP node + OpenAI + Base44 API"
        },
        {
          title: "WhatsApp Business Integration",
          description: "Clients text shift requests via WhatsApp. AI confirms details, creates booking, sends confirmation back",
          impact: "Clients LOVE this. Text a shift need, get staff confirmed in 5 minutes. Game changer.",
          implementation: "WhatsApp Cloud API → AI parsing → Confirmation loop → Base44 Booking creation → WhatsApp receipt",
          priority: "CRITICAL",
          stack: "n8n + WhatsApp Business API + OpenAI + Base44"
        },
        {
          title: "Smart Confirmation Workflow",
          description: "AI verifies parsed details with client before creating record. If confidence <90%, flags for human review",
          impact: "Zero errors. Clients trust the system. No 'AI made a mistake' complaints.",
          implementation: "Confidence scoring → Auto-confirm if >90% → Human approval node if <90%",
          priority: "HIGH",
          stack: "n8n conditional logic + Slack notification"
        }
      ]
    },
    {
      category: "Emergency Shift Fill Automation",
      icon: Zap,
      color: "red",
      status: "planned",
      priority: "CRITICAL",
      businessImpact: "THE feature. 'We fill urgent shifts in under 20 minutes, guaranteed.' No competitor can say this.",
      features: [
        {
          title: "One-Click Emergency Protocol",
          description: "Client marks shift as urgent → AI instantly sends WhatsApp, SMS, voice calls, and in-app notifications to geo-matched staff",
          impact: "15-minute average fill time for critical shifts. Clients pay premium rates for this reliability.",
          implementation: "Urgent flag → Multi-channel blast (parallel execution) → Real-time response tracking → Auto-assignment to first responder",
          priority: "CRITICAL",
          stack: "n8n parallel workflows + Twilio + Vapi + Base44"
        },
        {
          title: "Geo-Smart Matching",
          description: "Only contacts staff within configurable radius (default 10 miles). Uses Google Maps distance matrix for drive time calculations",
          impact: "Staff don't ignore messages because location is always reasonable. Higher response rates.",
          implementation: "Shift location → Staff addresses → Google Maps API → Filter by distance → Sort by drive time",
          priority: "HIGH",
          stack: "Google Maps Distance Matrix API + n8n filtering"
        },
        {
          title: "Live Client Updates",
          description: "Client gets WhatsApp/SMS updates every 5 minutes: '3 staff contacted', '1 accepted', 'Booking confirmed'",
          impact: "Clients feel in control. Transparency = trust = retention.",
          implementation: "Status change webhooks → Template messages → Progressive updates → Final confirmation",
          priority: "MEDIUM",
          stack: "n8n webhooks + Twilio SMS"
        }
      ]
    },
    {
      category: "Autonomous Financial Management",
      icon: DollarSign,
      color: "green",
      status: "planned",
      priority: "HIGH",
      businessImpact: "CFO's dream. 'Invoices generate themselves, payments chase themselves, payroll runs itself.'",
      features: [
        {
          title: "Auto-Invoice Generation",
          description: "As shifts complete and timesheets approve → AI generates itemized invoices, emails to client billing contact, tracks in system",
          impact: "Zero late invoices. Get paid faster. Eliminate 8 hours/week of admin work.",
          implementation: "Timesheet approved → Group by client → Generate invoice → PDF creation → Email → Mark as sent",
          priority: "CRITICAL",
          stack: "n8n scheduled trigger + Base44 API + PDF generator + SendGrid"
        },
        {
          title: "Progressive Payment Chasers",
          description: "Overdue invoices trigger escalating reminders: Day 7 (WhatsApp), Day 14 (Email), Day 21 (Phone call), Day 28 (Admin alert)",
          impact: "Reduce payment delays by 40%. Improve cash flow. Automate collections.",
          implementation: "Daily check for overdue invoices → Progressive reminder workflow → Human escalation if 30+ days",
          priority: "HIGH",
          stack: "n8n scheduled cron + multi-channel messaging"
        },
        {
          title: "Automated Payroll Processing",
          description: "End of pay period → AI calculates gross pay, deductions, generates payslips, sends to staff, prepares BACS file for bank",
          impact: "Payroll: 6 hours → 15 minutes. Staff get payslips instantly. Zero calculation errors.",
          implementation: "Period end trigger → Calculate all staff pay → Generate payslips → Email distribution → BACS file export",
          priority: "HIGH",
          stack: "n8n workflow + Base44 API + PDF generation + BACS file creator"
        }
      ]
    },
    {
      category: "Proactive Compliance Management",
      icon: Shield,
      color: "orange",
      status: "planned",
      priority: "HIGH",
      businessImpact: "Zero compliance violations. 'We've never had a CQC issue.' That's powerful.",
      features: [
        {
          title: "Intelligent Expiry Predictor",
          description: "AI monitors all certificates, sends multi-channel reminders at 30/14/7 days before expiry. Escalates if ignored.",
          impact: "Zero expired documents. Zero staff unable to work due to lapsed certificates. CQC audit ready 24/7.",
          implementation: "Daily compliance scan → Identify expiring docs → Send reminders → Track acknowledgment → Escalate if no action",
          priority: "CRITICAL",
          stack: "n8n daily cron + Base44 Compliance entity + Twilio + Email"
        },
        {
          title: "Automated Document Verification",
          description: "Staff uploads certificate → OCR extracts dates → AI validates authenticity → Auto-approves if confidence >95%",
          impact: "Reduce verification time by 90%. Staff back to work faster. Admin focuses on exceptions only.",
          implementation: "Upload trigger → OCR API → Date extraction → Fraud detection → Auto-approve or flag for review",
          priority: "MEDIUM",
          stack: "OCR.space/Textract + OpenAI validation + Base44 webhooks"
        },
        {
          title: "Auto-Suspension for Expired Docs",
          description: "If document expires → Staff automatically removed from available pool → Can't be assigned shifts → Notification sent",
          impact: "Zero liability. Never assign staff with expired compliance. Automatic regulatory adherence.",
          implementation: "Expiry date reached → Update staff status → Block from shift assignment → Notify admin and staff",
          priority: "HIGH",
          stack: "n8n scheduled check + Base44 API updates"
        }
      ]
    },
    {
      category: "Predictive Shift Management",
      icon: Brain,
      color: "indigo",
      status: "planned",
      priority: "MEDIUM",
      businessImpact: "AI predicts needs before clients ask. 'We suggested shifts they didn't know they needed.'",
      features: [
        {
          title: "Demand Forecasting AI",
          description: "Analyzes historical patterns (day of week, season, client behavior) to predict shift needs 2-4 weeks ahead",
          impact: "Pre-book staff before demand hits. Better margins on planned vs urgent shifts.",
          implementation: "Weekly analysis → Pattern recognition → Forecast generation → Suggest shifts to clients → Pre-book staff",
          priority: "MEDIUM",
          stack: "Python ML model or OpenAI + Base44 historical data"
        },
        {
          title: "Staff Availability Learning",
          description: "AI learns each staff member's preferences (weekend warrior, night shift lover) and optimizes shift offers",
          impact: "Higher acceptance rates. Staff get shifts they actually want. Less rejection waste.",
          implementation: "Track acceptance patterns → Build preference profile → Rank offers by fit → Smart notification targeting",
          priority: "LOW",
          stack: "Base44 analytics + ML model or OpenAI embeddings"
        },
        {
          title: "No-Show Risk Detection",
          description: "AI flags high-risk bookings (new staff, past cancellations, short notice) and requires extra confirmation",
          impact: "Reduce no-shows by 60%. Send backup staff automatically to high-risk shifts.",
          implementation: "Risk scoring algorithm → Require double confirmation → Auto-assign backup if high risk",
          priority: "MEDIUM",
          stack: "Base44 analytics + n8n conditional logic"
        }
      ]
    }
  ];

  const n8nWorkflows = [
    {
      name: "🚨 Emergency Shift Broadcast (Multi-Channel)",
      trigger: "Shift marked as 'urgent' or 'critical'",
      businessValue: "THE killer feature. 15-min fill time for emergencies.",
      steps: [
        "1. Calculate geo-matched staff (Google Maps Distance Matrix API)",
        "2. Parallel execution: WhatsApp (Twilio) + SMS (Twilio) + Voice Call (Vapi) + In-app push",
        "3. Real-time response tracking (webhook listeners)",
        "4. Auto-assign to first acceptance",
        "5. Send confirmations to staff + client",
        "6. If no response in 30min → increase rate 20% → expand radius → retry"
      ],
      apis: ["Twilio WhatsApp/SMS", "Vapi Voice AI", "Google Maps", "Base44 Webhooks"],
      priority: "P0 - Build First"
    },
    {
      name: "📧 Email Shift Parser (Inbox → Database)",
      trigger: "New email arrives at shifts@agency.com",
      businessValue: "Zero manual shift entry. Client emails = instant shifts.",
      steps: [
        "1. IMAP email monitor (Gmail/Outlook)",
        "2. OpenAI GPT-4 extraction: {client, date, time, role, rate, count, location}",
        "3. Confidence check: >90% = auto-create, <90% = human review",
        "4. Create shift in Base44 via API",
        "5. Send confirmation email to client with shift link",
        "6. Notify admin of new shift creation"
      ],
      apis: ["Gmail/IMAP API", "OpenAI GPT-4", "Base44 API", "SendGrid"],
      priority: "P0 - Build First"
    },
    {
      name: "💰 Auto-Invoice Weekly Generator",
      trigger: "Every Monday 6:00 AM",
      businessValue: "Never manually create an invoice again. Get paid faster.",
      steps: [
        "1. Query all approved timesheets from previous week (Base44 API)",
        "2. Group by client_id",
        "3. Calculate totals (hours × rates), VAT, line items",
        "4. Generate professional PDF (template with agency branding)",
        "5. Email to client billing contact",
        "6. Create invoice record in Base44 (status: sent)",
        "7. Schedule payment reminder for due date - 7 days"
      ],
      apis: ["Base44 API", "PDF Generator (jsPDF/PDFKit)", "SendGrid"],
      priority: "P1 - High Value"
    },
    {
      name: "🔔 Compliance Expiry Monitor & Auto-Reminder",
      trigger: "Daily 8:00 AM",
      businessValue: "Zero expired documents. CQC audit ready 24/7.",
      steps: [
        "1. Query all compliance documents (Base44 API)",
        "2. Identify docs expiring in 30/14/7/1 days",
        "3. Send progressive reminders: Email + SMS + WhatsApp",
        "4. If 7 days out → CC agency admin",
        "5. If expires → auto-suspend staff from shifts",
        "6. Track reminder acknowledgments",
        "7. Escalate to human if no action taken"
      ],
      apis: ["Base44 Compliance API", "Twilio SMS", "WhatsApp", "Email"],
      priority: "P0 - Compliance Critical"
    },
    {
      name: "📞 Voice AI Inbound Call Handler",
      trigger: "Incoming call to agency number",
      businessValue: "24/7 phone coverage. Never miss a client call again.",
      steps: [
        "1. Voice AI answers (Vapi/Bland configured with agency context)",
        "2. Natural conversation: 'Hi, how can I help you today?'",
        "3. Detect intent: Shift request / Staff inquiry / Complaint / General",
        "4. If shift request: Extract details (GPT-4 function calling)",
        "5. Confirm details with caller",
        "6. Create shift in Base44 via webhook",
        "7. Send confirmation SMS to client",
        "8. If complex issue → transfer to human + email summary"
      ],
      apis: ["Vapi/Bland Voice AI", "OpenAI GPT-4", "Base44 Webhooks", "Twilio"],
      priority: "P0 - Game Changer"
    },
    {
      name: "💳 Payment Chaser (Progressive Escalation)",
      trigger: "Invoice overdue",
      businessValue: "Reduce late payments by 40%. Automate collections.",
      steps: [
        "1. Daily check for overdue invoices (Base44 API)",
        "2. Day 7 overdue: Friendly WhatsApp reminder",
        "3. Day 14 overdue: Formal email reminder",
        "4. Day 21 overdue: Voice AI courtesy call",
        "5. Day 28 overdue: Admin alert + suggest payment plan",
        "6. Track all communication in Base44",
        "7. Auto-mark paid when payment received (webhook)"
      ],
      apis: ["Base44 API", "WhatsApp", "SendGrid", "Vapi Voice AI"],
      priority: "P1 - Cash Flow Critical"
    }
  ];

  const implementationRoadmap = [
    {
      phase: "Phase 2A - Q1 2026 (THE FOUNDATION)",
      focus: "Core Autonomy - The 'Wow' Features",
      deliverables: [
        "🚨 Emergency Shift Broadcast (multi-channel)",
        "📧 Email shift parsing (inbox → database)",
        "📞 Voice AI call handling (inbound)",
        "🔔 Compliance expiry automation",
        "💰 Auto-invoice generation"
      ],
      businessPitch: "Your agency runs itself. AI answers calls, parses emails, fills urgent shifts in 15 minutes."
    },
    {
      phase: "Phase 2B - Q2 2026 (THE INTELLIGENCE)",
      focus: "Predictive AI & Advanced Automation",
      deliverables: [
        "🧠 Demand forecasting (predict shift needs)",
        "📊 Performance analytics AI (staff scoring)",
        "💸 Dynamic pricing engine (supply/demand rates)",
        "📄 OCR document verification",
        "📞 Outbound staff calling (automated recruitment)"
      ],
      businessPitch: "AI predicts needs before clients ask. Optimizes pricing for maximum margins."
    },
    {
      phase: "Phase 2C - Q3 2026 (THE POLISH)",
      focus: "Financial Automation & Integration",
      deliverables: [
        "💳 Payment reconciliation (bank feeds)",
        "💼 Automated payroll (BACS file generation)",
        "📈 Revenue optimization advisor",
        "🔗 Xero/Sage accounting integration",
        "📱 WhatsApp Business API (full deployment)"
      ],
      businessPitch: "Complete hands-free operation. From shift request to payment - zero human intervention."
    }
  ];

  const phase1QuickWins = [
    {
      title: "Email Notifications (Resend/SendGrid)",
      description: "Replace in-app notifications with professional emails for shift assignments, confirmations, reminders",
      effort: "1-2 days",
      impact: "HIGH - Staff check email more than app",
      apis: ["Resend or SendGrid API"],
      status: "READY TO BUILD"
    },
    {
      title: "SMS Notifications (Twilio)",
      description: "Send SMS for urgent shifts, shift confirmations, compliance reminders",
      effort: "1 day",
      impact: "HIGH - Instant delivery, 98% open rate",
      apis: ["Twilio SMS API"],
      status: "READY TO BUILD"
    },
    {
      title: "WhatsApp Notifications (Twilio)",
      description: "Send WhatsApp messages for shift offers, confirmations (higher engagement than SMS)",
      effort: "2 days",
      impact: "CRITICAL - Staff prefer WhatsApp, especially international workforce",
      apis: ["Twilio WhatsApp API"],
      status: "READY TO BUILD"
    },
    {
      title: "AI Shift Description Generator",
      description: "When admin creates shift, AI suggests professional description based on client/role/requirements",
      effort: "1 day",
      impact: "MEDIUM - Saves time, ensures consistency",
      apis: ["OpenAI GPT-4"],
      status: "READY TO BUILD"
    },
    {
      title: "Document OCR Extraction",
      description: "When staff uploads compliance doc, AI extracts dates/numbers automatically (no manual typing)",
      effort: "2 days",
      impact: "HIGH - Massive time saver for onboarding",
      apis: ["OCR.space or Textract"],
      status: "READY TO BUILD"
    }
  ];

  const getColorClasses = (color) => {
    const classes = {
      purple: "bg-purple-100 text-purple-700 border-purple-300",
      blue: "bg-blue-100 text-blue-700 border-blue-300",
      green: "bg-green-100 text-green-700 border-green-300",
      amber: "bg-amber-100 text-amber-700 border-amber-300",
      red: "bg-red-100 text-red-700 border-red-300",
      orange: "bg-orange-100 text-orange-700 border-orange-300",
      indigo: "bg-indigo-100 text-indigo-700 border-indigo-300"
    };
    return classes[color] || classes.blue;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 via-indigo-700 to-blue-700 text-white p-8 rounded-xl">
        <div className="flex items-center gap-3 mb-3">
          <Rocket className="w-10 h-10" />
          <h1 className="text-3xl font-bold">Phase 2: Aggressive Agentic Autonomy</h1>
        </div>
        <p className="text-purple-100 text-lg mb-3">
          Transform ACG StaffLink from a management tool into an autonomous, self-operating agency
        </p>
        <div className="flex gap-3 flex-wrap">
          <Badge className="bg-white/20 text-white border-white/30">Target Launch: Q1 2026</Badge>
          <Badge className="bg-green-500 text-white">90% Task Automation</Badge>
          <Badge className="bg-amber-500 text-white">AI Call Center Included</Badge>
        </div>
      </div>

      {/* Vision Statement */}
      <Card className="border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50">
        <CardContent className="p-6">
          <h3 className="text-2xl font-bold text-gray-900 mb-3 flex items-center gap-2">
            <Target className="w-7 h-7 text-indigo-600" />
            The $1M Pitch: Why Agencies Will Pay Premium
          </h3>
          <div className="space-y-3 text-gray-800">
            <p className="text-lg leading-relaxed">
              <strong className="text-indigo-600">"Your agency runs itself."</strong> AI answers calls 24/7. 
              Clients text shift needs, AI creates bookings. Urgent shifts fill in 15 minutes with automated 
              staff calling. Invoices generate themselves. Compliance never expires. No-shows predicted and prevented.
            </p>
            <p className="text-lg leading-relaxed">
              <strong className="text-purple-600">What took 40 hours/week now takes 2.</strong> Your competitors 
              are drowning in admin work while you scale from 20 clients to 200 clients with the same team size.
            </p>
            <div className="grid md:grid-cols-3 gap-4 mt-4">
              <div className="p-4 bg-white rounded-lg border-2 border-green-300 shadow-sm">
                <Award className="w-8 h-8 text-green-600 mb-2" />
                <p className="text-3xl font-bold text-green-600">15min</p>
                <p className="text-sm text-gray-600">Emergency Shift Fill Time</p>
              </div>
              <div className="p-4 bg-white rounded-lg border-2 border-blue-300 shadow-sm">
                <Users className="w-8 h-8 text-blue-600 mb-2" />
                <p className="text-3xl font-bold text-blue-600">98%</p>
                <p className="text-sm text-gray-600">Shift Fill Rate Guaranteed</p>
              </div>
              <div className="p-4 bg-white rounded-lg border-2 border-purple-300 shadow-sm">
                <Sparkles className="w-8 h-8 text-purple-600 mb-2" />
                <p className="text-3xl font-bold text-purple-600">10x</p>
                <p className="text-sm text-gray-600">Scale Without Hiring</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* NEW SECTION: Navigation Audit Report */}
      <Card className="border-2 border-purple-500">
        <CardHeader className="bg-purple-50 border-b">
          <CardTitle className="text-2xl flex items-center gap-2">
            🎯 Navigation Audit & Recommendations
          </CardTitle>
          <p className="text-sm text-gray-600 mt-2">
            Comprehensive review of every sidebar link for multi-million dollar production readiness
          </p>
        </CardHeader>
        <CardContent className="p-6">
          
          {/* Core Operations - ESSENTIAL */}
          <div className="mb-8">
            <h3 className="text-xl font-bold text-green-700 mb-4 flex items-center gap-2">
              ✅ TIER 1: Core Operations (Essential - Keep)
            </h3>
            
            <div className="space-y-4">
              <div className="p-4 border-l-4 border-l-green-500 bg-green-50 rounded">
                <h4 className="font-bold text-gray-900">Dashboard</h4>
                <p className="text-sm text-gray-700 mt-1"><strong>Purpose:</strong> Command center for real-time operations</p>
                <p className="text-sm text-gray-700"><strong>Status:</strong> ✅ FIXED - Now filters by agency_id</p>
                <p className="text-sm text-green-700"><strong>Verdict:</strong> KEEP - Essential for daily operations</p>
              </div>

              <div className="p-4 border-l-4 border-l-green-500 bg-green-50 rounded">
                <h4 className="font-bold text-gray-900">Staff</h4>
                <p className="text-sm text-gray-700 mt-1"><strong>Purpose:</strong> Manage workforce, invite staff, view profiles</p>
                <p className="text-sm text-gray-700"><strong>Status:</strong> ✅ FIXED - Agency filtering working</p>
                <p className="text-sm text-green-700"><strong>Verdict:</strong> KEEP - Core business functionality</p>
              </div>

              <div className="p-4 border-l-4 border-l-green-500 bg-green-50 rounded">
                <h4 className="font-bold text-gray-900">Clients</h4>
                <p className="text-sm text-gray-700 mt-1"><strong>Purpose:</strong> Manage care homes, GPS geofencing setup</p>
                <p className="text-sm text-gray-700"><strong>Status:</strong> ✅ FIXED - Now shows correct client count</p>
                <p className="text-sm text-green-700"><strong>Verdict:</strong> KEEP - Critical for service delivery</p>
              </div>

              <div className="p-4 border-l-4 border-l-green-500 bg-green-50 rounded">
                <h4 className="font-bold text-gray-900">Shifts</h4>
                <p className="text-sm text-gray-700 mt-1"><strong>Purpose:</strong> View, assign, broadcast urgent shifts</p>
                <p className="text-sm text-gray-700"><strong>Status:</strong> ✅ Working with agency filter</p>
                <p className="text-sm text-green-700"><strong>Verdict:</strong> KEEP - Heart of the business</p>
              </div>

              <div className="p-4 border-l-4 border-l-green-500 bg-green-50 rounded">
                <h4 className="font-bold text-gray-900">Timesheets</h4>
                <p className="text-sm text-gray-700 mt-1"><strong>Purpose:</strong> Approve hours, validate GPS, payroll processing</p>
                <p className="text-sm text-gray-700"><strong>Status:</strong> ✅ GPS validation working</p>
                <p className="text-sm text-green-700"><strong>Verdict:</strong> KEEP - Required for billing</p>
              </div>

              <div className="p-4 border-l-4 border-l-green-500 bg-green-50 rounded">
                <h4 className="font-bold text-gray-900">Bookings</h4>
                <p className="text-sm text-gray-700 mt-1"><strong>Purpose:</strong> Track shift assignments and confirmations</p>
                <p className="text-sm text-gray-700"><strong>Status:</strong> ✅ Agency filtered</p>
                <p className="text-sm text-green-700"><strong>Verdict:</strong> KEEP - Essential for operations tracking</p>
              </div>

              <div className="p-4 border-l-4 border-l-green-500 bg-green-50 rounded">
                <h4 className="font-bold text-gray-900">Invoices</h4>
                <p className="text-sm text-gray-700 mt-1"><strong>Purpose:</strong> Generate client invoices, track payments</p>
                <p className="text-sm text-gray-700"><strong>Status:</strong> ✅ Working</p>
                <p className="text-sm text-green-700"><strong>Verdict:</strong> KEEP - Revenue management</p>
              </div>

              <div className="p-4 border-l-4 border-l-green-500 bg-green-50 rounded">
                <h4 className="font-bold text-gray-900">Payslips</h4>
                <p className="text-sm text-gray-700 mt-1"><strong>Purpose:</strong> Generate staff payslips, track wages</p>
                <p className="text-sm text-gray-700"><strong>Status:</strong> ✅ Working</p>
                <p className="text-sm text-green-700"><strong>Verdict:</strong> KEEP - Cost management</p>
              </div>
            </div>
          </div>

          {/* Enhanced Features - HIGH VALUE */}
          <div className="mb-8">
            <h3 className="text-xl font-bold text-blue-700 mb-4 flex items-center gap-2">
              🚀 TIER 2: Enhanced Features (High Value - Keep)
            </h3>
            
            <div className="space-y-4">
              <div className="p-4 border-l-4 border-l-blue-500 bg-blue-50 rounded">
                <h4 className="font-bold text-gray-900">Analytics Dashboard</h4>
                <p className="text-sm text-gray-700 mt-1"><strong>Purpose:</strong> KPI tracking, financial metrics, staff performance</p>
                <p className="text-sm text-gray-700"><strong>Status:</strong> ✅ NOW FIXED - Was showing 13 staff (all agencies), now shows 5 (Dominion only)</p>
                <p className="text-sm text-blue-700"><strong>Verdict:</strong> KEEP - Stakeholder reporting essential</p>
              </div>

              <div className="p-4 border-l-4 border-l-blue-500 bg-blue-50 rounded">
                <h4 className="font-bold text-gray-900">Performance Analytics</h4>
                <p className="text-sm text-gray-700 mt-1"><strong>Purpose:</strong> Revenue loss analysis, client performance, staff utilization</p>
                <p className="text-sm text-gray-700"><strong>Status:</strong> ✅ NOW FIXED - Agency filtering added</p>
                <p className="text-sm text-blue-700"><strong>Verdict:</strong> KEEP - Business intelligence goldmine</p>
              </div>

              <div className="p-4 border-l-4 border-l-blue-500 bg-blue-50 rounded">
                <h4 className="font-bold text-gray-900">Compliance Tracker</h4>
                <p className="text-sm text-gray-700 mt-1"><strong>Purpose:</strong> Track DBS, certifications, expiry reminders</p>
                <p className="text-sm text-gray-700"><strong>Status:</strong> ✅ Working with automation engine</p>
                <p className="text-sm text-blue-700"><strong>Verdict:</strong> KEEP - Legal requirement for healthcare</p>
              </div>

              <div className="p-4 border-l-4 border-l-blue-500 bg-blue-50 rounded">
                <h4 className="font-bold text-gray-900">Admin Workflows</h4>
                <p className="text-sm text-gray-700 mt-1"><strong>Purpose:</strong> Auto-escalation of unfilled shifts, verification tasks</p>
                <p className="text-sm text-gray-700"><strong>Status:</strong> ✅ Automated workflow engine running</p>
                <p className="text-sm text-blue-700"><strong>Verdict:</strong> KEEP - Reduces admin burden</p>
              </div>

              <div className="p-4 border-l-4 border-l-blue-500 bg-blue-50 rounded">
                <h4 className="font-bold text-gray-900">Quick Actions</h4>
                <p className="text-sm text-gray-700 mt-1"><strong>Purpose:</strong> Rapid access to common tasks</p>
                <p className="text-sm text-gray-700"><strong>Status:</strong> ✅ Working</p>
                <p className="text-sm text-blue-700"><strong>Verdict:</strong> KEEP - Improves admin efficiency</p>
              </div>

              <div className="p-4 border-l-4 border-l-blue-500 bg-blue-50 rounded">
                <h4 className="font-bold text-gray-900">Shift Calendar</h4>
                <p className="text-sm text-gray-700 mt-1"><strong>Purpose:</strong> Visual calendar view of all shifts</p>
                <p className="text-sm text-gray-700"><strong>Status:</strong> ✅ Implemented</p>
                <p className="text-sm text-blue-700"><strong>Verdict:</strong> KEEP - Better than list view for planning</p>
              </div>

              <div className="p-4 border-l-4 border-l-blue-500 bg-blue-50 rounded">
                <h4 className="font-bold text-gray-900">Live Shift Map</h4>
                <p className="text-sm text-gray-700 mt-1"><strong>Purpose:</strong> Real-time GPS tracking of staff on shift</p>
                <p className="text-sm text-gray-700"><strong>Status:</strong> ✅ TIER 3A feature - GPS-based</p>
                <p className="text-sm text-blue-700"><strong>Verdict:</strong> KEEP - Premium feature for enterprise clients</p>
              </div>

              <div className="p-4 border-l-4 border-l-blue-500 bg-blue-50 rounded">
                <h4 className="font-bold text-gray-900">Staff Availability</h4>
                <p className="text-sm text-gray-700 mt-1"><strong>Purpose:</strong> View staff availability calendars</p>
                <p className="text-sm text-gray-700"><strong>Status:</strong> ✅ Working</p>
                <p className="text-sm text-blue-700"><strong>Verdict:</strong> KEEP - Helps with shift planning</p>
              </div>
            </div>
          </div>

          {/* Power User Features - CONSOLIDATE */}
          <div className="mb-8">
            <h3 className="text-xl font-bold text-yellow-700 mb-4 flex items-center gap-2">
              ⚡ TIER 3: Power Features (Consolidate or Move)
            </h3>
            
            <div className="space-y-4">
              <div className="p-4 border-l-4 border-l-yellow-500 bg-yellow-50 rounded">
                <h4 className="font-bold text-gray-900">Post Shift</h4>
                <p className="text-sm text-gray-700 mt-1"><strong>Purpose:</strong> Create new shift posting</p>
                <p className="text-sm text-gray-700"><strong>Issue:</strong> Redundant - same as "Shifts" → "Create Shift" button</p>
                <p className="text-sm text-yellow-700"><strong>Recommendation:</strong> ❌ REMOVE from sidebar, keep as button in Shifts page</p>
              </div>

              <div className="p-4 border-l-4 border-l-yellow-500 bg-yellow-50 rounded">
                <h4 className="font-bold text-gray-900">Bulk Shift Creation</h4>
                <p className="text-sm text-gray-700 mt-1"><strong>Purpose:</strong> Create multiple recurring shifts at once</p>
                <p className="text-sm text-gray-700"><strong>Usage:</strong> Used occasionally for recurring schedules</p>
                <p className="text-sm text-yellow-700"><strong>Recommendation:</strong> 🔄 MOVE to "Shifts" page as a tab or modal</p>
              </div>

              <div className="p-4 border-l-4 border-l-yellow-500 bg-yellow-50 rounded">
                <h4 className="font-bold text-gray-900">Groups</h4>
                <p className="text-sm text-gray-700 mt-1"><strong>Purpose:</strong> Organize staff into teams</p>
                <p className="text-sm text-gray-700"><strong>Usage:</strong> Low frequency - setup once</p>
                <p className="text-sm text-yellow-700"><strong>Recommendation:</strong> 🔄 MOVE to Settings or Staff page</p>
              </div>

              <div className="p-4 border-l-4 border-l-yellow-500 bg-yellow-50 rounded">
                <h4 className="font-bold text-gray-900">Settings</h4>
                <p className="text-sm text-gray-700 mt-1"><strong>Contains:</strong> Agency Profile, GPS Consent</p>
                <p className="text-sm text-gray-700"><strong>Issue:</strong> Duplicates sidebar clutter</p>
                <p className="text-sm text-yellow-700"><strong>Recommendation:</strong> ✅ KEEP as dropdown, remove sub-items from main sidebar</p>
              </div>
            </div>
          </div>

          {/* User Utilities - ESSENTIAL BUT HIDDEN */}
          <div className="mb-8">
            <h3 className="text-xl font-bold text-indigo-700 mb-4 flex items-center gap-2">
              🔧 TIER 4: User Utilities (Move to User Menu)
            </h3>
            
            <div className="space-y-4">
              <div className="p-4 border-l-4 border-l-indigo-500 bg-indigo-50 rounded">
                <h4 className="font-bold text-gray-900">Profile Setup</h4>
                <p className="text-sm text-gray-700 mt-1"><strong>Purpose:</strong> User profile configuration</p>
                <p className="text-sm text-gray-700"><strong>Usage:</strong> One-time setup</p>
                <p className="text-sm text-indigo-700"><strong>Recommendation:</strong> 🔄 MOVE to user dropdown menu (top right)</p>
              </div>

              <div className="p-4 border-l-4 border-l-indigo-500 bg-indigo-50 rounded">
                <h4 className="font-bold text-gray-900">Help Center</h4>
                <p className="text-sm text-gray-700 mt-1"><strong>Purpose:</strong> Documentation and support</p>
                <p className="text-sm text-gray-700"><strong>Usage:</strong> As needed</p>
                <p className="text-sm text-indigo-700"><strong>Recommendation:</strong> 🔄 MOVE to user dropdown menu or help icon</p>
              </div>

              <div className="p-4 border-l-4 border-l-indigo-500 bg-indigo-50 rounded">
                <h4 className="font-bold text-gray-900">Home</h4>
                <p className="text-sm text-gray-700 mt-1"><strong>Purpose:</strong> Landing page</p>
                <p className="text-sm text-gray-700"><strong>Issue:</strong> Dashboard is the real home</p>
                <p className="text-sm text-indigo-700"><strong>Recommendation:</strong> ❌ REMOVE or make Home = Dashboard redirect</p>
              </div>
            </div>
          </div>

          {/* Proposed New Structure */}
          <div className="mt-8 p-6 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border-2 border-green-500">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              🎯 Recommended Sidebar Structure
            </h3>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-bold text-green-700 mb-3">📊 OPERATIONS</h4>
                <ul className="space-y-2 text-sm">
                  <li>• Dashboard</li>
                  <li>• Quick Actions</li>
                  <li>• Shifts (with Create & Bulk actions inside)</li>
                  <li>• Shift Calendar</li>
                  <li>• Live Shift Map</li>
                  <li>• Bookings</li>
                  <li>• Timesheets</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-bold text-blue-700 mb-3">👥 WORKFORCE</h4>
                <ul className="space-y-2 text-sm">
                  <li>• Staff (with Groups inside)</li>
                  <li>• Staff Availability</li>
                  <li>• Clients</li>
                  <li>• Compliance Tracker</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-bold text-purple-700 mb-3">💰 FINANCIALS</h4>
                <ul className="space-y-2 text-sm">
                  <li>• Invoices</li>
                  <li>• Payslips</li>
                  <li>• Performance Analytics</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-bold text-orange-700 mb-3">⚙️ MANAGEMENT</h4>
                <ul className="space-y-2 text-sm">
                  <li>• Analytics Dashboard</li>
                  <li>• Admin Workflows</li>
                  <li>• Settings (dropdown: Agency, GPS)</li>
                </ul>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-white rounded-lg">
              <h4 className="font-bold text-gray-900 mb-2">➕ Moved to User Dropdown:</h4>
              <p className="text-sm text-gray-700">• Profile Setup, Help Center, Logout</p>
            </div>
          </div>

          {/* Security Audit Results */}
          <div className="mt-8 p-6 bg-red-50 border-2 border-red-500 rounded-xl">
            <h3 className="text-2xl font-bold text-red-900 mb-4">
              🔒 Security Audit Results
            </h3>
            
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="text-2xl">✅</span>
                <div>
                  <p className="font-bold text-gray-900">Dashboard</p>
                  <p className="text-sm text-gray-700">NOW SECURE - Shows only agency data</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <span className="text-2xl">✅</span>
                <div>
                  <p className="font-bold text-gray-900">Staff, Clients, Shifts, Timesheets, Bookings</p>
                  <p className="text-sm text-gray-700">SECURE - Agency filtering working</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <span className="text-2xl">✅</span>
                <div>
                  <p className="font-bold text-gray-900">Analytics Dashboard</p>
                  <p className="text-sm text-gray-700">FIXED - Was showing 13 staff, now shows correct 5</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <span className="text-2xl">✅</span>
                <div>
                  <p className="font-bold text-gray-900">Performance Analytics</p>
                  <p className="text-sm text-gray-700">FIXED - Agency filtering added to all queries</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <span className="text-2xl">✅</span>
                <div>
                  <p className="font-bold text-gray-900">All Financial Pages</p>
                  <p className="text-sm text-gray-700">SECURE - Invoices, Payslips filtered by agency_id</p>
                </div>
              </div>
            </div>
          </div>

        </CardContent>
      </Card>

      {/* Phase 1 Quick Wins */}
      <Card className="border-2 border-green-300 bg-green-50">
        <CardHeader className="border-b bg-green-100">
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-6 h-6 text-green-700" />
            Phase 1 Quick Wins (Can Build NOW with API Keys)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <p className="text-sm text-green-900 mb-4">
            These features can be added to Phase 1 immediately. Just provide API keys and I'll integrate them modularly.
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            {phase1QuickWins.map((feature, idx) => (
              <div key={idx} className="p-4 bg-white rounded-lg border border-green-200">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-gray-900">{feature.title}</h4>
                  <Badge className="bg-green-600 text-white text-xs">{feature.effort}</Badge>
                </div>
                <p className="text-sm text-gray-700 mb-2">{feature.description}</p>
                <div className="flex justify-between items-center mt-3">
                  <span className="text-xs text-gray-600">Impact: <strong className="text-green-700">{feature.impact}</strong></span>
                  <Badge variant="outline" className="text-xs">{feature.apis[0]}</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* AI Capabilities by Priority */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Agentic Capabilities (Prioritized for Sales Pitch)</h2>
        <div className="space-y-4">
          {phase2Capabilities
            .sort((a, b) => {
              const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2 };
              return priorityOrder[a.priority] - priorityOrder[b.priority];
            })
            .map((category, idx) => {
            const Icon = category.icon;
            const isExpanded = expandedCategory === idx;
            return (
              <Card key={idx} className="border-2 hover:shadow-lg transition-all">
                <CardHeader 
                  className={`cursor-pointer ${getColorClasses(category.color)}`}
                  onClick={() => setExpandedCategory(isExpanded ? null : idx)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Icon className="w-6 h-6" />
                      <div>
                        <CardTitle className="text-lg">{category.category}</CardTitle>
                        <p className="text-xs mt-1 font-normal opacity-90">{category.businessImpact}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={
                        category.priority === 'CRITICAL' ? 'bg-red-600 text-white' :
                        category.priority === 'HIGH' ? 'bg-orange-500 text-white' :
                        'bg-gray-400 text-white'
                      }>
                        {category.priority}
                      </Badge>
                      <ChevronRight className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    </div>
                  </div>
                </CardHeader>
                {isExpanded && (
                  <CardContent className="p-6">
                    <div className="space-y-6">
                      {category.features.map((feature, fIdx) => (
                        <div key={fIdx} className="border-l-4 border-indigo-500 pl-4 bg-gray-50 p-4 rounded-r-lg">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-bold text-gray-900">{feature.title}</h4>
                            <Badge className={
                              feature.priority === 'CRITICAL' ? 'bg-red-600 text-white' :
                              feature.priority === 'HIGH' ? 'bg-orange-500 text-white' :
                              'bg-gray-400 text-white'
                            }>
                              {feature.priority}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-700 mb-3">{feature.description}</p>
                          <div className="bg-green-50 p-3 rounded-lg mb-2 border border-green-200">
                            <p className="text-xs text-green-700 font-semibold">💰 Business Impact:</p>
                            <p className="text-sm text-green-900">{feature.impact}</p>
                          </div>
                          <div className="bg-blue-50 p-3 rounded-lg mb-2 border border-blue-200">
                            <p className="text-xs text-blue-700 font-semibold">⚙️ Technical Implementation:</p>
                            <p className="text-sm text-blue-900">{feature.implementation}</p>
                          </div>
                          <div className="flex gap-2 flex-wrap mt-2">
                            {feature.stack.split(' + ').map((tech, tIdx) => (
                              <Badge key={tIdx} variant="outline" className="text-xs">{tech}</Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      </div>

      {/* n8n Workflows (Prioritized) */}
      <Card>
        <CardHeader className="border-b bg-gradient-to-r from-orange-50 to-red-50">
          <CardTitle className="flex items-center gap-2">
            <Workflow className="w-6 h-6 text-orange-600" />
            Critical n8n Workflows (Build Order)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-6">
            {n8nWorkflows.map((workflow, idx) => (
              <div key={idx} className="border-2 rounded-lg p-5 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-bold text-gray-900 text-lg">{workflow.name}</h4>
                      <Badge className={
                        workflow.priority === 'P0 - Build First' ? 'bg-red-600 text-white' :
                        workflow.priority === 'P0 - Game Changer' ? 'bg-purple-600 text-white' :
                        workflow.priority === 'P0 - Compliance Critical' ? 'bg-orange-600 text-white' :
                        'bg-blue-600 text-white'
                      }>
                        {workflow.priority}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      <strong>Trigger:</strong> {workflow.trigger}
                    </p>
                    <div className="bg-purple-50 p-3 rounded-lg border border-purple-200 mb-3">
                      <p className="text-xs text-purple-700 font-semibold">🎯 Business Value:</p>
                      <p className="text-sm text-purple-900">{workflow.businessValue}</p>
                    </div>
                  </div>
                </div>
                <div className="mb-3">
                  <p className="text-xs font-semibold text-gray-700 mb-2">Workflow Steps:</p>
                  <ol className="space-y-1.5">
                    {workflow.steps.map((step, sIdx) => (
                      <li key={sIdx} className="text-sm text-gray-700 pl-2">{step}</li>
                    ))}
                  </ol>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {workflow.apis.map((api, aIdx) => (
                    <Badge key={aIdx} variant="outline" className="text-xs bg-white">{api}</Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Implementation Roadmap */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-6 h-6 text-indigo-600" />
            Implementation Roadmap (Sales-Driven Phasing)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-6">
            {implementationRoadmap.map((phase, idx) => (
              <div key={idx} className="relative pl-8 pb-8 border-l-2 border-indigo-300 last:border-0">
                <div className="absolute -left-3 top-0 w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">{idx + 1}</span>
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-lg">{phase.phase}</h4>
                  <p className="text-sm text-indigo-600 font-medium mb-3">{phase.focus}</p>
                  <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-200 mb-3">
                    <p className="text-xs text-indigo-700 font-semibold">🎤 Sales Pitch:</p>
                    <p className="text-sm text-indigo-900 italic">"{phase.businessPitch}"</p>
                  </div>
                  <div className="space-y-2">
                    {phase.deliverables.map((deliverable, dIdx) => (
                      <div key={dIdx} className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-sm text-gray-700">{deliverable}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Success Metrics */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle>Phase 2 Success Metrics (What Matters to Agency Owners)</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-red-50 rounded-lg border-2 border-red-300">
              <p className="text-3xl font-bold text-red-600">15min</p>
              <p className="text-sm text-gray-600">Emergency Fill Time</p>
              <p className="text-xs text-gray-500 mt-1">(Industry avg: 4 hours)</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg border-2 border-green-300">
              <p className="text-3xl font-bold text-green-600">98%</p>
              <p className="text-sm text-gray-600">Shift Fill Rate</p>
              <p className="text-xs text-gray-500 mt-1">(Industry avg: 75%)</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg border-2 border-purple-300">
              <p className="text-3xl font-bold text-purple-600">40hrs</p>
              <p className="text-sm text-gray-600">Weekly Time Saved</p>
              <p className="text-xs text-gray-500 mt-1">Per admin user</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg border-2 border-blue-300">
              <p className="text-3xl font-bold text-blue-600">£0</p>
              <p className="text-sm text-gray-600">Compliance Penalties</p>
              <p className="text-xs text-gray-500 mt-1">Guaranteed</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Phase 3 Teaser */}
      <Card className="border-2 border-purple-300 bg-gradient-to-br from-purple-50 to-pink-50">
        <CardContent className="p-6">
          <h3 className="text-xl font-bold text-purple-900 mb-3 flex items-center gap-2">
            <Sparkles className="w-6 h-6" />
            Phase 3 Preview: The Revolution (Post-Phase 2 Success)
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 bg-white rounded-lg border border-purple-200">
              <h4 className="font-semibold text-purple-900 mb-2">📍 Geo-Location Tracking</h4>
              <p className="text-sm text-gray-700">
                Clients see staff location in real-time as they approach facility. "Your nurse is 5 minutes away."
              </p>
            </div>
            <div className="p-4 bg-white rounded-lg border border-purple-200">
              <h4 className="font-semibold text-purple-900 mb-2">📱 Paperless Clock-In/Out</h4>
              <p className="text-sm text-gray-700">
                Staff use phones to clock in via QR code/NFC at facility. GPS verification. Instant timesheet creation.
              </p>
            </div>
            <div className="p-4 bg-white rounded-lg border border-purple-200">
              <h4 className="font-semibold text-purple-900 mb-2">📧 Multi-Stage Client Emails</h4>
              <p className="text-sm text-gray-700">
                "Staff en route" → "Staff arrived" → "Shift complete" → "Thank you + feedback request" (all automated)
              </p>
            </div>
            <div className="p-4 bg-white rounded-lg border border-purple-200">
              <h4 className="font-semibold text-purple-900 mb-2">🎯 Opt-In Privacy Controls</h4>
              <p className="text-sm text-gray-700">
                Staff control when/what location data shared. Clients enable/disable features per their needs.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
