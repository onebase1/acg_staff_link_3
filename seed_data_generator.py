"""
Comprehensive Seed Data Generator for All 15 Tables
Generates ~86 records with realistic UK healthcare data
"""

import json
import random
from datetime import datetime, timedelta
from uuid import uuid4

# UK Healthcare Data
UK_FIRST_NAMES_MALE = ['James', 'John', 'Robert', 'Michael', 'William', 'David', 'Thomas', 'Daniel', 'Matthew', 'Andrew']
UK_FIRST_NAMES_FEMALE = ['Mary', 'Sarah', 'Emma', 'Jennifer', 'Linda', 'Elizabeth', 'Jessica', 'Karen', 'Rachel', 'Sophie']
UK_LAST_NAMES = ['Smith', 'Jones', 'Williams', 'Taylor', 'Brown', 'Davies', 'Evans', 'Wilson', 'Thomas', 'Roberts']

UK_CITIES = ['London', 'Manchester', 'Sunderland', 'Newcastle', 'Leeds', 'Birmingham']
UK_STREETS = ['High Street', 'Station Road', 'Church Lane', 'Main Street', 'Park Road']

CARE_HOME_NAMES = ['Divine Care Center', 'Instay Sunderland', 'Harbor View Lodge', 'Willow Manor', 'Oakwood Residence', 'Sunset Gardens']

# Generated IDs storage
ids = {
    'agencies': [], 'profiles': [], 'staff': [], 'clients': [],
    'shifts': [], 'bookings': [], 'timesheets': [], 'invoices': [],
    'compliance': [], 'groups': [], 'admin_workflows': [], 'payslips': []
}

def gen_uuid(): return str(uuid4())
def gen_email(fn, ln, domain='gmail.com'): return f"{fn.lower()}.{ln.lower()}@{domain}"
def gen_phone(): return f"+44{random.randint(7000000000, 7999999999)}"
def gen_postcode(): return f"{random.choice(['TS', 'SR', 'NE'])}{random.randint(1,9)} {random.randint(1,9)}{random.choice('ABDEFGHJLNPQRSTUWXYZ')}{random.choice('ABDEFGHJLNPQRSTUWXYZ')}"
def gen_date_ago(days): return (datetime.now() - timedelta(days=random.randint(0, days))).strftime('%Y-%m-%d')
def gen_ts_ago(days): return (datetime.now() - timedelta(days=random.randint(0, days), hours=random.randint(0, 23))).isoformat()
def gen_ts_future(days): return (datetime.now() + timedelta(days=random.randint(1, days))).isoformat()
def gen_date_future(days): return (datetime.now() + timedelta(days=random.randint(1, days))).strftime('%Y-%m-%d')

def sql_val(v):
    if v is None: return 'NULL'
    if isinstance(v, bool): return 'true' if v else 'false'
    if isinstance(v, (dict, list)): return f"'{json.dumps(v)}'::jsonb"
    if isinstance(v, str): return f"'{v.replace(chr(39), chr(39)+chr(39))}'"
    return str(v)

def gen_address():
    return {'line1': f"{random.randint(1,999)} {random.choice(UK_STREETS)}", 'city': random.choice(UK_CITIES), 'postcode': gen_postcode(), 'country': 'UK'}

# SQL Builder
sql = []
sql.append("-- COMPREHENSIVE SEED DATA - All 15 Tables")
sql.append(f"-- Generated: {datetime.now().isoformat()}")
sql.append("-- Run this in Supabase SQL Editor\n")

