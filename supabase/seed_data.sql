-- COMPREHENSIVE SEED DATA - All 15 Tables
-- Generated: 2025-11-11T00:48:21.233893
-- Run this in Supabase SQL Editor

-- 1. AGENCIES (2 records)
INSERT INTO agencies (id, name, created_by, registration_number, contact_email, contact_phone, subscription_tier, address, status, bank_details, dbs_check_expiry_alerts, mandatory_training_reminders, document_expiry_warnings, auto_approve_timesheets, sms_shift_confirmations, whatsapp_notifications, auto_generate_invoices, send_payment_reminders, email_notifications, sms_notifications, whatsapp_global_notifications, payment_terms_days, invoice_frequency) VALUES ('7b0c0285-852b-4430-bb72-771752d79fdd', 'Dominion Healthcare Services Ltd', 'g.basera@yahoo.com', 'GB12345678', 'info@dominionhealth.co.uk', '+441912345678', 'professional', '{"line1": "123 Business Park", "city": "Newcastle", "postcode": "NE1 4ST"}'::jsonb, 'active', '{"account_name": "Dominion Healthcare", "account_number": "12345678", "sort_code": "20-00-00"}'::jsonb, true, true, true, false, true, true, true, true, true, true, true, 30, 'weekly');
INSERT INTO agencies (id, name, created_by, registration_number, contact_email, contact_phone, subscription_tier, address, status, bank_details, dbs_check_expiry_alerts, mandatory_training_reminders, document_expiry_warnings, auto_approve_timesheets, sms_shift_confirmations, whatsapp_notifications, auto_generate_invoices, send_payment_reminders, email_notifications, sms_notifications, whatsapp_global_notifications, payment_terms_days, invoice_frequency) VALUES ('77f4a189-9735-4cbb-b62b-cdae0291c34e', 'CareStaff Solutions Ltd', 'admin@carestaff.co.uk', 'GB87654321', 'hello@carestaff.co.uk', '+441132345678', 'starter', '{"line1": "456 Care House", "city": "Leeds", "postcode": "LS1 2AB"}'::jsonb, 'active', '{"account_name": "CareStaff Solutions", "account_number": "87654321", "sort_code": "40-00-00"}'::jsonb, true, false, false, true, false, false, false, false, true, false, false, 14, 'monthly');

-- 2. PROFILES (4 admin/manager users)
-- Note: In production, these should match auth.users.id
INSERT INTO profiles (id, full_name, email, phone, user_type, agency_id, created_date, role, profile_photo_url)
VALUES ('f54f349c-e366-4c38-8134-a90e789a264c', 'Admin User 1', 'admin1@agency1.com', '+447097992641', 
'agency_admin', '7b0c0285-852b-4430-bb72-771752d79fdd', '2025-10-15T04:48:21.233893', 'admin', 'https://ui-avatars.com/api/?name=Admin');
INSERT INTO profiles (id, full_name, email, phone, user_type, agency_id, created_date, role, profile_photo_url)
VALUES ('5f707652-9acc-4fbd-a3a9-4bba736a2be4', 'Manager User 1', 'manager1@agency1.com', '+447030763223', 
'manager', '7b0c0285-852b-4430-bb72-771752d79fdd', '2025-09-17T17:48:21.233893', 'user', 'https://ui-avatars.com/api/?name=Manager');
INSERT INTO profiles (id, full_name, email, phone, user_type, agency_id, created_date, role, profile_photo_url)
VALUES ('eafcdcdd-b6ff-41da-86c1-c821e42496ca', 'Admin User 2', 'admin2@agency2.com', '+447521382670', 
'agency_admin', '77f4a189-9735-4cbb-b62b-cdae0291c34e', '2025-09-12T03:48:21.233893', 'admin', 'https://ui-avatars.com/api/?name=Admin');
INSERT INTO profiles (id, full_name, email, phone, user_type, agency_id, created_date, role, profile_photo_url)
VALUES ('8924b4a3-fc76-4584-9f80-b4965ed9e60b', 'Manager User 2', 'manager2@agency2.com', '+447156160237', 
'manager', '77f4a189-9735-4cbb-b62b-cdae0291c34e', '2025-10-22T17:48:21.233893', 'user', 'https://ui-avatars.com/api/?name=Manager');

