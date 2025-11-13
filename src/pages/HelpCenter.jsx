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