# 1. AGENCIES
sql.append("-- 1. AGENCIES (2 records)")
agencies_data = [
    {'id': gen_uuid(), 'name': 'Dominion Healthcare Services Ltd', 'created_by': 'g.basera@yahoo.com', 'registration_number': 'GB12345678',
     'contact_email': 'info@dominionhealth.co.uk', 'contact_phone': '+441912345678', 'subscription_tier': 'professional',
     'address': {'line1': '123 Business Park', 'city': 'Newcastle', 'postcode': 'NE1 4ST'}, 'status': 'active',
     'bank_details': {'account_name': 'Dominion Healthcare', 'account_number': '12345678', 'sort_code': '20-00-00'},
     'dbs_check_expiry_alerts': True, 'mandatory_training_reminders': True, 'document_expiry_warnings': True,
     'auto_approve_timesheets': False, 'sms_shift_confirmations': True, 'whatsapp_notifications': True,
     'auto_generate_invoices': True, 'send_payment_reminders': True, 'email_notifications': True,
     'sms_notifications': True, 'whatsapp_global_notifications': True, 'payment_terms_days': 30, 'invoice_frequency': 'weekly'},
    {'id': gen_uuid(), 'name': 'CareStaff Solutions Ltd', 'created_by': 'admin@carestaff.co.uk', 'registration_number': 'GB87654321',
     'contact_email': 'hello@carestaff.co.uk', 'contact_phone': '+441132345678', 'subscription_tier': 'starter',
     'address': {'line1': '456 Care House', 'city': 'Leeds', 'postcode': 'LS1 2AB'}, 'status': 'active',
     'bank_details': {'account_name': 'CareStaff Solutions', 'account_number': '87654321', 'sort_code': '40-00-00'},
     'dbs_check_expiry_alerts': True, 'mandatory_training_reminders': False, 'document_expiry_warnings': False,
     'auto_approve_timesheets': True, 'sms_shift_confirmations': False, 'whatsapp_notifications': False,
     'auto_generate_invoices': False, 'send_payment_reminders': False, 'email_notifications': True,
     'sms_notifications': False, 'whatsapp_global_notifications': False, 'payment_terms_days': 14, 'invoice_frequency': 'monthly'}
]
for a in agencies_data:
    ids['agencies'].append(a['id'])
    cols = ', '.join(a.keys())
    vals = ', '.join([sql_val(v) for v in a.values()])
    sql.append(f"INSERT INTO agencies ({cols}) VALUES ({vals});")
sql.append("")

# 2. PROFILES (Admin users - note: profiles.id must match auth.users.id in real system)
sql.append("-- 2. PROFILES (4 admin/manager users)")
sql.append("-- Note: In production, these should match auth.users.id")
for i, agency_id in enumerate(ids['agencies']):
    # Admin
    admin_id = gen_uuid()
    ids['profiles'].append(admin_id)
    sql.append(f"""INSERT INTO profiles (id, full_name, email, phone, user_type, agency_id, created_date, role, profile_photo_url)
VALUES ({sql_val(admin_id)}, {sql_val(f"Admin User {i+1}")}, {sql_val(f"admin{i+1}@agency{i+1}.com")}, {sql_val(gen_phone())}, 
'agency_admin', {sql_val(agency_id)}, {sql_val(gen_ts_ago(60))}, 'admin', 'https://ui-avatars.com/api/?name=Admin');""")
    # Manager
    mgr_id = gen_uuid()
    ids['profiles'].append(mgr_id)
    sql.append(f"""INSERT INTO profiles (id, full_name, email, phone, user_type, agency_id, created_date, role, profile_photo_url)
VALUES ({sql_val(mgr_id)}, {sql_val(f"Manager User {i+1}")}, {sql_val(f"manager{i+1}@agency{i+1}.com")}, {sql_val(gen_phone())}, 
'manager', {sql_val(agency_id)}, {sql_val(gen_ts_ago(60))}, 'user', 'https://ui-avatars.com/api/?name=Manager');""")
sql.append("")

# 3. STAFF (10 staff - 5 per agency)
sql.append("-- 3. STAFF (10 records - 5 per agency)")
staff_roles = ['nurse', 'healthcare_assistant', 'senior_care_worker', 'nurse', 'healthcare_assistant']
for agency_id in ids['agencies']:
    for i, role in enumerate(staff_roles):
        staff_id = gen_uuid()
        ids['staff'].append(staff_id)
        fn = random.choice(UK_FIRST_NAMES_FEMALE if i % 2 == 0 else UK_FIRST_NAMES_MALE)
        ln = random.choice(UK_LAST_NAMES)
        is_nurse = role == 'nurse'
        sql.append(f"""INSERT INTO staff (id, agency_id, first_name, last_name, email, phone, role, employment_type, status, hourly_rate, 
created_by, whatsapp_pin, whatsapp_number_verified, date_of_birth, profile_photo_url, 
nmc_pin, medication_trained, medication_training_expiry, can_work_as_senior, role_hierarchy,
employment_history, references, skills, gps_consent, last_known_location, date_joined, months_of_experience,
address, emergency_contact, availability, rating, total_shifts_completed, gps_consent_date, created_date, updated_date)
VALUES ({sql_val(staff_id)}, {sql_val(agency_id)}, {sql_val(fn)}, {sql_val(ln)}, {sql_val(gen_email(fn, ln))}, {sql_val(gen_phone())},
{sql_val(role)}, 'temporary', 'active', {random.randint(12, 25)},
{sql_val(f"admin@agency.com")}, {sql_val(str(random.randint(1000, 9999)))}, {sql_val(gen_phone())}, {sql_val(gen_date_ago(365*30))}, 
'https://ui-avatars.com/api/?name={fn}+{ln}',
{sql_val(f"NMC{random.randint(100000, 999999)}" if is_nurse else None)}, {sql_val(is_nurse)}, 
{sql_val(gen_date_future(365) if is_nurse else None)}, {sql_val(role == 'senior_care_worker')},
{sql_val({'can_work_as': [role]})},
{sql_val([{'employer': 'Previous Care Home', 'duration': '2 years'}])}, {sql_val([{'name': 'Jane Ref', 'phone': gen_phone()}])},
{sql_val(['First Aid', 'Manual Handling'])}, true, {sql_val({'latitude': 54.9783 + random.uniform(-0.1, 0.1), 'longitude': -1.6174 + random.uniform(-0.1, 0.1), 'timestamp': gen_ts_ago(1)})},
{sql_val(gen_date_ago(365))}, {random.randint(6, 60)}, {sql_val(gen_address())},
{sql_val({'name': 'Emergency Contact', 'relationship': 'Spouse', 'phone': gen_phone()})},
{sql_val({'monday': [{'start': '08:00', 'end': '20:00'}], 'tuesday': [{'start': '08:00', 'end': '20:00'}]})},
{random.uniform(4.0, 5.0):.1f}, {random.randint(5, 50)}, {sql_val(gen_ts_ago(100))}, {sql_val(gen_ts_ago(100))}, {sql_val(gen_ts_ago(1))});""")
sql.append("")