-- 3. STAFF (10 records - 5 per agency)
INSERT INTO staff (id, agency_id, first_name, last_name, email, phone, role, employment_type, status, hourly_rate, 
created_by, whatsapp_pin, whatsapp_number_verified, date_of_birth, profile_photo_url, 
nmc_pin, medication_trained, medication_training_expiry, can_work_as_senior, role_hierarchy,
employment_history, references, skills, gps_consent, last_known_location, date_joined, months_of_experience,
address, emergency_contact, availability, rating, total_shifts_completed, gps_consent_date, created_date, updated_date)
VALUES ('b7d0d3f5-77e7-4d50-bbde-90a02e1848cf', '7b0c0285-852b-4430-bb72-771752d79fdd', 'Linda', 'Williams', 'linda.williams@gmail.com', '+447869393417',
'nurse', 'temporary', 'active', 22,
'admin@agency.com', '3863', '+447180100732', '2000-03-22', 
'https://ui-avatars.com/api/?name=Linda+Williams',
'NMC156611', true, 
'2026-02-04', false,
'{"can_work_as": ["nurse"]}'::jsonb,
'[{"employer": "Previous Care Home", "duration": "2 years"}]'::jsonb, '[{"name": "Jane Ref", "phone": "+447651390429"}]'::jsonb,
'["First Aid", "Manual Handling"]'::jsonb, true, '{"latitude": 54.9779758137522, "longitude": -1.6206274623606267, "timestamp": "2025-11-10T07:48:21.234456"}'::jsonb,
'2024-12-18', 41, '{"line1": "265 Church Lane", "city": "Sunderland", "postcode": "NE4 9DS", "country": "UK"}'::jsonb,
'{"name": "Emergency Contact", "relationship": "Spouse", "phone": "+447194902945"}'::jsonb,
'{"monday": [{"start": "08:00", "end": "20:00"}], "tuesday": [{"start": "08:00", "end": "20:00"}]}'::jsonb,
4.8, 27, '2025-09-24T18:48:21.234456', '2025-09-20T07:48:21.234456', '2025-11-09T09:48:21.234456');
INSERT INTO staff (id, agency_id, first_name, last_name, email, phone, role, employment_type, status, hourly_rate, 
created_by, whatsapp_pin, whatsapp_number_verified, date_of_birth, profile_photo_url, 
nmc_pin, medication_trained, medication_training_expiry, can_work_as_senior, role_hierarchy,
employment_history, references, skills, gps_consent, last_known_location, date_joined, months_of_experience,
address, emergency_contact, availability, rating, total_shifts_completed, gps_consent_date, created_date, updated_date)
VALUES ('16370a49-aacd-43bf-907a-aa691750e39d', '7b0c0285-852b-4430-bb72-771752d79fdd', 'James', 'Jones', 'james.jones@gmail.com', '+447076586001',
'healthcare_assistant', 'temporary', 'active', 19,
'admin@agency.com', '5952', '+447982021759', '2005-12-10', 
'https://ui-avatars.com/api/?name=James+Jones',
NULL, false, 
NULL, false,
'{"can_work_as": ["healthcare_assistant"]}'::jsonb,
'[{"employer": "Previous Care Home", "duration": "2 years"}]'::jsonb, '[{"name": "Jane Ref", "phone": "+447589266806"}]'::jsonb,
'["First Aid", "Manual Handling"]'::jsonb, true, '{"latitude": 54.94295589230885, "longitude": -1.6417550410976784, "timestamp": "2025-11-10T05:48:21.234456"}'::jsonb,
'2025-05-16', 8, '{"line1": "100 Park Road", "city": "Birmingham", "postcode": "NE4 2XG", "country": "UK"}'::jsonb,
'{"name": "Emergency Contact", "relationship": "Spouse", "phone": "+447114800650"}'::jsonb,
'{"monday": [{"start": "08:00", "end": "20:00"}], "tuesday": [{"start": "08:00", "end": "20:00"}]}'::jsonb,
4.9, 25, '2025-10-24T06:48:21.234456', '2025-08-03T14:48:21.234456', '2025-11-09T12:48:21.234456');
INSERT INTO staff (id, agency_id, first_name, last_name, email, phone, role, employment_type, status, hourly_rate, 
created_by, whatsapp_pin, whatsapp_number_verified, date_of_birth, profile_photo_url, 
nmc_pin, medication_trained, medication_training_expiry, can_work_as_senior, role_hierarchy,
employment_history, references, skills, gps_consent, last_known_location, date_joined, months_of_experience,
address, emergency_contact, availability, rating, total_shifts_completed, gps_consent_date, created_date, updated_date)
VALUES ('52025345-00b3-45ed-8d4b-340ee78d78e1', '7b0c0285-852b-4430-bb72-771752d79fdd', 'Emma', 'Taylor', 'emma.taylor@gmail.com', '+447909421732',
'senior_care_worker', 'temporary', 'active', 17,
'admin@agency.com', '1174', '+447789371301', '2012-11-25', 
'https://ui-avatars.com/api/?name=Emma+Taylor',
NULL, false, 
NULL, true,
'{"can_work_as": ["senior_care_worker"]}'::jsonb,
'[{"employer": "Previous Care Home", "duration": "2 years"}]'::jsonb, '[{"name": "Jane Ref", "phone": "+447232795787"}]'::jsonb,
'["First Aid", "Manual Handling"]'::jsonb, true, '{"latitude": 54.938683621005424, "longitude": -1.5945381796537528, "timestamp": "2025-11-09T06:48:21.234456"}'::jsonb,
'2024-12-16', 49, '{"line1": "319 Park Road", "city": "Newcastle", "postcode": "SR4 7FE", "country": "UK"}'::jsonb,
'{"name": "Emergency Contact", "relationship": "Spouse", "phone": "+447860638092"}'::jsonb,
'{"monday": [{"start": "08:00", "end": "20:00"}], "tuesday": [{"start": "08:00", "end": "20:00"}]}'::jsonb,
4.1, 47, '2025-09-08T13:48:21.234456', '2025-08-26T15:48:21.234456', '2025-11-09T07:48:21.234456');
INSERT INTO staff (id, agency_id, first_name, last_name, email, phone, role, employment_type, status, hourly_rate, 
created_by, whatsapp_pin, whatsapp_number_verified, date_of_birth, profile_photo_url, 
nmc_pin, medication_trained, medication_training_expiry, can_work_as_senior, role_hierarchy,
employment_history, references, skills, gps_consent, last_known_location, date_joined, months_of_experience,
address, emergency_contact, availability, rating, total_shifts_completed, gps_consent_date, created_date, updated_date)
VALUES ('2a994361-bbfe-4342-aa77-4fa370bfc1ad', '7b0c0285-852b-4430-bb72-771752d79fdd', 'James', 'Thomas', 'james.thomas@gmail.com', '+447100333520',
'nurse', 'temporary', 'active', 15,
'admin@agency.com', '2824', '+447099656629', '2020-02-24', 
'https://ui-avatars.com/api/?name=James+Thomas',
'NMC496359', true, 
'2026-05-05', false,
'{"can_work_as": ["nurse"]}'::jsonb,
'[{"employer": "Previous Care Home", "duration": "2 years"}]'::jsonb, '[{"name": "Jane Ref", "phone": "+447137069036"}]'::jsonb,
'["First Aid", "Manual Handling"]'::jsonb, true, '{"latitude": 54.91720120463065, "longitude": -1.690858293389129, "timestamp": "2025-11-10T08:48:21.234456"}'::jsonb,
'2025-08-18', 25, '{"line1": "525 Church Lane", "city": "Leeds", "postcode": "TS2 1WH", "country": "UK"}'::jsonb,
'{"name": "Emergency Contact", "relationship": "Spouse", "phone": "+447386072684"}'::jsonb,
'{"monday": [{"start": "08:00", "end": "20:00"}], "tuesday": [{"start": "08:00", "end": "20:00"}]}'::jsonb,
4.6, 38, '2025-09-05T16:48:21.234456', '2025-09-09T22:48:21.234456', '2025-11-10T07:48:21.234456');
INSERT INTO staff (id, agency_id, first_name, last_name, email, phone, role, employment_type, status, hourly_rate, 
created_by, whatsapp_pin, whatsapp_number_verified, date_of_birth, profile_photo_url, 
nmc_pin, medication_trained, medication_training_expiry, can_work_as_senior, role_hierarchy,
employment_history, references, skills, gps_consent, last_known_location, date_joined, months_of_experience,
address, emergency_contact, availability, rating, total_shifts_completed, gps_consent_date, created_date, updated_date)
VALUES ('e73c04c0-7102-4307-9b0c-af5981b76253', '7b0c0285-852b-4430-bb72-771752d79fdd', 'Linda', 'Williams', 'linda.williams@gmail.com', '+447096508917',
'healthcare_assistant', 'temporary', 'active', 19,
'admin@agency.com', '9698', '+447878538087', '2019-11-30', 
'https://ui-avatars.com/api/?name=Linda+Williams',
NULL, false, 
NULL, false,
'{"can_work_as": ["healthcare_assistant"]}'::jsonb,
'[{"employer": "Previous Care Home", "duration": "2 years"}]'::jsonb, '[{"name": "Jane Ref", "phone": "+447519246471"}]'::jsonb,
'["First Aid", "Manual Handling"]'::jsonb, true, '{"latitude": 54.9514874104872, "longitude": -1.5999991596926217, "timestamp": "2025-11-09T18:48:21.234456"}'::jsonb,
'2025-04-11', 6, '{"line1": "264 Station Road", "city": "Newcastle", "postcode": "NE5 5SA", "country": "UK"}'::jsonb,
'{"name": "Emergency Contact", "relationship": "Spouse", "phone": "+447520612662"}'::jsonb,
'{"monday": [{"start": "08:00", "end": "20:00"}], "tuesday": [{"start": "08:00", "end": "20:00"}]}'::jsonb,
4.5, 8, '2025-10-18T19:48:21.234456', '2025-08-09T19:48:21.234456', '2025-11-09T09:48:21.234456');
INSERT INTO staff (id, agency_id, first_name, last_name, email, phone, role, employment_type, status, hourly_rate, 
created_by, whatsapp_pin, whatsapp_number_verified, date_of_birth, profile_photo_url, 
nmc_pin, medication_trained, medication_training_expiry, can_work_as_senior, role_hierarchy,
employment_history, references, skills, gps_consent, last_known_location, date_joined, months_of_experience,
address, emergency_contact, availability, rating, total_shifts_completed, gps_consent_date, created_date, updated_date)
VALUES ('e23a2d85-e6b1-44c1-905b-23ca43cbe58b', '77f4a189-9735-4cbb-b62b-cdae0291c34e', 'Jessica', 'Smith', 'jessica.smith@gmail.com', '+447283401702',
'nurse', 'temporary', 'active', 22,
'admin@agency.com', '8785', '+447169357595', '2000-12-16', 
'https://ui-avatars.com/api/?name=Jessica+Smith',
'NMC752027', true, 
'2026-04-17', false,
'{"can_work_as": ["nurse"]}'::jsonb,
'[{"employer": "Previous Care Home", "duration": "2 years"}]'::jsonb, '[{"name": "Jane Ref", "phone": "+447608307973"}]'::jsonb,
'["First Aid", "Manual Handling"]'::jsonb, true, '{"latitude": 54.9039618890364, "longitude": -1.5251847370712108, "timestamp": "2025-11-10T03:48:21.235014"}'::jsonb,
'2025-02-14', 51, '{"line1": "587 High Street", "city": "Manchester", "postcode": "NE8 5AL", "country": "UK"}'::jsonb,
'{"name": "Emergency Contact", "relationship": "Spouse", "phone": "+447819855942"}'::jsonb,
'{"monday": [{"start": "08:00", "end": "20:00"}], "tuesday": [{"start": "08:00", "end": "20:00"}]}'::jsonb,
4.1, 45, '2025-09-08T08:48:21.235014', '2025-11-02T07:48:21.235014', '2025-11-09T15:48:21.235014');
INSERT INTO staff (id, agency_id, first_name, last_name, email, phone, role, employment_type, status, hourly_rate, 
created_by, whatsapp_pin, whatsapp_number_verified, date_of_birth, profile_photo_url, 
nmc_pin, medication_trained, medication_training_expiry, can_work_as_senior, role_hierarchy,
employment_history, references, skills, gps_consent, last_known_location, date_joined, months_of_experience,
address, emergency_contact, availability, rating, total_shifts_completed, gps_consent_date, created_date, updated_date)
VALUES ('600d81f3-6352-4c15-9427-bebdab265677', '77f4a189-9735-4cbb-b62b-cdae0291c34e', 'Daniel', 'Jones', 'daniel.jones@gmail.com', '+447536218481',
'healthcare_assistant', 'temporary', 'active', 22,
'admin@agency.com', '9493', '+447728755248', '2004-02-05', 
'https://ui-avatars.com/api/?name=Daniel+Jones',
NULL, false, 
NULL, false,
'{"can_work_as": ["healthcare_assistant"]}'::jsonb,
'[{"employer": "Previous Care Home", "duration": "2 years"}]'::jsonb, '[{"name": "Jane Ref", "phone": "+447617364270"}]'::jsonb,
'["First Aid", "Manual Handling"]'::jsonb, true, '{"latitude": 54.90704578187522, "longitude": -1.6127062706829447, "timestamp": "2025-11-09T05:48:21.235014"}'::jsonb,
'2025-09-10', 48, '{"line1": "579 High Street", "city": "Manchester", "postcode": "SR5 4TL", "country": "UK"}'::jsonb,
'{"name": "Emergency Contact", "relationship": "Spouse", "phone": "+447780233262"}'::jsonb,
'{"monday": [{"start": "08:00", "end": "20:00"}], "tuesday": [{"start": "08:00", "end": "20:00"}]}'::jsonb,
4.2, 49, '2025-11-07T03:48:21.235014', '2025-11-01T04:48:21.235014', '2025-11-09T01:48:21.235014');
INSERT INTO staff (id, agency_id, first_name, last_name, email, phone, role, employment_type, status, hourly_rate, 
created_by, whatsapp_pin, whatsapp_number_verified, date_of_birth, profile_photo_url, 
nmc_pin, medication_trained, medication_training_expiry, can_work_as_senior, role_hierarchy,
employment_history, references, skills, gps_consent, last_known_location, date_joined, months_of_experience,
address, emergency_contact, availability, rating, total_shifts_completed, gps_consent_date, created_date, updated_date)
VALUES ('c2b64c5a-32bd-456a-b142-55ac7ae5e067', '77f4a189-9735-4cbb-b62b-cdae0291c34e', 'Jessica', 'Thomas', 'jessica.thomas@gmail.com', '+447212573682',
'senior_care_worker', 'temporary', 'active', 17,
'admin@agency.com', '8708', '+447965528298', '2000-12-15', 
'https://ui-avatars.com/api/?name=Jessica+Thomas',
NULL, false, 
NULL, true,
'{"can_work_as": ["senior_care_worker"]}'::jsonb,
'[{"employer": "Previous Care Home", "duration": "2 years"}]'::jsonb, '[{"name": "Jane Ref", "phone": "+447714706573"}]'::jsonb,
'["First Aid", "Manual Handling"]'::jsonb, true, '{"latitude": 54.95105970715351, "longitude": -1.6700401288681956, "timestamp": "2025-11-10T06:48:21.235014"}'::jsonb,
'2025-03-24', 27, '{"line1": "222 Main Street", "city": "London", "postcode": "NE7 5XU", "country": "UK"}'::jsonb,
'{"name": "Emergency Contact", "relationship": "Spouse", "phone": "+447389275609"}'::jsonb,
'{"monday": [{"start": "08:00", "end": "20:00"}], "tuesday": [{"start": "08:00", "end": "20:00"}]}'::jsonb,
4.9, 47, '2025-10-21T15:48:21.235014', '2025-10-24T16:48:21.235014', '2025-11-09T04:48:21.235014');
INSERT INTO staff (id, agency_id, first_name, last_name, email, phone, role, employment_type, status, hourly_rate, 
created_by, whatsapp_pin, whatsapp_number_verified, date_of_birth, profile_photo_url, 
nmc_pin, medication_trained, medication_training_expiry, can_work_as_senior, role_hierarchy,
employment_history, references, skills, gps_consent, last_known_location, date_joined, months_of_experience,
address, emergency_contact, availability, rating, total_shifts_completed, gps_consent_date, created_date, updated_date)
VALUES ('5be3aeb4-bbc7-4751-a3b2-4aa3b8246f7e', '77f4a189-9735-4cbb-b62b-cdae0291c34e', 'Daniel', 'Taylor', 'daniel.taylor@gmail.com', '+447988598779',
'nurse', 'temporary', 'active', 14,
'admin@agency.com', '3657', '+447474250415', '2017-09-14', 
'https://ui-avatars.com/api/?name=Daniel+Taylor',
'NMC253327', true, 
'2026-08-20', false,
'{"can_work_as": ["nurse"]}'::jsonb,
'[{"employer": "Previous Care Home", "duration": "2 years"}]'::jsonb, '[{"name": "Jane Ref", "phone": "+447316410601"}]'::jsonb,
'["First Aid", "Manual Handling"]'::jsonb, true, '{"latitude": 54.97441754610064, "longitude": -1.6457365269766155, "timestamp": "2025-11-10T04:48:21.235014"}'::jsonb,
'2025-06-21', 44, '{"line1": "207 High Street", "city": "Birmingham", "postcode": "SR1 2YA", "country": "UK"}'::jsonb,
'{"name": "Emergency Contact", "relationship": "Spouse", "phone": "+447945012595"}'::jsonb,
'{"monday": [{"start": "08:00", "end": "20:00"}], "tuesday": [{"start": "08:00", "end": "20:00"}]}'::jsonb,
4.6, 48, '2025-09-30T20:48:21.235014', '2025-09-15T03:48:21.235014', '2025-11-10T14:48:21.235014');
INSERT INTO staff (id, agency_id, first_name, last_name, email, phone, role, employment_type, status, hourly_rate, 
created_by, whatsapp_pin, whatsapp_number_verified, date_of_birth, profile_photo_url, 
nmc_pin, medication_trained, medication_training_expiry, can_work_as_senior, role_hierarchy,
employment_history, references, skills, gps_consent, last_known_location, date_joined, months_of_experience,
address, emergency_contact, availability, rating, total_shifts_completed, gps_consent_date, created_date, updated_date)
VALUES ('8d4bad9b-6e8a-4eb2-9729-3b8928c81e67', '77f4a189-9735-4cbb-b62b-cdae0291c34e', 'Jennifer', 'Jones', 'jennifer.jones@gmail.com', '+447611176185',
'healthcare_assistant', 'temporary', 'active', 21,
'admin@agency.com', '2652', '+447035490418', '1998-12-19', 
'https://ui-avatars.com/api/?name=Jennifer+Jones',
NULL, false, 
NULL, false,
'{"can_work_as": ["healthcare_assistant"]}'::jsonb,
'[{"employer": "Previous Care Home", "duration": "2 years"}]'::jsonb, '[{"name": "Jane Ref", "phone": "+447055386494"}]'::jsonb,
'["First Aid", "Manual Handling"]'::jsonb, true, '{"latitude": 54.988198509204466, "longitude": -1.6900526494628725, "timestamp": "2025-11-09T20:48:21.235014"}'::jsonb,
'2025-02-06', 60, '{"line1": "795 Main Street", "city": "Leeds", "postcode": "TS5 9AU", "country": "UK"}'::jsonb,
'{"name": "Emergency Contact", "relationship": "Spouse", "phone": "+447220764850"}'::jsonb,
'{"monday": [{"start": "08:00", "end": "20:00"}], "tuesday": [{"start": "08:00", "end": "20:00"}]}'::jsonb,
4.8, 23, '2025-09-28T09:48:21.235014', '2025-10-03T21:48:21.235014', '2025-11-10T16:48:21.235014');

