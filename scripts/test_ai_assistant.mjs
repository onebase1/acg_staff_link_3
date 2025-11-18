#!/usr/bin/env node

/**
 * Test script for ai-assistant edge function
 * Tests shift extraction mode with natural language input
 *
 * Usage: node scripts/test_ai_assistant.mjs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://rzzxxkppkiasuouuglaf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6enh4a3Bwa2lhc3VvdXVnbGFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzA5NzY5NzksImV4cCI6MjA0NjU1Mjk3OX0.Ks3Ks-Ks3Ks3Ks3Ks3Ks3Ks3Ks3Ks3Ks3Ks3Ks3Ks3Ks'; // Replace with actual key

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testAIAssistant() {
  console.log('🧪 Testing AI Assistant Edge Function\n');

  // Test 1: Extract shifts from natural language
  console.log('Test 1: Shift Extraction');
  console.log('Input: "Need 2 HCA for Divine Care tomorrow 8am-8pm, Room 14 and 15"\n');

  const systemPrompt = `You are a helpful AI assistant for a healthcare staffing agency. Extract shift details from natural language and return structured JSON.

Available clients: Divine Care Centre, St Mary's Home

When you have ALL required information, respond with JSON:
{
  "complete": true,
  "shifts": [
    {
      "client_name": "Divine Care Centre",
      "date": "2025-11-19",
      "start_time": "08:00",
      "end_time": "20:00",
      "duration_hours": 12,
      "role_required": "hca",
      "urgency": "normal",
      "work_location_within_site": "Room 14"
    }
  ]
}`;

  const userMessage = "Need 2 HCA for Divine Care tomorrow 8am-8pm, Room 14 and 15";

  try {
    const { data, error } = await supabase.functions.invoke('ai-assistant', {
      body: {
        mode: 'extract_shifts',
        prompt: `${systemPrompt}\n\nUser: ${userMessage}`,
        response_json_schema: true,
        temperature: 0.7
      }
    });

    if (error) {
      console.error('❌ Error:', error);
      return;
    }

    console.log('✅ Response:', JSON.stringify(data, null, 2));

    if (data.success && data.data.complete) {
      console.log(`\n✅ Successfully extracted ${data.data.shifts.length} shifts!`);
      console.log(`📊 Token usage: ${data.usage.total_tokens} tokens`);
    } else {
      console.log('\n⚠️ AI needs more information (conversational mode)');
    }

  } catch (err) {
    console.error('❌ Test failed:', err.message);
  }

  // Test 2: Conversational mode
  console.log('\n\nTest 2: Conversational Mode');
  console.log('Input: "What clients do we have?"\n');

  try {
    const { data, error } = await supabase.functions.invoke('ai-assistant', {
      body: {
        mode: 'conversational',
        prompt: 'Available clients: Divine Care Centre, St Mary\'s Home\n\nUser: What clients do we have?',
        response_json_schema: false,
        temperature: 0.7
      }
    });

    if (error) {
      console.error('❌ Error:', error);
      return;
    }

    console.log('✅ Response:', data.data);
    console.log(`📊 Token usage: ${data.usage.total_tokens} tokens`);

  } catch (err) {
    console.error('❌ Test failed:', err.message);
  }

  console.log('\n✅ All tests completed!');
}

// Run tests
testAIAssistant().catch(console.error);
