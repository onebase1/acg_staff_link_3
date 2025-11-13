"""
Batch insert seed data to Supabase using execute_sql
Skips profiles since they require auth.users entries
"""

import re

# Read the SQL file
with open('supabase/seed_data.sql', 'r', encoding='utf-8') as f:
    sql_content = f.read()

# Split by section comments
sections = []
current_section = []
section_name = ""

for line in sql_content.split('\n'):
    if line.strip().startswith('-- ') and (' records' in line or 'SEED DATA' in line or 'users' in line):
        if current_section:
            sections.append((section_name, '\n'.join(current_section)))
            current_section = []
        section_name = line.strip()
    current_section.append(line)

if current_section:
    sections.append((section_name, '\n'.join(current_section)))

print(f"Found {len(sections)} sections\n")

# Filter out headers and profiles
filtered_sections = []
for name, content in sections:
    if 'PROFILES' in name.upper() or 'users' in name.lower():
        print(f"[SKIP] {name}")
        continue
    if 'INSERT' not in content:
        print(f"[SKIP] {name} (no inserts)")
        continue
    filtered_sections.append((name, content))
    print(f"[OK] {name}")

print(f"\nWill insert {len(filtered_sections)} sections")
print("\nNow you can manually execute these SQL sections in Supabase")
print("Or use the mcp_SUPABASE_execute_sql tool for each section")

# Save filtered SQL
with open('supabase/seed_data_filtered.sql', 'w', encoding='utf-8') as f:
    f.write("-- FILTERED SEED DATA (Skipped profiles)\n\n")
    for name, content in filtered_sections:
        f.write(content + "\n\n")

print(f"\n[OK] Saved filtered SQL to: supabase/seed_data_filtered.sql")





