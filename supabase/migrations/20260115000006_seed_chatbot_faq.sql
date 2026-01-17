-- Migration: Seed chatbot_faq table with initial FAQ entries
-- Purpose: Provide Kylie AI with knowledge base for common staff questions
-- Author: Kylie AI Implementation
-- Date: 2026-01-15

-- Insert FAQ entries
-- Format: (category, question, answer, keywords, priority)

-- =========================================
-- UNIFORMS (6 questions)
-- =========================================

INSERT INTO chatbot_faq (category, question, answer, keywords, priority) VALUES
('uniforms',
 'What uniform do I need to wear?',
 'Your uniform depends on your role:
• Nurses: Navy scrubs provided
• HCAs: Blue tunic + black trousers
• Senior Carers: Burgundy polo + black trousers

First uniform provided free. Order extras via portal.',
 ARRAY['uniform', 'wear', 'clothes', 'dress', 'scrubs', 'tunic'],
 10),

('uniforms',
 'Where do I get my uniform?',
 'Collect from agency office (Mon-Fri 9-5) or order via portal for home delivery (3-5 days). First set free, replacements £15.',
 ARRAY['get', 'uniform', 'collect', 'order', 'buy'],
 5),

('uniforms',
 'Can I wear my own scrubs?',
 'No, agency-branded uniforms required for all shifts. Clients expect consistent branding.',
 ARRAY['own', 'scrubs', 'uniform', 'personal'],
 3),

('uniforms',
 'What if my uniform is damaged?',
 'Report damage via portal within 7 days for free replacement. Normal wear: £15 replacement fee.',
 ARRAY['damaged', 'torn', 'ripped', 'broken', 'uniform', 'replace'],
 2),

('uniforms',
 'Do I need safety shoes?',
 'Yes, closed-toe non-slip shoes required. We don''t provide these - purchase your own.',
 ARRAY['shoes', 'footwear', 'safety', 'boots'],
 5),

('uniforms',
 'What about winter coat?',
 'Fleece jackets available for £25 (optional). Many staff use their own coats over uniform.',
 ARRAY['coat', 'jacket', 'winter', 'cold', 'fleece'],
 1);

-- =========================================
-- RATES/PAY (7 questions)
-- =========================================

INSERT INTO chatbot_faq (category, question, answer, keywords, priority) VALUES
('rates',
 'What''s my hourly rate?',
 'Rates by role:
• HCA: £11.50-13/hr
• Nurse (Band 5): £18-22/hr
• Senior Carer: £13-15/hr

Night shift +£1/hr, weekends +15%, bank holidays +50%',
 ARRAY['rate', 'pay', 'hourly', 'wage', 'salary', 'money'],
 10),

('rates',
 'When do I get paid?',
 'Weekly pay cycle:
• Submit timesheet by Friday 5pm
• Paid next Friday via BACS

View payslips in portal',
 ARRAY['paid', 'payment', 'when', 'payroll', 'bacs'],
 10),

('rates',
 'How do I submit my timesheet?',
 '3 ways:
1. WhatsApp: Send photo to Kylie (fastest!)
2. Portal: Upload under ''Timesheets''
3. Email: timesheets@agency.com

Deadline: 24h after shift end',
 ARRAY['timesheet', 'submit', 'upload', 'send', 'how'],
 10),

('rates',
 'What if my pay is wrong?',
 'Check payslip for breakdown. Discrepancy? Message Kylie ''wrong pay'' or call office: 020 1234 5678',
 ARRAY['wrong', 'pay', 'incorrect', 'mistake', 'payslip', 'error'],
 8),

('rates',
 'Do you pay travel expenses?',
 'Mileage: 25p/mile for shifts >10 miles from home. Log via portal within 7 days.',
 ARRAY['travel', 'mileage', 'expenses', 'petrol', 'fuel', 'distance'],
 5),

('rates',
 'What about holiday pay?',
 '12.07% added to each payslip (statutory minimum). Accrues automatically, request via portal.',
 ARRAY['holiday', 'vacation', 'leave', 'time off', 'paid'],
 5),

('rates',
 'Can I get an advance?',
 'Emergency advances available (max £200). Email payroll@agency.com with reason. Deducted over 4 weeks.',
 ARRAY['advance', 'loan', 'emergency', 'money', 'cash'],
 3);

-- =========================================
-- TIMESHEETS (5 questions)
-- =========================================

INSERT INTO chatbot_faq (category, question, answer, keywords, priority) VALUES
('timesheets',
 'How do I submit my timesheet?',
 'WhatsApp Kylie a photo! Or portal. Deadline: 24h after shift.',
 ARRAY['submit', 'timesheet', 'send', 'upload', 'how'],
 10),

