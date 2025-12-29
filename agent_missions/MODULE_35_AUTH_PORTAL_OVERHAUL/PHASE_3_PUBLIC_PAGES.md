# PHASE 3: Public Pages Architecture

## Objective
Create a public pages architecture that allows unauthenticated users to view landing, legal, and authentication pages without triggering the auth guard or showing logged-in UI.

## Duration
6-8 hours

## Priority
**MEDIUM** - Enables OAuth application readiness and professional public presence

## User Decision

**Approved Approach:**
- ✅ Minimal landing + legal pages
- ✅ Reuse design/content from `marketing/website` Next.js app
- ✅ Convert Next.js components to React
- ✅ Two-layout architecture (PublicLayout + Layout)

## Problem Statement

### Current Issue: "Blank User" During Auth Check

**What Happens Now:**
```
1. User visits /landing (no auth)
2. Layout.jsx wraps ALL routes
3. Layout checks isAuthenticated (takes 500ms)
4. During this time, user sees:
   - Sidebar with "blank User"
   - Navigation menu
   - Dashboard UI elements
5. Then /landing finally loads
```

**Result:** Unprofessional UX, confusing for unauthenticated visitors

### Root Cause

**File:** `src/pages/index.jsx`

All routes use the same Layout wrapper:
```jsx
<Route element={<Layout />}>
  <Route path="/" element={<Home />} />
  <Route path="/login" element={<Login />} />  // ❌ Should be public
  <Route path="/Dashboard" element={<Dashboard />} />
  <Route path="/ClientPortal" element={<ClientPortal />} />
  {/* ALL routes wrapped in Layout with auth guard */}
</Route>
```

**Layout.jsx** checks authentication for EVERY route, causing:
- Public pages to show logged-in UI during auth check
- "Blank User" flashing before redirect
- Poor SEO (crawlers see auth redirect)

## Solution Design

### Two-Layout Architecture

**Concept:** Separate public routes from protected routes using different layouts

```jsx
<Router>
  <Routes>
    {/* PUBLIC ROUTES - No auth required */}
    <Route element={<PublicLayout />}>
      <Route path="/" element={<Landing />} />
      <Route path="/about" element={<About />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/login" element={<Login />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/auth/magic" element={<MagicLinkAuth />} />
    </Route>

    {/* PROTECTED ROUTES - Auth required */}
    <Route element={<Layout />}>
      <Route path="/Dashboard" element={<Dashboard />} />
      <Route path="/StaffPortal" element={<StaffPortal />} />
      <Route path="/ClientPortal" element={<ClientPortal />} />
      {/* ... all other protected routes */}
    </Route>
  </Routes>
</Router>
```

## Implementation Details

### 1. Create PublicLayout Component

**File:** `src/pages/PublicLayout.jsx`

**Requirements:**
- No authentication check
- Simple header (logo + "Sign In" button)
- Footer with legal links
- No sidebar/navigation
- No user state loading
- SEO-friendly (meta tags)

**Structure:**
```jsx
import React from 'react';
import { Outlet, Link } from 'react-router-dom';

export default function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="font-bold text-white">A</span>
            </div>
            <span className="text-xl font-bold">ACG StaffLink</span>
          </Link>

          <nav className="flex items-center gap-6">
            <Link to="/about" className="text-gray-600 hover:text-gray-900">About</Link>
            <Link to="/contact" className="text-gray-600 hover:text-gray-900">Contact</Link>
            <Link to="/login" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
              Sign In
            </Link>
          </nav>
        </div>
      </header>

      {/* Page Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t bg-gray-50 py-8">
        <div className="container mx-auto px-6">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              © 2025 Agile Care Management. All rights reserved.
            </p>
            <div className="flex gap-6 text-sm">
              <Link to="/privacy" className="text-gray-600 hover:text-gray-900">Privacy</Link>
              <Link to="/terms" className="text-gray-600 hover:text-gray-900">Terms</Link>
              <Link to="/contact" className="text-gray-600 hover:text-gray-900">Contact</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
```

### 2. Restructure Routes in index.jsx

**File:** `src/pages/index.jsx`

**Changes:**
1. Import `PublicLayout`
2. Wrap public routes in `<PublicLayout />`
3. Keep protected routes in `<Layout />`

**Before:**
```jsx
<Router>
  <Routes>
    <Route element={<Layout />}>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/Dashboard" element={<Dashboard />} />
      {/* ... */}
    </Route>
  </Routes>
</Router>
```

**After:**
```jsx
import PublicLayout from "./PublicLayout";

<Router>
  <Routes>
    {/* Public Routes */}
    <Route element={<PublicLayout />}>
      <Route path="/" element={<Landing />} />
      <Route path="/about" element={<About />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/login" element={<Login />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/auth/magic" element={<MagicLinkAuth />} />
    </Route>

    {/* Protected Routes */}
    <Route element={<Layout />}>
      <Route path="/Dashboard" element={<Dashboard />} />
      <Route path="/StaffPortal" element={<StaffPortal />} />
      <Route path="/ClientPortal" element={<ClientPortal />} />
      {/* ... all other protected routes unchanged */}
    </Route>
  </Routes>
</Router>
```

