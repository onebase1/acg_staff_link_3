import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, MessageSquare, Sparkles, Send, CheckCircle, AlertTriangle, Calendar, Clock, MapPin, Briefcase, DollarSign, Trash2, Edit2, Info } from "lucide-react";
import { toast } from "sonner";
import { InvokeLLM } from "@/api/integrations";

export default function NaturalLanguageShiftCreator() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [userInput, setUserInput] = useState('');
  const [conversationHistory, setConversationHistory] = useState([]);
  const [extractedShifts, setExtractedShifts] = useState([]); // ✅ Changed to array for multiple shifts
  const [isProcessing, setIsProcessing] = useState(false);
  const [validationWarnings, setValidationWarnings] = useState([]);

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data, error } = await supabase.from('clients').select('*');
      if (error) {
        console.error('❌ Error fetching clients:', error);
        return [];
      }
      return data || [];
    },
    initialData: []
  });

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (authError || !authUser) {
        throw authError || new Error('Not authenticated');
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (profileError) {
        throw profileError;
      }

      return profile;
    },
  });

  const createShiftMutation = useMutation({
    mutationFn: async (shiftData) => {
      const payload = {
        ...shiftData,
        agency_id: user.agency_id,
        status: 'open',
        shift_journey_log: [{
          state: 'created',
          timestamp: new Date().toISOString(),
          user_id: user.id,
          method: 'ai_natural_language'
        }]
      };

      const { data, error } = await supabase
        .from('shifts')
        .insert(payload)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['shifts']);
    }
  });

  // ✅ NEW: Create multiple shifts at once
  const createMultipleShiftsMutation = useMutation({
    mutationFn: async (shiftsArray) => {
      const payload = shiftsArray.map(shiftData => ({
        ...shiftData,
        agency_id: user.agency_id,
        status: 'open',
        shift_journey_log: [{
          state: 'created',
          timestamp: new Date().toISOString(),
          user_id: user.id,
          method: 'ai_natural_language'
        }]
      }));

      const { data, error } = await supabase
        .from('shifts')
        .insert(payload)
        .select();

      if (error) {
        throw error;
      }

      return data || [];
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries(['shifts']);
      toast.success(`✅ Created ${results.length} shift${results.length > 1 ? 's' : ''} successfully!`);
      setTimeout(() => navigate(createPageUrl('Shifts')), 1500);
    },
    onError: (error) => {
      toast.error(`Failed: ${error.message}`);
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userInput.trim()) return;

    const userMessage = userInput.trim();
    setUserInput('');
    setIsProcessing(true);

    const updatedHistory = [...conversationHistory, { role: 'user', content: userMessage }];
    setConversationHistory(updatedHistory);

    try {
      const clientNames = clients.map(c => c.name).join(', ');
      const today = new Date().toISOString().split('T')[0];

      // ✅ FIXED: Updated system prompt to create SHIFTS, not bookings
      const systemPrompt = `You are a helpful AI assistant for a healthcare staffing agency. Your job is to help admin staff CREATE OPEN SHIFTS through natural conversation.

**CRITICAL: You create SHIFTS, NOT bookings. Shifts start as "open" and admin assigns staff later.**

Available clients: ${clientNames}
Today's date: ${today}

When the user provides shift details, extract:
1. **client_name** (must match one of the available clients)
2. **date** (in YYYY-MM-DD format, interpret "tomorrow", "next Monday", etc.)
3. **start_time** (in HH:MM format, 24-hour, e.g., "08:00", "14:00", "20:00")
4. **end_time** (in HH:MM format, 24-hour, e.g., "20:00", "08:00" for overnight)
5. **role_required** (must be one of: "nurse", "care_worker", "hca", "senior_care_worker")
6. **urgency** ("normal", "urgent", or "critical")
7. **work_location_within_site** (e.g., "Room 14", "Room 20", "Lounge") - optional but recommended
8. **quantity** (how many separate shifts? e.g., "3 HCA" = 3 separate shifts for HCA role)

**IMPORTANT RULES:**
- If user says "3 HCA", create 3 SEPARATE shifts (not 1 shift with 3 staff)
- Each shift is independent and can be assigned to different staff
- Do NOT ask for staff names - shifts are created as "open"
- Calculate duration_hours from start/end times (handle overnight shifts correctly)

If information is missing, ask follow-up questions naturally.

When you have ALL required information, respond with JSON array:
{
  "complete": true,
  "shifts": [
    {
      "client_name": "Divine Care Centre",
      "date": "2025-11-23",
      "start_time": "08:00",
      "end_time": "20:00",
      "duration_hours": 12,
      "role_required": "hca",
      "urgency": "normal",
      "work_location_within_site": "Room 14"
    },
    {
      "client_name": "Divine Care Centre",
      "date": "2025-11-23",
      "start_time": "08:00",
      "end_time": "20:00",
      "duration_hours": 12,
      "role_required": "hca",
      "urgency": "normal",
      "work_location_within_site": "Room 15"
    }
  ]
}

Otherwise, respond conversationally to gather missing info.`;

      const response = await InvokeLLM({
        prompt: `${systemPrompt}\n\nConversation history:\n${updatedHistory.map(m => `${m.role}: ${m.content}`).join('\n')}\n\nRespond naturally or with JSON if complete.`,
        add_context_from_internet: false
      });

      let aiResponse = response?.data ?? response;

      // Check if response is JSON (complete extraction)
      try {
        const parsed = typeof aiResponse === 'string' ? JSON.parse(aiResponse) : aiResponse;
        
        if (parsed.complete && parsed.shifts && Array.isArray(parsed.shifts)) {
          // ✅ Process multiple shifts
          const processedShifts = [];

          for (const shiftData of parsed.shifts) {
            // Match client
            const matchedClient = clients.find(c => 
              c.name.toLowerCase().includes(shiftData.client_name.toLowerCase()) ||
              shiftData.client_name.toLowerCase().includes(c.name.toLowerCase())
            );

            if (!matchedClient) {
              setConversationHistory([...updatedHistory, {
                role: 'assistant',
                content: `I couldn't find "${shiftData.client_name}" in our client list. Available clients are: ${clientNames}. Which one did you mean?`
              }]);
              setIsProcessing(false);
              return;
            }

            // Get rates from client contract
            const contractRates = matchedClient.contract_terms?.rates_by_role?.[shiftData.role_required];

            processedShifts.push({
              client_id: matchedClient.id,
              client_name: matchedClient.name,
              date: shiftData.date,
              start_time: shiftData.start_time,
              end_time: shiftData.end_time,
              duration_hours: shiftData.duration_hours,
              role_required: shiftData.role_required,
              urgency: shiftData.urgency || 'normal',
              work_location_within_site: shiftData.work_location_within_site || null,
              pay_rate: contractRates?.pay_rate || 0,
              charge_rate: contractRates?.charge_rate || 0
            });
          }

          // ✅ NEW: Validate shifts and show warnings
          const warnings = validateShifts(processedShifts);
          setValidationWarnings(warnings);

          setExtractedShifts(processedShifts);
          setConversationHistory([...updatedHistory, {
            role: 'assistant',
            content: `Perfect! I've extracted ${processedShifts.length} shift${processedShifts.length > 1 ? 's' : ''}. ${warnings.length > 0 ? `Found ${warnings.length} item(s) to review.` : 'Everything looks good!'} Review below and confirm to create.`
          }]);
          setIsProcessing(false);
          return;
        }
      } catch (e) {
        // Not JSON, continue with conversational response
      }

      // Add AI response to conversation
      setConversationHistory([...updatedHistory, {
        role: 'assistant',
        content: typeof aiResponse === 'string' ? aiResponse : aiResponse.message || 'Could you provide more details?'
      }]);
      setIsProcessing(false);

    } catch (error) {
      console.error('AI Error:', error);

      // ✅ IMPROVED: Better error messages based on error type
      let errorMessage = 'Sorry, I encountered an error. Please try again.';

      if (error.message?.includes('timeout')) {
        errorMessage = '⏱️ Request timed out. The AI is taking longer than usual. Please try again with a simpler request.';
      } else if (error.message?.includes('rate limit')) {
        errorMessage = '⚠️ High demand right now. Please wait a moment and try again.';
      } else if (error.message?.includes('network')) {
        errorMessage = '📡 Connection issue detected. Please check your internet and try again.';
      } else if (error.message?.includes('Unauthorized')) {
        errorMessage = '🔒 Session expired. Please refresh the page and try again.';
      }

      setConversationHistory([...updatedHistory, {
        role: 'assistant',
        content: errorMessage
      }]);
      setIsProcessing(false);
      toast.error(errorMessage);
    }
  };

  const handleConfirmCreate = () => {
    if (!extractedShifts || extractedShifts.length === 0) return;
    createMultipleShiftsMutation.mutate(extractedShifts);
  };

  const getUrgencyColor = (urgency) => {
    if (urgency === 'urgent') return 'bg-orange-100 text-orange-800 border-orange-300';
    if (urgency === 'critical') return 'bg-red-100 text-red-800 border-red-300';
    return 'bg-gray-100 text-gray-800 border-gray-300';
  };

  // ✅ NEW: Validate extracted shifts and generate warnings
  const validateShifts = (shifts) => {
    const warnings = [];
    const today = new Date().toISOString().split('T')[0];

    shifts.forEach((shift, idx) => {
      // Check for missing location
      if (!shift.work_location_within_site) {
        const client = clients.find(c => c.id === shift.client_id);
        if (client?.contract_terms?.require_location_specification) {
          warnings.push({
            shiftIndex: idx,
            type: 'error',
            message: `Shift ${idx + 1}: ${client.name} requires specific work location`
          });
        } else {
          warnings.push({
            shiftIndex: idx,
            type: 'warning',
            message: `Shift ${idx + 1}: No location specified`
          });
        }
      }

      // Check for zero rates
      if (shift.pay_rate === 0 || shift.charge_rate === 0) {
        warnings.push({
          shiftIndex: idx,
          type: 'warning',
          message: `Shift ${idx + 1}: Rates are £0 - check client contract configuration`
        });
      }

      // Check for past dates
      if (shift.date < today) {
        warnings.push({
          shiftIndex: idx,
          type: 'error',
          message: `Shift ${idx + 1}: Date is in the past (${shift.date})`
        });
      }

      // Check for overnight shifts
      if (shift.end_time < shift.start_time) {
        warnings.push({
          shiftIndex: idx,
          type: 'info',
          message: `Shift ${idx + 1}: Overnight shift detected (ends next day)`
        });
      }

      // Check for weekend shifts
      const shiftDate = new Date(shift.date);
      const dayOfWeek = shiftDate.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        warnings.push({
          shiftIndex: idx,
          type: 'info',
          message: `Shift ${idx + 1}: Weekend shift - verify premium rates apply`
        });
      }
    });

    return warnings;
  };

  // ✅ NEW: Example prompts for quick start
  const examplePrompts = [
    "Need 3 HCA for Divine Care tomorrow 8am-8pm, Room 14, 15, and 20",
    "Urgent night shift tonight at St Mary's, nurse required",
    "Day shifts Monday through Friday next week, care worker",
    "2 senior care workers for weekend, 12-hour shifts"
  ];

  const handleExampleClick = (example) => {
    setUserInput(example);
  };

  const handleDeleteShift = (index) => {
    const updated = extractedShifts.filter((_, idx) => idx !== index);
    setExtractedShifts(updated);
    setValidationWarnings(validateShifts(updated));
    toast.success(`Shift ${index + 1} removed`);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-purple-600" />
          AI Shift Creator
        </h2>
        <p className="text-gray-600 mt-1">
          Describe your shift needs naturally - I'll extract the details and create open shifts
        </p>
      </div>

      {/* Conversation */}
      <Card className="min-h-[400px] flex flex-col">
        <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-pink-50">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Conversation
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 p-6 space-y-4 overflow-y-auto max-h-[500px]">
          {conversationHistory.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              <Sparkles className="w-12 h-12 text-purple-500 mx-auto mb-4" />
              <p className="text-lg mb-4 font-semibold text-gray-700">👋 Hi! I'm your AI shift assistant.</p>
              <p className="text-sm mb-4 text-gray-600">Click an example below or describe your shift needs:</p>

              {/* ✅ NEW: Clickable Example Prompts */}
              <div className="grid gap-2 max-w-2xl mx-auto">
                {examplePrompts.map((example, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleExampleClick(example)}
                    className="text-left px-4 py-3 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition-colors group"
                  >
                    <div className="flex items-start gap-2">
                      <Sparkles className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700 group-hover:text-purple-900">
                        "{example}"
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {conversationHistory.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-lg px-4 py-2 ${
                msg.role === 'user' 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-gray-100 text-gray-900'
              }`}>
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}

          {isProcessing && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-lg px-4 py-2 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm text-gray-600">Thinking...</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ✅ NEW: Table View of Extracted Shifts */}
      {extractedShifts.length > 0 && (
        <Card className="border-2 border-green-300 bg-green-50">
          <CardHeader className="border-b bg-green-100">
            <CardTitle className="text-green-900 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              {extractedShifts.length} Shift{extractedShifts.length > 1 ? 's' : ''} Ready to Create
              {validationWarnings.length > 0 && (
                <Badge className="ml-2 bg-amber-100 text-amber-800 border-amber-300">
                  {validationWarnings.filter(w => w.type === 'error').length > 0 ? '⚠️' : 'ℹ️'} {validationWarnings.length} item{validationWarnings.length > 1 ? 's' : ''} to review
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {/* ✅ NEW: Validation Warnings */}
            {validationWarnings.length > 0 && (
              <Alert className={`mb-4 ${validationWarnings.some(w => w.type === 'error') ? 'border-red-300 bg-red-50' : 'border-amber-300 bg-amber-50'}`}>
                <AlertTriangle className={`h-4 w-4 ${validationWarnings.some(w => w.type === 'error') ? 'text-red-600' : 'text-amber-600'}`} />
                <AlertDescription className="text-sm">
                  <div className="font-semibold mb-2">
                    {validationWarnings.some(w => w.type === 'error') ? '⚠️ Issues Found:' : 'ℹ️ Items to Review:'}
                  </div>
                  <ul className="space-y-1 ml-4">
                    {validationWarnings.map((warning, idx) => (
                      <li key={idx} className={`text-xs ${
                        warning.type === 'error' ? 'text-red-800' :
                        warning.type === 'warning' ? 'text-amber-800' :
                        'text-blue-800'
                      }`}>
                        {warning.message}
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
            {/* Table View */}
            <div className="overflow-x-auto mb-6">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-white border-b-2 border-green-300">
                    <th className="text-left p-3 text-sm font-semibold text-gray-700">#</th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-700">Client</th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-700">Location</th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-700">Date</th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-700">Time</th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-700">Role</th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-700">Urgency</th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-700">Rates</th>
                    <th className="text-center p-3 text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {extractedShifts.map((shift, idx) => (
                    <tr key={idx} className="border-b border-green-200 bg-white hover:bg-green-50">
                      <td className="p-3 text-sm font-mono text-gray-600">{idx + 1}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-green-600" />
                          <span className="font-semibold text-gray-900">{shift.client_name}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        {shift.work_location_within_site ? (
                          <Badge className="bg-cyan-100 text-cyan-800 border-cyan-300">
                            📍 {shift.work_location_within_site}
                          </Badge>
                        ) : (
                          <span className="text-xs text-amber-600 italic flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Not specified
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2 text-sm text-gray-800">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          {shift.date}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2 text-sm text-gray-800">
                          <Clock className="w-4 h-4 text-gray-400" />
                          {shift.start_time} - {shift.end_time}
                          <span className="text-xs text-gray-500">({shift.duration_hours}h)</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Briefcase className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-800 capitalize font-medium">
                            {shift.role_required.replace('_', ' ')}
                          </span>
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge className={getUrgencyColor(shift.urgency)}>
                          {shift.urgency === 'critical' && '🚨 '}
                          {shift.urgency === 'urgent' && '⚠️ '}
                          {shift.urgency.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <div className="text-xs space-y-1">
                          <div className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3 text-green-600" />
                            <span className="text-gray-700">Pay: £{shift.pay_rate}/hr</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3 text-blue-600" />
                            <span className="text-gray-700">Charge: £{shift.charge_rate}/hr</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteShift(idx)}
                          className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600"
                          title="Delete this shift"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary Stats */}
            <div className="grid md:grid-cols-3 gap-4 mb-6 p-4 bg-white rounded-lg border-2 border-green-200">
              <div className="text-center">
                <p className="text-sm text-gray-600">Total Shifts</p>
                <p className="text-2xl font-bold text-green-600">{extractedShifts.length}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Total Hours</p>
                <p className="text-2xl font-bold text-green-600">
                  {extractedShifts.reduce((sum, s) => sum + s.duration_hours, 0)}h
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Total Staff Cost</p>
                <p className="text-2xl font-bold text-green-600">
                  £{extractedShifts.reduce((sum, s) => sum + (s.pay_rate * s.duration_hours), 0).toFixed(2)}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={handleConfirmCreate}
                disabled={
                  createMultipleShiftsMutation.isPending ||
                  validationWarnings.some(w => w.type === 'error')
                }
                className="flex-1 bg-green-600 hover:bg-green-700 h-12 text-base disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createMultipleShiftsMutation.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Creating {extractedShifts.length} Shift{extractedShifts.length > 1 ? 's' : ''}...
                  </>
                ) : validationWarnings.some(w => w.type === 'error') ? (
                  <>
                    <AlertTriangle className="w-5 h-5 mr-2" />
                    Fix Errors Before Creating
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Confirm & Create {extractedShifts.length} Shift{extractedShifts.length > 1 ? 's' : ''}
                  </>
                )}
              </Button>
              <Button 
                variant="outline"
                onClick={() => {
                  setExtractedShifts([]);
                  setConversationHistory([]);
                }}
                className="flex-1 h-12 text-base"
                disabled={createMultipleShiftsMutation.isPending}
              >
                Start Over
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Input Form */}
      {extractedShifts.length === 0 && (
        <form onSubmit={handleSubmit} className="flex gap-3">
          <Textarea
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder='E.g., "Need 3 HCA for Divine Care tomorrow 9am-5pm" or ask "What clients do we have?"'
            rows={2}
            className="flex-1"
            disabled={isProcessing}
          />
          <Button 
            type="submit" 
            disabled={!userInput.trim() || isProcessing}
            className="bg-purple-600 hover:bg-purple-700 h-auto"
          >
            {isProcessing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </form>
      )}
    </div>
  );
}