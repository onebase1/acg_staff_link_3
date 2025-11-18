"""
COMPLETE Seed Data Generator - All 15 Tables with ~86 Records
Extends the basic generator with shifts, bookings, timesheets, invoices, etc.
"""

import json
from datetime import datetime, timedelta
from uuid import uuid4
import random

# Load existing IDs
with open('SEED_DATA_MANIFEST.json', 'r') as f:
    ids = json.load(f)

print(f"Loaded IDs: {len(ids['agencies'])} agencies, {len(ids['staff'])} staff, {len(ids['clients'])} clients")

def gen_uuid(): return str(uuid4())
def gen_ts_ago(days): return (datetime.now() - timedelta(days=random.randint(0, days), hours=random.randint(0, 23))).isoformat()
def gen_ts_future(days): return (datetime.now() + timedelta(days=random.randint(1, days))).isoformat()
def gen_date_ago(days): return (datetime.now() - timedelta(days=random.randint(0, days))).strftime('%Y-%m-%d')
def gen_date_future(days): return (datetime.now() + timedelta(days=random.randint(1, days))).strftime('%Y-%m-%d')

def sql_val(v):
    if v is None: return 'NULL'
    if isinstance(v, bool): return 'true' if v else 'false'
    if isinstance(v, (dict, list)): return f"'{json.dumps(v)}'::jsonb"
    if isinstance(v, str): return f"'{v.replace(chr(39), chr(39)+chr(39))}'"
    return str(v)

sql = []
sql.append("\n-- ============================================================================")
sql.append("-- ADDITIONAL SEED DATA: Shifts, Bookings, Timesheets, Invoices, etc.")
sql.append("-- ============================================================================\n")

# 5. SHIFTS (15 shifts with various statuses)
sql.append("-- 5. SHIFTS (15 records)")
shift_statuses = ['open', 'assigned', 'confirmed', 'completed', 'completed', 'completed', 'in_progress', 'open', 'assigned', 'confirmed', 'completed', 'completed', 'cancelled', 'open', 'assigned']
shift_roles = ['nurse', 'healthcare_assistant', 'senior_care_worker', 'nurse', 'healthcare_assistant']

for i in range(15):
    shift_id = gen_uuid()
    ids['shifts'].append(shift_id)
    agency_id = ids['agencies'][i % 2]
    client_id = ids['clients'][i % len(ids['clients'])]
    staff_id = ids['staff'][i % len(ids['staff'])] if shift_statuses[i] in ['assigned', 'confirmed', 'completed', 'in_progress'] else None
    status = shift_statuses[i]
    role = shift_roles[i % len(shift_roles)]
    days_offset = random.randint(-14, 7)
    shift_date = (datetime.now() + timedelta(days=days_offset)).strftime('%Y-%m-%d')
    start_time = (datetime.now() + timedelta(days=days_offset, hours=8)).isoformat()
    end_time = (datetime.now() + timedelta(days=days_offset, hours=20)).isoformat()
    
    journey_log = [
        {'status': 'open', 'timestamp': gen_ts_ago(20), 'user': 'system'},
        {'status': status, 'timestamp': gen_ts_ago(10), 'user': 'admin'}
    ] if status != 'open' else []
    
    sql.append(f"""INSERT INTO shifts (id, agency_id, client_id, assigned_staff_id, date, start_time, end_time, duration_hours, 
role_required, pay_rate, charge_rate, break_duration_minutes, status, urgency, notes, created_by, 
work_location_within_site, shift_journey_log, financial_locked, recurring, requirements, 
booking_id, timesheet_received, marketplace_visible, admin_closure_required, created_date, updated_date)
VALUES ({sql_val(shift_id)}, {sql_val(agency_id)}, {sql_val(client_id)}, {sql_val(staff_id)}, 
{sql_val(shift_date)}, {sql_val(start_time)}, {sql_val(end_time)}, 12,
{sql_val(role)}, {random.randint(15, 22)}, {random.randint(22, 32)}, 30, {sql_val(status)}, 
{sql_val('urgent' if i % 5 == 0 else 'normal')}, 'Shift for {role}', 'admin@agency.com',
{sql_val(f'Room {random.randint(1, 20)}')}, {sql_val(journey_log)}, 
{sql_val(status == 'completed')}, false, {sql_val(['Medication trained', 'DBS checked'])},
NULL, {sql_val(status == 'completed')}, false, {sql_val(status != 'open')},
{sql_val(gen_ts_ago(30))}, {sql_val(gen_ts_ago(1))});""")