-- 4. CLIENTS (6 care homes - 3 per agency)
INSERT INTO clients (id, agency_id, name, type, status, created_by, location_coordinates, geofence_enabled,
contact_person, billing_email, address, cqc_rating, bed_capacity, preferred_staff, notes, total_bookings,
internal_locations, payment_terms, contract_terms, rating, geofence_radius_meters, created_date, updated_date)
VALUES ('b22f82d8-3ff9-4b39-a8f5-ee0c0bad6a41', '7b0c0285-852b-4430-bb72-771752d79fdd', 'Divine Care Center', 'care_home', 'active', 'admin@agency.com',
'{"latitude": 54.9783, "longitude": -1.6174}'::jsonb, true,
'{"name": "Care Manager", "email": "manager@divinecarecenter.com", "phone": "+447389454454", "role": "Manager"}'::jsonb,
'billing@divinecarecenter.com', '{"line1": "980 Church Lane", "city": "Manchester", "postcode": "TS9 4DE", "country": "UK"}'::jsonb,
'good', 45, '["b7d0d3f5-77e7-4d50-bbde-90a02e1848cf"]'::jsonb,
'Preferred care home with excellent facilities', 19,
'["Room 1", "Room 2", "Room 3", "Wing A", "Wing B"]'::jsonb, 'net_30',
'{"require_location_specification": true, "break_duration_minutes": 30, "rates_by_role": {"nurse": {"pay_rate": 20, "charge_rate": 30}, "healthcare_assistant": {"pay_rate": 12, "charge_rate": 18}, "senior_care_worker": {"pay_rate": 16, "charge_rate": 24}}}'::jsonb,
4.3, 100, '2025-10-31T11:48:21.235014', '2025-11-10T08:48:21.235014');
INSERT INTO clients (id, agency_id, name, type, status, created_by, location_coordinates, geofence_enabled,
contact_person, billing_email, address, cqc_rating, bed_capacity, preferred_staff, notes, total_bookings,
internal_locations, payment_terms, contract_terms, rating, geofence_radius_meters, created_date, updated_date)
VALUES ('84e265d6-110d-4d02-9379-7bff65e33dfb', '7b0c0285-852b-4430-bb72-771752d79fdd', 'Instay Sunderland', 'care_home', 'active', 'admin@agency.com',
'{"latitude": 54.9783, "longitude": -1.6174}'::jsonb, true,
'{"name": "Care Manager", "email": "manager@instaysunderland.com", "phone": "+447892116419", "role": "Manager"}'::jsonb,
'billing@instaysunderland.com', '{"line1": "54 Main Street", "city": "Manchester", "postcode": "NE6 8AP", "country": "UK"}'::jsonb,
'good', 45, '["b7d0d3f5-77e7-4d50-bbde-90a02e1848cf"]'::jsonb,
'Preferred care home with excellent facilities', 54,
'["Room 1", "Room 2", "Room 3", "Wing A", "Wing B"]'::jsonb, 'net_30',
'{"require_location_specification": true, "break_duration_minutes": 30, "rates_by_role": {"nurse": {"pay_rate": 20, "charge_rate": 30}, "healthcare_assistant": {"pay_rate": 12, "charge_rate": 18}, "senior_care_worker": {"pay_rate": 16, "charge_rate": 24}}}'::jsonb,
4.6, 100, '2025-08-14T08:48:21.235014', '2025-11-09T02:48:21.235014');
INSERT INTO clients (id, agency_id, name, type, status, created_by, location_coordinates, geofence_enabled,
contact_person, billing_email, address, cqc_rating, bed_capacity, preferred_staff, notes, total_bookings,
internal_locations, payment_terms, contract_terms, rating, geofence_radius_meters, created_date, updated_date)
VALUES ('3be5f5c9-5721-4ab7-bc40-84ec82482086', '7b0c0285-852b-4430-bb72-771752d79fdd', 'Harbor View Lodge', 'care_home', 'active', 'admin@agency.com',
'{"latitude": 54.9783, "longitude": -1.6174}'::jsonb, true,
'{"name": "Care Manager", "email": "manager@harborviewlodge.com", "phone": "+447466375755", "role": "Manager"}'::jsonb,
'billing@harborviewlodge.com', '{"line1": "527 Park Road", "city": "London", "postcode": "NE6 9UX", "country": "UK"}'::jsonb,
'outstanding', 45, '["b7d0d3f5-77e7-4d50-bbde-90a02e1848cf"]'::jsonb,
'Preferred care home with excellent facilities', 79,
'["Room 1", "Room 2", "Room 3", "Wing A", "Wing B"]'::jsonb, 'net_30',
'{"require_location_specification": true, "break_duration_minutes": 30, "rates_by_role": {"nurse": {"pay_rate": 20, "charge_rate": 30}, "healthcare_assistant": {"pay_rate": 12, "charge_rate": 18}, "senior_care_worker": {"pay_rate": 16, "charge_rate": 24}}}'::jsonb,
4.8, 100, '2025-10-03T19:48:21.235014', '2025-11-10T11:48:21.235014');
INSERT INTO clients (id, agency_id, name, type, status, created_by, location_coordinates, geofence_enabled,
contact_person, billing_email, address, cqc_rating, bed_capacity, preferred_staff, notes, total_bookings,
internal_locations, payment_terms, contract_terms, rating, geofence_radius_meters, created_date, updated_date)
VALUES ('88943b25-4cf0-44b2-b2c5-2467c93d6869', '77f4a189-9735-4cbb-b62b-cdae0291c34e', 'Willow Manor', 'care_home', 'active', 'admin@agency.com',
'{"latitude": 54.9783, "longitude": -1.6174}'::jsonb, true,
'{"name": "Care Manager", "email": "manager@willowmanor.com", "phone": "+447456053336", "role": "Manager"}'::jsonb,
'billing@willowmanor.com', '{"line1": "538 Main Street", "city": "London", "postcode": "TS9 8RP", "country": "UK"}'::jsonb,
'good', 45, '["b7d0d3f5-77e7-4d50-bbde-90a02e1848cf"]'::jsonb,
'Preferred care home with excellent facilities', 19,
'["Room 1", "Room 2", "Room 3", "Wing A", "Wing B"]'::jsonb, 'net_30',
'{"require_location_specification": true, "break_duration_minutes": 30, "rates_by_role": {"nurse": {"pay_rate": 20, "charge_rate": 30}, "healthcare_assistant": {"pay_rate": 12, "charge_rate": 18}, "senior_care_worker": {"pay_rate": 16, "charge_rate": 24}}}'::jsonb,
4.7, 100, '2025-10-23T01:48:21.235014', '2025-11-10T23:48:21.235014');
INSERT INTO clients (id, agency_id, name, type, status, created_by, location_coordinates, geofence_enabled,
contact_person, billing_email, address, cqc_rating, bed_capacity, preferred_staff, notes, total_bookings,
internal_locations, payment_terms, contract_terms, rating, geofence_radius_meters, created_date, updated_date)
VALUES ('2981c19b-9f0a-4eff-a7fe-e6ab6a894ffa', '77f4a189-9735-4cbb-b62b-cdae0291c34e', 'Oakwood Residence', 'care_home', 'active', 'admin@agency.com',
'{"latitude": 54.9783, "longitude": -1.6174}'::jsonb, true,
'{"name": "Care Manager", "email": "manager@oakwoodresidence.com", "phone": "+447604530774", "role": "Manager"}'::jsonb,
'billing@oakwoodresidence.com', '{"line1": "777 Park Road", "city": "Newcastle", "postcode": "NE1 3ER", "country": "UK"}'::jsonb,
'outstanding', 60, '["b7d0d3f5-77e7-4d50-bbde-90a02e1848cf"]'::jsonb,
'Preferred care home with excellent facilities', 100,
'["Room 1", "Room 2", "Room 3", "Wing A", "Wing B"]'::jsonb, 'net_30',
'{"require_location_specification": true, "break_duration_minutes": 30, "rates_by_role": {"nurse": {"pay_rate": 20, "charge_rate": 30}, "healthcare_assistant": {"pay_rate": 12, "charge_rate": 18}, "senior_care_worker": {"pay_rate": 16, "charge_rate": 24}}}'::jsonb,
4.7, 100, '2025-11-06T08:48:21.235014', '2025-11-10T14:48:21.235014');
INSERT INTO clients (id, agency_id, name, type, status, created_by, location_coordinates, geofence_enabled,
contact_person, billing_email, address, cqc_rating, bed_capacity, preferred_staff, notes, total_bookings,
internal_locations, payment_terms, contract_terms, rating, geofence_radius_meters, created_date, updated_date)
VALUES ('6997c7d5-ff56-43f8-a56d-7a399c973d35', '77f4a189-9735-4cbb-b62b-cdae0291c34e', 'Sunset Gardens', 'care_home', 'active', 'admin@agency.com',
'{"latitude": 54.9783, "longitude": -1.6174}'::jsonb, true,
'{"name": "Care Manager", "email": "manager@sunsetgardens.com", "phone": "+447748245622", "role": "Manager"}'::jsonb,
'billing@sunsetgardens.com', '{"line1": "385 Station Road", "city": "Newcastle", "postcode": "SR9 5GL", "country": "UK"}'::jsonb,
'outstanding', 60, '["b7d0d3f5-77e7-4d50-bbde-90a02e1848cf"]'::jsonb,
'Preferred care home with excellent facilities', 89,
'["Room 1", "Room 2", "Room 3", "Wing A", "Wing B"]'::jsonb, 'net_30',
'{"require_location_specification": true, "break_duration_minutes": 30, "rates_by_role": {"nurse": {"pay_rate": 20, "charge_rate": 30}, "healthcare_assistant": {"pay_rate": 12, "charge_rate": 18}, "senior_care_worker": {"pay_rate": 16, "charge_rate": 24}}}'::jsonb,
4.9, 100, '2025-09-15T15:48:21.235014', '2025-11-10T16:48:21.235014');

-- ============================================================================
-- ADDITIONAL SEED DATA: Shifts, Bookings, Timesheets, Invoices, etc.
-- ============================================================================