### 3. Create Landing Page (Convert from Next.js)

**Source:** `marketing/website/src/app/page.tsx` (Next.js)
**Destination:** `src/pages/Landing.jsx` (React)

**Conversion Steps:**

**A. Extract Content:**
- Hero section: "Stop losing sleep over unfilled shifts"
- Features grid (11 features)
- Comparison section
- Final CTA

**B. Convert Next.js to React:**
```jsx
// BEFORE (Next.js)
'use client';
import { motion } from 'framer-motion';

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  // ...
}

// AFTER (React)
import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export default function Landing() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  // ...
}
```

**C. Replace Next.js Specific:**
- `href` → `to` (for react-router-dom)
- Remove `'use client'` directive
- Remove Framer Motion (optional animations)
- Use inline styles instead of Next.js Image

**D. Simplify for MVP:**
Keep:
- Hero section
- 6 key features (Smart Escalation, Compliance Guard, GPS Verification, AI Ranking, Marketplace, AI Assistant)
- CTA section
- Footer

Remove (for now):
- Framer Motion animations
- Trust badges section
- Comparison section (save for later)

**Landing.jsx Structure:**
```jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Clock, MapPin, Brain, LayoutGrid, Bot } from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="py-20 text-center">
        <div className="container mx-auto px-6">
          <h1 className="text-5xl md:text-7xl font-bold mb-6">
            Stop losing sleep over <br />
            <span className="text-blue-600">unfilled shifts.</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            The first AI-powered operations center for care agencies.
            Automate your bookings, bulletproof your compliance, and get paid faster.
          </p>
          <div className="flex gap-4 justify-center">
            <Link to="/login" className="bg-blue-600 text-white px-8 py-4 rounded-full font-bold hover:bg-blue-700">
              Start Free Trial
            </Link>
            <Link to="/contact" className="bg-gray-100 text-gray-900 px-8 py-4 rounded-full font-bold hover:bg-gray-200">
              Schedule Demo
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-6">
          <h2 className="text-4xl font-bold text-center mb-16">
            Operations on Autopilot.
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature cards */}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 text-center">
        <h2 className="text-5xl font-bold mb-8">Ready to scale without stress?</h2>
        <Link to="/login" className="bg-blue-600 text-white px-10 py-5 rounded-full font-bold text-xl hover:bg-blue-700">
          Get Started
        </Link>
      </section>
    </div>
  );
}
```

### 4. Create Legal Pages

#### A. Privacy Policy Page

**File:** `src/pages/Privacy.jsx`

```jsx
import React from 'react';

export default function Privacy() {
  return (
    <div className="container mx-auto px-6 py-16 max-w-4xl">
      <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>

      <div className="prose prose-lg">
        <p className="text-gray-600 mb-8">Last updated: December 28, 2025</p>

        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4">1. Information We Collect</h2>
          <p className="text-gray-700 leading-relaxed">
            ACG StaffLink collects information necessary to provide healthcare staffing services...
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4">2. How We Use Your Information</h2>
          <p className="text-gray-700 leading-relaxed">
            We use collected information to facilitate shift bookings, process payments, and ensure compliance...
          </p>
        </section>

        {/* Add all required GDPR sections */}
      </div>
    </div>
  );
}
```

**Required Sections:**
- Information We Collect
- How We Use Your Information
- Data Sharing and Disclosure
- Data Retention
- Your Rights (GDPR)
- Cookies and Tracking
- Security Measures
- Contact Information

#### B. Terms of Service Page

**File:** `src/pages/Terms.jsx`

**Required Sections:**
- Acceptance of Terms
- Service Description
- User Accounts
- Payment Terms
- Intellectual Property
- Limitation of Liability
- Termination
- Governing Law

#### C. Contact Page

**File:** `src/pages/Contact.jsx`

