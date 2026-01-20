# TEST PLAN: MODULE 44

## 🧪 MANUAL VERIFICATION
1. **Inbound WhatsApp Test**: Send a message to the agency WhatsApp number. Verify it appears in the `public.messages` table with the correct `staff_id`.
2. **Intent Matching**: Send "Confirm tomorrow" to the bot. Check `Shift` status in the DB (it should change to `confirmed`).
3. **UI Verification**: Open the Staff profile and ensure the message history is visible.

## 🛠️ SQL TESTS
```sql
-- Verify message attribution
SELECT m.*, s.first_name 
FROM public.messages m 
JOIN public.staff s ON m.staff_id = s.id 
WHERE m.direction = 'inbound';
```

## 📊 SUCCESS METRICS
- < 2s for message logging in DB.
- > 90% accuracy in intent classification for common phrases (Confirm, Cancel, Help).
