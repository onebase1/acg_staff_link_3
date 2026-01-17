# Event Dashboard & Funding Discovery

## 1. Funding Discovery List (No-Credit / North East Focus)

### Grants & Competitions
*   **North East Growth Hub Grants**: (£5k–£75k) for digital/SaaS projects in NE England.
*   **Innovate UK Launchpad: Digital Tech NE**: (£25k–£100k) Specific for Northumberland, Tyne & Wear, and County Durham.
*   **Startup Awards North East**: (£10k+ prizes) and high-value investor introductions.
*   **Innovate UK Innovation Competitions**: Search for "Digital Health" or "Social Care" themes.

### Angel Networks (High-Traction Focus)
*   **SFC Capital**: Very active in UK SaaS, SEIS-focused.
*   **TechNorth Ventures**: Direct focus on Northern technology founders.
*   **Northern Powerhouse Partnership**: Regional growth capital.
*   **Angel Invest North**: Specialized in North East tech deals.

---

## 2. Interactive Event Dashboard Requirements (Technical Concept)

### Objective
A simple, internal-facing dashboard for the Director to track and prioritize high-value networking and funding deadlines.

### Core Features
*   **Event Tracker**: List of upcoming North East events (VentureFest, Startup Grind) with "Priority" badges.
*   **Grant Deadline Calendar**: Automated countdowns for Innovate UK and local NE grant registrations.
*   **Status Toggles**: "Not Registered", "Registered", "Attended", "Follow-up Sent".
*   **Contact Log**: Quick entry for people met at events (linked to CRM or simple table).
*   **ROI Counter**: Tracking potential lead value or funding applied for vs. time spent.

### Proposed Data Schema (Supabase)
```sql
CREATE TABLE public.networking_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  event_date date NOT NULL,
  location text,
  priority_level text CHECK (priority_level IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),
  type text, -- e.g., 'Grant', 'Networking', 'Investor Pitch'
  registration_status text DEFAULT 'NOT_STARTED',
  notes text,
  url text,
  created_at timestamp with time zone DEFAULT now()
);
```

### UI Components (Admin View)
*   **Bento Grid**: Top stat cards (Next Grant Deadline, People Met this Month, Active Funding Apps).
*   **Interactive Table**: Sorted by date, with color-coded priority icons.
*   **Quick Note Modal**: For capturing co-founder lead details on the fly.