sql.append("")

# 6. BOOKINGS (10 bookings)
sql.append("-- 6. BOOKINGS (10 records)")
for i in range(10):
    if i >= len(ids['shifts']): break
    booking_id = gen_uuid()
    ids['bookings'].append(booking_id)
    shift_id = ids['shifts'][i]
    staff_id = ids['staff'][i % len(ids['staff'])]
    client_id = ids['clients'][i % len(ids['clients'])]
    agency_id = ids['agencies'][i % 2]
    
    sql.append(f"""INSERT INTO bookings (id, agency_id, shift_id, staff_id, client_id, status, booking_date, 
shift_date, confirmation_method, confirmed_by_staff_at, notes, created_date, updated_date)
VALUES ({sql_val(booking_id)}, {sql_val(agency_id)}, {sql_val(shift_id)}, {sql_val(staff_id)}, {sql_val(client_id)},
'confirmed', {sql_val(gen_ts_ago(10))}, {sql_val(gen_date_ago(10))}, 'phone', {sql_val(gen_ts_ago(9))},
'Booking confirmed by staff', {sql_val(gen_ts_ago(15))}, {sql_val(gen_ts_ago(1))});""")

sql.append("")

# 7. TIMESHEETS (8 timesheets)
sql.append("-- 7. TIMESHEETS (8 records)")
for i in range(8):
    if i >= len(ids['bookings']): break
    timesheet_id = gen_uuid()
    ids['timesheets'].append(timesheet_id)
    booking_id = ids['bookings'][i]
    staff_id = ids['staff'][i % len(ids['staff'])]
    client_id = ids['clients'][i % len(ids['clients'])]
    agency_id = ids['agencies'][i % 2]
    
    sql.append(f"""INSERT INTO timesheets (id, agency_id, booking_id, staff_id, client_id, shift_date, 
work_location_within_site, clock_in_time, clock_out_time, total_hours, break_duration_minutes, status,
pay_rate, charge_rate, staff_pay_amount, client_charge_amount, geofence_validated, location_verified,
staff_signature, created_date, updated_date)
VALUES ({sql_val(timesheet_id)}, {sql_val(agency_id)}, {sql_val(booking_id)}, {sql_val(staff_id)}, {sql_val(client_id)},
{sql_val(gen_date_ago(7))}, {sql_val(f'Room {random.randint(1, 10)}')}, {sql_val(gen_ts_ago(7))}, {sql_val(gen_ts_ago(7))},
{random.uniform(10, 12):.1f}, 30, 'approved', {random.randint(15, 22)}, {random.randint(22, 32)}, 
{random.uniform(150, 250):.2f}, {random.uniform(250, 350):.2f}, true, true,
'SignatureDataBase64...', {sql_val(gen_ts_ago(10))}, {sql_val(gen_ts_ago(1))});""")

sql.append("")