# 4. CLIENTS (6 care homes - 3 per agency)
sql.append("-- 4. CLIENTS (6 care homes - 3 per agency)")
home_names_idx = 0
for agency_id in ids['agencies']:
    for i in range(3):
        client_id = gen_uuid()
        ids['clients'].append(client_id)
        home_name = CARE_HOME_NAMES[home_names_idx]
        home_names_idx += 1
        beds = random.choice([38, 45, 52, 60])
        sql.append(f"""INSERT INTO clients (id, agency_id, name, type, status, created_by, location_coordinates, geofence_enabled,
contact_person, billing_email, address, cqc_rating, bed_capacity, preferred_staff, notes, total_bookings,
internal_locations, payment_terms, contract_terms, rating, geofence_radius_meters, created_date, updated_date)
VALUES ({sql_val(client_id)}, {sql_val(agency_id)}, {sql_val(home_name)}, 'care_home', 'active', 'admin@agency.com',
{sql_val({'latitude': 54.9783, 'longitude': -1.6174})}, true,
{sql_val({'name': 'Care Manager', 'email': f"manager@{home_name.lower().replace(' ', '')}.com", 'phone': gen_phone(), 'role': 'Manager'})},
{sql_val(f"billing@{home_name.lower().replace(' ', '')}.com")}, {sql_val(gen_address())},
{sql_val(random.choice(['good', 'outstanding']))}, {beds}, {sql_val([ids['staff'][0] if ids['staff'] else None])},
'Preferred care home with excellent facilities', {random.randint(10, 100)},
{sql_val(['Room 1', 'Room 2', 'Room 3', 'Wing A', 'Wing B'])}, 'net_30',
{sql_val({'require_location_specification': True, 'break_duration_minutes': 30, 'rates_by_role': {
    'nurse': {'pay_rate': 20, 'charge_rate': 30}, 'healthcare_assistant': {'pay_rate': 12, 'charge_rate': 18}, 
    'senior_care_worker': {'pay_rate': 16, 'charge_rate': 24}}})},
{random.uniform(4.2, 4.9):.1f}, 100, {sql_val(gen_ts_ago(90))}, {sql_val(gen_ts_ago(1))});""")
sql.append("")

print(f"Generated agencies: {len(ids['agencies'])}")
print(f"Generated profiles: {len(ids['profiles'])}")
print(f"Generated staff: {len(ids['staff'])}")
print(f"Generated clients: {len(ids['clients'])}")

# Save Part 1
with open('supabase/seed_data.sql', 'w', encoding='utf-8') as f:
    f.write('\n'.join(sql))

# Save ID manifest
with open('SEED_DATA_MANIFEST.json', 'w', encoding='utf-8') as f:
    json.dump(ids, f, indent=2)

print(f"\n[OK] Generated seed data saved to: supabase/seed_data.sql")
print(f"[OK] ID manifest saved to: SEED_DATA_MANIFEST.json")
print(f"\nNext: Run the SQL file in Supabase SQL Editor or continue generating more data...")