```jsx
import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    message: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Send email via send-email edge function
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: 'info@agilecaremanagement.co.uk',
          subject: `Contact Form: ${formData.company || formData.name}`,
          html: `
            <h2>New Contact Form Submission</h2>
            <p><strong>Name:</strong> ${formData.name}</p>
            <p><strong>Email:</strong> ${formData.email}</p>
            <p><strong>Company:</strong> ${formData.company}</p>
            <p><strong>Message:</strong></p>
            <p>${formData.message}</p>
          `
        })
      });

      if (response.ok) {
        toast.success('Message sent! We\'ll be in touch soon.');
        setFormData({ name: '', email: '', company: '', message: '' });
      } else {
        throw new Error('Failed to send');
      }
    } catch (error) {
      toast.error('Failed to send message. Please email us directly.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-6 py-16 max-w-2xl">
      <h1 className="text-4xl font-bold mb-4">Contact Us</h1>
      <p className="text-gray-600 mb-8">
        Interested in ACG StaffLink? Get in touch and we'll schedule a personalized demo.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">Your Name *</label>
          <Input
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="John Smith"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Email *</label>
          <Input
            required
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="john@example.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Company</label>
          <Input
            value={formData.company}
            onChange={(e) => setFormData({ ...formData, company: e.target.value })}
            placeholder="Your Agency Name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Message *</label>
          <textarea
            required
            value={formData.message}
            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            rows={6}
            className="w-full px-3 py-2 border rounded-md"
            placeholder="Tell us about your staffing needs..."
          />
        </div>

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Sending...' : 'Send Message'}
        </Button>
      </form>

      <div className="mt-12 p-6 bg-gray-50 rounded-lg">
        <h3 className="font-bold mb-4">Other Ways to Reach Us</h3>
        <p className="text-gray-700">
          <strong>Email:</strong> info@agilecaremanagement.co.uk<br />
          <strong>Phone:</strong> +44 20 1234 5678
        </p>
      </div>
    </div>
  );
}
```

### 5. Update Layout.jsx

**File:** `src/pages/Layout.jsx`

**Remove public route handling:**
```jsx
// BEFORE
const authRoutes = ['/login', '/reset-password'];
if (authRoutes.includes(location.pathname)) {
  return children; // Skip auth check
}

// AFTER
// Remove this check entirely - public routes now use PublicLayout
```

Layout.jsx should ONLY handle protected routes now.

## Testing Strategy

### Manual Testing

**Test 1: Public Page Access (Not Logged In)**
```
1. Open incognito browser
2. Visit https://agilecaremanagement.co.uk/
3. EXPECT: Landing page loads immediately
4. VERIFY: No "blank User" shown
5. VERIFY: No auth redirect
6. VERIFY: Header shows "Sign In" button
```

**Test 2: Navigation Between Public Pages**
```
1. On landing page, click "Contact"
2. EXPECT: Contact page loads without auth check
3. Click "Privacy" in footer
4. EXPECT: Privacy page loads
5. VERIFY: No sidebar visible
6. VERIFY: Simple header/footer on all pages
```

**Test 3: Login Flow**
```
1. On landing page, click "Sign In"
2. EXPECT: Login page (still in PublicLayout)
3. Login successfully
4. EXPECT: Redirect to role-specific page (Staff/Client/Admin)
5. VERIFY: Now using Layout (sidebar visible)
```

**Test 4: Direct URL Access**
```
1. Not logged in, visit /Dashboard directly
2. EXPECT: Redirect to /login?next=/Dashboard
3. Login
4. EXPECT: Redirect back to /Dashboard
```

**Test 5: SEO / Crawlers**
```
1. Use curl or browser dev tools
2. Fetch / (landing page)
3. VERIFY: Full HTML returned (not redirect)
4. VERIFY: Meta tags present
5. VERIFY: No JavaScript required for content
```

## SEO Optimization

### Meta Tags for Landing Page

```jsx
// In Landing.jsx
import { Helmet } from 'react-helmet-async';

<Helmet>
  <title>ACG StaffLink - Healthcare Staffing Automation Platform</title>
  <meta name="description" content="Automate your healthcare staffing operations with AI-powered shift management, compliance tracking, and smart marketplace." />
  <meta name="keywords" content="healthcare staffing, care agency software, shift management, compliance tracking" />

  {/* Open Graph */}
  <meta property="og:title" content="ACG StaffLink - Healthcare Staffing Platform" />
  <meta property="og:description" content="The first AI-powered operations center for care agencies" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://agilecaremanagement.co.uk" />

  {/* Twitter */}
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="ACG StaffLink" />
  <meta name="twitter:description" content="Healthcare staffing automation platform" />
</Helmet>
```

### Install react-helmet-async

```bash
npm install react-helmet-async
```

Wrap app in provider (src/main.jsx):
```jsx
import { HelmetProvider } from 'react-helmet-async';

<HelmetProvider>
  <App />
</HelmetProvider>
```

## Deployment Checklist

- [ ] PublicLayout.jsx created
- [ ] Routes restructured in index.jsx
- [ ] Landing.jsx created (converted from Next.js)
- [ ] Privacy.jsx created
- [ ] Terms.jsx created
- [ ] Contact.jsx created
- [ ] Layout.jsx updated (removed public route handling)
- [ ] react-helmet-async installed
- [ ] SEO meta tags added
- [ ] All public pages tested (not logged in)
- [ ] All protected routes still work
- [ ] Login flow works
- [ ] No "blank User" issue

## Success Metrics

- ✅ Zero "blank User" sightings on public pages
- ✅ Landing page loads < 1 second
- ✅ SEO crawlers can index content
- ✅ Contact form submissions work
- ✅ Login flow redirects correctly

---

**Ready for implementation after Phase 2!**
