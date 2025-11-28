import React, { useState, useEffect, useRef } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sparkles, Send, Loader2, CheckCircle2, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { conversationalExtraction, convertToGridData } from '@/utils/aiShiftParser';
import { supabase } from '@/lib/supabase';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export default function AIScheduleInput({
    isOpen,
    onClose,
    onDataReady,
    clients,
    currentAgency,
    user,
    selectedClient // New prop
}) {
    const chatEndRef = useRef(null);

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

    // Reset state when opened
    useEffect(() => {
        if (isOpen) {
            setConversation([]);
            setUserInput('');

            // Initialize context with selectedClient if available
            if (selectedClient) {
                setContext({
                    client_id: selectedClient.id,
                    client_name: selectedClient.name,
                    client: selectedClient,
                    role: null,
                    month: null,
                    year: null
                });
            } else {
                setContext({
                    client_id: null,
                    client_name: null,
                    client: null,
                    role: null,
                    month: null,
                    year: null
                });
            }
        }
    }, [isOpen, selectedClient]);

    // Auto-scroll chat to bottom
    useEffect(() => {
        if (isOpen) {
            chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [conversation, isOpen]);

    const handleClientSelect = (clientId) => {
        const client = clients.find(c => c.id === clientId);
        if (client) {
            setContext(prev => ({
                ...prev,
                client_id: client.id,
                client_name: client.name,
                client: client
            }));
            // Optional: Add a system message to the chat
            // setConversation(prev => [...prev, {
            //     role: 'assistant',
            //     content: `Selected client: ${client.name}. Please paste the schedule.`
            // }]);
        }
    };

    const handleSendMessage = async (messageOverride = null) => {
        // Enforce client selection
        if (!context.client_id) {
            toast.error('Please select a client first');
            return;
        }

        const messageToSend = messageOverride || userInput;
        if (!messageToSend.trim() || isProcessing) return;

        const message = messageToSend.trim();
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

            // If ready, convert to gridData and return to parent
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

                // Success message before closing
                setConversation(prev => [...prev, {
                    role: 'assistant',
                    content: 'Perfect! I have prepared the schedule. Loading it now...',
                    data: { status: 'complete' }
                }]);

                // Short delay to show success message
                setTimeout(() => {
                    onDataReady(gridFormData);
                    onClose();
                }, 1500);
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

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px] h-[80vh] flex flex-col p-0 gap-0">
                <DialogHeader className="p-6 pb-2 border-b">
                    <DialogTitle className="flex items-center gap-2 text-purple-700">
                        <Sparkles className="w-5 h-5" />
                        Magic Paste (AI Import)
                    </DialogTitle>
                    <DialogDescription>
                        Select a client and paste your schedule text.
                    </DialogDescription>

                    {/* Client Selector */}
                    <div className="mt-4">
                        <label className="text-xs font-medium text-gray-500 mb-1 block">
                            Select Client (Required)
                        </label>
                        <Select
                            value={context.client_id || ''}
                            onValueChange={handleClientSelect}
                            disabled={!!selectedClient} // Disable if passed from parent
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select a client..." />
                            </SelectTrigger>
                            <SelectContent>
                                {clients.map(client => (
                                    <SelectItem key={client.id} value={client.id}>
                                        {client.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {selectedClient && (
                            <p className="text-[10px] text-gray-400 mt-1">
                                Client pre-selected from previous step.
                            </p>
                        )}
                    </div>
                </DialogHeader>

                {/* Chat Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/50">
                    {conversation.length === 0 && (
                        <div className="text-center text-gray-500 mt-4">
                            <Sparkles className="w-12 h-12 mx-auto mb-4 text-purple-200" />
                            <p className="text-sm">
                                {context.client_id
                                    ? `Ready to schedule for ${context.client_name}!`
                                    : "Please select a client to start."}
                            </p>
                            <p className="text-xs mt-2 text-gray-400">
                                Example: "Monday 17th x 5 HCA shifts"
                            </p>
                        </div>
                    )}

                    {conversation.map((msg, idx) => (
                        <div
                            key={idx}
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-[85%] rounded-lg p-3 text-sm ${msg.role === 'user'
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-white border text-gray-900 shadow-sm'
                                    }`}
                            >
                                <p className="whitespace-pre-wrap">{msg.content}</p>

                                {/* Show options if AI provides them */}
                                {msg.role === 'assistant' && msg.data?.options && msg.data.options.length > 0 && (
                                    <div className="mt-3 space-y-1">
                                        {msg.data.options.map((option, optIdx) => (
                                            <button
                                                key={optIdx}
                                                onClick={() => {
                                                    // Pass option directly to avoid state race condition
                                                    handleSendMessage(option);
                                                }}
                                                className="block w-full text-left px-3 py-2 text-xs bg-purple-50 text-purple-700 rounded hover:bg-purple-100 border border-purple-100 transition-colors"
                                            >
                                                {option}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {isProcessing && (
                        <div className="flex justify-start">
                            <div className="bg-white border rounded-lg p-3 shadow-sm">
                                <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                            </div>
                        </div>
                    )}

                    <div ref={chatEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 border-t bg-white">
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
                            placeholder={context.client_id ? "Type or paste here..." : "Select a client first..."}
                            className="min-h-[80px] resize-none focus-visible:ring-purple-500"
                            disabled={isProcessing || !context.client_id}
                        />
                        <Button
                            onClick={() => handleSendMessage()}
                            disabled={!userInput.trim() || isProcessing || !context.client_id}
                            className="h-auto bg-purple-600 hover:bg-purple-700"
                        >
                            {isProcessing ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Send className="w-4 h-4" />
                            )}
                        </Button>
                    </div>
                    {!context.client_id && (
                        <p className="text-xs text-red-500 mt-2 text-center font-medium">
                            Please select a client to enable chat.
                        </p>
                    )}
                    <p className="text-[10px] text-gray-400 mt-2 text-center">
                        AI can make mistakes. Please review the generated schedule carefully.
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
}