# 8. INVOICES (3 invoices)
sql.append("-- 8. INVOICES (3 records)")
for i in range(3):
    invoice_id = gen_uuid()
    ids['invoices'].append(invoice_id)
    client_id = ids['clients'][i % len(ids['clients'])]
    agency_id = ids['agencies'][i % 2]
    subtotal = random.uniform(800, 2500)
    vat = subtotal * 0.2
    total = subtotal + vat
    
    sql.append(f"""INSERT INTO invoices (id, agency_id, client_id, invoice_number, invoice_date, due_date, 
period_start, period_end, subtotal, vat_rate, vat_amount, total, balance_due, status, created_by,
line_items, notes, reminder_sent_count, created_date, updated_date)
VALUES ({sql_val(invoice_id)}, {sql_val(agency_id)}, {sql_val(client_id)}, {sql_val(f'INV-{datetime.now().year}-{1000+i}')},
{sql_val(gen_date_ago(10))}, {sql_val(gen_date_future(20))}, {sql_val(gen_date_ago(20))}, {sql_val(gen_date_ago(5))},
{subtotal:.2f}, 0.20, {vat:.2f}, {total:.2f}, {total:.2f}, 'sent', 'admin@agency.com',
{sql_val([{'description': 'Healthcare services', 'quantity': random.randint(5, 15), 'rate': random.uniform(18, 30), 'amount': random.uniform(200, 500)}])},
'Monthly invoice for healthcare services', 0, {sql_val(gen_ts_ago(15))}, {sql_val(gen_ts_ago(1))});""")

sql.append("")

# 9. PAYSLIPS (2 payslips)
sql.append("-- 9. PAYSLIPS (2 records)")
for i in range(2):
    payslip_id = gen_uuid()
    ids['payslips'].append(payslip_id)
    staff_id = ids['staff'][i]
    agency_id = ids['agencies'][i % 2]
    gross = random.uniform(800, 1500)
    tax = gross * 0.2
    ni = gross * 0.12
    deductions = tax + ni
    net = gross - deductions
    
    sql.append(f"""INSERT INTO payslips (id, agency_id, staff_id, payslip_number, period_start, period_end, payment_date,
gross_pay, tax, ni, deductions, net_pay, total_hours, status, created_by, pdf_url, bank_details, 
timesheets, created_date, updated_date)
VALUES ({sql_val(payslip_id)}, {sql_val(agency_id)}, {sql_val(staff_id)}, {sql_val(f'PAY-{datetime.now().year}-{5000+i}')},
{sql_val(gen_date_ago(30))}, {sql_val(gen_date_ago(7))}, {sql_val(gen_date_ago(3))},
{gross:.2f}, {tax:.2f}, {ni:.2f}, {deductions:.2f}, {net:.2f}, {random.uniform(60, 100):.1f}, 'paid', 'admin@agency.com',
'https://example.com/payslips/{payslip_id}.pdf', {sql_val({'account_name': 'Staff Member', 'sort_code': '20-00-00', 'account_number': '12345678'})},
{sql_val([ids['timesheets'][0] if ids['timesheets'] else None])}, {sql_val(gen_ts_ago(15))}, {sql_val(gen_ts_ago(1))});""")

sql.append("")

# 10. COMPLIANCE (12 compliance documents)
sql.append("-- 10. COMPLIANCE (12 records)")
doc_types = ['dbs_check', 'right_to_work', 'professional_registration', 'training_certificate', 'vaccination_record', 'reference']
for i in range(12):
    comp_id = gen_uuid()
    ids['compliance'].append(comp_id)
    staff_id = ids['staff'][i % len(ids['staff'])]
    agency_id = ids['agencies'][i % 2]
    doc_type = doc_types[i % len(doc_types)]
    
    sql.append(f"""INSERT INTO compliance (id, staff_id, agency_id, document_type, document_name, document_url, 
issue_date, expiry_date, status, created_by, issuing_authority, reference_number, 
reminder_30d_sent, reminder_14d_sent, created_date, updated_date)
VALUES ({sql_val(comp_id)}, {sql_val(staff_id)}, {sql_val(agency_id)}, {sql_val(doc_type)}, 
'{doc_type.replace("_", " ").title()} - Staff {i+1}', 'https://example.com/docs/{comp_id}.pdf',
{sql_val(gen_date_ago(365))}, {sql_val(gen_date_future(random.choice([30, 90, 365])))}, 'verified', 'admin@agency.com',
'Issuing Authority {i+1}', 'REF-{random.randint(100000, 999999)}', false, false,
{sql_val(gen_ts_ago(365))}, {sql_val(gen_ts_ago(1))});""")

