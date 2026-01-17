-- Get Dominion contact details for reporting
SELECT
    id,
    name,
    contact_email,
    phone,
    email,
    email_notifications,
    whatsapp_global_notifications,
    sms_notifications
FROM agencies
WHERE name ILIKE '%dominion%';
