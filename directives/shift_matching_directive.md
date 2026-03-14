# Directive: Enhance AI Shift-Matching Logic

## Goal
To improve the precision of shift-staff assignments based on historical performance, distance, and client preferences.

## Inputs
- `staff_profiles` (Supabase table)
- `shift_requirements` (Status: Open)
- `gps_proximity_threshold` (Default: 15 miles)

## Process
1. Query the `staff_profiles` for qualified roles.
2. Filter for availability using the `staff_v2_calendar` table.
3. Calculate distance using the Mapbox utility in `execution/geo_calculator.py`.
4. Rank staff by "Performance Score" and "Proximity".
5. Trigger WhatsApp notification via n8n.

## Tools
- `execution/query_matches.py`
- `execution/calc_proximity.py`

## Outputs
- List of Top 5 candidates sent to Admin UI.
- Automated WhatsApp broadcast if "Auto-Fill" is enabled.