-- 5. SHIFTS (15 records)
INSERT INTO shifts (id, agency_id, client_id, assigned_staff_id, date, start_time, end_time, duration_hours, 
role_required, pay_rate, charge_rate, break_duration_minutes, status, urgency, notes, created_by, 
work_location_within_site, shift_journey_log, financial_locked, recurring, requirements, 
booking_id, timesheet_received, marketplace_visible, admin_closure_required, created_date, updated_date)
VALUES ('af9de779-45e2-4e02-9d4f-fca05f3f520e', '7b0c0285-852b-4430-bb72-771752d79fdd', 'b22f82d8-3ff9-4b39-a8f5-ee0c0bad6a41', NULL, 
'2025-10-30', '2025-10-30T08:50:06.614876', '2025-10-30T20:50:06.614876', 12,
'nurse', 16, 32, 30, 'open', 
'urgent', 'Shift for nurse', 'admin@agency.com',
'Room 19', '[]'::jsonb, 
false, false, '["Medication trained", "DBS checked"]'::jsonb,
NULL, false, false, false,
'2025-10-18T07:50:06.614876', '2025-11-09T19:50:06.614876');
INSERT INTO shifts (id, agency_id, client_id, assigned_staff_id, date, start_time, end_time, duration_hours, 
role_required, pay_rate, charge_rate, break_duration_minutes, status, urgency, notes, created_by, 
work_location_within_site, shift_journey_log, financial_locked, recurring, requirements, 
booking_id, timesheet_received, marketplace_visible, admin_closure_required, created_date, updated_date)
VALUES ('02d905c5-e4a3-464c-ad25-fa391d1d7d05', '77f4a189-9735-4cbb-b62b-cdae0291c34e', '84e265d6-110d-4d02-9379-7bff65e33dfb', '16370a49-aacd-43bf-907a-aa691750e39d', 
'2025-10-28', '2025-10-28T08:50:06.614876', '2025-10-28T20:50:06.614876', 12,
'healthcare_assistant', 16, 29, 30, 'assigned', 
'normal', 'Shift for healthcare_assistant', 'admin@agency.com',
'Room 5', '[{"status": "open", "timestamp": "2025-10-29T18:50:06.614876", "user": "system"}, {"status": "assigned", "timestamp": "2025-11-08T18:50:06.614876", "user": "admin"}]'::jsonb, 
false, false, '["Medication trained", "DBS checked"]'::jsonb,
NULL, false, false, true,
'2025-10-16T07:50:06.614876', '2025-11-10T09:50:06.614876');
INSERT INTO shifts (id, agency_id, client_id, assigned_staff_id, date, start_time, end_time, duration_hours, 
role_required, pay_rate, charge_rate, break_duration_minutes, status, urgency, notes, created_by, 
work_location_within_site, shift_journey_log, financial_locked, recurring, requirements, 
booking_id, timesheet_received, marketplace_visible, admin_closure_required, created_date, updated_date)
VALUES ('35612d0c-f0db-4f60-bb60-e8a390b1c482', '7b0c0285-852b-4430-bb72-771752d79fdd', '3be5f5c9-5721-4ab7-bc40-84ec82482086', '52025345-00b3-45ed-8d4b-340ee78d78e1', 
'2025-11-18', '2025-11-18T08:50:06.614876', '2025-11-18T20:50:06.614876', 12,
'senior_care_worker', 22, 26, 30, 'confirmed', 
'normal', 'Shift for senior_care_worker', 'admin@agency.com',
'Room 17', '[{"status": "open", "timestamp": "2025-11-01T23:50:06.614876", "user": "system"}, {"status": "confirmed", "timestamp": "2025-11-04T02:50:06.614876", "user": "admin"}]'::jsonb, 
false, false, '["Medication trained", "DBS checked"]'::jsonb,
NULL, false, false, true,
'2025-10-11T07:50:06.614876', '2025-11-09T11:50:06.614876');
INSERT INTO shifts (id, agency_id, client_id, assigned_staff_id, date, start_time, end_time, duration_hours, 
role_required, pay_rate, charge_rate, break_duration_minutes, status, urgency, notes, created_by, 
work_location_within_site, shift_journey_log, financial_locked, recurring, requirements, 
booking_id, timesheet_received, marketplace_visible, admin_closure_required, created_date, updated_date)
VALUES ('4d26dbbc-50f9-4457-a59e-68418790e810', '77f4a189-9735-4cbb-b62b-cdae0291c34e', '88943b25-4cf0-44b2-b2c5-2467c93d6869', '2a994361-bbfe-4342-aa77-4fa370bfc1ad', 
'2025-11-13', '2025-11-13T08:50:06.614876', '2025-11-13T20:50:06.614876', 12,
'nurse', 22, 27, 30, 'completed', 
'normal', 'Shift for nurse', 'admin@agency.com',
'Room 3', '[{"status": "open", "timestamp": "2025-10-25T17:50:06.614876", "user": "system"}, {"status": "completed", "timestamp": "2025-11-06T09:50:06.614876", "user": "admin"}]'::jsonb, 
true, false, '["Medication trained", "DBS checked"]'::jsonb,
NULL, true, false, true,
'2025-10-15T00:50:06.614876', '2025-11-10T16:50:06.614876');
INSERT INTO shifts (id, agency_id, client_id, assigned_staff_id, date, start_time, end_time, duration_hours, 
role_required, pay_rate, charge_rate, break_duration_minutes, status, urgency, notes, created_by, 
work_location_within_site, shift_journey_log, financial_locked, recurring, requirements, 
booking_id, timesheet_received, marketplace_visible, admin_closure_required, created_date, updated_date)
VALUES ('ce390fc8-68c4-4280-908c-15a32f0f692c', '7b0c0285-852b-4430-bb72-771752d79fdd', '2981c19b-9f0a-4eff-a7fe-e6ab6a894ffa', 'e73c04c0-7102-4307-9b0c-af5981b76253', 
'2025-11-14', '2025-11-14T08:50:06.614876', '2025-11-14T20:50:06.614876', 12,
'healthcare_assistant', 15, 32, 30, 'completed', 
'normal', 'Shift for healthcare_assistant', 'admin@agency.com',
'Room 9', '[{"status": "open", "timestamp": "2025-10-29T06:50:06.614876", "user": "system"}, {"status": "completed", "timestamp": "2025-11-05T05:50:06.614876", "user": "admin"}]'::jsonb, 
true, false, '["Medication trained", "DBS checked"]'::jsonb,
NULL, true, false, true,
'2025-10-16T00:50:06.614876', '2025-11-10T11:50:06.614876');
INSERT INTO shifts (id, agency_id, client_id, assigned_staff_id, date, start_time, end_time, duration_hours, 
role_required, pay_rate, charge_rate, break_duration_minutes, status, urgency, notes, created_by, 
work_location_within_site, shift_journey_log, financial_locked, recurring, requirements, 
booking_id, timesheet_received, marketplace_visible, admin_closure_required, created_date, updated_date)
VALUES ('1df479e3-2a76-438c-a1bd-152744f0c14b', '77f4a189-9735-4cbb-b62b-cdae0291c34e', '6997c7d5-ff56-43f8-a56d-7a399c973d35', 'e23a2d85-e6b1-44c1-905b-23ca43cbe58b', 
'2025-11-15', '2025-11-15T08:50:06.614876', '2025-11-15T20:50:06.614876', 12,
'nurse', 22, 27, 30, 'completed', 
'urgent', 'Shift for nurse', 'admin@agency.com',
'Room 11', '[{"status": "open", "timestamp": "2025-11-08T09:50:06.614876", "user": "system"}, {"status": "completed", "timestamp": "2025-11-03T06:50:06.614876", "user": "admin"}]'::jsonb, 
true, false, '["Medication trained", "DBS checked"]'::jsonb,
NULL, true, false, true,
'2025-10-31T21:50:06.614876', '2025-11-09T11:50:06.614876');
INSERT INTO shifts (id, agency_id, client_id, assigned_staff_id, date, start_time, end_time, duration_hours, 
role_required, pay_rate, charge_rate, break_duration_minutes, status, urgency, notes, created_by, 
work_location_within_site, shift_journey_log, financial_locked, recurring, requirements, 
booking_id, timesheet_received, marketplace_visible, admin_closure_required, created_date, updated_date)
VALUES ('bf0430c5-00eb-4f03-9646-a94a5e283bee', '7b0c0285-852b-4430-bb72-771752d79fdd', 'b22f82d8-3ff9-4b39-a8f5-ee0c0bad6a41', '600d81f3-6352-4c15-9427-bebdab265677', 
'2025-11-14', '2025-11-14T08:50:06.615528', '2025-11-14T20:50:06.615528', 12,
'healthcare_assistant', 17, 30, 30, 'in_progress', 
'normal', 'Shift for healthcare_assistant', 'admin@agency.com',
'Room 10', '[{"status": "open", "timestamp": "2025-10-27T09:50:06.615528", "user": "system"}, {"status": "in_progress", "timestamp": "2025-11-10T21:50:06.615528", "user": "admin"}]'::jsonb, 
false, false, '["Medication trained", "DBS checked"]'::jsonb,
NULL, false, false, true,
'2025-10-28T06:50:06.615528', '2025-11-09T09:50:06.615528');
INSERT INTO shifts (id, agency_id, client_id, assigned_staff_id, date, start_time, end_time, duration_hours, 
role_required, pay_rate, charge_rate, break_duration_minutes, status, urgency, notes, created_by, 
work_location_within_site, shift_journey_log, financial_locked, recurring, requirements, 
booking_id, timesheet_received, marketplace_visible, admin_closure_required, created_date, updated_date)
VALUES ('3d11c244-1480-41b8-a4ec-93823b2a008f', '77f4a189-9735-4cbb-b62b-cdae0291c34e', '84e265d6-110d-4d02-9379-7bff65e33dfb', NULL, 
'2025-10-31', '2025-10-31T08:50:06.615528', '2025-10-31T20:50:06.615528', 12,
'senior_care_worker', 19, 23, 30, 'open', 
'normal', 'Shift for senior_care_worker', 'admin@agency.com',
'Room 6', '[]'::jsonb, 
false, false, '["Medication trained", "DBS checked"]'::jsonb,
NULL, false, false, false,
'2025-10-16T09:50:06.615528', '2025-11-10T06:50:06.615528');
INSERT INTO shifts (id, agency_id, client_id, assigned_staff_id, date, start_time, end_time, duration_hours, 
role_required, pay_rate, charge_rate, break_duration_minutes, status, urgency, notes, created_by, 
work_location_within_site, shift_journey_log, financial_locked, recurring, requirements, 
booking_id, timesheet_received, marketplace_visible, admin_closure_required, created_date, updated_date)
VALUES ('30362619-9f18-44b4-921a-21a8fc18d252', '7b0c0285-852b-4430-bb72-771752d79fdd', '3be5f5c9-5721-4ab7-bc40-84ec82482086', '5be3aeb4-bbc7-4751-a3b2-4aa3b8246f7e', 
'2025-11-09', '2025-11-09T08:50:06.615528', '2025-11-09T20:50:06.615528', 12,
'nurse', 22, 27, 30, 'assigned', 
'normal', 'Shift for nurse', 'admin@agency.com',
'Room 11', '[{"status": "open", "timestamp": "2025-11-02T13:50:06.615528", "user": "system"}, {"status": "assigned", "timestamp": "2025-10-31T01:50:06.615528", "user": "admin"}]'::jsonb, 
false, false, '["Medication trained", "DBS checked"]'::jsonb,
NULL, false, false, true,
'2025-11-09T10:50:06.615528', '2025-11-10T23:50:06.615528');
INSERT INTO shifts (id, agency_id, client_id, assigned_staff_id, date, start_time, end_time, duration_hours, 
role_required, pay_rate, charge_rate, break_duration_minutes, status, urgency, notes, created_by, 
work_location_within_site, shift_journey_log, financial_locked, recurring, requirements, 
booking_id, timesheet_received, marketplace_visible, admin_closure_required, created_date, updated_date)
VALUES ('34d965ec-6344-489a-906b-c7687f2b0b82', '77f4a189-9735-4cbb-b62b-cdae0291c34e', '88943b25-4cf0-44b2-b2c5-2467c93d6869', '8d4bad9b-6e8a-4eb2-9729-3b8928c81e67', 
'2025-11-13', '2025-11-13T08:50:06.615528', '2025-11-13T20:50:06.615528', 12,
'healthcare_assistant', 15, 26, 30, 'confirmed', 
'normal', 'Shift for healthcare_assistant', 'admin@agency.com',
'Room 16', '[{"status": "open", "timestamp": "2025-10-29T20:50:06.615528", "user": "system"}, {"status": "confirmed", "timestamp": "2025-10-31T06:50:06.615528", "user": "admin"}]'::jsonb, 
false, false, '["Medication trained", "DBS checked"]'::jsonb,
NULL, false, false, true,
'2025-11-02T00:50:06.615528', '2025-11-09T13:50:06.615528');
INSERT INTO shifts (id, agency_id, client_id, assigned_staff_id, date, start_time, end_time, duration_hours, 
role_required, pay_rate, charge_rate, break_duration_minutes, status, urgency, notes, created_by, 
work_location_within_site, shift_journey_log, financial_locked, recurring, requirements, 
booking_id, timesheet_received, marketplace_visible, admin_closure_required, created_date, updated_date)
VALUES ('0a0636c9-0f16-41f6-99e5-9e1ac9320576', '7b0c0285-852b-4430-bb72-771752d79fdd', '2981c19b-9f0a-4eff-a7fe-e6ab6a894ffa', 'b7d0d3f5-77e7-4d50-bbde-90a02e1848cf', 
'2025-10-28', '2025-10-28T08:50:06.615528', '2025-10-28T20:50:06.615528', 12,
'nurse', 21, 25, 30, 'completed', 
'urgent', 'Shift for nurse', 'admin@agency.com',
'Room 8', '[{"status": "open", "timestamp": "2025-10-26T17:50:06.615528", "user": "system"}, {"status": "completed", "timestamp": "2025-11-07T21:50:06.615528", "user": "admin"}]'::jsonb, 
true, false, '["Medication trained", "DBS checked"]'::jsonb,
NULL, true, false, true,
'2025-10-19T06:50:06.615528', '2025-11-10T18:50:06.615528');
INSERT INTO shifts (id, agency_id, client_id, assigned_staff_id, date, start_time, end_time, duration_hours, 
role_required, pay_rate, charge_rate, break_duration_minutes, status, urgency, notes, created_by, 
work_location_within_site, shift_journey_log, financial_locked, recurring, requirements, 
booking_id, timesheet_received, marketplace_visible, admin_closure_required, created_date, updated_date)
VALUES ('83a18b75-ce85-4a74-84dc-2a056941fe08', '77f4a189-9735-4cbb-b62b-cdae0291c34e', '6997c7d5-ff56-43f8-a56d-7a399c973d35', '16370a49-aacd-43bf-907a-aa691750e39d', 
'2025-11-09', '2025-11-09T08:50:06.615528', '2025-11-09T20:50:06.615528', 12,
'healthcare_assistant', 22, 31, 30, 'completed', 
'normal', 'Shift for healthcare_assistant', 'admin@agency.com',
'Room 1', '[{"status": "open", "timestamp": "2025-10-25T01:50:06.615528", "user": "system"}, {"status": "completed", "timestamp": "2025-11-04T16:50:06.615528", "user": "admin"}]'::jsonb, 
true, false, '["Medication trained", "DBS checked"]'::jsonb,
NULL, true, false, true,
'2025-10-15T18:50:06.615528', '2025-11-10T15:50:06.615528');
INSERT INTO shifts (id, agency_id, client_id, assigned_staff_id, date, start_time, end_time, duration_hours, 
role_required, pay_rate, charge_rate, break_duration_minutes, status, urgency, notes, created_by, 
work_location_within_site, shift_journey_log, financial_locked, recurring, requirements, 
booking_id, timesheet_received, marketplace_visible, admin_closure_required, created_date, updated_date)
VALUES ('0189e4ef-12f7-4112-94af-89e1c6c8362f', '7b0c0285-852b-4430-bb72-771752d79fdd', 'b22f82d8-3ff9-4b39-a8f5-ee0c0bad6a41', NULL, 
'2025-11-16', '2025-11-16T08:50:06.615528', '2025-11-16T20:50:06.615528', 12,
'senior_care_worker', 20, 24, 30, 'cancelled', 
'normal', 'Shift for senior_care_worker', 'admin@agency.com',
'Room 8', '[{"status": "open", "timestamp": "2025-11-01T17:50:06.615528", "user": "system"}, {"status": "cancelled", "timestamp": "2025-11-04T12:50:06.615528", "user": "admin"}]'::jsonb, 
false, false, '["Medication trained", "DBS checked"]'::jsonb,
NULL, false, false, true,
'2025-10-20T10:50:06.615528', '2025-11-11T00:50:06.615528');
INSERT INTO shifts (id, agency_id, client_id, assigned_staff_id, date, start_time, end_time, duration_hours, 
role_required, pay_rate, charge_rate, break_duration_minutes, status, urgency, notes, created_by, 
work_location_within_site, shift_journey_log, financial_locked, recurring, requirements, 
booking_id, timesheet_received, marketplace_visible, admin_closure_required, created_date, updated_date)
VALUES ('865123cf-e9bb-42b6-8689-0389e1db0f0a', '77f4a189-9735-4cbb-b62b-cdae0291c34e', '84e265d6-110d-4d02-9379-7bff65e33dfb', NULL, 
'2025-11-09', '2025-11-09T08:50:06.615528', '2025-11-09T20:50:06.615528', 12,
'nurse', 17, 32, 30, 'open', 
'normal', 'Shift for nurse', 'admin@agency.com',
'Room 17', '[]'::jsonb, 
false, false, '["Medication trained", "DBS checked"]'::jsonb,
NULL, false, false, false,
'2025-10-22T18:50:06.615528', '2025-11-09T21:50:06.615528');
INSERT INTO shifts (id, agency_id, client_id, assigned_staff_id, date, start_time, end_time, duration_hours, 
role_required, pay_rate, charge_rate, break_duration_minutes, status, urgency, notes, created_by, 
work_location_within_site, shift_journey_log, financial_locked, recurring, requirements, 
booking_id, timesheet_received, marketplace_visible, admin_closure_required, created_date, updated_date)
VALUES ('7c06dde5-54ca-4db9-b8ab-7cc6f781427f', '7b0c0285-852b-4430-bb72-771752d79fdd', '3be5f5c9-5721-4ab7-bc40-84ec82482086', 'e73c04c0-7102-4307-9b0c-af5981b76253', 
'2025-11-14', '2025-11-14T08:50:06.615528', '2025-11-14T20:50:06.615528', 12,
'healthcare_assistant', 21, 30, 30, 'assigned', 
'normal', 'Shift for healthcare_assistant', 'admin@agency.com',
'Room 2', '[{"status": "open", "timestamp": "2025-11-05T13:50:06.615528", "user": "system"}, {"status": "assigned", "timestamp": "2025-11-02T15:50:06.615528", "user": "admin"}]'::jsonb, 
false, false, '["Medication trained", "DBS checked"]'::jsonb,
NULL, false, false, true,
'2025-10-16T21:50:06.615528', '2025-11-09T20:50:06.615528');

