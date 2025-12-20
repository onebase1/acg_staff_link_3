import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Target, TrendingUp, Zap, CheckCircle, DollarSign, Users,
  Calendar, Shield, MessageSquare, BarChart3, Copy, Sparkles, 
  Mic, Building2, Briefcase, PlayCircle, AlertTriangle, 
  FileText, ChevronRight, Clock, Phone, Mail, Linkedin
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useAuth } from "@/hooks/useAuth.jsx";

export default function PitchCommandCenter() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [copiedSection, setCopiedSection] = useState(null);
  const [activeTab, setActiveTab] = useState("quick-ref");

  // Super admin check
  const isSuperAdmin = useMemo(
    () => !!user && (user.email === "g.basera@yahoo.com" || user.user_type === "super_admin"),
    [user]
  );

  const copyToClipboard = (text, sectionName) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionName);
    toast.success(`${sectionName} copied to clipboard!`);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  // Core messaging data
  const coreMessaging = {
    oneLiner: "I help healthcare staffing agencies fill shifts in 90 seconds instead of 45 minutes—using WhatsApp and AI, not phone calls and spreadsheets.",
    passion: "I'm obsessed with eliminating soul-destroying repetitive work. I built ACG StaffLink because I watched coordinators burn out doing tasks a machine should handle.",
    problem: "Healthcare staffing agencies run on 1995 technology—manual calls, spreadsheets, WhatsApp groups. Staff spend 40% of their time on admin instead of care. Agencies lose money, coordinators burn out, and compliance gets missed.",
    solution: "One WhatsApp message goes to 200 eligible staff. First to confirm gets it. Compliance auto-checked. Timesheet auto-collected. 90% of the admin disappears.",
    proof: "One person can now manage what used to take 5 coordinators. That's not theory—that's what I built and tested."
  };

  // Hooks by audience
  const hooks = {
    agencyOwner: {
      title: "Agency Owner Hooks",
      icon: Building2,
      color: "cyan",
      hooks: [
        {
          name: "The Lived Frustration ⭐",
          recommended: true,
          text: "I worked in healthcare staffing for years. And I watched the same thing happen every week: someone calls in sick, you spend 45 minutes making phone calls, and half the time you still can't fill the shift.\n\nThat's not a process problem. That's a broken system.\n\nSo I built something to fix it."
        },
        {
          name: "The Revenue Leak",
          text: "Most agencies I talk to don't realize they're losing £15,000 or more every year just from slow shift fills and missed shifts.\n\nNot because they're bad at their job—because the tools they're using were designed for 1995.\n\nI built something for 2025."
        },
        {
          name: "The Coordinator Burnout",
          text: "You know that feeling when your best coordinator hands in their notice? They're not leaving because of money. They're leaving because the job is 80% phone calls and admin chaos.\n\nI built something to fix that."
        }
      ]
    },
    partner: {
      title: "Partner Hooks",
      icon: Briefcase,
      color: "purple",
      hooks: [
        {
          name: "The Competitive Urgency ⭐",
          recommended: true,
          text: "Your customers are going to start asking: 'When are you adding AI shift filling?'\n\nSome of your competitors are already shipping it—badly.\n\nYou have maybe 6 months before this becomes table stakes. I can help you get there first."
        },
        {
          name: "The Revenue Opportunity",
          text: "What if your platform could offer white-label AI shift filling? Your customers wouldn't build it themselves. They'd buy it from you. That's a feature that increases NRR and reduces churn."
        }
      ]
    },
    investor: {
      title: "Investor Hooks",
      icon: TrendingUp,
      color: "green",
      hooks: [
        {
          name: "The 30-Second Sequence ⭐",
          recommended: true,
          text: "Healthcare staffing is a £69 billion market. 85% still runs on phone calls and spreadsheets.\n\nI've spent 2 years rebuilding staffing from scratch with AI. One person can now manage 500 staff.\n\n2,000+ UK agencies in our target. 8:1 LTV:CAC at pilot scale. £200k gets us to £50k MRR by Q3 2026."
        }
      ]
    }
  };

  // Key numbers
  const keyNumbers = [
    { label: "Manual fill time", value: "45 min", color: "red" },
    { label: "With ACG StaffLink", value: "90 sec", color: "green" },
    { label: "Small agency loss", value: "£15k/yr", color: "orange" },
    { label: "Medium agency loss", value: "£73k/yr", color: "orange" },
    { label: "Large agency loss", value: "£298k/yr", color: "red" },
    { label: "UK agencies on spreadsheets", value: "45%", color: "blue" },
    { label: "Global market", value: "£69B", color: "purple" },
    { label: "Target LTV:CAC", value: "8:1", color: "green" }
  ];

  // Objection handling
  const objections = [
    {
      objection: "We're happy with our current system",
      response: "That's great—sounds like things are working. Out of curiosity, how long does it typically take to fill an urgent shift?\n\n[If they give a number > 5 minutes]\n\nWhat would it mean for your operation if that dropped to under 2 minutes?"
    },
    {
      objection: "We've tried software before, it didn't work",
      response: "I hear that a lot. Most staffing software asks staff to download an app, log in, check portals. That's why it fails—staff don't use it.\n\nWe work through WhatsApp. Your staff already have it. No training, no new app, no passwords. That's why adoption is near 100%."
    },
    {
      objection: "My staff won't use technology",
      response: "That's exactly why we built this on WhatsApp. Your staff already send messages every day. They don't need to learn anything new.\n\nThey get one message: 'Shift available. Reply YES to accept.' That's it."
    },
    {
      objection: "It's too expensive",
      response: "How many shifts do you miss per month? At £300 each, even 2 missed shifts is £7,200/year.\n\nWe cost a fraction of that. It pays for itself month one."
    },
    {
      objection: "I need to think about it",
      response: "Of course. Can I ask—what specifically do you need to think through?\n\n[Listen, then address their specific concern]"
    }
  ];

  // Demo flow
  const demoSteps = [
    { step: 1, title: "Create the Shift", description: "Show PostShiftV2 - create an urgent HCA shift", page: "PostShiftV2" },
    { step: 2, title: "The Broadcast", description: "Click broadcast - WhatsApp goes to all eligible staff", page: "Shifts" },
    { step: 3, title: "Compliance Auto-Check", description: "Show how DBS, training verified before staff can accept", page: "ComplianceTracker" },
    { step: 4, title: "Timesheet & Invoice", description: "GPS check-in, one-click invoice generation", page: "GenerateInvoices" }
  ];

  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Access Restricted</h2>
            <p className="text-gray-600">This page is only accessible to super admins.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Mic className="w-8 h-8 text-purple-600" />
            Pitch Command Center
          </h1>
          <p className="text-gray-600 mt-1">Your complete sales toolkit—hooks, objections, demos, and key numbers</p>
        </div>
        <Badge variant="outline" className="text-purple-600 border-purple-300">
          <Sparkles className="w-3 h-3 mr-1" />
          Super Admin Only
        </Badge>
      </div>

      {/* Quick Reference Card */}
      <Card className="border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-white">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-purple-800">
            <Sparkles className="w-5 h-5" />
            Core Messaging (Memorize These)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(coreMessaging).map(([key, value]) => (
            <div key={key} className="flex items-start gap-3 p-3 bg-white rounded-lg border">
              <div className="flex-1">
                <span className="text-xs font-semibold text-purple-600 uppercase">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                <p className="text-gray-800 mt-1">{value}</p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => copyToClipboard(value, key)}
                className={copiedSection === key ? "text-green-600" : ""}
              >
                {copiedSection === key ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="quick-ref">Key Numbers</TabsTrigger>
          <TabsTrigger value="hooks">Opening Hooks</TabsTrigger>
          <TabsTrigger value="objections">Objection Handling</TabsTrigger>
          <TabsTrigger value="demo">Demo Flow</TabsTrigger>
        </TabsList>

        {/* Key Numbers Tab */}
        <TabsContent value="quick-ref" className="mt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {keyNumbers.map((num, idx) => (
              <Card key={idx} className="text-center">
                <CardContent className="p-4">
                  <p className="text-sm text-gray-600">{num.label}</p>
                  <p className={`text-2xl font-bold text-${num.color}-600`}>{num.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Hooks Tab */}
        <TabsContent value="hooks" className="mt-4 space-y-6">
          {Object.entries(hooks).map(([key, section]) => (
            <Card key={key}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <section.icon className={`w-5 h-5 text-${section.color}-600`} />
                  {section.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {section.hooks.map((hook, idx) => (
                  <div key={idx} className={`p-4 rounded-lg border ${hook.recommended ? 'border-green-300 bg-green-50' : 'bg-gray-50'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-gray-800">{hook.name}</span>
                      <Button size="sm" variant="ghost" onClick={() => copyToClipboard(hook.text, hook.name)}>
                        {copiedSection === hook.name ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                    <p className="text-gray-700 whitespace-pre-line text-sm">{hook.text}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Objections Tab */}
        <TabsContent value="objections" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-orange-600" />
                Common Objections & Responses
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {objections.map((obj, idx) => (
                <div key={idx} className="p-4 bg-gray-50 rounded-lg border">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-red-700">"{obj.objection}"</p>
                    <Button size="sm" variant="ghost" onClick={() => copyToClipboard(obj.response, obj.objection)}>
                      {copiedSection === obj.objection ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                  <p className="text-gray-700 mt-2 whitespace-pre-line text-sm">{obj.response}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Demo Flow Tab */}
        <TabsContent value="demo" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PlayCircle className="w-5 h-5 text-blue-600" />
                Live Demo Flow (4 Steps)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {demoSteps.map((step) => (
                  <div key={step.step} className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                      {step.step}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{step.title}</p>
                      <p className="text-sm text-gray-600">{step.description}</p>
                    </div>
                    <Button size="sm" onClick={() => navigate(createPageUrl(step.page))}>
                      Open <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