sql.append("")

# 11. GROUPS (2 groups)
sql.append("-- 11. GROUPS (2 records)")
for i in range(2):
    group_id = gen_uuid()
    ids['groups'].append(group_id)
    agency_id = ids['agencies'][i]
    staff_members = [ids['staff'][j] for j in range(i*5, min((i+1)*5, len(ids['staff'])))]
    
    sql.append(f"""INSERT INTO groups (id, agency_id, name, description, staff_members, created_date, updated_date)
VALUES ({sql_val(group_id)}, {sql_val(agency_id)}, 'Team {chr(65+i)}', 'Primary healthcare team {chr(65+i)}',
ARRAY[{', '.join([sql_val(s) for s in staff_members])}]::uuid[], {sql_val(gen_ts_ago(60))}, {sql_val(gen_ts_ago(1))});""")

sql.append("")

# 12. ADMIN_WORKFLOWS (3 workflows)
sql.append("-- 12. ADMIN_WORKFLOWS (3 records)")
workflow_types = ['unfilled_urgent_shift', 'expired_compliance_document', 'timesheet_discrepancy']
for i in range(3):
    workflow_id = gen_uuid()
    ids['admin_workflows'].append(workflow_id)
    agency_id = ids['agencies'][i % 2]
    
    sql.append(f"""INSERT INTO admin_workflows (id, agency_id, type, priority, title, status, created_by,
related_entity, deadline, auto_created, escalation_count, created_date, updated_date)
VALUES ({sql_val(workflow_id)}, {sql_val(agency_id)}, {sql_val(workflow_types[i])}, 
{sql_val(['high', 'medium', 'critical'][i])}, 'Workflow: {workflow_types[i].replace("_", " ").title()}', 
'pending', 'system', {sql_val({'entity_type': 'shift', 'entity_id': ids['shifts'][0] if ids['shifts'] else None})},
{sql_val(gen_ts_future(7))}, true, 0, {sql_val(gen_ts_ago(5))}, {sql_val(gen_ts_ago(1))});""")

sql.append("")

# 13. CHANGE_LOGS (5 change logs)
sql.append("-- 13. CHANGE_LOGS (5 records)")
change_types = ['shift_cancelled', 'shift_reassigned', 'bank_details_changed', 'pay_rate_override', 'staff_suspended']
for i in range(5):
    log_id = gen_uuid()
    agency_id = ids['agencies'][i % 2]
    
    sql.append(f"""INSERT INTO change_logs (id, agency_id, change_type, affected_entity_type, affected_entity_id,
old_value, new_value, reason, changed_by_email, changed_at, risk_level, reviewed, created_date, updated_date)
VALUES ({sql_val(log_id)}, {sql_val(agency_id)}, {sql_val(change_types[i])}, 'shift', 
{sql_val(ids['shifts'][0] if ids['shifts'] else gen_uuid())}, 'Old Value', 'New Value',
'Administrative change', 'admin@agency.com', {sql_val(gen_ts_ago(3))}, 'low', false,
{sql_val(gen_ts_ago(3))}, {sql_val(gen_ts_ago(1))});""")

sql.append("")

# 14. OPERATIONAL_COSTS (3 costs)
sql.append("-- 14. OPERATIONAL_COSTS (3 records)")
services = ['Twilio SMS', 'Resend Email', 'Supabase Hosting']
categories = ['communication', 'communication', 'platform_hosting']
for i in range(3):
    cost_id = gen_uuid()
    agency_id = ids['agencies'][i % 2]
    
    sql.append(f"""INSERT INTO operational_costs (id, agency_id, cost_type, service_name, service_category,
amount, cost_date, currency, status, created_by, billing_period, roi_impact, created_date, updated_date)
VALUES ({sql_val(cost_id)}, {sql_val(agency_id)}, 'monthly_subscription', {sql_val(services[i])}, 
{sql_val(categories[i])}, {random.uniform(20, 150):.2f}, {sql_val(gen_date_ago(5))}, 'GBP', 'paid',
'admin@agency.com', {sql_val(gen_date_ago(30))}, {sql_val(random.choice(['high', 'medium', 'critical']))},
{sql_val(gen_ts_ago(30))}, {sql_val(gen_ts_ago(1))});""")