-- 6. BOOKINGS (10 records)
INSERT INTO bookings (id, agency_id, shift_id, staff_id, client_id, status, booking_date, 
shift_date, confirmation_method, confirmed_by_staff_at, notes, created_date, updated_date)
VALUES ('d5c718e9-a78a-49ce-b1ef-ec696932d0f5', '7b0c0285-852b-4430-bb72-771752d79fdd', 'af9de779-45e2-4e02-9d4f-fca05f3f520e', 'b7d0d3f5-77e7-4d50-bbde-90a02e1848cf', 'b22f82d8-3ff9-4b39-a8f5-ee0c0bad6a41',
'confirmed', '2025-11-02T03:50:06.615528', '2025-11-03', 'phone', '2025-11-06T23:50:06.615528',
'Booking confirmed by staff', '2025-11-10T06:50:06.615528', '2025-11-10T15:50:06.615528');
INSERT INTO bookings (id, agency_id, shift_id, staff_id, client_id, status, booking_date, 
shift_date, confirmation_method, confirmed_by_staff_at, notes, created_date, updated_date)
VALUES ('8addbfd3-35aa-4877-8096-79026f303d59', '77f4a189-9735-4cbb-b62b-cdae0291c34e', '02d905c5-e4a3-464c-ad25-fa391d1d7d05', '16370a49-aacd-43bf-907a-aa691750e39d', '84e265d6-110d-4d02-9379-7bff65e33dfb',
'confirmed', '2025-11-09T20:50:06.615528', '2025-11-09', 'phone', '2025-11-07T00:50:06.615528',
'Booking confirmed by staff', '2025-10-29T05:50:06.615528', '2025-11-09T10:50:06.615528');
INSERT INTO bookings (id, agency_id, shift_id, staff_id, client_id, status, booking_date, 
shift_date, confirmation_method, confirmed_by_staff_at, notes, created_date, updated_date)
VALUES ('c3911d54-9e1b-427c-8192-7e46ea859091', '7b0c0285-852b-4430-bb72-771752d79fdd', '35612d0c-f0db-4f60-bb60-e8a390b1c482', '52025345-00b3-45ed-8d4b-340ee78d78e1', '3be5f5c9-5721-4ab7-bc40-84ec82482086',
'confirmed', '2025-11-04T06:50:06.615528', '2025-11-10', 'phone', '2025-11-09T16:50:06.615528',
'Booking confirmed by staff', '2025-10-27T07:50:06.615528', '2025-11-10T09:50:06.615528');
INSERT INTO bookings (id, agency_id, shift_id, staff_id, client_id, status, booking_date, 
shift_date, confirmation_method, confirmed_by_staff_at, notes, created_date, updated_date)
VALUES ('758bb5b0-360c-4bd4-a39c-4b459fd01ef5', '77f4a189-9735-4cbb-b62b-cdae0291c34e', '4d26dbbc-50f9-4457-a59e-68418790e810', '2a994361-bbfe-4342-aa77-4fa370bfc1ad', '88943b25-4cf0-44b2-b2c5-2467c93d6869',
'confirmed', '2025-11-06T20:50:06.615528', '2025-11-04', 'phone', '2025-11-05T16:50:06.616236',
'Booking confirmed by staff', '2025-11-06T23:50:06.616236', '2025-11-09T14:50:06.616236');
INSERT INTO bookings (id, agency_id, shift_id, staff_id, client_id, status, booking_date, 
shift_date, confirmation_method, confirmed_by_staff_at, notes, created_date, updated_date)
VALUES ('70d5a70e-eae5-4d71-b5c6-ca7e3195bc3c', '7b0c0285-852b-4430-bb72-771752d79fdd', 'ce390fc8-68c4-4280-908c-15a32f0f692c', 'e73c04c0-7102-4307-9b0c-af5981b76253', '2981c19b-9f0a-4eff-a7fe-e6ab6a894ffa',
'confirmed', '2025-11-09T20:50:06.616236', '2025-11-09', 'phone', '2025-11-08T14:50:06.616236',
'Booking confirmed by staff', '2025-11-10T18:50:06.616236', '2025-11-10T09:50:06.616236');
INSERT INTO bookings (id, agency_id, shift_id, staff_id, client_id, status, booking_date, 
shift_date, confirmation_method, confirmed_by_staff_at, notes, created_date, updated_date)
VALUES ('912bb61f-bbff-4a68-9a06-b8e23f0192eb', '77f4a189-9735-4cbb-b62b-cdae0291c34e', '1df479e3-2a76-438c-a1bd-152744f0c14b', 'e23a2d85-e6b1-44c1-905b-23ca43cbe58b', '6997c7d5-ff56-43f8-a56d-7a399c973d35',
'confirmed', '2025-11-01T00:50:06.616236', '2025-11-02', 'phone', '2025-11-03T01:50:06.616236',
'Booking confirmed by staff', '2025-11-10T18:50:06.616236', '2025-11-09T21:50:06.616236');
INSERT INTO bookings (id, agency_id, shift_id, staff_id, client_id, status, booking_date, 
shift_date, confirmation_method, confirmed_by_staff_at, notes, created_date, updated_date)
VALUES ('b819d681-c7b7-4054-922d-53fa8248ac75', '7b0c0285-852b-4430-bb72-771752d79fdd', 'bf0430c5-00eb-4f03-9646-a94a5e283bee', '600d81f3-6352-4c15-9427-bebdab265677', 'b22f82d8-3ff9-4b39-a8f5-ee0c0bad6a41',
'confirmed', '2025-10-31T01:50:06.616236', '2025-11-10', 'phone', '2025-11-01T06:50:06.616236',
'Booking confirmed by staff', '2025-11-04T04:50:06.616236', '2025-11-09T17:50:06.616236');
INSERT INTO bookings (id, agency_id, shift_id, staff_id, client_id, status, booking_date, 
shift_date, confirmation_method, confirmed_by_staff_at, notes, created_date, updated_date)
VALUES ('f9f80726-0ea6-40f9-a2d9-45dc2fa11e8b', '77f4a189-9735-4cbb-b62b-cdae0291c34e', '3d11c244-1480-41b8-a4ec-93823b2a008f', 'c2b64c5a-32bd-456a-b142-55ac7ae5e067', '84e265d6-110d-4d02-9379-7bff65e33dfb',
'confirmed', '2025-11-03T05:50:06.616236', '2025-11-11', 'phone', '2025-11-06T12:50:06.616236',
'Booking confirmed by staff', '2025-11-08T22:50:06.616236', '2025-11-10T01:50:06.616236');
INSERT INTO bookings (id, agency_id, shift_id, staff_id, client_id, status, booking_date, 
shift_date, confirmation_method, confirmed_by_staff_at, notes, created_date, updated_date)
VALUES ('a773d64b-2131-4c88-a60c-8fd0fd4e17d2', '7b0c0285-852b-4430-bb72-771752d79fdd', '30362619-9f18-44b4-921a-21a8fc18d252', '5be3aeb4-bbc7-4751-a3b2-4aa3b8246f7e', '3be5f5c9-5721-4ab7-bc40-84ec82482086',
'confirmed', '2025-11-01T16:50:06.616236', '2025-11-04', 'phone', '2025-11-04T01:50:06.616236',
'Booking confirmed by staff', '2025-11-09T23:50:06.616236', '2025-11-10T01:50:06.616236');
INSERT INTO bookings (id, agency_id, shift_id, staff_id, client_id, status, booking_date, 
shift_date, confirmation_method, confirmed_by_staff_at, notes, created_date, updated_date)
VALUES ('0750378b-c437-46bb-83fa-15f50aae684b', '77f4a189-9735-4cbb-b62b-cdae0291c34e', '34d965ec-6344-489a-906b-c7687f2b0b82', '8d4bad9b-6e8a-4eb2-9729-3b8928c81e67', '88943b25-4cf0-44b2-b2c5-2467c93d6869',
'confirmed', '2025-11-02T05:50:06.616236', '2025-11-04', 'phone', '2025-11-10T03:50:06.616236',
'Booking confirmed by staff', '2025-11-03T05:50:06.616236', '2025-11-09T03:50:06.616236');

