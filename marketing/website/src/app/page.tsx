'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Clock, FileText, CheckCircle, ChevronRight, Menu, X, Play, MapPin, Camera, MessageCircle, Brain, Sparkles, LayoutGrid, Bot, PhoneCall } from 'lucide-react';
import { cn } from '@/lib/utils';

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden selection:bg-blue-500/30">

      {/* Navigation */}
      <nav className="fixed w-full z-50 bg-background/80 backdrop-blur-md border-b border-white/10">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="font-bold text-white">A</span>
            </div>
            <span className="text-xl font-bold tracking-tight">ACG StaffLink</span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">How it Works</a>
            <a href="#testimonials" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">Testimonials</a>
            <button className="bg-white text-black px-5 py-2 rounded-full text-sm font-bold hover:bg-gray-200 transition-colors">
              Book Demo
            </button>
          </div>

          <button className="md:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X /> : <Menu />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden absolute w-full bg-background border-b border-white/10 p-6 flex flex-col gap-4">
            <a href="#features" className="text-gray-400 hover:text-white">Features</a>
            <a href="#how-it-works" className="text-gray-400 hover:text-white">How it Works</a>
            <button className="bg-white text-black px-5 py-2 rounded-full text-sm font-bold">Book Demo</button>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
        <div className="absolute inset-0 bg-blue-900/10 rounded-full blur-[100px] -z-10 transform -translate-y-1/2 scale-150" />

        <div className="container mx-auto px-6 text-center">
          <motion.div
            initial="initial"
            animate="animate"
            variants={staggerContainer}
            className="max-w-4xl mx-auto space-y-8"
          >
            <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-900/30 border border-blue-500/30 text-blue-400 text-sm font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              v2.0 Now Verified & Live
            </motion.div>

            <motion.h1 variants={fadeInUp} className="text-5xl md:text-7xl font-bold tracking-tight leading-tight">
              Stop losing sleep over <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">unfilled shifts.</span>
            </motion.h1>

            <motion.p variants={fadeInUp} className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
              The first AI-powered operations center for care agencies. Automate your bookings, bulletproof your compliance, and get paid faster.
            </motion.p>

            <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <button className="w-full sm:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-bold text-lg transition-all transform hover:scale-105 flex items-center justify-center gap-2">
                Start Free Trial <ChevronRight className="w-5 h-5" />
              </button>
              <button className="w-full sm:w-auto px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-full font-bold text-lg transition-all flex items-center justify-center gap-2">
                <Play className="w-5 h-5 fill-current" /> Watch Demo
              </button>
            </motion.div>

            {/* Dashboard Preview Mockup */}
            <motion.div
              initial={{ opacity: 0, y: 40, rotateX: 10 }}
              animate={{ opacity: 1, y: 0, rotateX: 0 }}
              transition={{ delay: 0.4, duration: 0.8 }}
              className="mt-16 mx-auto max-w-6xl relative"
            >
              <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10" />
              <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-2 shadow-2xl">
                <div className="aspect-[16/9] rounded-lg bg-gray-900 flex items-center justify-center relative overflow-hidden border border-white/5">
                  {/* Abstract Representation of Dashboard for now */}
                  <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2940&auto=format&fit=crop')] bg-cover bg-center opacity-40 mix-blend-overlay"></div>
                  <div className="z-10 text-center space-y-4">
                    <div className="inline-flex items-center gap-2 px-6 py-3 bg-gray-800/80 rounded-lg border border-red-500/50 text-red-400 backdrop-blur-md shadow-xl animate-pulse">
                      <span className="w-3 h-3 rounded-full bg-red-500"></span>
                      Warning: 1 Urgent Shift Unfilled (&gt;15m)
                    </div>
                    <p className="text-gray-400 text-sm">Real-time escalation engine active</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Trust Badges */}
            <motion.div variants={fadeInUp} className="pt-12 text-center space-y-4">
              <p className="text-sm font-medium text-gray-500 uppercase tracking-widest">Trusted by 50+ Modern Agencies</p>
              <div className="flex justify-center gap-12 grayscale opacity-40">
                <div className="h-8 w-24 bg-white/20 rounded"></div>
                <div className="h-8 w-24 bg-white/20 rounded"></div>
                <div className="h-8 w-24 bg-white/20 rounded"></div>
                <div className="h-8 w-24 bg-white/20 rounded"></div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-32 bg-background relative">
        <div className="container mx-auto px-6">
          <div className="mb-20 text-center max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-bold mb-6">Operations on Autopilot.</h2>
            <p className="text-gray-400 text-lg">
              ACG StaffLink isn&apos;t just a database. It&apos;s an active member of your team. It monitors your shifts, chases your staff for documents, and prepares your invoices while you sleep.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Clock className="w-8 h-8 text-blue-400" />}
              title="Smart Escalation"
              description="The system watches every urgent shift. If it's not filled in 15 minutes, it triggers an admin workflow automatically."
              badge="Live"
            />
            <FeatureCard
              icon={<Shield className="w-8 h-8 text-purple-400" />}
              title="Compliance Guard"
              description="Daily 8 AM scans of every document. The system auto-suspends staff the moment a document expires. Zero risk."
              badge="Live"
            />
            <FeatureCard
              icon={<FileText className="w-8 h-8 text-green-400" />}
              title="One-Click Invoicing"
              description="Convert approved timesheets into professional invoice drafts instantly. Just review and hit send."
              badge="Live"
            />
            <FeatureCard
              icon={<MapPin className="w-8 h-8 text-red-400" />}
              title="GPS Verification"
              description="Geofenced clock-ins ensure staff are exactly where they need to be. Visual map snapshots eliminate disputes."
              badge="Live"
            />
            <FeatureCard
              icon={<Camera className="w-8 h-8 text-yellow-400" />}
              title="Instant OCR Timesheets"
              description="Staff snap a photo. AI extracts the data with 99% accuracy. You verify. Payroll done in seconds."
              badge="Live"
            />
            <FeatureCard
              icon={<MessageCircle className="w-8 h-8 text-pink-400" />}
              title="Smart Reminders"
              description="Automated nudges via WhatsApp & SMS drastically reduce no-shows and ensure timesheets are submitted on time."
              badge="Live"
            />
            <FeatureCard
              icon={<Brain className="w-8 h-8 text-blue-400" />}
              title="AI Staff Ranking"
              description="Don't just fill shifts. Fill them with the BEST. Our 'Moneyball' algo scores staff on reliability, distance, and burnout risk."
              badge="Beta"
            />
            <FeatureCard
              icon={<Sparkles className="w-8 h-8 text-amber-400" />}
              title="Chat-to-Book"
              description="Clients simply text 'Need a nurse for tonight'. Our AI parses the request, finds the staff, and fills the shift. Zero admin."
              badge="Beta"
            />
            <FeatureCard
              icon={<LayoutGrid className="w-8 h-8 text-indigo-400" />}
              title="Smart Marketplace"
              description="A tailor-made job board that ONLY shows shifts to eligible, compliant, and available staff. No more double-bookings."
              badge="Live"
            />
            <FeatureCard
              icon={<Bot className="w-8 h-8 text-cyan-400" />}
              title="AI Staff Assistant"
              description="Staff have questions? Our WhatsApp AI answers FAQs 24/7. Complex issues are routed to humans with full context."
              badge="Active"
            />
            <FeatureCard
              icon={<PhoneCall className="w-8 h-8 text-emerald-400" />}
              title="24/7 Voice Agent"
              description="Clients can call anytime. Our AI takes shift bookings over the phone, confirms details, and notifies your team instantly."
              badge="Live"
            />
          </div>
        </div>
      </section>

      {/* Comparison Section */}
      <section className="py-32 bg-white/5 border-y border-white/5">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <h2 className="text-3xl md:text-4xl font-bold">The Cost of &quot;Business as Usual&quot;</h2>
              <div className="space-y-6">
                <ComparisonItem
                  negative="Spending 4 hours/day calling staff"
                  positive="One-click broadcast to top available staff"
                />
                <ComparisonItem
                  negative="Missed compliance dates & CQC risk"
                  positive="Automated 30/14/7-day expiry reminders"
                />
                <ComparisonItem
                  negative="Manual invoice typing errors"
                  positive="Automated draft generation from timesheets"
                />
              </div>
              <button className="mt-8 text-blue-400 font-bold hover:text-blue-300 flex items-center gap-2">
                Read the Case Study <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-blue-500/10 blur-[80px] rounded-full" />
              <div className="relative bg-black/40 border border-white/10 rounded-2xl p-8 backdrop-blur-xl">
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <span className="text-gray-400">Metric</span>
                    <span className="text-gray-400">With ACG StaffLink</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Shift Fill Rate</span>
                    <span className="text-green-400 font-bold text-xl">98%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Admin Time</span>
                    <span className="text-green-400 font-bold text-xl">-80%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Compliance Violations</span>
                    <span className="text-green-400 font-bold text-xl">0</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-900/20 to-background" />
        <div className="container mx-auto px-6 relative text-center">
          <h2 className="text-4xl md:text-6xl font-bold mb-8">Ready to scale without stress?</h2>
          <p className="text-gray-400 text-xl mb-12 max-w-2xl mx-auto">Join the high-performance agencies using ACG StaffLink to dominate their local market.</p>
          <button className="px-10 py-5 bg-white text-black rounded-full font-bold text-xl hover:bg-gray-200 transition-colors shadow-xl shadow-white/5">
            Book Your Transformation
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12 bg-black/20">
        <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">
              <span className="font-bold text-white text-xs">A</span>
            </div>
            <span className="font-bold">ACG StaffLink</span>
          </div>
          <div className="flex gap-8 text-sm text-gray-400">
            <a href="#" className="hover:text-white">Privacy</a>
            <a href="#" className="hover:text-white">Terms</a>
            <a href="#" className="hover:text-white">Contact</a>
          </div>
          <div className="text-sm text-gray-500">
            © 2024 ACG StaffLink. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description, badge }: { icon: React.ReactNode, title: string, description: string, badge?: string }) {
  return (
    <div className="p-8 rounded-2xl bg-white/5 border border-white/5 hover:border-blue-500/30 transition-colors group relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="relative z-10">
        <div className="mb-6 inline-flex p-3 rounded-lg bg-gray-900/50 border border-white/10 group-hover:scale-110 transition-transform duration-300">
          {icon}
        </div>
        <h3 className="text-xl font-bold mb-3 flex items-center gap-3">
          {title}
          {badge && <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">{badge}</span>}
        </h3>
        <p className="text-gray-400 leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
}

function ComparisonItem({ negative, positive }: { negative: string, positive: string }) {
  return (
    <div className="grid grid-cols-[1fr,auto,1fr] items-center gap-4 text-sm md:text-base">
      <div className="text-gray-500 flex items-center gap-2 justify-end text-right">
        {negative} <X className="w-4 h-4 text-red-500/50" />
      </div>
      <div className="w-8 h-px bg-white/10" />
      <div className="text-white flex items-center gap-2">
        <CheckCircle className="w-4 h-4 text-green-400" /> {positive}
      </div>
    </div>
  );
}