sql.append("")

# 15. INVOICE_AMENDMENTS (1 amendment)
sql.append("-- 15. INVOICE_AMENDMENTS (1 record)")
if ids['invoices']:
    amend_id = gen_uuid()
    invoice_id = ids['invoices'][0]
    agency_id = ids['agencies'][0]
    
    sql.append(f"""INSERT INTO invoice_amendments (id, agency_id, invoice_id, amendment_type, amendment_reason,
original_invoice_id, amendment_version, original_total, amended_total, total_difference, status, created_by,
changes_made, risk_level, created_date, updated_date)
VALUES ({sql_val(amend_id)}, {sql_val(agency_id)}, {sql_val(invoice_id)}, 'hours_adjustment',
'Client requested adjustment for actual hours worked', {sql_val(invoice_id)}, 1, 1000.00, 950.00, -50.00,
'approved', 'admin@agency.com', {sql_val([{'field': 'hours', 'old': '50', 'new': '47.5'}])}, 'low',
{sql_val(gen_ts_ago(5))}, {sql_val(gen_ts_ago(1))});""")

sql.append("")

# 16. NOTIFICATION_QUEUE (2 notifications)
sql.append("-- 16. NOTIFICATION_QUEUE (2 records)")
for i in range(2):
    notif_id = gen_uuid()
    agency_id = ids['agencies'][i % 2]
    
    sql.append(f"""INSERT INTO notification_queue (id, agency_id, notification_type, recipient_type, recipient_email,
recipient_first_name, status, created_by, pending_items, item_count, created_date, updated_date)
VALUES ({sql_val(notif_id)}, {sql_val(agency_id)}, {sql_val(['shift_assignment', 'shift_reminder'][i])}, 
'staff', 'staff{i+1}@example.com', 'Staff{i+1}', 'pending', 'system',
{sql_val([{'type': 'shift', 'id': ids['shifts'][0] if ids['shifts'] else None}])}, 1,
{sql_val(gen_ts_ago(1))}, {sql_val(gen_ts_ago(1))});""")

sql.append("")

# Save extended seed data
with open('supabase/seed_data.sql', 'a', encoding='utf-8') as f:
    f.write('\n'.join(sql))

# Update manifest
with open('SEED_DATA_MANIFEST.json', 'w', encoding='utf-8') as f:
    json.dump(ids, f, indent=2)

print(f"\n[OK] Complete seed data:")
print(f"  - Agencies: {len(ids['agencies'])}")
print(f"  - Profiles: {len(ids['profiles'])}")
print(f"  - Staff: {len(ids['staff'])}")
print(f"  - Clients: {len(ids['clients'])}")
print(f"  - Shifts: {len(ids['shifts'])}")
print(f"  - Bookings: {len(ids['bookings'])}")
print(f"  - Timesheets: {len(ids['timesheets'])}")
print(f"  - Invoices: {len(ids['invoices'])}")
print(f"  - Payslips: {len(ids['payslips'])}")
print(f"  - Compliance: {len(ids['compliance'])}")
print(f"  - Groups: {len(ids['groups'])}")
print(f"  - Admin Workflows: {len(ids['admin_workflows'])}")
print(f"  - Change Logs: 5")
print(f"  - Operational Costs: 3")
print(f"  - Invoice Amendments: 1")
print(f"  - Notification Queue: 2")
print(f"\nTotal: ~86 records")
print(f"\n[OK] Saved to: supabase/seed_data.sql")
print(f"[OK] Updated: SEED_DATA_MANIFEST.json")






