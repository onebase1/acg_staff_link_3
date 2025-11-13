import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Sparkles, CheckCircle, MessageSquare, MapPin } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { InvokeLLM } from '@/api/integrations';

export default function NaturalLanguageShiftRequest({ clients = [], staff = [], currentAgency, onClose }) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversation, setConversation] = useState([]);
  const [parsedShift, setParsedShift] = useState(null);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  const queryClient = useQueryClient();

  // ✅ FIXED: Use correct API endpoint
  const createMutation = useMutation({
    mutationFn: async (shiftData) => {
      console.log('🚀 Creating shift with data:', shiftData);
      const { data, error } = await supabase
        .from('shifts')
        .insert(shiftData)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['shifts']);
      queryClient.invalidateQueries(['marketplace-shifts']);
      toast.success('✅ Shift created successfully!');
      onClose();
    },
    onError: (error) => {
      console.error('❌ Shift creation failed:', error);
      toast.error(`Failed to create shift: ${error.message}`);
    }
  });

  const handleSubmit = async () => {
    if (!input.trim()) {
      toast.error('Please enter shift details');
      return;
    }

    setLoading(true);
    
    const userMessage = { role: 'user', content: input };
    setConversation(prev => [...prev, userMessage]);

    try {
      // ✅ ENHANCED: More detailed client info in prompt
      const clientsInfo = clients.map(c => {
        const locations = c.internal_locations || [];
        const locationsList = locations.length > 0 
          ? locations.map(loc => `"${loc}"`).join(', ')
          : 'No locations defined';
        
        return `
**${c.name}** (${c.type})
  - Location Required: ${c.contract_terms?.require_location_specification ? '⚠️ YES - MUST specify room' : 'Optional'}
  - Available Rooms/Units: ${locationsList}
  - Day Shift: ${c.contract_terms?.default_shift_times?.day_shift?.start_time || '08:00'} - ${c.contract_terms?.default_shift_times?.day_shift?.end_time || '20:00'}
  - Night Shift: ${c.contract_terms?.default_shift_times?.night_shift?.start_time || '20:00'} - ${c.contract_terms?.default_shift_times?.night_shift?.end_time || '08:00'}
  - Break: ${c.contract_terms?.break_duration_minutes || 0} mins`;
      }).join('\n\n');

      const systemPrompt = `You are an intelligent shift scheduling assistant for a UK healthcare staffing agency.

**CRITICAL CONTEXT - CLIENT CONTRACTS:**
${clientsInfo}

**YOUR JOB:**
1. **Extract shift details** from user's natural language request
2. **Ask clarifying questions** if critical information is missing
3. **Suggest defaults** from client contracts when applicable
4. **CRITICAL: Validate location** - If client requires location, you MUST ask for room/unit from the available list
5. **Use EXACT room names** from available rooms - don't invent rooms that aren't in the list
6. **Be conversational** - don't just extract data, engage naturally

**CONVERSATION HISTORY:**
${conversation.map(msg => `${msg.role}: ${msg.content}`).join('\n')}

**USER'S LATEST REQUEST:**
${input}

**RESPONSE FORMAT:**
If you have enough information, respond with JSON:
{
  "ready": true,
  "shift_data": {
    "client_name": "...",
    "role_required": "nurse|care_worker|hca|senior_care_worker",
    "date": "YYYY-MM-DD",
    "start_time": "HH:MM",
    "end_time": "HH:MM",
    "duration_hours": 12,
    "work_location_within_site": "Room 14" (MUST be from available rooms list),
    "urgency": "normal|urgent|critical",
    "notes": "..."
  },
  "confidence_score": 85,
  "assumptions_made": ["Used default day shift times", "Suggested Room 14 as available location"]
}

If you need more information, respond with JSON:
{
  "ready": false,
  "message": "I've noted you need a nurse at Divine Care Centre tomorrow. Which room will they be working in? (Available: Room 10, Room 11, Room 12, Room 13, Room 14)",
  "missing_fields": ["work_location_within_site"]
}

**IMPORTANT:** When suggesting rooms, ONLY use rooms from the "Available Rooms/Units" list for that client. Don't invent room numbers!`;

      const llmRawResponse = await InvokeLLM({
        prompt: systemPrompt,
        response_json_schema: {
          type: 'object',
          properties: {
            ready: { type: 'boolean' },
            message: { type: 'string' },
            shift_data: { type: 'object' },
            missing_fields: { type: 'array', items: { type: 'string' } },
            confidence_score: { type: 'number' },
            assumptions_made: { type: 'array', items: { type: 'string' } }
          }
        }
      });

      const llmResponse = llmRawResponse?.data ?? llmRawResponse;
      console.log('🤖 AI Response:', llmResponse);

      const aiMessage = { 
        role: 'assistant', 
        content: llmResponse.message || 'Processing...',
        data: llmResponse
      };
      setConversation(prev => [...prev, aiMessage]);

      if (llmResponse.ready) {
        setParsedShift({
            ...llmResponse.shift_data,
            confidence: llmResponse.confidence_score 
        });
        setNeedsConfirmation(true);
        toast.success('✅ Shift details extracted! Please review and confirm.');
      } else {
        toast.info('💬 AI asking for more details...');
      }

      setInput('');

    } catch (error) {
      console.error('❌ AI parsing error:', error);
      toast.error(`Failed to process request: ${error.message}`);
      
      setConversation(prev => [...prev, {
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error.message}. Could you try rephrasing your request?`
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmCreate = async () => {
    if (!parsedShift) {
      toast.error('No shift data to create');
      return;
    }

    console.log('🔍 Parsed shift data:', parsedShift);
    console.log('🔍 Available clients:', clients.map(c => ({ id: c.id, name: c.name })));

    // ✅ FIXED: Better client lookup with multiple fallbacks
    let client = clients.find(c => 
      c.name.toLowerCase() === parsedShift.client_name.toLowerCase()
    );

    if (!client) {
      // Fallback: partial match
      client = clients.find(c => 
        c.name.toLowerCase().includes(parsedShift.client_name.toLowerCase()) ||
        parsedShift.client_name.toLowerCase().includes(c.name.toLowerCase())
      );
    }

    if (!client) {
      console.error('❌ Client not found:', parsedShift.client_name);
      console.error('Available clients:', clients.map(c => c.name));
      toast.error(`Client "${parsedShift.client_name}" not found. Available: ${clients.map(c => c.name).join(', ')}`);
      return;
    }

    console.log('✅ Found client:', client.name, client.id);

    // ✅ Build complete shift data
    const shiftData = {
      agency_id: currentAgency,
      client_id: client.id,
      role_required: parsedShift.role_required,
      date: parsedShift.date,
      start_time: parsedShift.start_time,
      end_time: parsedShift.end_time,
      duration_hours: parsedShift.duration_hours,
      work_location_within_site: parsedShift.work_location_within_site,
      urgency: parsedShift.urgency || 'normal',
      notes: parsedShift.notes || null,
      status: 'open',
      shift_journey_log: [
        {
          state: 'created',
          timestamp: new Date().toISOString(),
          method: 'ai_natural_language',
          source: 'NaturalLanguageShiftRequest'
        }
      ],
      pay_rate: client.contract_terms?.rates_by_role?.[parsedShift.role_required]?.pay_rate || 0,
      charge_rate: client.contract_terms?.rates_by_role?.[parsedShift.role_required]?.charge_rate || 0
    };

    // ✅ VALIDATION: Check required fields
    const requiredFields = ['client_id', 'role_required', 'date', 'start_time', 'end_time'];
    const missingFields = requiredFields.filter(field => !shiftData[field]);
    
    if (missingFields.length > 0) {
      toast.error(`Missing required fields: ${missingFields.join(', ')}`);
      return;
    }

    // ✅ VALIDATION: Check location if required
    if (client.contract_terms?.require_location_specification) {
      if (!shiftData.work_location_within_site?.trim()) {
        toast.error(`${client.name} requires specific work location. Please specify a room.`);
        return;
      }

      // Validate location is in approved list
      const approvedLocations = client.internal_locations || [];
      if (approvedLocations.length > 0 && !approvedLocations.includes(shiftData.work_location_within_site)) {
        const confirmOverride = window.confirm(
          `⚠️ WARNING: "${shiftData.work_location_within_site}" is not in ${client.name}'s approved locations.\n\n` +
          `Approved locations: ${approvedLocations.join(', ')}\n\n` +
          `Continue anyway?`
        );
        
        if (!confirmOverride) {
          toast.error('Shift creation cancelled - invalid location');
          return;
        }
      }
    }

    console.log('🚀 Final shift data being submitted:', shiftData);

    try {
      await createMutation.mutateAsync(shiftData);
      setParsedShift(null);
      setNeedsConfirmation(false);
    } catch (error) {
      console.error('❌ Shift creation failed:', error);
      toast.error(`Shift creation failed: ${error.message}`);
    }
  };

  return (
    <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
      <CardHeader className="border-b bg-white/50">
        <CardTitle className="flex items-center gap-2 text-purple-900">
          <Sparkles className="w-5 h-5" />
          AI Shift Assistant (Contract-Aware)
        </CardTitle>
        <p className="text-sm text-gray-600 mt-1">
          💬 Describe your shift naturally - I'll ask questions if needed and suggest defaults from client contracts
        </p>
      </CardHeader>

      <CardContent className="p-6 space-y-4">
        {/* Conversation History */}
        {conversation.length > 0 && (
          <div className="space-y-3 max-h-[400px] overflow-y-auto mb-4 p-4 bg-white rounded-lg">
            {conversation.map((msg, idx) => (
              <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-3 rounded-lg ${
                  msg.role === 'user' 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-gray-100 text-gray-900'
                }`}>
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  
                  {msg.data?.assumptions_made && msg.data.assumptions_made.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-300">
                      <p className="text-xs font-semibold mb-1">💡 Assumptions Made:</p>
                      <ul className="text-xs space-y-1">
                        {msg.data.assumptions_made.map((assumption, i) => (
                          <li key={i}>• {assumption}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Input Area */}
        {!needsConfirmation && (
          <div className="space-y-3">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g., 'Need a nurse at Divine Care tomorrow 8am-8pm in Room 13' or 'Urgent: Care worker for night shift'"
              rows={3}
              className="resize-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
            />
            <Button 
              onClick={handleSubmit} 
              disabled={loading || !input.trim()}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  AI Processing...
                </>
              ) : (
                <>
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Send Message
                </>
              )}
            </Button>
          </div>
        )}

        {/* Confirmation View */}
        {needsConfirmation && parsedShift && (
          <div className="space-y-4">
            <Alert className="border-green-300 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-900">
                <strong>✅ Shift details extracted!</strong> Please review and confirm:
              </AlertDescription>
            </Alert>

            <div className="bg-white p-4 rounded-lg space-y-3 border-2 border-green-200">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-600">Client:</span>
                  <p className="font-semibold">{parsedShift.client_name}</p>
                </div>
                <div>
                  <span className="text-gray-600">Role:</span>
                  <p className="font-semibold capitalize">{parsedShift.role_required?.replace('_', ' ')}</p>
                </div>
                <div>
                  <span className="text-gray-600">Date:</span>
                  <p className="font-semibold">{parsedShift.date}</p>
                </div>
                <div>
                  <span className="text-gray-600">Time:</span>
                  <p className="font-semibold">{parsedShift.start_time} - {parsedShift.end_time}</p>
                </div>
                <div>
                  <span className="text-gray-600">Duration:</span>
                  <p className="font-semibold">{parsedShift.duration_hours}h</p>
                </div>
                <div>
                  <span className="text-gray-600">Urgency:</span>
                  <Badge className={parsedShift.urgency === 'urgent' ? 'bg-orange-500' : 'bg-gray-500'}>
                    {parsedShift.urgency}
                  </Badge>
                </div>
                {parsedShift.work_location_within_site && (
                  <div className="col-span-2">
                    <span className="text-gray-600 flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> Location:
                    </span>
                    <p className="font-semibold">📍 {parsedShift.work_location_within_site}</p>
                  </div>
                )}
                {parsedShift.notes && (
                  <div className="col-span-2">
                    <span className="text-gray-600">Notes:</span>
                    <p className="font-semibold">{parsedShift.notes}</p>
                  </div>
                )}
              </div>

              {parsedShift.confidence && (
                <div className="pt-3 border-t">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">AI Confidence:</span>
                    <Badge variant="outline">
                      {parsedShift.confidence}%
                    </Badge>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => {
                  setParsedShift(null);
                  setNeedsConfirmation(false);
                  toast.info('Shift cancelled - start over if needed');
                }}
                disabled={createMutation.isPending}
              >
                Cancel
              </Button>
              <Button 
                className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600"
                onClick={handleConfirmCreate}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating Shift...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Confirm & Create Shift
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Helper Text */}
        {!needsConfirmation && conversation.length === 0 && (
          <div className="text-xs text-gray-500 space-y-1">
            <p className="font-semibold">💡 Examples:</p>
            <ul className="space-y-1 ml-4">
              <li>• "Need a nurse at Divine Care tomorrow 8am-8pm in Room 13"</li>
              <li>• "Urgent night shift, care worker needed at Room 14"</li>
              <li>• "Day shift next Monday for senior care worker"</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}