import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Shield, AlertTriangle, CheckCircle, Clock, Archive, Search, 
  Zap, Mail, MessageCircle, Phone, Database, FileText, TrendingUp,
  Users, Calendar, DollarSign, Settings, Eye, XCircle, AlertCircle,
  ChevronDown, ChevronRight, Info, Trash2, Activity
} from "lucide-react";

/**
 * 🔍 COMPREHENSIVE BACKEND FUNCTIONS AUDIT
 * 
 * PURPOSE: Document all backend functions, their status, usage, and relationships
 * AUDIENCE: Super Admin, Technical Team, Future Developers
 * 
 * Created: 2025-01-XX
 * Last Updated: Auto-generated on page load
 */

export default function FunctionsAudit() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [expandedFunctions, setExpandedFunctions] = useState(new Set());

  const toggleFunction = (funcName) => {
    setExpandedFunctions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(funcName)) {
        newSet.delete(funcName);
      } else {
        newSet.add(funcName);
      }
      return newSet;
    });
  };

  // 📊 COMPREHENSIVE FUNCTIONS CATALOG
  const functionsInventory = [
    // ========================================
    // CATEGORY 1: CORE COMMUNICATION
    // ========================================
    {
      name: 'sendEmail',
      category: 'core_communication',
      status: 'active',
      priority: 'critical',
      description: 'Professional email delivery service using Resend API. Handles sender name customization (agency branding vs platform branding).',
      usage: {
        where_used: [
          'NotificationService.jsx (all email notifications)',
          'Staff invitation workflow',
          'Invoice delivery',
          'Compliance alerts',
          'ALL automated emails'
        ],
        call_frequency: 'High - 100+ calls/day expected at scale'
      },
      dependencies: {
        secrets: ['RESEND_API_KEY', 'RESEND_FROM_DOMAIN'],
        functions: [],
        entities: []
      },
      issues: [],
      recommendations: [],
      tested: true,
      critical_notes: '✅ WORKING PERFECTLY - Primary email engine for entire platform'
    },
    {
      name: 'sendSMS',
      category: 'core_communication',
      status: 'active',
      priority: 'critical',
      description: 'SMS delivery via Twilio. Used for instant notifications, shift alerts, and urgent communications.',
      usage: {
        where_used: [
          'NotificationService.jsx → notifyShiftAssignment',
          'NotificationService.jsx → notifyUrgentShift',
          'shiftReminderEngine.js (24h & 2h reminders)',
          'paymentReminderEngine.js (overdue payment alerts)',
          'All urgent/critical workflows'
        ],
        call_frequency: 'High - Every shift assignment, urgent broadcast, reminder'
      },
      dependencies: {
        secrets: ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_PHONE_NUMBER'],
        functions: [],
        entities: []
      },
      issues: [
        {
          severity: 'high',
          description: '🔴 URGENT SHIFT BROADCASTS NOT SENDING SMS - User reports no SMS received despite broadcast being triggered',
          impact: 'Staff are not receiving critical urgent shift notifications',
          root_cause: 'SUSPECTED: Function exists and works in isolation (user tested manually) BUT may not be properly connected to UI broadcast flow',
          action_plan: [
            '1. Review console logs in PostShiftV2.jsx broadcast flow',
            '2. Verify NotificationService.notifyUrgentShift is calling sendSMS correctly',
            '3. Check if phone numbers in Staff entity are correctly formatted',
            '4. Test end-to-end flow: Create urgent shift → Check broadcast → Verify SMS delivery'
          ],
          priority: 'IMMEDIATE',
          assigned_to: 'Development Team'
        }
      ],
      recommendations: [
        'Add retry logic for failed SMS delivery',
        'Implement delivery status tracking (Twilio callbacks)',
        'Add rate limiting to prevent hitting Twilio limits'
      ],
      tested: true,
      critical_notes: '⚠️ WORKS IN ISOLATION but may have integration issue with broadcast UI flow'
    },
    {
      name: 'sendWhatsApp',
      category: 'core_communication',
      status: 'active',
      priority: 'critical',
      description: 'WhatsApp messaging via Twilio Sandbox. Parallel channel to SMS for instant notifications.',
      usage: {
        where_used: [
          'NotificationService.jsx → notifyShiftAssignment',
          'NotificationService.jsx → notifyUrgentShift',
          'shiftReminderEngine.js',
          'enhancedWhatsAppOffers.js (rich formatted offers)',
          'whatsappMasterRouter.js (conversation handler)'
        ],
        call_frequency: 'High - Parallel to every SMS'
      },
      dependencies: {
        secrets: ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_WHATSAPP_NUMBER'],
        functions: [],
        entities: []
      },
      issues: [
        {
          severity: 'high',
          description: '🔴 URGENT SHIFT BROADCASTS NOT SENDING WHATSAPP - Same issue as SMS',
          impact: 'Staff missing urgent shift notifications on both channels',
          root_cause: 'SUSPECTED: NotificationService integration issue, not function itself',
          action_plan: 'Same as sendSMS - trace broadcast flow from UI to function execution',
          priority: 'IMMEDIATE'
        }
      ],
      recommendations: [],
      tested: true,
      critical_notes: '⚠️ User confirmed: "Just sent hi to Twilio and got response perfectly" - function works, likely integration issue'
    },

    // ========================================
    // CATEGORY 2: SCHEDULED AUTOMATIONS
    // ========================================
    {
      name: 'shiftStatusAutomation',
      category: 'scheduled_automation',
      status: 'active',
      priority: 'high',
      description: 'Cron job (every 5 mins) that automatically updates shift statuses: confirmed → in_progress → awaiting_admin_closure. Creates verification workflows.',
      usage: {
        where_used: ['Cron scheduler (runs automatically)'],
        call_frequency: 'Every 5 minutes'
      },
      dependencies: {
        secrets: [],
        functions: [],
        entities: ['Shift', 'AdminWorkflow', 'Agency']
      },
      issues: [],
      recommendations: [],
      tested: true,
      critical_notes: '✅ Core automation - handles shift lifecycle transitions'
    },
    {
      name: 'shiftReminderEngine',
      category: 'scheduled_automation',
      status: 'active',
      priority: 'high',
      description: 'Cron job (hourly) sending shift reminders: 24h before (Email+SMS+WhatsApp), 2h before (SMS+WhatsApp only). Prevents duplicates with atomic flag setting.',
      usage: {
        where_used: ['Cron scheduler (runs hourly)'],
        call_frequency: 'Every hour'
      },
      dependencies: {
        secrets: ['TWILIO credentials', 'RESEND_API_KEY'],
        functions: ['sendSMS', 'sendWhatsApp', 'sendEmail'],
        entities: ['Shift', 'Staff', 'Client', 'Agency']
      },
      issues: [],
      recommendations: ['Monitor reminder delivery rates', 'Add SMS delivery confirmation tracking'],
      tested: false,
      critical_notes: '⚠️ NEEDS TESTING - User should verify reminders are being sent correctly'
    },
    {
      name: 'urgentShiftEscalation',
      category: 'scheduled_automation',
      status: 'active',
      priority: 'high',
      description: 'Cron job (every 5 mins) monitoring urgent shifts unfilled after X minutes. Creates AdminWorkflows for manual intervention.',
      usage: {
        where_used: ['Cron scheduler'],
        call_frequency: 'Every 5 minutes'
      },
      dependencies: {
        secrets: [],
        functions: [],
        entities: ['Shift', 'AdminWorkflow', 'Agency']
      },
      issues: [],
      recommendations: [],
      tested: false,
      critical_notes: 'Part of urgent shift handling chain'
    },
    {
      name: 'complianceMonitor',
      category: 'scheduled_automation',
      status: 'active',
      priority: 'high',
      description: 'Daily scan (8am) of all compliance documents. Sends reminders at 30/14/7 days before expiry. Auto-suspends staff with expired critical documents.',
      usage: {
        where_used: ['Cron scheduler (daily 8am)'],
        call_frequency: 'Once per day'
      },
      dependencies: {
        secrets: ['RESEND_API_KEY', 'TWILIO credentials'],
        functions: ['sendEmail', 'sendSMS'],
        entities: ['Compliance', 'Staff', 'Agency', 'AdminWorkflow']
      },
      issues: [],
      recommendations: [],
      tested: false,
      critical_notes: 'Critical for CQC compliance and legal protection'
    },
    {
      name: 'emailAutomationEngine',
      category: 'scheduled_automation',
      status: 'active',
      priority: 'medium',
      description: 'Sends daily shift digests (8am) and weekly summaries (Monday 8am) to staff and admins.',
      usage: {
        where_used: ['Cron scheduler (daily + weekly)'],
        call_frequency: 'Daily + weekly'
      },
      dependencies: {
        secrets: ['RESEND_API_KEY'],
        functions: ['sendEmail'],
        entities: ['Shift', 'Staff', 'Client', 'Agency', 'User', 'Timesheet']
      },
      issues: [
        {
          severity: 'medium',
          description: '⚠️ POTENTIAL DUPLICATE with staffDailyDigestEngine.js',
          impact: 'Staff may receive duplicate daily digest emails',
          root_cause: 'Two separate functions sending similar daily digests',
          action_plan: [
            '1. Review both functions to identify differences',
            '2. Consolidate into single function OR',
            '3. Clearly separate responsibilities (e.g., one for staff, one for admins)',
            '4. Add flag to prevent double-sending'
          ],
          priority: 'MEDIUM',
          status: 'NEEDS_INVESTIGATION'
        }
      ],
      recommendations: ['Consolidate with staffDailyDigestEngine or clearly separate'],
      tested: false,
      critical_notes: '⚠️ REVIEW: May overlap with staffDailyDigestEngine'
    },
    {
      name: 'notificationDigestEngine',
      category: 'scheduled_automation',
      status: 'active',
      priority: 'critical',
      description: 'Processes NotificationQueue entity - sends batched emails every 5 minutes. Core of email batching system.',
      usage: {
        where_used: [
          'Cron scheduler (every 5 mins)',
          'Processes queued notifications from NotificationService.queueNotification()'
        ],
        call_frequency: 'Every 5 minutes'
      },
      dependencies: {
        secrets: ['RESEND_API_KEY'],
        functions: ['sendEmail'],
        entities: ['NotificationQueue', 'Agency']
      },
      issues: [],
      recommendations: [],
      tested: true,
      critical_notes: '✅ Core infrastructure for batched email delivery - prevents email spam'
    },
    {
      name: 'scheduledTimesheetProcessor',
      category: 'scheduled_automation',
      status: 'active',
      priority: 'medium',
      description: 'Background job (every 15 mins) that runs auto-approval engine on all submitted timesheets.',
      usage: {
        where_used: ['Cron scheduler (every 15 mins)'],
        call_frequency: 'Every 15 minutes'
      },
      dependencies: {
        secrets: [],
        functions: ['autoTimesheetApprovalEngine'],
        entities: ['Timesheet', 'Agency', 'Staff', 'Shift']
      },
      issues: [],
      recommendations: [],
      tested: false,
      critical_notes: 'Batch processor for automated timesheet approvals'
    },
    {
      name: 'paymentReminderEngine',
      category: 'scheduled_automation',
      status: 'testing_mode',
      priority: 'medium',
      description: '🧪 TESTING MODE - Payment reminders using 10-minute intervals instead of days. Normal mode: 14/21/28 days overdue.',
      usage: {
        where_used: ['Cron scheduler'],
        call_frequency: 'Every hour (in production)'
      },
      dependencies: {
        secrets: ['RESEND_API_KEY', 'TWILIO credentials'],
        functions: ['sendEmail', 'sendSMS', 'sendWhatsApp'],
        entities: ['Invoice', 'Client', 'Agency', 'AdminWorkflow']
      },
      issues: [
        {
          severity: 'low',
          description: '⚠️ CURRENTLY IN TESTING MODE with 10-minute intervals',
          impact: 'Will send reminders too frequently if left in test mode in production',
          action_plan: [
            '1. After testing complete, revert to production intervals:',
            '   - 10 min → 14 days',
            '   - 20 min → 21 days',
            '   - 30 min → 28 days',
            '2. Update function code to remove test mode',
            '3. Deploy updated version'
          ],
          priority: 'LOW',
          status: 'KNOWN_TEST_MODE'
        }
      ],
      recommendations: ['Revert to production timing after testing'],
      tested: false,
      critical_notes: '🧪 IN TEST MODE - Remember to revert!'
    },
    {
      name: 'incompleteProfileReminder',
      category: 'scheduled_automation',
      status: 'active',
      priority: 'medium',
      description: 'Daily job sending progressive reminders to staff with incomplete profiles (Day 1, 3, 7, 14).',
      usage: {
        where_used: ['Cron scheduler (daily)'],
        call_frequency: 'Once per day'
      },
      dependencies: {
        secrets: [],
        functions: [],
        entities: ['Staff', 'Compliance', 'Agency', 'AdminWorkflow']
      },
      issues: [],
      recommendations: [],
      tested: false,
      critical_notes: 'Helps drive onboarding completion'
    },

    // ========================================
    // CATEGORY 3: INTELLIGENT AUTOMATION
    // ========================================
    {
      name: 'autoTimesheetCreator',
      category: 'intelligent_automation',
      status: 'active',
      priority: 'critical',
      description: 'Auto-creates draft timesheets when shifts are assigned. Pre-fills all financial data from shift. Enhanced error logging.',
      usage: {
        where_used: [
          'Shifts.jsx → assignStaffMutation',
          'StaffPortal.jsx → acceptShiftMutation',
          'Bookings management',
          'EVERY shift assignment workflow'
        ],
        call_frequency: 'High - Every shift assignment'
      },
      dependencies: {
        secrets: [],
        functions: [],
        entities: ['Timesheet', 'Booking', 'Shift', 'Staff', 'Client']
      },
      issues: [],
      recommendations: [],
      tested: true,
      critical_notes: '✅ ENHANCED with comprehensive logging - core workflow automation'
    },
    {
      name: 'autoTimesheetApprovalEngine',
      category: 'intelligent_automation',
      status: 'active',
      priority: 'high',
      description: 'Validates and auto-approves "perfect" timesheets (GPS validated, signatures present, hours within threshold). Creates AdminWorkflows for issues.',
      usage: {
        where_used: [
          'scheduledTimesheetProcessor.js (batch processor)',
          'Can be called manually by admin',
          'Potentially called after timesheet submission'
        ],
        call_frequency: 'Medium - Every 15 mins via scheduler'
      },
      dependencies: {
        secrets: [],
        functions: [],
        entities: ['Timesheet', 'Shift', 'Booking', 'AdminWorkflow', 'Staff', 'Agency']
      },
      issues: [],
      recommendations: ['Monitor auto-approval rate (target: 80%+)'],
      tested: false,
      critical_notes: 'Key to achieving automation goals - reduces manual timesheet reviews'
    },
    {
      name: 'intelligentTimesheetValidator',
      category: 'intelligent_automation',
      status: 'active',
      priority: 'high',
      description: 'Strategic validation engine - auto-approves confident cases, creates AdminWorkflows only for genuine red flags. GPS, hours, signatures validation.',
      usage: {
        where_used: [
          'whatsappTimesheetHandler.js (after WhatsApp submission)',
          'Can be called after any timesheet submission',
          'Part of intelligent approval chain'
        ],
        call_frequency: 'Medium - After timesheet submissions'
      },
      dependencies: {
        secrets: [],
        functions: [],
        entities: ['Timesheet', 'Shift', 'Booking', 'AdminWorkflow']
      },
      issues: [
        {
          severity: 'medium',
          description: '⚠️ POTENTIAL OVERLAP with autoTimesheetApprovalEngine',
          impact: 'Two separate validation/approval functions may cause confusion',
          root_cause: 'Similar functionality - both validate and approve timesheets',
          action_plan: [
            '1. Review both functions to identify differences',
            '2. Consider consolidating into single "TimesheetApprovalOrchestrator"',
            '3. OR clearly separate: intelligentTimesheetValidator = validation only, autoTimesheetApprovalEngine = decision engine'
          ],
          priority: 'MEDIUM',
          status: 'NEEDS_CONSOLIDATION'
        }
      ],
      recommendations: ['Consolidate with autoTimesheetApprovalEngine OR clearly separate responsibilities'],
      tested: false,
      critical_notes: '⚠️ REVIEW: Overlaps with autoTimesheetApprovalEngine'
    },
    {
      name: 'aiShiftMatcher',
      category: 'intelligent_automation',
      status: 'active',
      priority: 'medium',
      description: 'Uber-style scoring algorithm for staff-shift matching. Scores: reliability (30), proximity (20), experience (20), freshness (15), rating (15).',
      usage: {
        where_used: [
          'Can be called when assigning shifts',
          'Potential use in marketplace',
          'NOT currently integrated into UI'
        ],
        call_frequency: 'Low - Optional feature'
      },
      dependencies: {
        secrets: [],
        functions: [],
        entities: ['Staff', 'Shift', 'Client']
      },
      issues: [
        {
          severity: 'low',
          description: '⚠️ ORPHANED FEATURE - Function exists but not integrated into UI',
          impact: 'Advanced matching capability not being utilized',
          root_cause: 'Feature built but never connected to shift assignment workflow',
          action_plan: [
            '1. DECISION POINT: Do we want AI matching in the product?',
            '2. If YES: Integrate into Shifts.jsx assignment modal',
            '3. If NO: Archive this function'
          ],
          priority: 'LOW',
          status: 'ORPHANED'
        }
      ],
      recommendations: ['Either integrate into UI or archive if not needed'],
      tested: false,
      critical_notes: '⚠️ ORPHANED - Not connected to UI, may be valuable feature to activate'
    },
    {
      name: 'noShowDetectionEngine',
      category: 'intelligent_automation',
      status: 'active',
      priority: 'medium',
      description: 'Detects when staff don\'t show up (no clock-in after 15 mins). Sends reminder, then escalates to AdminWorkflow and broadcasts for replacement.',
      usage: {
        where_used: ['Cron scheduler (every 5 mins OR hourly)'],
        call_frequency: 'Frequent checks'
      },
      dependencies: {
        secrets: ['TWILIO credentials'],
        functions: ['sendSMS', 'urgentShiftEscalation'],
        entities: ['Shift', 'Timesheet', 'Staff', 'Client', 'AdminWorkflow']
      },
      issues: [],
      recommendations: [],
      tested: false,
      critical_notes: 'Important for operational reliability - prevents no-shows impacting care'
    },
    {
      name: 'autoInvoiceGenerator',
      category: 'intelligent_automation',
      status: 'active',
      priority: 'critical',
      description: 'Generates invoices from approved timesheets. CRITICAL: Creates as DRAFT only. Financial locks now happen in sendInvoice function.',
      usage: {
        where_used: [
          'GenerateInvoices.jsx',
          'Can be triggered manually or automatically'
        ],
        call_frequency: 'Weekly (billing cycle)'
      },
      dependencies: {
        secrets: [],
        functions: [],
        entities: ['Invoice', 'Timesheet', 'Client', 'Agency', 'Staff', 'Shift', 'AdminWorkflow', 'ChangeLog']
      },
      issues: [
        {
          severity: 'medium',
          description: '⚠️ ARCHITECTURAL CHANGE - Financial locking moved to sendInvoice',
          impact: 'Invoice generation and locking now 2-step process (generate draft → send & lock)',
          root_cause: 'Improved separation of concerns - drafts can be edited before sending',
          action_plan: [
            '1. Verify sendInvoice correctly locks timesheets',
            '2. Test end-to-end: Generate invoice → Edit if needed → Send (locks)',
            '3. Update user documentation to reflect 2-step process'
          ],
          priority: 'MEDIUM',
          status: 'ARCHITECTURAL_IMPROVEMENT'
        }
      ],
      recommendations: [],
      tested: false,
      critical_notes: '✅ IMPROVED ARCHITECTURE - Now generates drafts only, sendInvoice handles locking'
    },
    {
      name: 'sendInvoice',
      category: 'intelligent_automation',
      status: 'active',
      priority: 'critical',
      description: '📧 Sends invoice email + APPLIES FINANCIAL LOCKS. Creates immutable snapshot. Updates timesheet status to "invoiced". ONLY function that locks data.',
      usage: {
        where_used: ['Invoices.jsx → Send Invoice button'],
        call_frequency: 'Weekly (when invoices ready to send)'
      },
      dependencies: {
        secrets: ['RESEND_API_KEY'],
        functions: ['sendEmail'],
        entities: ['Invoice', 'Timesheet', 'Client', 'Agency', 'ChangeLog']
      },
      issues: [],
      recommendations: [],
      tested: false,
      critical_notes: '🔒 CRITICAL SECURITY FUNCTION - Only place where financial locks are applied'
    },

    // ========================================
    // CATEGORY 4: ENHANCED FEATURES
    // ========================================
    {
      name: 'enhancedWhatsAppOffers',
      category: 'enhanced_features',
      status: 'active',
      priority: 'low',
      description: 'Sends rich-formatted WhatsApp shift offers with client details, earnings, accept/decline options. Feature can be toggled in agency settings.',
      usage: {
        where_used: [
          'smartEscalationEngine.js',
          'Can be used for shift broadcasts',
          'NOT currently integrated into main UI'
        ],
        call_frequency: 'Low - Optional feature'
      },
      dependencies: {
        secrets: ['TWILIO credentials'],
        functions: ['sendWhatsApp'],
        entities: ['Shift', 'Staff', 'Client', 'Agency']
      },
      issues: [
        {
          severity: 'low',
          description: '⚠️ ORPHANED FEATURE - Built but not integrated',
          impact: 'Rich WhatsApp offers not being used despite being available',
          root_cause: 'Feature built as optional enhancement but never connected to broadcast flow',
          action_plan: [
            '1. DECISION: Do we want rich WhatsApp offers?',
            '2. If YES: Replace simple notifyUrgentShift messages with this',
            '3. If NO: Archive function'
          ],
          priority: 'LOW',
          status: 'ORPHANED'
        }
      ],
      recommendations: ['Either integrate into broadcast workflow or archive'],
      tested: false,
      critical_notes: '⚠️ ORPHANED - Nice-to-have feature not connected to UI'
    },
    {
      name: 'clientCommunicationAutomation',
      category: 'enhanced_features',
      status: 'active',
      priority: 'low',
      description: 'Auto-emails clients for: shift filled, day-before reminder, post-shift thank you + feedback. Requires feature toggle in settings.',
      usage: {
        where_used: ['NOT CURRENTLY INTEGRATED - awaiting activation'],
        call_frequency: 'Would be per-shift if activated'
      },
      dependencies: {
        secrets: ['RESEND_API_KEY'],
        functions: ['sendEmail'],
        entities: ['Shift', 'Staff', 'Client', 'Agency']
      },
      issues: [
        {
          severity: 'low',
          description: '⚠️ ORPHANED FEATURE - Not integrated',
          impact: 'Clients not receiving automated confirmations/reminders',
          root_cause: 'Built as optional feature, never activated',
          action_plan: [
            '1. DECISION: Activate client communication automation?',
            '2. If YES: Add trigger points in shift assignment workflow',
            '3. If NO: Archive function'
          ],
          priority: 'LOW',
          status: 'ORPHANED'
        }
      ],
      recommendations: ['Archive if not needed for MVP, or integrate if valuable for client experience'],
      tested: false,
      critical_notes: '⚠️ ORPHANED - Client relationship feature never activated'
    },
    {
      name: 'staffDailyDigestEngine',
      category: 'enhanced_features',
      status: 'active',
      priority: 'medium',
      description: 'Sends staff their shift schedule every morning (8am) via Email and/or SMS. Includes "rest day" messages for staff with no shifts.',
      usage: {
        where_used: ['Cron scheduler (daily 8am)'],
        call_frequency: 'Once per day'
      },
      dependencies: {
        secrets: ['RESEND_API_KEY', 'TWILIO credentials'],
        functions: ['sendEmail', 'sendSMS'],
        entities: ['Shift', 'Staff', 'Client', 'Agency']
      },
      issues: [
        {
          severity: 'medium',
          description: '⚠️ DUPLICATE FUNCTIONALITY with emailAutomationEngine',
          impact: 'Staff may receive duplicate daily digest emails',
          root_cause: 'Two functions doing similar daily digest sends',
          action_plan: [
            '1. Compare functionality of both functions',
            '2. Consolidate into single unified daily digest sender',
            '3. OR clearly separate: staffDailyDigestEngine = staff only, emailAutomationEngine = admin summaries'
          ],
          priority: 'MEDIUM',
          status: 'NEEDS_CONSOLIDATION'
        }
      ],
      recommendations: ['Consolidate with emailAutomationEngine or clearly separate responsibilities'],
      tested: false,
      critical_notes: '⚠️ REVIEW: Overlaps with emailAutomationEngine'
    },
    {
      name: 'smartEscalationEngine',
      category: 'enhanced_features',
      status: 'active',
      priority: 'medium',
      description: 'Progressive escalation for unfilled urgent shifts: 1) Broadcast, 2) Wait X mins, 3) Escalate to AdminWorkflow, 4) SMS admin.',
      usage: {
        where_used: ['Cron scheduler (every 5 mins)'],
        call_frequency: 'Every 5 minutes'
      },
      dependencies: {
        secrets: ['TWILIO credentials'],
        functions: ['enhancedWhatsAppOffers', 'sendSMS'],
        entities: ['Shift', 'Staff', 'Client', 'Agency', 'AdminWorkflow', 'User']
      },
      issues: [
        {
          severity: 'medium',
          description: '⚠️ POTENTIAL OVERLAP with urgentShiftEscalation',
          impact: 'Two separate escalation engines may create duplicate workflows',
          root_cause: 'Both functions monitor urgent shifts and create escalation workflows',
          action_plan: [
            '1. Compare urgentShiftEscalation vs smartEscalationEngine',
            '2. Identify differences in logic',
            '3. Consolidate OR disable one',
            '4. Ensure no duplicate workflows created'
          ],
          priority: 'MEDIUM',
          status: 'NEEDS_REVIEW'
        }
      ],
      recommendations: ['Review overlap with urgentShiftEscalation, consolidate if duplicative'],
      tested: false,
      critical_notes: '⚠️ REVIEW: May overlap with urgentShiftEscalation'
    },

    // ========================================
    // CATEGORY 5: VALIDATION & SECURITY
    // ========================================
    {
      name: 'validateBulkImport',
      category: 'validation_security',
      status: 'active',
      priority: 'high',
      description: '🏆 Enterprise-grade bulk import validator. Features: fuzzy matching, UK date auto-conversion, email validation, confidence scoring, auto-fixes.',
      usage: {
        where_used: ['BulkDataImport.jsx'],
        call_frequency: 'Low - When admin imports data'
      },
      dependencies: {
        secrets: [],
        functions: [],
        entities: ['Staff', 'Client', 'Shift']
      },
      issues: [],
      recommendations: [],
      tested: true,
      critical_notes: '✅ GOLD STANDARD - Comprehensive validation prevents bad data entering system'
    },
    {
      name: 'financialDataValidator',
      category: 'validation_security',
      status: 'active',
      priority: 'critical',
      description: '💰 Financial security guardian. Validates rate consistency, detects drift, enforces locks. Prevents post-invoice tampering.',
      usage: {
        where_used: [
          'Can be called before invoice generation',
          'Can be called to detect drift',
          'Can validate edit permissions',
          'NOT currently integrated into UI'
        ],
        call_frequency: 'Low - Ad-hoc validation'
      },
      dependencies: {
        secrets: [],
        functions: [],
        entities: ['Timesheet', 'Shift', 'Invoice', 'AdminWorkflow', 'ChangeLog']
      },
      issues: [
        {
          severity: 'medium',
          description: '⚠️ NOT INTEGRATED - Powerful security function not being used',
          impact: 'Missing opportunity to catch financial inconsistencies proactively',
          root_cause: 'Function built for future use, not connected to invoice flow yet',
          action_plan: [
            '1. DECISION: Integrate into invoice generation workflow?',
            '2. If YES: Call before autoInvoiceGenerator runs',
            '3. Add UI indicator showing validation status'
          ],
          priority: 'MEDIUM',
          status: 'NOT_INTEGRATED'
        }
      ],
      recommendations: ['Integrate into invoice generation workflow for added security'],
      tested: false,
      critical_notes: '⚠️ POWERFUL TOOL not yet integrated - consider activating for production'
    },
    {
      name: 'validateShiftEligibility',
      category: 'validation_security',
      status: 'active',
      priority: 'high',
      description: '✅ Comprehensive shift eligibility checker. Validates role, NMC PIN, training, compliance, references. Prevents ineligible assignments.',
      usage: {
        where_used: [
          'ShiftMarketplace.jsx (before accepting shifts)',
          'Shift assignment workflows',
          'Staff portal'
        ],
        call_frequency: 'Medium - Before shift acceptance'
      },
      dependencies: {
        secrets: [],
        functions: [],
        entities: ['Staff', 'Shift', 'Compliance']
      },
      issues: [],
      recommendations: [],
      tested: true,
      critical_notes: '✅ CRITICAL CQC COMPLIANCE - Prevents unqualified staff working shifts'
    },
    {
      name: 'geofenceValidator',
      category: 'validation_security',
      status: 'active',
      priority: 'medium',
      description: 'GPS validation using Haversine formula. Validates staff location against client geofence. Returns distance + validation result.',
      usage: {
        where_used: [
          'MobileClockIn.jsx (when staff clocks in)',
          'Timesheet validation flow',
          'TIER 3A feature'
        ],
        call_frequency: 'Medium - Every clock-in event'
      },
      dependencies: {
        secrets: [],
        functions: [],
        entities: ['Timesheet', 'Client']
      },
      issues: [],
      recommendations: ['Monitor geofence violation rates'],
      tested: true,
      critical_notes: '✅ TIER 3A feature - GPS proof of attendance'
    },
    {
      name: 'criticalChangeNotifier',
      category: 'validation_security',
      status: 'active',
      priority: 'high',
      description: '🔒 Security alerts for critical changes: shift cancellations, bank detail changes, rate changes, reassignments. Fraud prevention.',
      usage: {
        where_used: [
          'Should be called from frontend when critical changes made',
          'NOT currently integrated'
        ],
        call_frequency: 'Low - Only when critical changes occur'
      },
      dependencies: {
        secrets: ['RESEND_API_KEY'],
        functions: [],
        entities: ['ChangeLog']
      },
      issues: [
        {
          severity: 'high',
          description: '⚠️ NOT INTEGRATED - Critical security function not being used',
          impact: 'No automated alerts when critical changes made (security risk)',
          root_cause: 'Function built but never connected to edit workflows',
          action_plan: [
            '1. URGENT: Integrate into:',
            '   - Shift edit flow (when status/staff changed)',
            '   - Staff profile edits (bank details)',
            '   - Rate override workflows',
            '2. Add to all critical mutation points',
            '3. Test notification delivery'
          ],
          priority: 'HIGH',
          status: 'NOT_INTEGRATED_SECURITY_RISK'
        }
      ],
      recommendations: ['URGENT: Integrate into edit workflows for fraud prevention'],
      tested: false,
      critical_notes: '🔴 NOT INTEGRATED - Important security feature not active'
    },
    {
      name: 'shiftVerificationChain',
      category: 'validation_security',
      status: 'active',
      priority: 'low',
      description: 'Sends verification emails to clients at shift lifecycle stages (staff assigned, day before, post-shift). Part of audit trail.',
      usage: {
        where_used: ['NOT currently integrated'],
        call_frequency: 'Would be per-shift if activated'
      },
      dependencies: {
        secrets: [],
        functions: [],
        entities: ['Shift', 'Staff', 'Client', 'Agency', 'ChangeLog']
      },
      issues: [
        {
          severity: 'low',
          description: '⚠️ ORPHANED - Client verification emails not being sent',
          impact: 'Missing client communication touchpoints',
          root_cause: 'Feature never integrated into shift workflow',
          action_plan: ['Archive OR integrate if client communication needed'],
          priority: 'LOW',
          status: 'ORPHANED'
        }
      ],
      recommendations: ['Archive if not needed for MVP'],
      tested: false,
      critical_notes: '⚠️ ORPHANED - Consider archiving'
    },

    // ========================================
    // CATEGORY 6: WHATSAPP & CONVERSATIONAL
    // ========================================
    {
      name: 'whatsappMasterRouter',
      category: 'whatsapp_conversational',
      status: 'active',
      priority: 'high',
      description: '🤖 Conversational WhatsApp assistant powered by OpenAI. PIN authentication, natural language understanding, context-aware responses.',
      usage: {
        where_used: [
          'Twilio WhatsApp webhook',
          'Staff can chat naturally via WhatsApp',
          'Handles shift queries, availability, timesheet submission'
        ],
        call_frequency: 'Medium - As staff send messages'
      },
      dependencies: {
        secrets: ['OPENAI_API_KEY', 'TWILIO credentials'],
        functions: ['sendWhatsApp'],
        entities: ['Staff', 'Shift', 'Client', 'Agency']
      },
      issues: [],
      recommendations: ['Monitor OpenAI token usage', 'Add conversation history storage'],
      tested: false,
      critical_notes: '🤖 AI-powered assistant - innovative feature for staff engagement'
    },
    {
      name: 'whatsappTimesheetHandler',
      category: 'whatsapp_conversational',
      status: 'active',
      priority: 'medium',
      description: 'Processes WhatsApp timesheet submissions. Parses natural language (e.g., "8 hours, 30 min break"), creates timesheet, triggers validation.',
      usage: {
        where_used: ['Called by whatsappMasterRouter OR Twilio webhook'],
        call_frequency: 'Medium - When staff submit via WhatsApp'
      },
      dependencies: {
        secrets: ['OPENAI_API_KEY', 'TWILIO credentials'],
        functions: ['sendWhatsApp', 'intelligentTimesheetValidator', 'autoTimesheetCreator'],
        entities: ['Timesheet', 'Shift', 'Staff', 'Client']
      },
      issues: [
        {
          severity: 'medium',
          description: '⚠️ UNCLEAR RELATIONSHIP with whatsappMasterRouter',
          impact: 'Two WhatsApp handlers may cause routing confusion',
          root_cause: 'whatsappMasterRouter is conversational AI, whatsappTimesheetHandler is specific to timesheets',
          action_plan: [
            '1. Clarify: Is whatsappTimesheetHandler called BY whatsappMasterRouter?',
            '2. OR are they separate webhook endpoints?',
            '3. Document the relationship clearly'
          ],
          priority: 'MEDIUM',
          status: 'NEEDS_DOCUMENTATION'
        }
      ],
      recommendations: ['Clarify relationship with whatsappMasterRouter, potentially consolidate'],
      tested: false,
      critical_notes: '⚠️ REVIEW: Relationship with whatsappMasterRouter needs clarification'
    },
    {
      name: 'incomingSMSHandler',
      category: 'whatsapp_conversational',
      status: 'active',
      priority: 'high',
      description: 'Processes SMS replies (e.g., "YES" to accept shift). Handles phone number normalization. Sets shift status to "confirmed".',
      usage: {
        where_used: ['Twilio SMS webhook'],
        call_frequency: 'Medium - When staff reply to SMS'
      },
      dependencies: {
        secrets: ['TWILIO credentials'],
        functions: ['autoTimesheetCreator'],
        entities: ['Staff', 'Shift', 'Booking', 'Client', 'Agency']
      },
      issues: [],
      recommendations: [],
      tested: true,
      critical_notes: '✅ CRITICAL for SMS-based shift acceptance workflow'
    },

    // ========================================
    // CATEGORY 7: AI & DATA EXTRACTION
    // ========================================
    {
      name: 'generateShiftDescription',
      category: 'ai_data_extraction',
      status: 'active',
      priority: 'low',
      description: 'Uses OpenAI to generate professional shift descriptions. 2-3 sentence descriptions for shift postings.',
      usage: {
        where_used: ['NOT currently integrated into shift creation'],
        call_frequency: 'Would be low if integrated'
      },
      dependencies: {
        secrets: ['OPENAI_API_KEY'],
        functions: [],
        entities: []
      },
      issues: [
        {
          severity: 'low',
          description: '⚠️ ORPHANED - Never integrated into shift creation flow',
          impact: 'AI-generated descriptions not being used',
          root_cause: 'Feature built but not connected to PostShiftV2 or shift forms',
          action_plan: ['Archive OR add to shift creation as optional enhancement'],
          priority: 'LOW',
          status: 'ORPHANED'
        }
      ],
      recommendations: ['Archive if not needed'],
      tested: false,
      critical_notes: '⚠️ ORPHANED - Nice-to-have feature never integrated'
    },
    {
      name: 'extractDocumentDates',
      category: 'ai_data_extraction',
      status: 'active',
      priority: 'medium',
      description: 'OCR extraction of dates from compliance documents using OpenAI Vision. Extracts: issue date, expiry, reference number, issuing authority.',
      usage: {
        where_used: [
          'ComplianceTracker.jsx (can be integrated)',
          'Document upload flow',
          'NOT currently integrated'
        ],
        call_frequency: 'Low - Per document upload'
      },
      dependencies: {
        secrets: ['OPENAI_API_KEY'],
        functions: [],
        entities: []
      },
      issues: [
        {
          severity: 'low',
          description: '⚠️ NOT INTEGRATED - OCR capability not being used',
          impact: 'Staff manually typing dates instead of auto-extraction',
          root_cause: 'Feature built but not connected to compliance upload UI',
          action_plan: ['Integrate into ComplianceTracker upload OR archive'],
          priority: 'LOW',
          status: 'NOT_INTEGRATED'
        }
      ],
      recommendations: ['Integrate into compliance upload for better UX or archive'],
      tested: false,
      critical_notes: '⚠️ NOT INTEGRATED - Could improve compliance UX if activated'
    },
    {
      name: 'extractTimesheetData',
      category: 'ai_data_extraction',
      status: 'active',
      priority: 'medium',
      description: '🔍 Enhanced OCR for timesheet documents. Handles NHS/care home formats. Validates against expected data. Confidence scoring.',
      usage: {
        where_used: [
          'Timesheets.jsx (document upload)',
          'Staff timesheet submission with photo',
          'Currently being used'
        ],
        call_frequency: 'Medium - When staff upload timesheet photos'
      },
      dependencies: {
        secrets: ['OPENAI_API_KEY'],
        functions: [],
        entities: []
      },
      issues: [],
      recommendations: [],
      tested: true,
      critical_notes: '✅ ACTIVE FEATURE - Allows staff to submit timesheets via photo upload'
    },

    // ========================================
    // CATEGORY 8: ONBOARDING & USER MGMT
    // ========================================
    {
      name: 'welcomeAgency',
      category: 'onboarding_user_mgmt',
      status: 'active',
      priority: 'low',
      description: 'Sends professional welcome email when new agency signs up. Includes: next steps, feature tour, support info.',
      usage: {
        where_used: ['NOT currently triggered automatically', 'Can be called manually'],
        call_frequency: 'Very low - New agency signups'
      },
      dependencies: {
        secrets: ['RESEND_API_KEY'],
        functions: ['sendEmail'],
        entities: ['Agency', 'User']
      },
      issues: [
        {
          severity: 'low',
          description: '⚠️ NOT TRIGGERED AUTOMATICALLY',
          impact: 'New agencies not receiving welcome email',
          root_cause: 'No trigger point when agency is created',
          action_plan: [
            '1. Add trigger to Agency creation flow',
            '2. OR create manual "Send Welcome Email" button in Agency settings',
            '3. OR archive if not needed'
          ],
          priority: 'LOW',
          status: 'NOT_TRIGGERED'
        }
      ],
      recommendations: ['Add trigger to agency creation OR archive'],
      tested: false,
      critical_notes: '⚠️ NOT TRIGGERED - Nice-to-have onboarding email'
    },
    {
      name: 'newUserSignupHandler',
      category: 'onboarding_user_mgmt',
      status: 'active',
      priority: 'medium',
      description: 'SECURITY: Creates AdminWorkflow only for matched agency when new user signs up. Prevents unauthorized access.',
      usage: {
        where_used: ['Base44 platform auth webhook (after user registration)'],
        call_frequency: 'Low - New user signups'
      },
      dependencies: {
        secrets: [],
        functions: [],
        entities: ['Staff', 'Agency', 'AdminWorkflow', 'User']
      },
      issues: [],
      recommendations: [],
      tested: true,
      critical_notes: '🔒 SECURITY - Ensures only authorized users get matched to agencies'
    },

    // ========================================
    // CATEGORY 9: TESTING & DIAGNOSTICS
    // ========================================
    {
      name: 'pingTest1',
      category: 'testing_diagnostics',
      status: 'active',
      priority: 'low',
      description: 'Simple ping test for function deployment verification. Base44 platform diagnostic.',
      usage: {
        where_used: ['Testing/debugging only'],
        call_frequency: 'Rarely'
      },
      dependencies: {
        secrets: [],
        functions: [],
        entities: []
      },
      issues: [],
      recommendations: [
        {
          type: 'cleanup',
          description: 'ARCHIVE after deployment issues resolved - no longer needed for production'
        }
      ],
      tested: true,
      critical_notes: '⚠️ DIAGNOSTIC ONLY - Can be archived once deployment stable'
    },
    {
      name: 'pingTest2',
      category: 'testing_diagnostics',
      status: 'active',
      priority: 'low',
      description: 'Duplicate ping test. Base44 platform diagnostic.',
      usage: {
        where_used: ['Testing/debugging only'],
        call_frequency: 'Rarely'
      },
      dependencies: {
        secrets: [],
        functions: [],
        entities: []
      },
      issues: [],
      recommendations: [
        {
          type: 'cleanup',
          description: 'ARCHIVE after deployment issues resolved - duplicate of pingTest1'
        }
      ],
      tested: true,
      critical_notes: '⚠️ DUPLICATE - Archive after testing complete'
    }
  ];

  // ========================================
  // ANALYSIS & STATISTICS
  // ========================================

  const stats = {
    total: functionsInventory.length,
    active: functionsInventory.filter(f => f.status === 'active').length,
    orphaned: functionsInventory.filter(f => 
      f.issues.some(i => i.status === 'ORPHANED')
    ).length,
    needs_integration: functionsInventory.filter(f => 
      f.issues.some(i => i.status === 'NOT_INTEGRATED' || i.status === 'NOT_INTEGRATED_SECURITY_RISK')
    ).length,
    critical_priority: functionsInventory.filter(f => f.priority === 'critical').length,
    tested: functionsInventory.filter(f => f.tested).length,
    has_issues: functionsInventory.filter(f => f.issues.length > 0).length,
    duplicates: functionsInventory.filter(f => 
      f.issues.some(i => i.description.includes('DUPLICATE') || i.description.includes('OVERLAP'))
    ).length
  };

  const categories = [
    { value: 'all', label: 'All Functions', count: stats.total },
    { value: 'core_communication', label: '📧 Core Communication', count: functionsInventory.filter(f => f.category === 'core_communication').length },
    { value: 'scheduled_automation', label: '⏰ Scheduled Automation', count: functionsInventory.filter(f => f.category === 'scheduled_automation').length },
    { value: 'intelligent_automation', label: '🤖 Intelligent Automation', count: functionsInventory.filter(f => f.category === 'intelligent_automation').length },
    { value: 'enhanced_features', label: '✨ Enhanced Features', count: functionsInventory.filter(f => f.category === 'enhanced_features').length },
    { value: 'validation_security', label: '🔒 Validation & Security', count: functionsInventory.filter(f => f.category === 'validation_security').length },
    { value: 'whatsapp_conversational', label: '💬 WhatsApp & Chat', count: functionsInventory.filter(f => f.category === 'whatsapp_conversational').length },
    { value: 'ai_data_extraction', label: '🔍 AI & Data Extraction', count: functionsInventory.filter(f => f.category === 'ai_data_extraction').length },
    { value: 'onboarding_user_mgmt', label: '👥 Onboarding & Users', count: functionsInventory.filter(f => f.category === 'onboarding_user_mgmt').length },
    { value: 'testing_diagnostics', label: '🧪 Testing & Diagnostics', count: functionsInventory.filter(f => f.category === 'testing_diagnostics').length }
  ];

  const filteredFunctions = functionsInventory.filter(func => {
    const matchesSearch = !searchTerm || 
      func.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      func.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || func.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const getPriorityBadge = (priority) => {
    const variants = {
      critical: { className: 'bg-red-600 text-white', label: '🔴 CRITICAL' },
      high: { className: 'bg-orange-500 text-white', label: '🟠 HIGH' },
      medium: { className: 'bg-yellow-500 text-white', label: '🟡 MEDIUM' },
      low: { className: 'bg-blue-500 text-white', label: '🔵 LOW' }
    };
    return variants[priority] || variants.medium;
  };

  const getStatusBadge = (status) => {
    const variants = {
      active: { className: 'bg-green-100 text-green-800', label: '✅ Active' },
      testing_mode: { className: 'bg-yellow-100 text-yellow-800', label: '🧪 Testing' },
      orphaned: { className: 'bg-gray-100 text-gray-800', label: '📦 Orphaned' },
      deprecated: { className: 'bg-red-100 text-red-800', label: '❌ Deprecated' }
    };
    return variants[status] || variants.active;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 text-white p-8 rounded-2xl shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <Shield className="w-12 h-12" />
              <div>
                <h1 className="text-3xl font-bold">Backend Functions Audit</h1>
                <p className="text-purple-100 text-sm mt-1">Comprehensive documentation & health check</p>
              </div>
            </div>
            <p className="text-purple-100 text-sm">
              Last Updated: {new Date().toLocaleDateString('en-GB', { 
                weekday: 'long', 
                day: 'numeric', 
                month: 'long', 
                year: 'numeric' 
              })}
            </p>
          </div>
          <Badge className="bg-white/20 text-white text-lg px-4 py-2">
            {stats.total} Functions
          </Badge>
        </div>
      </div>

      {/* Executive Summary */}
      <div className="grid md:grid-cols-5 gap-4">
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Activity className="w-8 h-8 text-green-600" />
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-sm text-gray-600 uppercase tracking-wide mb-1">Active</p>
            <p className="text-3xl font-bold text-gray-900">{stats.active}</p>
            <p className="text-xs text-green-600 mt-2">Deployed & Running</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <AlertTriangle className="w-8 h-8 text-orange-600" />
            </div>
            <p className="text-sm text-gray-600 uppercase tracking-wide mb-1">Has Issues</p>
            <p className="text-3xl font-bold text-gray-900">{stats.has_issues}</p>
            <p className="text-xs text-orange-600 mt-2">Needs Review</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-gray-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Archive className="w-8 h-8 text-gray-600" />
            </div>
            <p className="text-sm text-gray-600 uppercase tracking-wide mb-1">Orphaned</p>
            <p className="text-3xl font-bold text-gray-900">{stats.orphaned}</p>
            <p className="text-xs text-gray-600 mt-2">Not Integrated</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <p className="text-sm text-gray-600 uppercase tracking-wide mb-1">Critical</p>
            <p className="text-3xl font-bold text-gray-900">{stats.critical_priority}</p>
            <p className="text-xs text-red-600 mt-2">Mission Critical</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="w-8 h-8 text-blue-600" />
            </div>
            <p className="text-sm text-gray-600 uppercase tracking-wide mb-1">Tested</p>
            <p className="text-3xl font-bold text-gray-900">{stats.tested}/{stats.total}</p>
            <p className="text-xs text-blue-600 mt-2">Verified Working</p>
          </CardContent>
        </Card>
      </div>

      {/* CRITICAL ALERTS */}
      <Alert className="border-2 border-red-300 bg-red-50">
        <AlertTriangle className="h-6 w-6 text-red-600" />
        <AlertDescription>
          <p className="font-bold text-red-900 text-lg mb-3">🚨 IMMEDIATE ACTION REQUIRED</p>
          <div className="space-y-2">
            <p className="text-red-800">
              <strong>1. Urgent Shift Notifications Not Sending:</strong> SMS/WhatsApp broadcasts not reaching staff despite function working in isolation. 
              Root cause: Suspected integration issue between UI and NotificationService.
            </p>
            <p className="text-red-800">
              <strong>2. Critical Security Function Not Integrated:</strong> criticalChangeNotifier exists but not connected to edit workflows - missing fraud prevention alerts.
            </p>
            <p className="text-red-800">
              <strong>3. Potential Duplicate Daily Digests:</strong> emailAutomationEngine and staffDailyDigestEngine may send duplicate morning emails.
            </p>
          </div>
        </AlertDescription>
      </Alert>

      {/* Search & Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search functions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto">
              {categories.map(cat => (
                <Button
                  key={cat.value}
                  variant={selectedCategory === cat.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(cat.value)}
                  className="whitespace-nowrap"
                >
                  {cat.label} ({cat.count})
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Functions List */}
      <div className="space-y-4">
        {filteredFunctions.map(func => {
          const isExpanded = expandedFunctions.has(func.name);
          const priorityBadge = getPriorityBadge(func.priority);
          const statusBadge = getStatusBadge(func.status);
          const hasCriticalIssues = func.issues.some(i => i.severity === 'high' || i.severity === 'critical');

          return (
            <Card key={func.name} className={`border-2 ${hasCriticalIssues ? 'border-red-300' : 'border-gray-200'}`}>
              <CardHeader 
                className="cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => toggleFunction(func.name)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {isExpanded ? <ChevronDown className="w-5 h-5 text-gray-600" /> : <ChevronRight className="w-5 h-5 text-gray-600" />}
                      <h3 className="text-xl font-bold text-gray-900">{func.name}</h3>
                      <Badge {...statusBadge}>{statusBadge.label}</Badge>
                      <Badge {...priorityBadge}>{priorityBadge.label}</Badge>
                      {func.tested && <Badge className="bg-blue-100 text-blue-800">✓ Tested</Badge>}
                      {func.issues.length > 0 && (
                        <Badge className="bg-red-100 text-red-800">
                          {func.issues.length} issue{func.issues.length > 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                    <p className="text-gray-700">{func.description}</p>
                  </div>
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent className="border-t bg-gray-50 p-6 space-y-6">
                  {/* Issues */}
                  {func.issues.length > 0 && (
                    <div className="p-4 bg-red-50 border-2 border-red-200 rounded-lg">
                      <h4 className="font-bold text-red-900 mb-3 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5" />
                        Issues Identified ({func.issues.length})
                      </h4>
                      {func.issues.map((issue, idx) => (
                        <div key={idx} className="mb-4 last:mb-0 p-3 bg-white rounded border border-red-200">
                          <div className="flex items-start justify-between mb-2">
                            <Badge className={
                              issue.severity === 'critical' ? 'bg-red-600 text-white' :
                              issue.severity === 'high' ? 'bg-orange-500 text-white' :
                              'bg-yellow-500 text-white'
                            }>
                              {issue.severity?.toUpperCase()}
                            </Badge>
                            <Badge variant="outline">{issue.status}</Badge>
                          </div>
                          <p className="font-semibold text-red-900 mb-2">{issue.description}</p>
                          {issue.impact && <p className="text-sm text-gray-700 mb-2"><strong>Impact:</strong> {issue.impact}</p>}
                          {issue.root_cause && <p className="text-sm text-gray-700 mb-2"><strong>Root Cause:</strong> {issue.root_cause}</p>}
                          {issue.action_plan && (
                            <div className="mt-2">
                              <p className="text-sm font-semibold text-gray-900 mb-1">Action Plan:</p>
                              {Array.isArray(issue.action_plan) ? (
                                <ol className="text-sm text-gray-700 list-decimal list-inside">
                                  {issue.action_plan.map((step, i) => (
                                    <li key={i} className="mb-1">{step}</li>
                                  ))}
                                </ol>
                              ) : (
                                <p className="text-sm text-gray-700">{issue.action_plan}</p>
                              )}
                            </div>
                          )}
                          {issue.priority && (
                            <div className="mt-2">
                              <Badge className="bg-purple-600 text-white">
                                Priority: {issue.priority}
                              </Badge>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Usage Information */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <h4 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
                        <Eye className="w-4 h-4" />
                        Where Used
                      </h4>
                      <ul className="text-sm text-blue-800 space-y-1">
                        {func.usage.where_used.map((location, idx) => (
                          <li key={idx}>• {location}</li>
                        ))}
                      </ul>
                      <p className="text-xs text-blue-700 mt-3">
                        <strong>Call Frequency:</strong> {func.usage.call_frequency}
                      </p>
                    </div>

                    <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                      <h4 className="font-bold text-purple-900 mb-2 flex items-center gap-2">
                        <Database className="w-4 h-4" />
                        Dependencies
                      </h4>
                      {func.dependencies.secrets.length > 0 && (
                        <div className="mb-2">
                          <p className="text-xs text-purple-700 font-semibold">Secrets:</p>
                          <ul className="text-xs text-purple-800">
                            {func.dependencies.secrets.map((secret, idx) => (
                              <li key={idx}>🔑 {secret}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {func.dependencies.functions.length > 0 && (
                        <div className="mb-2">
                          <p className="text-xs text-purple-700 font-semibold">Functions:</p>
                          <ul className="text-xs text-purple-800">
                            {func.dependencies.functions.map((fn, idx) => (
                              <li key={idx}>⚡ {fn}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {func.dependencies.entities.length > 0 && (
                        <div>
                          <p className="text-xs text-purple-700 font-semibold">Entities:</p>
                          <ul className="text-xs text-purple-800">
                            {func.dependencies.entities.map((entity, idx) => (
                              <li key={idx}>📋 {entity}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Recommendations */}
                  {func.recommendations.length > 0 && (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <h4 className="font-bold text-yellow-900 mb-2 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" />
                        Recommendations
                      </h4>
                      <ul className="text-sm text-yellow-800 space-y-1">
                        {func.recommendations.map((rec, idx) => (
                          <li key={idx}>💡 {typeof rec === 'string' ? rec : rec.description}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Critical Notes */}
                  {func.critical_notes && (
                    <div className={`p-4 border-2 rounded-lg ${
                      func.critical_notes.includes('✅') ? 'bg-green-50 border-green-300' :
                      func.critical_notes.includes('⚠️') ? 'bg-yellow-50 border-yellow-300' :
                      func.critical_notes.includes('🔴') ? 'bg-red-50 border-red-300' :
                      'bg-gray-50 border-gray-300'
                    }`}>
                      <h4 className="font-bold mb-2 flex items-center gap-2">
                        <Info className="w-4 h-4" />
                        Critical Notes
                      </h4>
                      <p className="text-sm">{func.critical_notes}</p>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Recommendations Summary */}
      <Card className="border-2 border-purple-300">
        <CardHeader className="bg-purple-50 border-b">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Strategic Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="p-4 bg-red-50 border-l-4 border-red-500">
            <h4 className="font-bold text-red-900 mb-2">🔴 URGENT (IMMEDIATE)</h4>
            <ul className="space-y-2 text-red-800 text-sm">
              <li>• <strong>Fix Urgent Shift Broadcast:</strong> Debug why sendSMS/sendWhatsApp not receiving calls from broadcast flow (highest priority)</li>
              <li>• <strong>Integrate criticalChangeNotifier:</strong> Connect to edit workflows for fraud prevention</li>
            </ul>
          </div>

          <div className="p-4 bg-orange-50 border-l-4 border-orange-500">
            <h4 className="font-bold text-orange-900 mb-2">🟠 HIGH (NEXT SPRINT)</h4>
            <ul className="space-y-2 text-orange-800 text-sm">
              <li>• <strong>Consolidate Daily Digest Functions:</strong> Merge emailAutomationEngine + staffDailyDigestEngine to prevent duplicates</li>
              <li>• <strong>Consolidate Validation Functions:</strong> Review intelligentTimesheetValidator + autoTimesheetApprovalEngine overlap</li>
              <li>• <strong>Clarify WhatsApp Routing:</strong> Document relationship between whatsappMasterRouter + whatsappTimesheetHandler</li>
            </ul>
          </div>

          <div className="p-4 bg-yellow-50 border-l-4 border-yellow-500">
            <h4 className="font-bold text-yellow-900 mb-2">🟡 MEDIUM (BACKLOG)</h4>
            <ul className="space-y-2 text-yellow-800 text-sm">
              <li>• <strong>Review Escalation Overlap:</strong> urgentShiftEscalation vs smartEscalationEngine - consolidate if duplicative</li>
              <li>• <strong>Revert Testing Mode:</strong> paymentReminderEngine is in test mode (10-min intervals) - revert to production timing</li>
              <li>• <strong>Integrate OR Archive Orphaned Features:</strong> Make decisions on aiShiftMatcher, enhancedWhatsAppOffers, clientCommunicationAutomation</li>
            </ul>
          </div>

          <div className="p-4 bg-blue-50 border-l-4 border-blue-500">
            <h4 className="font-bold text-blue-900 mb-2">🔵 LOW (CLEANUP)</h4>
            <ul className="space-y-2 text-blue-800 text-sm">
              <li>• <strong>Archive Diagnostic Functions:</strong> pingTest1, pingTest2 can be removed after deployment stable</li>
              <li>• <strong>Archive Unused AI Features:</strong> generateShiftDescription, extractDocumentDates if not needed</li>
              <li>• <strong>Archive Unused Automations:</strong> shiftVerificationChain if client communication not required</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Testing Status */}
      <Card>
        <CardHeader className="border-b bg-gray-50">
          <CardTitle>Testing & Verification Status</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-3">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-semibold">Overall Testing Coverage</span>
                <span className="text-sm">{stats.tested}/{stats.total} functions tested</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div 
                  className="bg-green-600 h-4 rounded-full transition-all"
                  style={{ width: `${(stats.tested / stats.total * 100).toFixed(0)}%` }}
                ></div>
              </div>
            </div>

            <Alert className="bg-amber-50 border-amber-300">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <AlertDescription className="text-amber-900">
                <strong>Testing Priority:</strong> Focus on high-priority functions first. Critical communication functions (sendSMS, sendWhatsApp) need immediate end-to-end testing in broadcast flow.
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>

      {/* Architecture Insights */}
      <Card className="border-2 border-cyan-300">
        <CardHeader className="bg-cyan-50 border-b">
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Architecture & Design Patterns
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div>
            <h4 className="font-bold text-gray-900 mb-2">✅ STRENGTHS</h4>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• <strong>Separation of Concerns:</strong> Communication, automation, validation clearly separated</li>
              <li>• <strong>Robust Error Handling:</strong> Most functions have comprehensive try/catch and logging</li>
              <li>• <strong>Feature Toggles:</strong> Agency settings control automation features (good for rollback)</li>
              <li>• <strong>Security-First:</strong> Financial locks, immutable snapshots, ChangeLog audit trails</li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-gray-900 mb-2">⚠️ AREAS FOR IMPROVEMENT</h4>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• <strong>Function Proliferation:</strong> {stats.total} functions is high - consolidation opportunities exist</li>
              <li>• <strong>Orphaned Features:</strong> {stats.orphaned} functions built but not integrated - technical debt</li>
              <li>• <strong>Duplicate Logic:</strong> {stats.duplicates} potential duplicates identified - creates confusion</li>
              <li>• <strong>Testing Gap:</strong> Only {Math.round((stats.tested / stats.total) * 100)}% tested - need comprehensive test suite</li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-gray-900 mb-2">🎯 STRATEGIC PRIORITIES</h4>
            <ol className="text-sm text-gray-700 space-y-2 list-decimal list-inside">
              <li><strong>Fix Urgent Notification Flow:</strong> Highest priority - critical for operations</li>
              <li><strong>Consolidate Duplicates:</strong> Reduce function count, improve maintainability</li>
              <li><strong>Archive Orphaned Functions:</strong> Clean up unused code</li>
              <li><strong>Integration Audit:</strong> Ensure all active functions properly connected</li>
              <li><strong>Comprehensive Testing:</strong> End-to-end tests for critical flows</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}