('timesheets',
 'What if client won''t sign?',
 'Submit anyway with note. Kylie will alert admin to follow up with client.',
 ARRAY['signature', 'sign', 'client', 'refused', 'won''t'],
 7),

('timesheets',
 'I submitted wrong hours, can I correct?',
 'Yes! Message Kylie within 24h: ''Correct timesheet for [date] to [hours]''. Or edit in portal.',
 ARRAY['wrong', 'hours', 'mistake', 'correct', 'fix', 'change'],
 8),

('timesheets',
 'Why was my timesheet rejected?',
 'Common reasons:
• Hours don''t match shift booking
• Missing signature
• Illegible photo

Resubmit with corrections ASAP.',
 ARRAY['rejected', 'denied', 'refused', 'why', 'failed'],
 8),

('timesheets',
 'Can I submit multiple days at once?',
 'WhatsApp: 1 photo per shift. Portal: batch upload supported.',
 ARRAY['multiple', 'batch', 'several', 'many', 'days'],
 3);

-- =========================================
-- SHIFTS (6 questions)
-- =========================================

INSERT INTO chatbot_faq (category, question, answer, keywords, priority) VALUES
('shifts',
 'How do I find available shifts?',
 'Ask Kylie ''show me shifts'' or check portal marketplace. Auto-matched shifts sent daily at 6pm.',
 ARRAY['find', 'available', 'shifts', 'marketplace', 'open'],
 10),

('shifts',
 'Can I cancel a shift?',
 'Yes, but:
• >24h notice: No penalty
• <24h: Warning flag
• <4h: May affect future bookings

Tell Kylie: ''Cancel my shift on [date]''',
 ARRAY['cancel', 'decline', 'can''t', 'unable', 'sick'],
 10),

('shifts',
 'What if I''m running late?',
 'Call client directly (number in shift details) AND message Kylie immediately. >30min late = incident report.',
 ARRAY['late', 'running', 'delayed', 'stuck', 'traffic'],
 9),

('shifts',
 'Can I swap shifts with another carer?',
 'No direct swaps. Decline unwanted shift (returns to marketplace) and colleague can accept.',
 ARRAY['swap', 'exchange', 'trade', 'another'],
 4),

('shifts',
 'How do I know shift is confirmed?',
 'You''ll receive:
1. WhatsApp from Kylie
2. Email confirmation
3. Portal notification

Shift shows ''Confirmed'' in My Shifts',
 ARRAY['confirmed', 'confirmation', 'accepted', 'approved'],
 7),

('shifts',
 'What''s the cancellation policy?',
 'Staff:
• >24h: Free cancellation
• <24h: Warning (3 warnings = review)

Client:
• >24h: No fee
• <24h: You get 50% pay
• <4h: You get 100% pay',
 ARRAY['policy', 'cancellation', 'cancel', 'rules'],
 6);

-- =========================================
-- AVAILABILITY (3 questions)
-- =========================================

INSERT INTO chatbot_faq (category, question, answer, keywords, priority) VALUES
('availability',
 'How do I update my availability?',
 'Tell Kylie: ''I''m available Mon-Fri next week'' or update in portal under Settings > Availability.',
 ARRAY['availability', 'update', 'change', 'schedule'],
 10),

('availability',
 'Will I get automatic shift offers?',
 'Yes! If your availability + role match, you''ll get daily digest at 6pm with matched shifts.',
 ARRAY['automatic', 'auto', 'matched', 'offers', 'daily'],
 7),

('availability',
 'Can I block certain dates?',
 'Yes, mark unavailable in portal calendar or tell Kylie: ''I''m not available [date]''',
 ARRAY['block', 'unavailable', 'busy', 'dates', 'holiday'],
 6);

-- =========================================
-- GENERAL (3 questions)
-- =========================================

INSERT INTO chatbot_faq (category, question, answer, keywords, priority) VALUES
('general',
 'Who do I contact for emergencies?',
 'During shift: Call client directly
Agency emergencies: 020 1234 5678 (24/7)
Non-urgent: Message Kylie anytime',
 ARRAY['emergency', 'contact', 'help', 'urgent', 'phone'],
 10),

('general',
 'How do I report a problem?',
 'Tell Kylie what happened. Serious issues escalate to manager within 30min.',
 ARRAY['problem', 'issue', 'complaint', 'report'],
 8),

('general',
 'Where''s the staff handbook?',
 'Portal: Resources > Staff Handbook or https://agilecaremanagement.netlify.app/handbook',
 ARRAY['handbook', 'manual', 'guide', 'documentation', 'rules'],
 5);

-- Update statistics
SELECT COUNT(*) as total_faqs FROM chatbot_faq WHERE active = TRUE;