-- 7. TIMESHEETS (8 records)
INSERT INTO timesheets (id, agency_id, booking_id, staff_id, client_id, shift_date, 
work_location_within_site, clock_in_time, clock_out_time, total_hours, break_duration_minutes, status,
pay_rate, charge_rate, staff_pay_amount, client_charge_amount, geofence_validated, location_verified,
staff_signature, created_date, updated_date)
VALUES ('328e484d-cacf-4e3b-ad5d-177ef956d6ae', '7b0c0285-852b-4430-bb72-771752d79fdd', 'd5c718e9-a78a-49ce-b1ef-ec696932d0f5', 'b7d0d3f5-77e7-4d50-bbde-90a02e1848cf', 'b22f82d8-3ff9-4b39-a8f5-ee0c0bad6a41',
'2025-11-08', 'Room 6', '2025-11-04T15:50:06.616236', '2025-11-03T20:50:06.616236',
11.5, 30, 'approved', 19, 26, 
192.55, 280.50, true, true,
'SignatureDataBase64...', '2025-11-08T05:50:06.616236', '2025-11-09T16:50:06.616236');
INSERT INTO timesheets (id, agency_id, booking_id, staff_id, client_id, shift_date, 
work_location_within_site, clock_in_time, clock_out_time, total_hours, break_duration_minutes, status,
pay_rate, charge_rate, staff_pay_amount, client_charge_amount, geofence_validated, location_verified,
staff_signature, created_date, updated_date)
VALUES ('33378291-c541-4b4b-9d59-0c5391c9d1ce', '77f4a189-9735-4cbb-b62b-cdae0291c34e', '8addbfd3-35aa-4877-8096-79026f303d59', '16370a49-aacd-43bf-907a-aa691750e39d', '84e265d6-110d-4d02-9379-7bff65e33dfb',
'2025-11-09', 'Room 4', '2025-11-04T06:50:06.616236', '2025-11-05T07:50:06.616236',
10.0, 30, 'approved', 19, 32, 
220.98, 345.83, true, true,
'SignatureDataBase64...', '2025-11-03T22:50:06.616236', '2025-11-10T03:50:06.616236');
INSERT INTO timesheets (id, agency_id, booking_id, staff_id, client_id, shift_date, 
work_location_within_site, clock_in_time, clock_out_time, total_hours, break_duration_minutes, status,
pay_rate, charge_rate, staff_pay_amount, client_charge_amount, geofence_validated, location_verified,
staff_signature, created_date, updated_date)
VALUES ('98585fbb-ff87-4f0a-80a5-38c7e406ee75', '7b0c0285-852b-4430-bb72-771752d79fdd', 'c3911d54-9e1b-427c-8192-7e46ea859091', '52025345-00b3-45ed-8d4b-340ee78d78e1', '3be5f5c9-5721-4ab7-bc40-84ec82482086',
'2025-11-11', 'Room 10', '2025-11-05T04:50:06.616236', '2025-11-04T11:50:06.616236',
10.4, 30, 'approved', 17, 31, 
192.63, 275.25, true, true,
'SignatureDataBase64...', '2025-11-08T12:50:06.616236', '2025-11-09T19:50:06.616236');
INSERT INTO timesheets (id, agency_id, booking_id, staff_id, client_id, shift_date, 
work_location_within_site, clock_in_time, clock_out_time, total_hours, break_duration_minutes, status,
pay_rate, charge_rate, staff_pay_amount, client_charge_amount, geofence_validated, location_verified,
staff_signature, created_date, updated_date)
VALUES ('088c3879-1f95-40c0-8e9d-9bb620c6e23a', '77f4a189-9735-4cbb-b62b-cdae0291c34e', '758bb5b0-360c-4bd4-a39c-4b459fd01ef5', '2a994361-bbfe-4342-aa77-4fa370bfc1ad', '88943b25-4cf0-44b2-b2c5-2467c93d6869',
'2025-11-10', 'Room 6', '2025-11-03T04:50:06.616236', '2025-11-05T16:50:06.616236',
10.4, 30, 'approved', 16, 26, 
209.47, 277.16, true, true,
'SignatureDataBase64...', '2025-10-31T02:50:06.616236', '2025-11-10T10:50:06.616236');
INSERT INTO timesheets (id, agency_id, booking_id, staff_id, client_id, shift_date, 
work_location_within_site, clock_in_time, clock_out_time, total_hours, break_duration_minutes, status,
pay_rate, charge_rate, staff_pay_amount, client_charge_amount, geofence_validated, location_verified,
staff_signature, created_date, updated_date)
VALUES ('5e203834-3d0c-4313-ba05-f367c030c6cf', '7b0c0285-852b-4430-bb72-771752d79fdd', '70d5a70e-eae5-4d71-b5c6-ca7e3195bc3c', 'e73c04c0-7102-4307-9b0c-af5981b76253', '2981c19b-9f0a-4eff-a7fe-e6ab6a894ffa',
'2025-11-05', 'Room 7', '2025-11-07T12:50:06.616236', '2025-11-09T01:50:06.616236',
11.2, 30, 'approved', 22, 27, 
221.14, 332.28, true, true,
'SignatureDataBase64...', '2025-11-03T21:50:06.616236', '2025-11-10T17:50:06.616236');
INSERT INTO timesheets (id, agency_id, booking_id, staff_id, client_id, shift_date, 
work_location_within_site, clock_in_time, clock_out_time, total_hours, break_duration_minutes, status,
pay_rate, charge_rate, staff_pay_amount, client_charge_amount, geofence_validated, location_verified,
staff_signature, created_date, updated_date)
VALUES ('3dd9d308-40c5-4932-8c56-1df5fbbf3226', '77f4a189-9735-4cbb-b62b-cdae0291c34e', '912bb61f-bbff-4a68-9a06-b8e23f0192eb', 'e23a2d85-e6b1-44c1-905b-23ca43cbe58b', '6997c7d5-ff56-43f8-a56d-7a399c973d35',
'2025-11-06', 'Room 9', '2025-11-08T22:50:06.616236', '2025-11-09T16:50:06.616236',
11.7, 30, 'approved', 22, 30, 
242.38, 295.64, true, true,
'SignatureDataBase64...', '2025-11-08T19:50:06.616236', '2025-11-10T13:50:06.616236');
INSERT INTO timesheets (id, agency_id, booking_id, staff_id, client_id, shift_date, 
work_location_within_site, clock_in_time, clock_out_time, total_hours, break_duration_minutes, status,
pay_rate, charge_rate, staff_pay_amount, client_charge_amount, geofence_validated, location_verified,
staff_signature, created_date, updated_date)
VALUES ('198e0828-3152-4f27-a4d1-39f6a223c862', '7b0c0285-852b-4430-bb72-771752d79fdd', 'b819d681-c7b7-4054-922d-53fa8248ac75', '600d81f3-6352-4c15-9427-bebdab265677', 'b22f82d8-3ff9-4b39-a8f5-ee0c0bad6a41',
'2025-11-11', 'Room 9', '2025-11-09T11:50:06.616818', '2025-11-10T12:50:06.616818',
11.0, 30, 'approved', 18, 25, 
166.03, 279.63, true, true,
'SignatureDataBase64...', '2025-11-10T19:50:06.616818', '2025-11-09T17:50:06.616818');
INSERT INTO timesheets (id, agency_id, booking_id, staff_id, client_id, shift_date, 
work_location_within_site, clock_in_time, clock_out_time, total_hours, break_duration_minutes, status,
pay_rate, charge_rate, staff_pay_amount, client_charge_amount, geofence_validated, location_verified,
staff_signature, created_date, updated_date)
VALUES ('4a8e50fb-19f8-4c57-b491-c9a8977b2332', '77f4a189-9735-4cbb-b62b-cdae0291c34e', 'f9f80726-0ea6-40f9-a2d9-45dc2fa11e8b', 'c2b64c5a-32bd-456a-b142-55ac7ae5e067', '84e265d6-110d-4d02-9379-7bff65e33dfb',
'2025-11-07', 'Room 5', '2025-11-05T19:50:06.616818', '2025-11-04T19:50:06.616818',
12.0, 30, 'approved', 18, 24, 
213.48, 261.38, true, true,
'SignatureDataBase64...', '2025-11-04T10:50:06.616818', '2025-11-10T03:50:06.616818');

-- 8. INVOICES (3 records)
INSERT INTO invoices (id, agency_id, client_id, invoice_number, invoice_date, due_date, 
period_start, period_end, subtotal, vat_rate, vat_amount, total, balance_due, status, created_by,
line_items, notes, reminder_sent_count, created_date, updated_date)
VALUES ('1ba865d0-3f13-4005-9882-a5401df8c5de', '7b0c0285-852b-4430-bb72-771752d79fdd', 'b22f82d8-3ff9-4b39-a8f5-ee0c0bad6a41', 'INV-2025-1000',
'2025-11-11', '2025-11-20', '2025-11-07', '2025-11-08',
1883.40, 0.20, 376.68, 2260.08, 2260.08, 'sent', 'admin@agency.com',
'[{"description": "Healthcare services", "quantity": 11, "rate": 27.162485803451897, "amount": 419.70873766931976}]'::jsonb,
'Monthly invoice for healthcare services', 0, '2025-11-08T03:50:06.616818', '2025-11-10T00:50:06.616818');
INSERT INTO invoices (id, agency_id, client_id, invoice_number, invoice_date, due_date, 
period_start, period_end, subtotal, vat_rate, vat_amount, total, balance_due, status, created_by,
line_items, notes, reminder_sent_count, created_date, updated_date)
VALUES ('e7560ecf-b655-475d-b315-a55b5a07e2ff', '77f4a189-9735-4cbb-b62b-cdae0291c34e', '84e265d6-110d-4d02-9379-7bff65e33dfb', 'INV-2025-1001',
'2025-11-02', '2025-11-17', '2025-10-26', '2025-11-06',
1682.31, 0.20, 336.46, 2018.77, 2018.77, 'sent', 'admin@agency.com',
'[{"description": "Healthcare services", "quantity": 15, "rate": 19.85139198763243, "amount": 425.1566906449576}]'::jsonb,
'Monthly invoice for healthcare services', 0, '2025-11-02T11:50:06.616818', '2025-11-09T05:50:06.616818');
INSERT INTO invoices (id, agency_id, client_id, invoice_number, invoice_date, due_date, 
period_start, period_end, subtotal, vat_rate, vat_amount, total, balance_due, status, created_by,
line_items, notes, reminder_sent_count, created_date, updated_date)
VALUES ('99c72054-1da5-425a-b3ab-4484b47112e5', '7b0c0285-852b-4430-bb72-771752d79fdd', '3be5f5c9-5721-4ab7-bc40-84ec82482086', 'INV-2025-1002',
'2025-11-03', '2025-11-30', '2025-10-31', '2025-11-07',
1948.99, 0.20, 389.80, 2338.79, 2338.79, 'sent', 'admin@agency.com',
'[{"description": "Healthcare services", "quantity": 12, "rate": 19.478558745632892, "amount": 225.5966715332532}]'::jsonb,
'Monthly invoice for healthcare services', 0, '2025-11-06T14:50:06.616818', '2025-11-09T12:50:06.616818');

