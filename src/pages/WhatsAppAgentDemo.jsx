import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, CheckCircle2, Clock, Sparkles } from "lucide-react";

export default function WhatsAppAgentDemo() {
  const conversations = [
    {
      type: "staff",
      messages: [
        { sender: "staff", text: "Hi, I'm looking for shifts this weekend", time: "10:23 AM" },
        { sender: "ai", text: "Hi Chidi! 👋 Let me check available shifts for you this weekend...", time: "10:23 AM" },
        { sender: "ai", text: "I found 3 shifts that match your profile:\n\n1️⃣ Castle Bank - Saturday Night (8pm-8am)\n   💰 £14.75/hr • 🕒 11 hours\n\n2️⃣ Riverside Care - Sunday Day (8am-8pm)\n   💰 £14.75/hr • 🕒 12 hours\n\n3️⃣ Manor House - Sunday Night (8pm-8am)\n   💰 £14.75/hr • 🕒 11 hours\n\nReply with the number to accept!", time: "10:23 AM" },
        { sender: "staff", text: "1", time: "10:24 AM" },
        { sender: "ai", text: "✅ Perfect! I've booked you for:\n📍 Castle Bank Residential Home\n📅 Saturday, June 7th\n🕐 20:00 - 08:00 (11 hours)\n💷 £162.25\n\nConfirmation email sent! See you there! 🎉", time: "10:24 AM" }
      ]
    },
    {
      type: "admin",
      messages: [
        { sender: "admin", text: "Urgent: Need cover for Castle Bank tonight 8pm-8am", time: "2:15 PM" },
        { sender: "ai", text: "🚨 Emergency shift detected!\n\nSearching for available staff within 10 miles...", time: "2:15 PM" },
        { sender: "ai", text: "Found 5 qualified staff:\n✓ Sent SMS alerts\n✓ Sent WhatsApp messages\n✓ Sent in-app notifications\n\nTracking responses in real-time...", time: "2:15 PM" },
        { sender: "ai", text: "✅ Chidi Okonkwo accepted (2:17 PM)\n\nShift confirmed! Staff notified. Client notification sent.\n\nTotal time: 2 minutes ⚡", time: "2:17 PM" },
        { sender: "admin", text: "Who's working at Castle Bank tomorrow?", time: "3:30 PM" },
        { sender: "ai", text: "📋 Castle Bank - Tomorrow (June 6th):\n\n🌅 Day Shift (8am-8pm):\n   • Amara Nwankwo\n\n🌙 Night Shift (8pm-8am):\n   • Ebuka Adeyemi\n\nBoth confirmed ✓", time: "3:30 PM" }
      ]
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 via-teal-600 to-cyan-600 text-white p-8 rounded-xl">
        <div className="flex items-center gap-3 mb-3">
          <MessageSquare className="w-10 h-10" />
          <h1 className="text-3xl font-bold">WhatsApp AI Agent</h1>
          <Badge className="bg-white/20 text-white border-white/30">Phase 2 Preview</Badge>
        </div>
        <p className="text-green-100 text-lg">
          Your staff and admins manage everything via WhatsApp. No app needed. No training required.
        </p>
      </div>

      {/* Value Proposition */}
      <Card className="border-2 border-green-300 bg-green-50">
        <CardContent className="p-6">
          <h3 className="text-2xl font-bold text-gray-900 mb-3 flex items-center gap-2">
            <Sparkles className="w-7 h-7 text-green-600" />
            Why This Changes Everything
          </h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <h4 className="font-bold text-gray-900 mb-2">For Staff</h4>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
                  <span>Find shifts via WhatsApp (platform they already use)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
                  <span>Accept shifts with one message</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
                  <span>Check schedule anytime</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
                  <span>Upload documents via photo</span>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-gray-900 mb-2">For Admins</h4>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
                  <span>Post shifts via text message</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
                  <span>Get instant staff availability</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
                  <span>Emergency broadcasts in seconds</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
                  <span>Ask questions in natural language</span>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-gray-900 mb-2">For Your Business</h4>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
                  <span>98% staff adoption (everyone uses WhatsApp)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
                  <span>50% faster shift fills</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
                  <span>Zero training required</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
                  <span>24/7 availability (AI never sleeps)</span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Live Conversation Examples */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Staff Conversation */}
        <Card className="border-2 border-green-300">
          <CardHeader className="bg-green-50 border-b">
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-green-600" />
              Staff Experience
            </CardTitle>
            <p className="text-sm text-gray-600">Chidi finding and accepting weekend shifts</p>
          </CardHeader>
          <CardContent className="p-4">
            <div className="bg-[#E5DDD5] rounded-lg p-4 min-h-[500px]">
              {conversations[0].messages.map((msg, idx) => (
                <div key={idx} className={`mb-3 flex ${msg.sender === 'staff' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] ${msg.sender === 'staff' ? 'bg-[#DCF8C6]' : 'bg-white'} rounded-lg p-3 shadow-sm`}>
                    <p className="text-sm text-gray-900 whitespace-pre-line">{msg.text}</p>
                    <p className="text-xs text-gray-500 mt-1 text-right">{msg.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Admin Conversation */}
        <Card className="border-2 border-cyan-300">
          <CardHeader className="bg-cyan-50 border-b">
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-cyan-600" />
              Admin Experience
            </CardTitle>
            <p className="text-sm text-gray-600">Manager filling urgent shift + checking schedule</p>
          </CardHeader>
          <CardContent className="p-4">
            <div className="bg-[#E5DDD5] rounded-lg p-4 min-h-[500px]">
              {conversations[1].messages.map((msg, idx) => (
                <div key={idx} className={`mb-3 flex ${msg.sender === 'admin' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] ${msg.sender === 'admin' ? 'bg-[#DCF8C6]' : 'bg-white'} rounded-lg p-3 shadow-sm`}>
                    <p className="text-sm text-gray-900 whitespace-pre-line">{msg.text}</p>
                    <p className="text-xs text-gray-500 mt-1 text-right">{msg.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Technical Capabilities */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle>What The AI Can Do</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid md:grid-cols-4 gap-4">
            <div className="p-4 border rounded-lg bg-gradient-to-br from-green-50 to-teal-50">
              <Clock className="w-8 h-8 text-green-600 mb-3" />
              <h4 className="font-bold text-gray-900 mb-2">Shift Management</h4>
              <p className="text-sm text-gray-600">Browse, accept, cancel shifts. Check your schedule.</p>
            </div>
            <div className="p-4 border rounded-lg bg-gradient-to-br from-blue-50 to-cyan-50">
              <MessageSquare className="w-8 h-8 text-blue-600 mb-3" />
              <h4 className="font-bold text-gray-900 mb-2">Natural Chat</h4>
              <p className="text-sm text-gray-600">Ask questions in plain English. No commands to memorize.</p>
            </div>
            <div className="p-4 border rounded-lg bg-gradient-to-br from-purple-50 to-pink-50">
              <CheckCircle2 className="w-8 h-8 text-purple-600 mb-3" />
              <h4 className="font-bold text-gray-900 mb-2">Document Upload</h4>
              <p className="text-sm text-gray-600">Send photos of certificates. AI extracts dates automatically.</p>
            </div>
            <div className="p-4 border rounded-lg bg-gradient-to-br from-orange-50 to-red-50">
              <Sparkles className="w-8 h-8 text-orange-600 mb-3" />
              <h4 className="font-bold text-gray-900 mb-2">Smart Matching</h4>
              <p className="text-sm text-gray-600">AI finds best shifts based on your preferences and history.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <Card className="border-2 border-purple-300 bg-purple-50">
        <CardContent className="p-6">
          <h3 className="text-xl font-bold text-purple-900 mb-4">Expected Impact (Based on Industry Data)</h3>
          <div className="grid md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-4xl font-bold text-purple-600">98%</p>
              <p className="text-sm text-gray-700 mt-1">Staff Adoption Rate</p>
              <p className="text-xs text-gray-500">(Everyone uses WhatsApp)</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold text-purple-600">15min</p>
              <p className="text-sm text-gray-700 mt-1">Avg. Shift Fill Time</p>
              <p className="text-xs text-gray-500">(vs 4 hours traditionally)</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold text-purple-600">£0</p>
              <p className="text-sm text-gray-700 mt-1">Training Costs</p>
              <p className="text-xs text-gray-500">(Intuitive interface)</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold text-purple-600">24/7</p>
              <p className="text-sm text-gray-700 mt-1">Availability</p>
              <p className="text-xs text-gray-500">(AI never takes breaks)</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}