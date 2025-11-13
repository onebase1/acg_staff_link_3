import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock, Sparkles } from "lucide-react";

/**
 * Natural Language Shift Request - Test Suite
 * 
 * 10 test scenarios to validate AI parsing accuracy
 */

export default function NaturalLanguageTests() {
  const [testResults, setTestResults] = useState({});

  const testCases = [
    {
      id: 1,
      input: "I need 3 nurses tomorrow",
      expected: {
        quantity: 3,
        role: "nurse",
        date_relative: "tomorrow",
        time: "08:00-20:00 (day shift default)"
      },
      category: "Basic"
    },
    {
      id: 2,
      input: "2 night shift carers this Friday",
      expected: {
        quantity: 2,
        role: "care_worker",
        date_relative: "this Friday",
        time: "20:00-08:00 (night shift)"
      },
      category: "Time-specific"
    },
    {
      id: 3,
      input: "5 day shifts for next Monday",
      expected: {
        quantity: 5,
        role: "care_worker (assumed)",
        date_relative: "next Monday",
        time: "08:00-20:00 (day shift)"
      },
      category: "Future date"
    },
    {
      id: 4,
      input: "Urgent: 1 nurse tonight",
      expected: {
        quantity: 1,
        role: "nurse",
        date_relative: "tonight",
        urgency: "urgent",
        time: "20:00-08:00 (night shift)"
      },
      category: "Urgency detection"
    },
    {
      id: 5,
      input: "3 nurses and 2 carers for November 5th",
      expected: {
        shifts: [
          { quantity: 3, role: "nurse" },
          { quantity: 2, role: "care_worker" }
        ],
        date: "2025-11-05",
        time: "08:00-20:00 (day shift default)"
      },
      category: "Multi-role"
    },
    {
      id: 6,
      input: "I need a senior care worker this weekend",
      expected: {
        quantity: 1,
        role: "senior_care_worker",
        date_relative: "this weekend (Saturday or Sunday)",
        time: "08:00-20:00 (day shift default)"
      },
      category: "Role recognition"
    },
    {
      id: 7,
      input: "2 HCAs for November 2nd morning shift",
      expected: {
        quantity: 2,
        role: "hca",
        date: "2025-11-02",
        time: "07:00-15:00 (morning shift)"
      },
      category: "Specific date + time"
    },
    {
      id: 8,
      input: "Critical: need 4 nurses immediately",
      expected: {
        quantity: 4,
        role: "nurse",
        date_relative: "today/ASAP",
        urgency: "critical",
        time: "next available"
      },
      category: "Critical urgency"
    },
    {
      id: 9,
      input: "Book me 3 afternoon shifts for next week Tuesday",
      expected: {
        quantity: 3,
        role: "care_worker (assumed)",
        date_relative: "next Tuesday",
        time: "15:00-23:00 (afternoon shift)"
      },
      category: "Time period"
    },
    {
      id: 10,
      input: "I want 2 specialist nurses for the 10th, long day",
      expected: {
        quantity: 2,
        role: "specialist_nurse",
        date: "2025-11-10",
        time: "08:00-20:00 (long day = 12h)"
      },
      category: "Complex"
    }
  ];

  const runTest = async (testCase) => {
    // In real implementation, this would call the actual InvokeLLM parser
    // For now, we'll mark it as ready to test
    setTestResults({
      ...testResults,
      [testCase.id]: {
        status: 'ready',
        timestamp: new Date().toISOString()
      }
    });
  };

  const runAllTests = async () => {
    for (const test of testCases) {
      await runTest(test);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Natural Language Shift Request - Test Suite</h2>
        <p className="text-gray-600 mt-1">
          10 test scenarios to validate AI parsing accuracy before UAT
        </p>
      </div>

      <Card className="border-2 border-cyan-200 bg-gradient-to-br from-cyan-50 to-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyan-600" />
            Testing Instructions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-700">
            <strong>How to test:</strong>
          </p>
          <ol className="list-decimal list-inside text-sm text-gray-700 space-y-1">
            <li>Go to <strong>Quick Actions</strong> page (or Client Portal if testing as care home)</li>
            <li>Copy one of the test phrases below</li>
            <li>Paste into the "Quick Shift Request" text area</li>
            <li>Click "Understand Request"</li>
            <li>Verify the parsed output matches expected results</li>
            <li>Mark test as ✅ Pass or ❌ Fail</li>
          </ol>
          <p className="text-xs text-gray-600 mt-3">
            💡 <strong>Note:</strong> Today is October 31, 2025. "Tomorrow" = November 1, "Next Monday" = November 3, "This Friday" = November 7
          </p>
        </CardContent>
      </Card>

      <div className="flex justify-between items-center">
        <Badge className="bg-gray-700 text-white text-base px-4 py-2">
          {Object.keys(testResults).length} / {testCases.length} Tests Ready
        </Badge>
        <Button onClick={runAllTests} className="bg-gradient-to-r from-cyan-500 to-blue-600">
          <Sparkles className="w-4 h-4 mr-2" />
          Mark All Ready for Testing
        </Button>
      </div>

      <div className="space-y-3">
        {testCases.map((test) => {
          const result = testResults[test.id];
          return (
            <Card key={test.id} className="border-2 border-gray-200 hover:border-cyan-300 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
                      {test.id}
                    </div>
                    <Badge variant="outline">{test.category}</Badge>
                  </div>
                  {result && result.status === 'ready' && (
                    <Badge className="bg-green-600">
                      <Clock className="w-3 h-3 mr-1" />
                      Ready to Test
                    </Badge>
                  )}
                </div>

                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 mb-3">
                  <p className="text-sm text-gray-600 mb-1">Input:</p>
                  <p className="font-mono text-gray-900 font-medium">"{test.input}"</p>
                </div>

                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-900 font-semibold mb-2">Expected Output:</p>
                  <div className="space-y-1 text-sm text-gray-700">
                    {test.expected.shifts ? (
                      <>
                        <p><strong>Shifts:</strong></p>
                        {test.expected.shifts.map((shift, idx) => (
                          <p key={idx} className="ml-4">• {shift.quantity}x {shift.role.replace('_', ' ')}</p>
                        ))}
                        <p><strong>Date:</strong> {test.expected.date}</p>
                        <p><strong>Time:</strong> {test.expected.time}</p>
                      </>
                    ) : (
                      <>
                        {test.expected.quantity && <p>• <strong>Quantity:</strong> {test.expected.quantity}</p>}
                        {test.expected.role && <p>• <strong>Role:</strong> {test.expected.role}</p>}
                        {test.expected.date && <p>• <strong>Date:</strong> {test.expected.date}</p>}
                        {test.expected.date_relative && <p>• <strong>Date:</strong> {test.expected.date_relative}</p>}
                        {test.expected.time && <p>• <strong>Time:</strong> {test.expected.time}</p>}
                        {test.expected.urgency && <p>• <strong>Urgency:</strong> {test.expected.urgency}</p>}
                      </>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => runTest(test)}
                    className="flex-1"
                  >
                    Mark Ready to Test
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(test.input);
                      alert('Copied to clipboard! Paste into Quick Actions > Quick Shift Request');
                    }}
                    className="bg-cyan-50 border-cyan-300 text-cyan-700 hover:bg-cyan-100"
                  >
                    📋 Copy Input
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-2 border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="text-green-900">Testing Checklist</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <input type="checkbox" className="w-4 h-4" />
            <span>All 10 test cases parsed correctly</span>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" className="w-4 h-4" />
            <span>Date calculations correct (tomorrow, next Monday, etc.)</span>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" className="w-4 h-4" />
            <span>Time defaults applied correctly (day=08:00-20:00, night=20:00-08:00)</span>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" className="w-4 h-4" />
            <span>Multi-role shifts split correctly</span>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" className="w-4 h-4" />
            <span>Urgency detection working (urgent, critical)</span>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" className="w-4 h-4" />
            <span>Client rates auto-populated from contract</span>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" className="w-4 h-4" />
            <span>Cost estimation accurate</span>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" className="w-4 h-4" />
            <span>Confirm & Create button creates all shifts</span>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" className="w-4 h-4" />
            <span>Shifts appear in Shifts page after creation</span>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" className="w-4 h-4" />
            <span>Works from both QuickActions (admin) and ClientPortal (care home)</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}