-- 9. PAYSLIPS (2 records)
INSERT INTO payslips (id, agency_id, staff_id, payslip_number, period_start, period_end, payment_date,
gross_pay, tax, ni, deductions, net_pay, total_hours, status, created_by, pdf_url, bank_details, 
timesheets, created_date, updated_date)
VALUES ('257232e6-05f9-4404-ae3c-d80f29b3b59d', '7b0c0285-852b-4430-bb72-771752d79fdd', 'b7d0d3f5-77e7-4d50-bbde-90a02e1848cf', 'PAY-2025-5000',
'2025-11-07', '2025-11-05', '2025-11-08',
1383.39, 276.68, 166.01, 442.68, 940.70, 60.9, 'paid', 'admin@agency.com',
'https://example.com/payslips/257232e6-05f9-4404-ae3c-d80f29b3b59d.pdf', '{"account_name": "Staff Member", "sort_code": "20-00-00", "account_number": "12345678"}'::jsonb,
'["328e484d-cacf-4e3b-ad5d-177ef956d6ae"]'::jsonb, '2025-10-27T11:50:06.616818', '2025-11-10T14:50:06.616818');
INSERT INTO payslips (id, agency_id, staff_id, payslip_number, period_start, period_end, payment_date,
gross_pay, tax, ni, deductions, net_pay, total_hours, status, created_by, pdf_url, bank_details, 
timesheets, created_date, updated_date)
VALUES ('92897537-0324-43ed-bc1d-30ec2a48acf7', '77f4a189-9735-4cbb-b62b-cdae0291c34e', '16370a49-aacd-43bf-907a-aa691750e39d', 'PAY-2025-5001',
'2025-10-27', '2025-11-11', '2025-11-09',
1007.01, 201.40, 120.84, 322.24, 684.77, 65.3, 'paid', 'admin@agency.com',
'https://example.com/payslips/92897537-0324-43ed-bc1d-30ec2a48acf7.pdf', '{"account_name": "Staff Member", "sort_code": "20-00-00", "account_number": "12345678"}'::jsonb,
'["328e484d-cacf-4e3b-ad5d-177ef956d6ae"]'::jsonb, '2025-11-05T08:50:06.616818', '2025-11-09T07:50:06.616818');

-- 10. COMPLIANCE (12 records)
INSERT INTO compliance (id, staff_id, agency_id, document_type, document_name, document_url, 
issue_date, expiry_date, status, created_by, issuing_authority, reference_number, 
reminder_30d_sent, reminder_14d_sent, created_date, updated_date)
VALUES ('7ee0dd40-9826-479e-a678-0d77b0423767', 'b7d0d3f5-77e7-4d50-bbde-90a02e1848cf', '7b0c0285-852b-4430-bb72-771752d79fdd', 'dbs_check', 
'Dbs Check - Staff 1', 'https://example.com/docs/7ee0dd40-9826-479e-a678-0d77b0423767.pdf',
'2025-06-16', '2025-11-29', 'verified', 'admin@agency.com',
'Issuing Authority 1', 'REF-898049', false, false,
'2025-06-26T06:50:06.617379', '2025-11-10T06:50:06.617379');
INSERT INTO compliance (id, staff_id, agency_id, document_type, document_name, document_url, 
issue_date, expiry_date, status, created_by, issuing_authority, reference_number, 
reminder_30d_sent, reminder_14d_sent, created_date, updated_date)
VALUES ('ea78e39c-dfb5-429d-bd9c-8afbb8159b2b', '16370a49-aacd-43bf-907a-aa691750e39d', '77f4a189-9735-4cbb-b62b-cdae0291c34e', 'right_to_work', 
'Right To Work - Staff 2', 'https://example.com/docs/ea78e39c-dfb5-429d-bd9c-8afbb8159b2b.pdf',
'2025-10-07', '2025-12-01', 'verified', 'admin@agency.com',
'Issuing Authority 2', 'REF-883490', false, false,
'2025-05-03T20:50:06.617379', '2025-11-10T15:50:06.617379');
INSERT INTO compliance (id, staff_id, agency_id, document_type, document_name, document_url, 
issue_date, expiry_date, status, created_by, issuing_authority, reference_number, 
reminder_30d_sent, reminder_14d_sent, created_date, updated_date)
VALUES ('848ee592-1952-43a0-90e8-c9510f5dd374', '52025345-00b3-45ed-8d4b-340ee78d78e1', '7b0c0285-852b-4430-bb72-771752d79fdd', 'professional_registration', 
'Professional Registration - Staff 3', 'https://example.com/docs/848ee592-1952-43a0-90e8-c9510f5dd374.pdf',
'2025-06-10', '2026-01-20', 'verified', 'admin@agency.com',
'Issuing Authority 3', 'REF-608962', false, false,
'2025-08-15T16:50:06.617379', '2025-11-10T17:50:06.617379');
INSERT INTO compliance (id, staff_id, agency_id, document_type, document_name, document_url, 
issue_date, expiry_date, status, created_by, issuing_authority, reference_number, 
reminder_30d_sent, reminder_14d_sent, created_date, updated_date)
VALUES ('63898758-a138-4896-8fd9-29a7ca36f7e9', '2a994361-bbfe-4342-aa77-4fa370bfc1ad', '77f4a189-9735-4cbb-b62b-cdae0291c34e', 'training_certificate', 
'Training Certificate - Staff 4', 'https://example.com/docs/63898758-a138-4896-8fd9-29a7ca36f7e9.pdf',
'2025-07-28', '2025-12-10', 'verified', 'admin@agency.com',
'Issuing Authority 4', 'REF-141089', false, false,
'2025-05-22T04:50:06.617379', '2025-11-09T03:50:06.617379');
INSERT INTO compliance (id, staff_id, agency_id, document_type, document_name, document_url, 
issue_date, expiry_date, status, created_by, issuing_authority, reference_number, 
reminder_30d_sent, reminder_14d_sent, created_date, updated_date)
VALUES ('dfdb0453-caab-4171-b2b3-dcc2e1bb8a07', 'e73c04c0-7102-4307-9b0c-af5981b76253', '7b0c0285-852b-4430-bb72-771752d79fdd', 'vaccination_record', 
'Vaccination Record - Staff 5', 'https://example.com/docs/dfdb0453-caab-4171-b2b3-dcc2e1bb8a07.pdf',
'2025-06-13', '2026-01-29', 'verified', 'admin@agency.com',
'Issuing Authority 5', 'REF-583432', false, false,
'2025-11-02T11:50:06.617379', '2025-11-09T15:50:06.617379');
INSERT INTO compliance (id, staff_id, agency_id, document_type, document_name, document_url, 
issue_date, expiry_date, status, created_by, issuing_authority, reference_number, 
reminder_30d_sent, reminder_14d_sent, created_date, updated_date)
VALUES ('88552042-e8cb-4433-a26d-f1f2ef00629f', 'e23a2d85-e6b1-44c1-905b-23ca43cbe58b', '77f4a189-9735-4cbb-b62b-cdae0291c34e', 'reference', 
'Reference - Staff 6', 'https://example.com/docs/88552042-e8cb-4433-a26d-f1f2ef00629f.pdf',
'2025-08-25', '2026-01-25', 'verified', 'admin@agency.com',
'Issuing Authority 6', 'REF-359715', false, false,
'2025-08-04T16:50:06.617379', '2025-11-09T23:50:06.617379');
INSERT INTO compliance (id, staff_id, agency_id, document_type, document_name, document_url, 
issue_date, expiry_date, status, created_by, issuing_authority, reference_number, 
reminder_30d_sent, reminder_14d_sent, created_date, updated_date)
VALUES ('00395559-ed61-4d82-9d83-bc333f629034', '600d81f3-6352-4c15-9427-bebdab265677', '7b0c0285-852b-4430-bb72-771752d79fdd', 'dbs_check', 
'Dbs Check - Staff 7', 'https://example.com/docs/00395559-ed61-4d82-9d83-bc333f629034.pdf',
'2025-06-04', '2025-11-21', 'verified', 'admin@agency.com',
'Issuing Authority 7', 'REF-531639', false, false,
'2025-02-12T12:50:06.617379', '2025-11-10T06:50:06.617379');
INSERT INTO compliance (id, staff_id, agency_id, document_type, document_name, document_url, 
issue_date, expiry_date, status, created_by, issuing_authority, reference_number, 
reminder_30d_sent, reminder_14d_sent, created_date, updated_date)
VALUES ('bd679226-5d79-4dd0-b3cd-9731855ffe93', 'c2b64c5a-32bd-456a-b142-55ac7ae5e067', '77f4a189-9735-4cbb-b62b-cdae0291c34e', 'right_to_work', 
'Right To Work - Staff 8', 'https://example.com/docs/bd679226-5d79-4dd0-b3cd-9731855ffe93.pdf',
'2025-04-18', '2026-09-21', 'verified', 'admin@agency.com',
'Issuing Authority 8', 'REF-946755', false, false,
'2025-09-28T00:50:06.617379', '2025-11-09T06:50:06.617379');
INSERT INTO compliance (id, staff_id, agency_id, document_type, document_name, document_url, 
issue_date, expiry_date, status, created_by, issuing_authority, reference_number, 
reminder_30d_sent, reminder_14d_sent, created_date, updated_date)
VALUES ('54a2cd47-3598-4026-ba80-64f3fc25256b', '5be3aeb4-bbc7-4751-a3b2-4aa3b8246f7e', '7b0c0285-852b-4430-bb72-771752d79fdd', 'professional_registration', 
'Professional Registration - Staff 9', 'https://example.com/docs/54a2cd47-3598-4026-ba80-64f3fc25256b.pdf',
'2024-11-26', '2025-12-15', 'verified', 'admin@agency.com',
'Issuing Authority 9', 'REF-265643', false, false,
'2025-07-03T16:50:06.617379', '2025-11-09T20:50:06.617379');
INSERT INTO compliance (id, staff_id, agency_id, document_type, document_name, document_url, 
issue_date, expiry_date, status, created_by, issuing_authority, reference_number, 
reminder_30d_sent, reminder_14d_sent, created_date, updated_date)
VALUES ('7606e57b-04df-4a09-9e8c-91ce07881693', '8d4bad9b-6e8a-4eb2-9729-3b8928c81e67', '77f4a189-9735-4cbb-b62b-cdae0291c34e', 'training_certificate', 
'Training Certificate - Staff 10', 'https://example.com/docs/7606e57b-04df-4a09-9e8c-91ce07881693.pdf',
'2025-06-23', '2026-05-24', 'verified', 'admin@agency.com',
'Issuing Authority 10', 'REF-750470', false, false,
'2024-11-29T04:50:06.617379', '2025-11-09T04:50:06.617379');
INSERT INTO compliance (id, staff_id, agency_id, document_type, document_name, document_url, 
issue_date, expiry_date, status, created_by, issuing_authority, reference_number, 
reminder_30d_sent, reminder_14d_sent, created_date, updated_date)
VALUES ('231f7424-c9ed-4bd6-927b-f8b40fe58ff5', 'b7d0d3f5-77e7-4d50-bbde-90a02e1848cf', '7b0c0285-852b-4430-bb72-771752d79fdd', 'vaccination_record', 
'Vaccination Record - Staff 11', 'https://example.com/docs/231f7424-c9ed-4bd6-927b-f8b40fe58ff5.pdf',
'2025-08-27', '2026-11-10', 'verified', 'admin@agency.com',
'Issuing Authority 11', 'REF-221148', false, false,
'2025-03-12T02:50:06.617379', '2025-11-09T17:50:06.617379');
INSERT INTO compliance (id, staff_id, agency_id, document_type, document_name, document_url, 
issue_date, expiry_date, status, created_by, issuing_authority, reference_number, 
reminder_30d_sent, reminder_14d_sent, created_date, updated_date)
VALUES ('e3af52b2-58e7-4720-aef2-dc0531922596', '16370a49-aacd-43bf-907a-aa691750e39d', '77f4a189-9735-4cbb-b62b-cdae0291c34e', 'reference', 
'Reference - Staff 12', 'https://example.com/docs/e3af52b2-58e7-4720-aef2-dc0531922596.pdf',
'2025-07-22', '2026-04-01', 'verified', 'admin@agency.com',
'Issuing Authority 12', 'REF-368733', false, false,
'2025-04-27T18:50:06.617379', '2025-11-10T13:50:06.617379');

