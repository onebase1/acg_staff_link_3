import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';
import { ArrowLeft, Sparkles, Send, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Import BulkShiftCreation components for reuse
import Step3PreviewTable from '@/components/bulk-shifts/Step3PreviewTable';
import { expandGridToShifts, prepareShiftsForInsert } from '@/utils/bulkShifts/shiftGenerator';
import { validateBulkShifts } from '@/utils/bulkShifts/validation';

// Import AI parser
import { conversationalExtraction, convertToGridData } from '@/utils/aiShiftParser';

export default function AIShiftPaste() {
  const navigate = useNavigate();
  const chatEndRef = useRef(null);
  
  const [user, setUser] = useState(null);
  const [currentAgency, setCurrentAgency] = useState(null);
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState([]);
  
  // Conversation state
  const [conversation, setConversation] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Extraction context
  const [context, setContext] = useState({
    client_id: null,
    client_name: null,
    client: null,
    role: null,
    month: null,
    year: null
  });
  
  // BulkShiftCreation state (for preview and creation)
  const [formData, setFormData] = useState(null);
  const [currentStep, setCurrentStep] = useState(1); // 1: Chat, 2: Preview, 3: Creating
  const [isCreating, setIsCreating] = useState(false);
  const [creationProgress, setCreationProgress] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [createdCount, setCreatedCount] = useState(0);

  // Auth check
  useEffect(() => {
    const checkAccess = async () => {
      try {
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

        if (authError || !authUser) {
          toast.error('Authentication failed. Please log in again.');
          navigate(createPageUrl('Home'));
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single();

        if (profileError || !profile) {
          toast.error('Profile not found. Please log in again.');
          navigate(createPageUrl('Home'));
          return;
        }

        setUser(profile);

        // Block staff members
        if (profile.user_type === 'staff_member') {
          toast.error('Access Denied: This page is for agency admins only');
          navigate(createPageUrl('StaffPortal'));
          return;
        }

        setCurrentAgency(profile.agency_id);

        // Fetch clients
        const { data: clientsData, error: clientsError } = await supabase
          .from('clients')
          .select('*')
          .eq('agency_id', profile.agency_id)
          .eq('status', 'active')
          .order('name');

        if (clientsError) {
          console.error('❌ Error fetching clients:', clientsError);
          toast.error('Failed to load clients');
        } else {
          setClients(clientsData || []);
        }

        setLoading(false);
      } catch (error) {
        console.error('❌ Access check failed:', error);
        toast.error('Failed to verify access');
        navigate(createPageUrl('Home'));
      }
    };

    checkAccess();
  }, [navigate]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  // Handle user message submission
  const handleSendMessage = async () => {
    if (!userInput.trim() || isProcessing) return;

    const message = userInput.trim();
    setUserInput('');
    setIsProcessing(true);

    // Add user message to conversation
    const userMessage = { role: 'user', content: message };
    setConversation(prev => [...prev, userMessage]);

    try {
      // Call AI extraction
      const aiResponse = await conversationalExtraction(
        message,
        clients,
        conversation,
        context
      );

      // Add AI response to conversation
      const aiMessage = {
        role: 'assistant',
        content: aiResponse.question || 'Processing...',
        data: aiResponse
      };
      setConversation(prev => [...prev, aiMessage]);

      // Update context with extracted data
      if (aiResponse.extracted_data) {
        setContext(prev => ({
          ...prev,
          ...aiResponse.extracted_data
        }));
      }

      // If ready, convert to gridData and move to preview
      if (aiResponse.status === 'ready') {
        const client = clients.find(c => c.id === aiResponse.extracted_data.client_id);

        if (!client) {
          toast.error('Client not found');
          setIsProcessing(false);
          return;
        }

        console.log('🎯 AI is ready! Converting to gridData...');
        const gridFormData = convertToGridData(
          aiResponse.extracted_data,
          client,
          user,
          currentAgency
        );

        console.log('📦 Setting formData and moving to step 2...');
        setFormData(gridFormData);
        setCurrentStep(2); // Move to preview
        console.log('✅ State updated: formData set, currentStep = 2');
      }

      setIsProcessing(false);
    } catch (error) {
      console.error('❌ AI processing failed:', error);
      toast.error(`AI processing failed: ${error.message}`);
      
      const errorMessage = {
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error.message}. Please try again.`
      };
      setConversation(prev => [...prev, errorMessage]);
      
      setIsProcessing(false);
    }
  };

  // Handle preview step
  const handlePreview = () => {
    if (!formData) return;

    // Generate shifts from gridData (same as BulkShiftCreation)
    const shifts = expandGridToShifts(
      formData.gridData,
      formData.activeRoles,
      formData.client,
      formData,
      currentAgency,
      user
    );

    // Validate shifts
    const validation = validateBulkShifts(shifts);

    // Update formData with generated shifts
    setFormData(prev => ({
      ...prev,
      generatedShifts: shifts,
      validation: validation
    }));
  };

  // Handle shift creation (same as BulkShiftCreation)
  const handleCreateShifts = async () => {
    if (!formData || !formData.generatedShifts || formData.generatedShifts.length === 0) {
      toast.error('No shifts to create');
      return;
    }

    if (!formData.validation.isValid) {
      toast.error('Please fix validation errors before creating shifts');
      return;
    }

    setIsCreating(true);
    setCreationProgress(0);
    setCurrentStep(3); // Move to creating step

    try {
      const shiftsToInsert = prepareShiftsForInsert(formData.generatedShifts);

      // Batch insert (50 shifts per batch)
      const batchSize = 50;
      const batches = [];
      for (let i = 0; i < shiftsToInsert.length; i += batchSize) {
        batches.push(shiftsToInsert.slice(i, i + batchSize));
      }

      let totalInserted = 0;

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];

        const { data, error } = await supabase
          .from('shifts')
          .insert(batch)
          .select();

        if (error) {
          console.error('❌ Batch insert error:', error);
          throw new Error(`Failed to insert batch ${i + 1}: ${error.message}`);
        }

        totalInserted += data.length;
        setCreationProgress(((i + 1) / batches.length) * 100);
      }

      // Success
      setCreatedCount(totalInserted);
      setIsCreating(false);
      setShowSuccess(true);

      toast.success(`🎉 Successfully created ${totalInserted} shifts!`);

      // Auto-redirect after 3 seconds
      setTimeout(() => {
        navigate(createPageUrl('Shifts'));
      }, 3000);

    } catch (error) {
      console.error('❌ Error creating shifts:', error);
      toast.error(`Failed to create shifts: ${error.message}`);
      setIsCreating(false);
      setCreationProgress(0);
    }
  };

  // Trigger preview when formData is set and we're on step 2
  useEffect(() => {
    const needsGeneration = formData && currentStep === 2 && (!formData.generatedShifts || formData.generatedShifts.length === 0);

    console.log('🔍 useEffect triggered:', {
      hasFormData: !!formData,
      currentStep,
      generatedShiftsLength: formData?.generatedShifts?.length || 0,
      gridDataKeys: formData?.gridData ? Object.keys(formData.gridData).length : 0,
      needsGeneration
    });

    if (needsGeneration) {
      console.log('🔄 Generating shifts from gridData...');
      handlePreview();
    } else {
      console.log('⏭️ Skipping handlePreview:', {
        reason: !formData ? 'no formData' : currentStep !== 2 ? 'not step 2' : 'already has generatedShifts'
      });
    }
  }, [formData, currentStep]); // Depend on both, but check length to prevent loop

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  // Step 3: Success screen
  if (showSuccess) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="text-center">
              <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-green-900 mb-2">
                🎉 Shifts Created Successfully!
              </h2>
              <p className="text-green-700 mb-4">
                Created {createdCount} shifts via AI Shift Paste
              </p>
              <p className="text-sm text-green-600">
                Redirecting to Shifts page...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step 2: Preview (reuse BulkShiftCreation preview)
  if (currentStep === 2 && formData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => setCurrentStep(1)}
            disabled={isCreating}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Chat
          </Button>
          <h1 className="text-2xl font-bold">Review AI Extracted Shifts</h1>
        </div>

        <Step3PreviewTable
          shifts={formData.generatedShifts || []}
          validation={formData.validation || { errors: [], warnings: [], isValid: false }}
          onBack={() => setCurrentStep(1)}
          onCreate={handleCreateShifts}
          onShiftUpdate={(updatedShifts) => {
            setFormData(prev => ({
              ...prev,
              generatedShifts: updatedShifts
            }));
          }}
          isCreating={isCreating}
          creationProgress={creationProgress}
        />
      </div>
    );
  }

  // Step 1: Chat interface
  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-6 flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => navigate(createPageUrl('Dashboard'))}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
        <div className="flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-purple-600" />
          <h1 className="text-2xl font-bold">AI Shift Paste</h1>
        </div>
      </div>

      <Alert className="mb-6 border-purple-200 bg-purple-50">
        <Sparkles className="h-4 w-4 text-purple-600" />
        <AlertDescription className="text-purple-900">
          <strong>How it works:</strong> Paste your weekly schedule below (e.g., "Monday 17th x 5 HCA shifts...").
          I'll extract the shifts, ask clarifying questions if needed, then show you a preview before creating them.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chat Panel */}
        <Card className="lg:col-span-1">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-blue-50">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              AI Assistant
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {/* Chat messages */}
            <div className="h-[500px] overflow-y-auto p-4 space-y-4">
              {conversation.length === 0 && (
                <div className="text-center text-gray-500 mt-20">
                  <Sparkles className="w-12 h-12 mx-auto mb-4 text-purple-300" />
                  <p className="text-sm">
                    Paste your schedule below to get started!
                  </p>
                  <p className="text-xs mt-2 text-gray-400">
                    Example: "DAYS\nMonday 17th x 5 – Staff names...\nNIGHTS\nMonday 17th x 2 – Staff names..."
                  </p>
                </div>
              )}

              {conversation.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      msg.role === 'user'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>

                    {/* Show options if AI provides them */}
                    {msg.role === 'assistant' && msg.data?.options && msg.data.options.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {msg.data.options.map((option, optIdx) => (
                          <button
                            key={optIdx}
                            onClick={() => {
                              setUserInput(option);
                              handleSendMessage();
                            }}
                            className="block w-full text-left px-2 py-1 text-xs bg-white rounded hover:bg-gray-50 border"
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Show assumptions if AI made any */}
                    {msg.role === 'assistant' && msg.data?.assumptions_made && msg.data.assumptions_made.length > 0 && (
                      <div className="mt-2 text-xs opacity-75">
                        <p className="font-semibold">Assumptions:</p>
                        <ul className="list-disc list-inside">
                          {msg.data.assumptions_made.map((assumption, aIdx) => (
                            <li key={aIdx}>{assumption}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isProcessing && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-lg p-3">
                    <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Input area */}
            <div className="border-t p-4">
              <div className="flex gap-2">
                <Textarea
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Paste your schedule or type your response..."
                  className="min-h-[100px] resize-none"
                  disabled={isProcessing}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!userInput.trim() || isProcessing}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Press Enter to send, Shift+Enter for new line
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Context Panel */}
        <Card className="lg:col-span-1">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50">
            <CardTitle>Extraction Context</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-gray-700">Client</p>
                <p className="text-lg">
                  {context.client_name || <span className="text-gray-400">Not selected</span>}
                </p>
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-700">Role</p>
                <p className="text-lg">
                  {context.role ? (
                    context.role.replace(/_/g, ' ')
                  ) : (
                    <span className="text-gray-400">Not selected</span>
                  )}
                </p>
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-700">Period</p>
                <p className="text-lg">
                  {context.month && context.year ? (
                    `${context.month} ${context.year}`
                  ) : (
                    <span className="text-gray-400">Not selected</span>
                  )}
                </p>
              </div>

              {context.client_id && (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-900 text-sm">
                    All required information collected! Send your schedule to proceed.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

