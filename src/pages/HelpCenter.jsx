import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search, HelpCircle, Book, MessageSquare, Phone, Mail,
  Clock, Calendar, Users, Shield, AlertTriangle, CheckCircle,
  ChevronDown, ChevronRight, Rocket, FileText
} from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function HelpCenter() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user: authUser }, error } = await supabase.auth.getUser();
      if (!error && authUser) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single();
        
        if (profile) setUser(profile);
      }
    };
    fetchUser();
  }, []);

  const categories = [
    { id: 'all', name: 'All Topics', icon: HelpCircle, count: 0 },
    { id: 'getting-started', name: 'Getting Started', icon: Rocket, count: 3 },
    { id: 'shifts', name: 'Shifts & Bookings', icon: Calendar, count: 5 },
    { id: 'timesheets', name: 'Timesheets', icon: Clock, count: 4 },
    { id: 'gps', name: 'GPS Tracking', icon: FileText, count: 6 },
    { id: 'compliance', name: 'Compliance & Documents', icon: Shield, count: 4 },
    { id: 'portal', name: 'Staff Portal', icon: Users, count: 4 },
    { id: 'technical', name: 'Technical Issues', icon: AlertTriangle, count: 3 }
  ];

  const faqs = [
    {
      id: 'getting-started-1',
      category: 'getting-started',
      question: 'How do I log in for the first time?',
      answer: `
        <p>You should have received an invitation email with a link to create your account.</p>
        <ol class="list-decimal pl-6 mt-3 space-y-2">
          <li>Click the link in your invitation email</li>
          <li>Create a secure password</li>
          <li>Complete your profile information</li>
          <li>Upload required documents (if applicable)</li>
        </ol>
        <p class="mt-3"><strong>Didn't receive an email?</strong> Check your spam folder or contact your agency admin.</p>
      `,
      tags: ['login', 'password', 'first-time', 'invitation']
    },
    {
      id: 'getting-started-uninvited',
      category: 'getting-started',
      question: '⏳ I signed up but my account says "Under Review" - what does this mean?',
      answer: `
        <div class="bg-yellow-50 p-4 rounded-lg border border-yellow-200 mb-4">
          <h4 class="font-bold text-yellow-900 mb-3">⏳ Account Under Review</h4>
          <p class="text-sm text-yellow-800 mb-3">Your account is awaiting approval from an agency administrator. This happens when you sign up without an invitation.</p>

          <p class="text-sm text-yellow-800 mb-2"><strong>What this means:</strong></p>
          <ul class="list-disc pl-6 text-sm text-yellow-800 space-y-1">
            <li>You can log in and view the profile setup page</li>
            <li>You cannot access any dashboards or features yet</li>
            <li>An administrator has been notified of your signup</li>
            <li>You will be assigned to an agency and given a role</li>
          </ul>
        </div>

        <div class="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-4">
          <h4 class="font-bold text-blue-900 mb-3">⏱️ How long does approval take?</h4>
          <p class="text-sm text-blue-800">Typically within 1-2 business days. The super admin will review your details and assign you to the appropriate agency.</p>
        </div>

        <div class="bg-green-50 p-4 rounded-lg border border-green-200">
          <h4 class="font-bold text-green-900 mb-3">✅ After Approval</h4>
          <p class="text-sm text-green-800 mb-2">Once approved, you'll be able to:</p>
          <ul class="list-disc pl-6 text-sm text-green-800 space-y-1">
            <li>Access your assigned dashboard (Staff Portal, Client Portal, or Admin Dashboard)</li>
            <li>Complete your profile setup</li>
            <li>Upload compliance documents (if staff)</li>
            <li>View shifts, timesheets, and other features</li>
          </ul>
          <p class="text-sm text-green-800 mt-3"><strong>Note:</strong> You will NOT receive an email notification when approved. Simply try logging in again after 1-2 days.</p>
        </div>
      `,
      tags: ['signup', 'pending', 'approval', 'under review', 'uninvited']
    },
    {
      id: 'timesheets-upload',
      category: 'timesheets',
      question: '📤 How do I upload my timesheet?',
      answer: `
        <div class="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-4">
          <h4 class="font-bold text-blue-900 mb-3">📤 Uploading Your Timesheet</h4>
          <ol class="list-decimal pl-6 text-sm text-blue-800 space-y-2">
            <li>Take a clear photo of your completed, signed timesheet</li>
            <li>Go to <strong>Staff Portal → Timesheets</strong></li>
            <li>Click on the timesheet for the shift you just completed</li>
            <li>Click the <strong>"Upload Doc"</strong> button</li>
            <li>Select your photo or PDF</li>
            <li>Wait for AI to process (extracts hours, signatures, dates)</li>
            <li>Check confirmation message</li>
          </ol>
        </div>
        
        <div class="bg-green-50 p-3 rounded-lg border border-green-200 mt-4">
          <p class="text-sm text-green-900"><strong>✅ After Shift Reminder:</strong> You'll receive a WhatsApp + Email reminder when your shift ends, with a link to upload your timesheet!</p>
        </div>
      `,
      tags: ['timesheet', 'upload', 'document', 'submission']
    },
    {
      id: 'timesheets-reminder',
      category: 'timesheets',
      question: '🔔 When will I get a reminder to upload my timesheet?',
      answer: `
        <p class="mb-4">After your shift ends, you'll automatically receive:</p>
        
        <div class="space-y-3">
          <div class="flex items-start gap-3">
            <div class="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
              <MessageSquare class="w-4 h-4 text-green-600" />
            </div>
            <div>
              <p class="font-semibold text-green-900">WhatsApp Message</p>
              <p class="text-sm text-gray-600">Reminder with link to Staff Portal</p>
            </div>
          </div>
          
          <div class="flex items-start gap-3">
            <div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Mail class="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p class="font-semibold text-blue-900">Email</p>
              <p class="text-sm text-gray-600">Detailed reminder with shift info and upload instructions</p>
            </div>
          </div>
        </div>
        
        <div class="bg-yellow-50 p-3 rounded-lg border border-yellow-200 mt-4">
          <p class="text-sm text-yellow-900"><strong>⚠️ Important:</strong> Timesheets must be submitted within 48 hours of shift completion.</p>
        </div>
      `,
      tags: ['reminder', 'notification', 'timesheet', 'whatsapp', 'email']
    },
    {
      id: 'timesheets-ai',
      category: 'timesheets',
      question: '🤖 What does "AI Confidence Score" mean?',
      answer: `
        <p class="mb-4">When you upload a timesheet, our AI reads the document and assigns a confidence score:</p>
        
        <div class="space-y-3">
          <div class="flex items-start gap-3">
            <div class="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
              <span class="text-green-600 font-bold">80+%</span>
            </div>
            <div>
              <p class="font-semibold text-green-900">High Confidence</p>
              <p class="text-sm text-gray-600">AI is confident the data is accurate. No action needed.</p>
            </div>
          </div>
          
          <div class="flex items-start gap-3">
            <div class="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
              <span class="text-yellow-600 font-bold">60-79%</span>
            </div>
            <div>
              <p class="font-semibold text-yellow-900">Medium Confidence</p>
              <p class="text-sm text-gray-600">Admin will review to confirm accuracy.</p>
            </div>
          </div>
          
          <div class="flex items-start gap-3">
            <div class="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <span class="text-red-600 font-bold">&lt;60%</span>
            </div>
            <div>
              <p class="font-semibold text-red-900">Low Confidence</p>
              <p class="text-sm text-gray-600">Admin will contact you if clarification is needed.</p>
            </div>
          </div>
        </div>
        
        <div class="bg-blue-50 p-3 rounded-lg border border-blue-200 mt-4">
          <p class="text-sm text-blue-900"><strong>💡 Tip:</strong> Take clear, well-lit photos with visible signatures to get higher confidence scores!</p>
        </div>
      `,
      tags: ['ai', 'confidence', 'ocr', 'accuracy']
    },
    // GPS FAQs
    {
      id: 'gps-what-is',
      category: 'gps',
      question: '📍 What is GPS timesheet tracking?',
      answer: `
        <div class="bg-green-50 p-4 rounded-lg border border-green-200 mb-4">
          <h4 class="font-bold text-green-900 mb-3">📍 GPS Timesheet Tracking</h4>
          <p class="text-sm text-green-800 mb-3">GPS tracking automatically creates your timesheet when you clock in and out using your phone's location.</p>

          <p class="text-sm text-green-800 mb-2"><strong>How it works:</strong></p>
          <ol class="list-decimal pl-6 text-sm text-green-800 space-y-2">
            <li>You arrive at the client location</li>
            <li>Open Staff Portal → My Shifts → Click "Clock In"</li>
            <li>App captures your GPS location and validates you're within 100m of the client</li>
            <li>Work your shift</li>
            <li>Click "Clock Out" when finished</li>
            <li>Timesheet automatically created with actual start/end times</li>
            <li>Timesheet auto-approved if GPS validated</li>
            <li>Shift auto-completed - ready for payment!</li>
          </ol>
        </div>

        <div class="bg-blue-50 p-3 rounded-lg border border-blue-200">
          <p class="text-sm text-blue-900"><strong>✅ Benefits:</strong> No manual timesheet upload, instant approval, faster payment!</p>
        </div>
      `,
      tags: ['gps', 'tracking', 'location', 'clock-in', 'clock-out', 'automatic']
    },
    {
      id: 'gps-upload-required',
      category: 'gps',
      question: '📤 Do I need to upload a timesheet if I used GPS?',
      answer: `
        <div class="bg-green-50 p-4 rounded-lg border-2 border-green-300 mb-4">
          <h4 class="font-bold text-green-900 mb-3">✅ NO - GPS Timesheets Are Automatic!</h4>
          <p class="text-sm text-green-800 mb-3">If you successfully clocked in and out with GPS, your timesheet is automatically created and submitted. <strong>No upload needed!</strong></p>

          <p class="text-sm text-green-800 mb-2"><strong>You'll receive a confirmation message:</strong></p>
          <div class="bg-white p-3 rounded border border-green-200 font-mono text-sm text-green-900 mt-2">
            ✅ SHIFT COMPLETE: Your shift at [Client] has ended.<br><br>
            🎯 GPS STAFF - NO ACTION NEEDED!<br>
            Your timesheet was auto-created from GPS clock-in/out.<br>
            Status: Submitted for approval
          </div>
        </div>

        <div class="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h4 class="font-bold text-blue-900 mb-3">📋 Optional: Upload Paper Timesheet as Backup</h4>
          <p class="text-sm text-blue-800 mb-2">Even though GPS timesheets are automatic, you can still upload a paper timesheet if you have one:</p>
          <ul class="list-disc pl-6 text-sm text-blue-800 space-y-1">
            <li>Provides extra evidence for disputes</li>
            <li>Shows client signature</li>
            <li>Useful if GPS data is questioned</li>
          </ul>
          <p class="text-sm text-blue-800 mt-2"><strong>How:</strong> Go to Staff Portal → Timesheets → Click your timesheet → Upload Document</p>
        </div>
      `,
      tags: ['gps', 'upload', 'timesheet', 'automatic', 'no action needed']
    },
    {
      id: 'gps-forgot-clock-out',
      category: 'gps',
      question: '⚠️ What if I forgot to clock out?',
      answer: `
        <div class="bg-yellow-50 p-4 rounded-lg border border-yellow-200 mb-4">
          <h4 class="font-bold text-yellow-900 mb-3">⚠️ Forgot to Clock Out</h4>
          <p class="text-sm text-yellow-800 mb-3">If you forgot to clock out, your timesheet won't be automatically created.</p>

          <p class="text-sm text-yellow-800 mb-2"><strong>What to do:</strong></p>
          <ol class="list-decimal pl-6 text-sm text-yellow-800 space-y-2">
            <li><strong>Clock out as soon as you remember</strong> (even if it's late)</li>
            <li>If too late, <strong>contact your admin immediately</strong></li>
            <li>Provide your estimated end time</li>
            <li>Admin will manually complete your timesheet</li>
            <li>Upload a paper timesheet as backup evidence</li>
          </ol>
        </div>

        <div class="bg-red-50 p-4 rounded-lg border border-red-200">
          <h4 class="font-bold text-red-900 mb-3">🔋 Phone Battery Died?</h4>
          <p class="text-sm text-red-800 mb-2">Same process:</p>
          <ol class="list-decimal pl-6 text-sm text-red-800 space-y-1">
            <li>Charge phone and clock out ASAP</li>
            <li>If too late, contact admin with estimated time</li>
            <li>Admin will manually complete timesheet</li>
            <li>Upload paper timesheet as backup</li>
          </ol>
        </div>
      `,
      tags: ['gps', 'forgot', 'clock-out', 'battery', 'phone died']
    },
    {
      id: 'gps-rejection',
      category: 'gps',
      question: '❌ Why was my GPS timesheet rejected?',
      answer: `
        <div class="bg-red-50 p-4 rounded-lg border border-red-200 mb-4">
          <h4 class="font-bold text-red-900 mb-3">❌ Common GPS Rejection Reasons</h4>

          <div class="space-y-3">
            <div class="bg-white p-3 rounded border border-red-200">
              <p class="font-semibold text-red-900 mb-1">1. Geofence Validation Failed</p>
              <p class="text-sm text-red-800"><strong>Reason:</strong> You were more than 100m from the client location</p>
              <p class="text-sm text-red-800 mt-1"><strong>Fix:</strong> Make sure you're at the correct location before clocking in/out. If client address is wrong, contact admin.</p>
            </div>

            <div class="bg-white p-3 rounded border border-red-200">
              <p class="font-semibold text-red-900 mb-1">2. Missing Clock-In or Clock-Out</p>
              <p class="text-sm text-red-800"><strong>Reason:</strong> You forgot to clock in or clock out</p>
              <p class="text-sm text-red-800 mt-1"><strong>Fix:</strong> Contact admin immediately with estimated times. Upload paper timesheet.</p>
            </div>

            <div class="bg-white p-3 rounded border border-red-200">
              <p class="font-semibold text-red-900 mb-1">3. Overtime Detected</p>
              <p class="text-sm text-red-800"><strong>Reason:</strong> You worked more hours than scheduled (e.g., 12.5 hours instead of 12)</p>
              <p class="text-sm text-red-800 mt-1"><strong>Fix:</strong> Admin will review and approve overtime if authorized by client.</p>
            </div>
          </div>
        </div>

        <div class="bg-blue-50 p-3 rounded-lg border border-blue-200">
          <p class="text-sm text-blue-900"><strong>💡 Tip:</strong> Always check for the "Clock-in successful" message before starting your shift!</p>
        </div>
      `,
      tags: ['gps', 'rejected', 'failed', 'geofence', 'overtime']
    },
    {
      id: 'gps-turn-off',
      category: 'gps',
      question: '📱 Can I turn off GPS after clocking in?',
      answer: `
        <div class="bg-green-50 p-4 rounded-lg border-2 border-green-300 mb-4">
          <h4 class="font-bold text-green-900 mb-3">✅ YES - GPS Only Captured at Clock-In/Out</h4>
          <p class="text-sm text-green-800 mb-3">GPS is <strong>NOT</strong> tracked continuously during your shift. It's only captured when you click "Clock In" and "Clock Out".</p>

          <p class="text-sm text-green-800 mb-2"><strong>What this means:</strong></p>
          <ul class="list-disc pl-6 text-sm text-green-800 space-y-1">
            <li>✅ You can turn off GPS/location services during your shift</li>
            <li>✅ You can turn off your phone completely</li>
            <li>✅ Your location is NOT tracked while working</li>
            <li>⚠️ You MUST turn GPS back on before clocking out</li>
          </ul>
        </div>

        <div class="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h4 class="font-bold text-blue-900 mb-3">📵 Care Home Requires Phones Off?</h4>
          <p class="text-sm text-blue-800 mb-2">No problem! Clock in/out at the entrance:</p>
          <ol class="list-decimal pl-6 text-sm text-blue-800 space-y-1">
            <li>Clock in at care home entrance (before entering ward)</li>
            <li>Turn off phone and work shift</li>
            <li>Clock out at care home entrance (after leaving ward)</li>
            <li>GPS validates location at entrance (still within 100m)</li>
            <li>Timesheet auto-created successfully ✅</li>
          </ol>
        </div>
      `,
      tags: ['gps', 'turn off', 'location', 'privacy', 'phones off']
    },
    {
      id: 'gps-consent',
      category: 'gps',
      question: '🔒 How do I grant GPS consent?',
      answer: `
        <div class="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-4">
          <h4 class="font-bold text-blue-900 mb-3">🔒 Granting GPS Consent</h4>
          <p class="text-sm text-blue-800 mb-3">GPS consent is required to use automatic GPS timesheets. It's a one-time setup.</p>

          <p class="text-sm text-blue-800 mb-2"><strong>How to grant consent:</strong></p>
          <ol class="list-decimal pl-6 text-sm text-blue-800 space-y-2">
            <li>Go to <strong>Staff Portal → My Profile</strong></li>
            <li>Scroll to <strong>"GPS Consent"</strong> section</li>
            <li>Read the consent statement</li>
            <li>Check the box: "I consent to GPS tracking for timesheet verification"</li>
            <li>Click <strong>"Save"</strong></li>
          </ol>
        </div>

        <div class="bg-green-50 p-4 rounded-lg border border-green-200 mb-4">
          <h4 class="font-bold text-green-900 mb-3">✅ What GPS Consent Allows</h4>
          <ul class="list-disc pl-6 text-sm text-green-800 space-y-1">
            <li>Capture your location when you click "Clock In"</li>
            <li>Capture your location when you click "Clock Out"</li>
            <li>Validate you're within 100m of client location</li>
            <li>Automatically create timesheets from GPS data</li>
          </ul>
        </div>

        <div class="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
          <p class="text-sm text-yellow-900"><strong>⚠️ Privacy:</strong> GPS is ONLY captured at clock-in/out. Your location is NOT tracked continuously during shifts.</p>
        </div>
      `,
      tags: ['gps', 'consent', 'privacy', 'permission', 'location']
    },
    {
      id: 'shifts-confirm',
      category: 'shifts',
      question: 'How do I confirm a shift?',
      answer: `
        <p>When you're assigned a shift, you'll receive notifications via:</p>
        <ul class="list-disc pl-6 mt-3 space-y-2">
          <li><strong>Email:</strong> Detailed shift information</li>
          <li><strong>SMS:</strong> Quick confirmation link</li>
          <li><strong>WhatsApp:</strong> Reply "YES" to confirm</li>
        </ul>
        <p class="mt-3">You can also confirm through the Staff Portal:</p>
        <ol class="list-decimal pl-6 mt-2 space-y-1">
          <li>Go to Staff Portal</li>
          <li>Find the shift in "Upcoming Shifts"</li>
          <li>Click "Confirm" button</li>
        </ol>
      `,
      tags: ['shift', 'confirm', 'accept', 'booking']
    },
    {
      id: 'compliance-upload',
      category: 'compliance',
      question: 'How do I upload compliance documents?',
      answer: `
        <p>Keep your documents up to date to remain eligible for shifts:</p>
        <ol class="list-decimal pl-6 mt-3 space-y-2">
          <li>Go to <strong>Staff Portal → My Compliance</strong></li>
          <li>Find the document that needs updating</li>
          <li>Click "Upload" next to the document</li>
          <li>Select your file (PDF, JPG, or PNG)</li>
          <li>Add expiry date if applicable</li>
          <li>Submit for verification</li>
        </ol>
        <div class="bg-yellow-50 p-3 rounded-lg border border-yellow-200 mt-4">
          <p class="text-sm text-yellow-900"><strong>⚠️ Reminder:</strong> You'll receive notifications 30, 14, and 7 days before documents expire.</p>
        </div>
      `,
      tags: ['compliance', 'documents', 'upload', 'dbs', 'training']
    },
    {
      id: 'portal-access',
      category: 'portal',
      question: 'I can\'t access the Staff Portal - what should I do?',
      answer: `
        <p>Try these troubleshooting steps:</p>
        <ol class="list-decimal pl-6 mt-3 space-y-2">
          <li><strong>Clear your browser cache:</strong> Try Ctrl+Shift+Delete (Windows) or Cmd+Shift+Delete (Mac)</li>
          <li><strong>Try a different browser:</strong> Chrome, Firefox, or Safari</li>
          <li><strong>Check your email for login link:</strong> Use the most recent invitation</li>
          <li><strong>Reset your password:</strong> Click "Forgot Password" on the login page</li>
        </ol>
        <p class="mt-3"><strong>Still having issues?</strong> Contact your agency admin for assistance.</p>
      `,
      tags: ['login', 'access', 'portal', 'troubleshooting']
    },
    {
      id: 'technical-mobile',
      category: 'technical',
      question: 'Can I use the portal on my mobile phone?',
      answer: `
        <p><strong>Yes!</strong> The Staff Portal is fully mobile-responsive and works on:</p>
        <ul class="list-disc pl-6 mt-3 space-y-2">
          <li>📱 iOS (iPhone, iPad)</li>
          <li>📱 Android (Samsung, Google Pixel, etc.)</li>
          <li>💻 Tablets</li>
          <li>💻 Desktop computers</li>
        </ul>
        <div class="bg-blue-50 p-3 rounded-lg border border-blue-200 mt-4">
          <p class="text-sm text-blue-900"><strong>💡 Tip:</strong> Add the portal to your home screen for quick access like an app!</p>
        </div>
      `,
      tags: ['mobile', 'phone', 'app', 'responsive']
    }
  ];

  const filteredFaqs = faqs.filter(faq => {
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
    const matchesSearch = searchTerm === '' || 
      faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faq.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Help Center</h2>
        <p className="text-gray-600 mt-1">
          Find answers to common questions and get support
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <Input
          placeholder="Search for help..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Categories */}
      <div className="grid md:grid-cols-4 gap-4">
        {categories.map(category => {
          const Icon = category.icon;
          const count = category.id === 'all' 
            ? faqs.length 
            : faqs.filter(f => f.category === category.id).length;

          return (
            <Card
              key={category.id}
              className={`cursor-pointer transition-all ${
                selectedCategory === category.id
                  ? 'border-cyan-500 bg-cyan-50'
                  : 'hover:border-gray-300'
              }`}
              onClick={() => setSelectedCategory(category.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 ${
                    selectedCategory === category.id ? 'text-cyan-600' : 'text-gray-400'
                  }`} />
                  <div>
                    <p className="font-semibold text-sm">{category.name}</p>
                    <p className="text-xs text-gray-500">{count} articles</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* FAQs */}
      <div className="space-y-3">
        {filteredFaqs.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <HelpCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No results found</h3>
              <p className="text-gray-600">
                Try adjusting your search or browse by category
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredFaqs.map(faq => (
            <Card key={faq.id} className="hover:shadow-md transition-shadow">
              <CardHeader
                className="cursor-pointer"
                onClick={() => setExpandedFaq(expandedFaq === faq.id ? null : faq.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      {faq.question}
                    </h3>
                    <div className="flex gap-2 mt-2">
                      {faq.tags.slice(0, 3).map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  {expandedFaq === faq.id ? (
                    <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0 ml-4" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0 ml-4" />
                  )}
                </div>
              </CardHeader>

              {expandedFaq === faq.id && (
                <CardContent className="border-t pt-4">
                  <div 
                    className="prose prose-sm max-w-none text-gray-700"
                    dangerouslySetInnerHTML={{ __html: faq.answer }}
                  />
                </CardContent>
              )}
            </Card>
          ))
        )}
      </div>

      {/* Contact Support */}
      <Card className="border-2 border-cyan-200 bg-gradient-to-r from-cyan-50 to-blue-50">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <MessageSquare className="w-8 h-8 text-cyan-600 flex-shrink-0" />
            <div>
              <h3 className="font-bold text-gray-900 mb-2">Still need help?</h3>
              <p className="text-gray-700 mb-4">
                Can't find what you're looking for? Contact your agency admin for personalized support.
              </p>
              <div className="flex gap-3">
                {user?.user_type !== 'staff_member' && (
                  <Button size="sm" className="gap-2">
                    <Mail className="w-4 h-4" />
                    Contact Support
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}