-- 11. GROUPS (2 records)
INSERT INTO groups (id, agency_id, name, description, staff_members, created_date, updated_date)
VALUES ('79a8bad7-c992-4d30-827c-7556b4ccf8de', '7b0c0285-852b-4430-bb72-771752d79fdd', 'Team A', 'Primary healthcare team A',
ARRAY['b7d0d3f5-77e7-4d50-bbde-90a02e1848cf', '16370a49-aacd-43bf-907a-aa691750e39d', '52025345-00b3-45ed-8d4b-340ee78d78e1', '2a994361-bbfe-4342-aa77-4fa370bfc1ad', 'e73c04c0-7102-4307-9b0c-af5981b76253']::uuid[], '2025-10-08T04:50:06.617892', '2025-11-10T15:50:06.617892');
INSERT INTO groups (id, agency_id, name, description, staff_members, created_date, updated_date)
VALUES ('c942183c-b7b1-46ca-b962-d3c99179ff06', '77f4a189-9735-4cbb-b62b-cdae0291c34e', 'Team B', 'Primary healthcare team B',
ARRAY['e23a2d85-e6b1-44c1-905b-23ca43cbe58b', '600d81f3-6352-4c15-9427-bebdab265677', 'c2b64c5a-32bd-456a-b142-55ac7ae5e067', '5be3aeb4-bbc7-4751-a3b2-4aa3b8246f7e', '8d4bad9b-6e8a-4eb2-9729-3b8928c81e67']::uuid[], '2025-10-19T06:50:06.617892', '2025-11-09T05:50:06.617892');

-- 12. ADMIN_WORKFLOWS (3 records)
INSERT INTO admin_workflows (id, agency_id, type, priority, title, status, created_by,
related_entity, deadline, auto_created, escalation_count, created_date, updated_date)
VALUES ('b824afcd-5f8f-450e-8b48-529121a3fa69', '7b0c0285-852b-4430-bb72-771752d79fdd', 'unfilled_urgent_shift', 
'high', 'Workflow: Unfilled Urgent Shift', 
'pending', 'system', '{"entity_type": "shift", "entity_id": "af9de779-45e2-4e02-9d4f-fca05f3f520e"}'::jsonb,
'2025-11-17T00:50:06.617892', true, 0, '2025-11-10T19:50:06.617892', '2025-11-09T16:50:06.617892');
INSERT INTO admin_workflows (id, agency_id, type, priority, title, status, created_by,
related_entity, deadline, auto_created, escalation_count, created_date, updated_date)
VALUES ('1e039627-98d5-484e-aa65-f2d1ca27f1f1', '77f4a189-9735-4cbb-b62b-cdae0291c34e', 'expired_compliance_document', 
'medium', 'Workflow: Expired Compliance Document', 
'pending', 'system', '{"entity_type": "shift", "entity_id": "af9de779-45e2-4e02-9d4f-fca05f3f520e"}'::jsonb,
'2025-11-18T00:50:06.617892', true, 0, '2025-11-09T13:50:06.617892', '2025-11-10T06:50:06.617892');
INSERT INTO admin_workflows (id, agency_id, type, priority, title, status, created_by,
related_entity, deadline, auto_created, escalation_count, created_date, updated_date)
VALUES ('5ace462a-7487-414e-8741-db038eb245f6', '7b0c0285-852b-4430-bb72-771752d79fdd', 'timesheet_discrepancy', 
'critical', 'Workflow: Timesheet Discrepancy', 
'pending', 'system', '{"entity_type": "shift", "entity_id": "af9de779-45e2-4e02-9d4f-fca05f3f520e"}'::jsonb,
'2025-11-17T00:50:06.617892', true, 0, '2025-11-07T10:50:06.617892', '2025-11-09T10:50:06.617892');

-- 13. CHANGE_LOGS (5 records)
INSERT INTO change_logs (id, agency_id, change_type, affected_entity_type, affected_entity_id,
old_value, new_value, reason, changed_by_email, changed_at, risk_level, reviewed, created_date, updated_date)
VALUES ('6ac790ec-53e3-431e-9c6a-340734fd8898', '7b0c0285-852b-4430-bb72-771752d79fdd', 'shift_cancelled', 'shift', 
'af9de779-45e2-4e02-9d4f-fca05f3f520e', 'Old Value', 'New Value',
'Administrative change', 'admin@agency.com', '2025-11-09T02:50:06.617892', 'low', false,
'2025-11-07T10:50:06.617892', '2025-11-10T12:50:06.617892');
INSERT INTO change_logs (id, agency_id, change_type, affected_entity_type, affected_entity_id,
old_value, new_value, reason, changed_by_email, changed_at, risk_level, reviewed, created_date, updated_date)
VALUES ('957615a1-5b9f-4e58-9cd8-26d1aeef6afd', '77f4a189-9735-4cbb-b62b-cdae0291c34e', 'shift_reassigned', 'shift', 
'af9de779-45e2-4e02-9d4f-fca05f3f520e', 'Old Value', 'New Value',
'Administrative change', 'admin@agency.com', '2025-11-07T06:50:06.617892', 'low', false,
'2025-11-09T20:50:06.617892', '2025-11-09T22:50:06.617892');
INSERT INTO change_logs (id, agency_id, change_type, affected_entity_type, affected_entity_id,
old_value, new_value, reason, changed_by_email, changed_at, risk_level, reviewed, created_date, updated_date)
VALUES ('3bf36fc8-37e7-43b1-a7dd-13a393e25401', '7b0c0285-852b-4430-bb72-771752d79fdd', 'bank_details_changed', 'shift', 
'af9de779-45e2-4e02-9d4f-fca05f3f520e', 'Old Value', 'New Value',
'Administrative change', 'admin@agency.com', '2025-11-08T10:50:06.617892', 'low', false,
'2025-11-09T01:50:06.617892', '2025-11-09T19:50:06.617892');
INSERT INTO change_logs (id, agency_id, change_type, affected_entity_type, affected_entity_id,
old_value, new_value, reason, changed_by_email, changed_at, risk_level, reviewed, created_date, updated_date)
VALUES ('14e37942-3da2-4cbe-974e-96e7db58941f', '77f4a189-9735-4cbb-b62b-cdae0291c34e', 'pay_rate_override', 'shift', 
'af9de779-45e2-4e02-9d4f-fca05f3f520e', 'Old Value', 'New Value',
'Administrative change', 'admin@agency.com', '2025-11-08T11:50:06.617892', 'low', false,
'2025-11-09T23:50:06.617892', '2025-11-09T08:50:06.617892');
INSERT INTO change_logs (id, agency_id, change_type, affected_entity_type, affected_entity_id,
old_value, new_value, reason, changed_by_email, changed_at, risk_level, reviewed, created_date, updated_date)
VALUES ('38c53643-07b2-4375-bd4c-53e144d2952b', '7b0c0285-852b-4430-bb72-771752d79fdd', 'staff_suspended', 'shift', 
'af9de779-45e2-4e02-9d4f-fca05f3f520e', 'Old Value', 'New Value',
'Administrative change', 'admin@agency.com', '2025-11-08T12:50:06.617892', 'low', false,
'2025-11-10T10:50:06.617892', '2025-11-09T02:50:06.617892');

-- 14. OPERATIONAL_COSTS (3 records)
INSERT INTO operational_costs (id, agency_id, cost_type, service_name, service_category,
amount, cost_date, currency, status, created_by, billing_period, roi_impact, created_date, updated_date)
VALUES ('0a6eb383-9125-48cc-b06e-937010d5cf4f', '7b0c0285-852b-4430-bb72-771752d79fdd', 'monthly_subscription', 'Twilio SMS', 
'communication', 89.73, '2025-11-06', 'GBP', 'paid',
'admin@agency.com', '2025-10-18', 'critical',
'2025-10-24T05:50:06.617892', '2025-11-10T19:50:06.617892');
INSERT INTO operational_costs (id, agency_id, cost_type, service_name, service_category,
amount, cost_date, currency, status, created_by, billing_period, roi_impact, created_date, updated_date)
VALUES ('5321b6de-e06e-4d03-a1c5-fd13a0722067', '77f4a189-9735-4cbb-b62b-cdae0291c34e', 'monthly_subscription', 'Resend Email', 
'communication', 90.24, '2025-11-07', 'GBP', 'paid',
'admin@agency.com', '2025-11-03', 'high',
'2025-11-04T14:50:06.617892', '2025-11-09T09:50:06.617892');
INSERT INTO operational_costs (id, agency_id, cost_type, service_name, service_category,
amount, cost_date, currency, status, created_by, billing_period, roi_impact, created_date, updated_date)
VALUES ('2afae60c-43f6-4816-ba8a-c0d5112e038a', '7b0c0285-852b-4430-bb72-771752d79fdd', 'monthly_subscription', 'Supabase Hosting', 
'platform_hosting', 96.57, '2025-11-11', 'GBP', 'paid',
'admin@agency.com', '2025-10-23', 'medium',
'2025-10-26T23:50:06.617892', '2025-11-09T15:50:06.617892');

-- 15. INVOICE_AMENDMENTS (1 record)
INSERT INTO invoice_amendments (id, agency_id, invoice_id, amendment_type, amendment_reason,
original_invoice_id, amendment_version, original_total, amended_total, total_difference, status, created_by,
changes_made, risk_level, created_date, updated_date)
VALUES ('feeabe9e-b958-471a-9406-b56fb695ce2e', '7b0c0285-852b-4430-bb72-771752d79fdd', '1ba865d0-3f13-4005-9882-a5401df8c5de', 'hours_adjustment',
'Client requested adjustment for actual hours worked', '1ba865d0-3f13-4005-9882-a5401df8c5de', 1, 1000.00, 950.00, -50.00,
'approved', 'admin@agency.com', '[{"field": "hours", "old": "50", "new": "47.5"}]'::jsonb, 'low',
'2025-11-10T08:50:06.617892', '2025-11-09T09:50:06.617892');

-- 16. NOTIFICATION_QUEUE (2 records)
INSERT INTO notification_queue (id, agency_id, notification_type, recipient_type, recipient_email,
recipient_first_name, status, created_by, pending_items, item_count, created_date, updated_date)
VALUES ('23b61486-57e2-4d57-abe3-059b9074b2c8', '7b0c0285-852b-4430-bb72-771752d79fdd', 'shift_assignment', 
'staff', 'staff1@example.com', 'Staff1', 'pending', 'system',
'[{"type": "shift", "id": "af9de779-45e2-4e02-9d4f-fca05f3f520e"}]'::jsonb, 1,
'2025-11-10T05:50:06.617892', '2025-11-10T11:50:06.617892');
INSERT INTO notification_queue (id, agency_id, notification_type, recipient_type, recipient_email,
recipient_first_name, status, created_by, pending_items, item_count, created_date, updated_date)
VALUES ('b8275962-1563-41b5-944c-245fb0adbf23', '77f4a189-9735-4cbb-b62b-cdae0291c34e', 'shift_reminder', 
'staff', 'staff2@example.com', 'Staff2', 'pending', 'system',
'[{"type": "shift", "id": "af9de779-45e2-4e02-9d4f-fca05f3f520e"}]'::jsonb, 1,
'2025-11-09T18:50:06.617892', '2025-11-10T10:50:06.617892');
