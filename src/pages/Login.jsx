import React, { useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabaseAuth } from "@/api/supabaseAuth";
import { ensureUserProfile } from "@/api/profileService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

const VIEW = {
  SIGN_IN: "sign-in",
  SIGN_UP: "sign-up",
  FORGOT_PASSWORD: "forgot-password",
};

function SignInForm({ onSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberDevice, setRememberDevice] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      await supabaseAuth.signIn(email.trim(), password);
      if (!rememberDevice) {
        // Align with enterprise-grade security: clear session persistence if user opts out.
        localStorage.removeItem("supabase.auth.token");
      }
      toast.success("Welcome back 👋");
      onSuccess();
    } catch (error) {
      toast.error(error.message || "Unable to sign in");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="signin-email">Work email</Label>
        <Input
          id="signin-email"
          type="email"
          autoComplete="email"
          placeholder="you@guest-glow.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="signin-password">Password</Label>
        <Input
          id="signin-password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <label className="flex items-center gap-2">
          <Checkbox
            id="remember-me"
            checked={rememberDevice}
            onCheckedChange={(checked) => setRememberDevice(Boolean(checked))}
          />
          Remember this device
        </label>
        <button
          type="button"
          className="font-medium text-primary hover:underline"
          onClick={() => onSuccess(VIEW.FORGOT_PASSWORD)}
        >
          Forgot password?
        </button>
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Signing in..." : "Sign in"}
      </Button>
    </form>
  );
}

function SignUpForm({ onSuccess }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [accountType, setAccountType] = useState("agency_admin");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [agencyName, setAgencyName] = useState("");
  const [loading, setLoading] = useState(false);

  const passwordPolicy = useMemo(
    () => ({
      min: 10,
      pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).+$/,
    }),
    []
  );

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!acceptTerms) {
      toast.error("Please accept the Terms of Service and Data Processing Agreement.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    if (password.length < passwordPolicy.min || !passwordPolicy.pattern.test(password)) {
      toast.error(
        "Use at least 10 characters with upper, lower, number, and special characters for enterprise compliance."
      );
      return;
    }

    try {
      setLoading(true);
      const metadata = {
        full_name: fullName,
        phone,
        account_type: accountType,
        agency_name: agencyName,
      };

      const { user, session } = await supabaseAuth.signUp(email.trim(), password, metadata);

      if (user) {
        await ensureUserProfile({
          userId: user.id,
          email: user.email,
          fullName,
          phone,
          userType: accountType,
        });
      }

      if (session) {
        toast.success("Account created. Let’s complete your onboarding.");
        onSuccess();
      } else {
        toast.success(
          "Account request received. Check your inbox to verify your email and continue onboarding."
        );
        onSuccess(VIEW.SIGN_IN);
      }
    } catch (error) {
      toast.error(error.message || "Unable to create account right now.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="signup-full-name">Full name</Label>
          <Input
            id="signup-full-name"
            autoComplete="name"
            placeholder="Alex Morgan"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            required
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="signup-email">Work email</Label>
          <Input
            id="signup-email"
            type="email"
            autoComplete="email"
            placeholder="operations@guest-glow.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="signup-agency">Organisation / Agency</Label>
          <Input
            id="signup-agency"
            placeholder="Guest Glow Healthcare"
            value={agencyName}
            onChange={(event) => setAgencyName(event.target.value)}
          />
        </div>

        <div className="space-y-2 md:col-span-1">
          <Label htmlFor="signup-phone">Direct line</Label>
          <Input
            id="signup-phone"
            type="tel"
            autoComplete="tel"
            placeholder="+44 20 1234 5678"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="signup-password">Password</Label>
          <Input
            id="signup-password"
            type="password"
            autoComplete="new-password"
            placeholder="Create a strong password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="signup-confirm-password">Confirm password</Label>
          <Input
            id="signup-confirm-password"
            type="password"
            autoComplete="new-password"
            placeholder="Re-enter password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium text-muted-foreground">
          Role / Access level
        </Label>
        <RadioGroup
          value={accountType}
          onValueChange={(value) => setAccountType(value)}
          className="grid gap-3 md:grid-cols-3"
        >
          <label className="flex items-start gap-3 rounded-lg border bg-card p-3 text-sm shadow-sm hover:border-primary/60">
            <RadioGroupItem value="agency_admin" id="role-admin" className="mt-0.5" />
            <div>
              <div className="font-medium">Agency Admin</div>
              <p className="text-xs text-muted-foreground">Owns the tenant and manages teams.</p>
            </div>
          </label>
          <label className="flex items-start gap-3 rounded-lg border bg-card p-3 text-sm shadow-sm hover:border-primary/60">
            <RadioGroupItem value="staff_member" id="role-staff" className="mt-0.5" />
            <div>
              <div className="font-medium">Staff User</div>
              <p className="text-xs text-muted-foreground">Access to shift portal & compliance.</p>
            </div>
          </label>
          <label className="flex items-start gap-3 rounded-lg border bg-card p-3 text-sm shadow-sm hover:border-primary/60">
            <RadioGroupItem value="client_user" id="role-client" className="mt-0.5" />
            <div>
              <div className="font-medium">Client User</div>
              <p className="text-xs text-muted-foreground">Care home / client portal access.</p>
            </div>
          </label>
        </RadioGroup>
      </div>

      <div className="flex items-start gap-2 rounded-md bg-muted/30 p-3 text-xs text-muted-foreground">
        <Checkbox
          id="terms"
          checked={acceptTerms}
          onCheckedChange={(checked) => setAcceptTerms(Boolean(checked))}
        />
        <label htmlFor="terms" className="leading-relaxed">
          I agree to the{" "}
          <a href="https://guest-glow.com/terms" target="_blank" rel="noreferrer" className="font-medium text-primary hover:underline">
            Terms of Service
          </a>{" "}
          and{" "}
          <a href="https://guest-glow.com/privacy" target="_blank" rel="noreferrer" className="font-medium text-primary hover:underline">
            Data Processing Standards
          </a>.
        </label>
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Creating account..." : "Create enterprise account"}
      </Button>
    </form>
  );
}

function ForgotPasswordForm({ onSuccess }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      await supabaseAuth.requestPasswordReset(email.trim());
      toast.success("Reset instructions sent. Check your inbox.");
      onSuccess(VIEW.SIGN_IN);
    } catch (error) {
      toast.error(error.message || "Unable to start password reset.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="forgot-email">Work email</Label>
        <Input
          id="forgot-email"
          type="email"
          autoComplete="email"
          placeholder="operations@guest-glow.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </div>
      <p className="text-xs text-muted-foreground">
        We’ll send a secure one-time link. The link is valid for 15 minutes and can only be used once.
      </p>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Sending reset link..." : "Send reset link"}
      </Button>
    </form>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [view, setView] = useState(() => {
    const urlView = new URLSearchParams(location.search).get("view");
    if (urlView && Object.values(VIEW).includes(urlView)) {
      return urlView;
    }
    return VIEW.SIGN_IN;
  });

  const next = new URLSearchParams(location.search).get("next");

  const handleAuthSuccess = (overrideView) => {
    if (overrideView) {
      setView(overrideView);
      return;
    }

    if (next) {
      navigate(next, { replace: true });
    } else {
      navigate("/Dashboard");
    }
  };

  const onTabChange = (value) => {
    setView(value);
    const params = new URLSearchParams(location.search);
    params.set("view", value);
    navigate(`${location.pathname}?${params.toString()}`, { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col lg:flex-row">
        <aside className="relative flex w-full flex-col justify-between bg-gradient-to-br from-cyan-500 via-blue-600 to-slate-900 px-10 py-12 text-slate-50 lg:w-1/2">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.2),_transparent_55%)]" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 text-sm font-semibold uppercase tracking-widest text-white/90">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 border border-white/20">
                ACG
              </div>
              Agile Care Management
            </div>
            <h1 className="mt-10 text-3xl font-semibold leading-tight md:text-4xl">
              Enterprise-grade workforce orchestration for multi-tenant care teams.
            </h1>
            <p className="mt-6 max-w-xl text-base text-white/80">
              Unified staffing, compliance, finance, and communications—powered by Supabase and AI-driven automations.
              Seamless SSO-ready architecture aligned with NHS DSPT and ISO 27001 best practices.
            </p>
          </div>
          <div className="relative z-10 mt-12 grid gap-6 text-sm text-white/85">
            <div className="rounded-xl border border-white/15 bg-white/10 p-4 shadow-lg backdrop-blur">
              <h3 className="font-semibold">Operational command hub</h3>
              <p className="mt-2 text-white/70">
                Real-time shift orchestration, anomaly detection, and automated timesheet pipelines.
              </p>
            </div>
            <div className="rounded-xl border border-white/15 bg-white/10 p-4 shadow-lg backdrop-blur">
              <h3 className="font-semibold">Financial guardrails</h3>
              <p className="mt-2 text-white/70">
                Automated invoice generation, dispute management, BI-grade reporting, and audited change logs.
              </p>
            </div>
            <div className="rounded-xl border border-white/15 bg-white/10 p-4 shadow-lg backdrop-blur">
              <h3 className="font-semibold">Compliance by design</h3>
              <p className="mt-2 text-white/70">
                Enforced RBAC, full audit trails, secure file storage, and policy-driven onboarding workflows.
              </p>
            </div>
          </div>
          <div className="relative z-10 mt-10 text-xs text-white/60">
            Need a bespoke deployment or SSO handshake?{" "}
            <a
              href="mailto:enterprise@guest-glow.com"
              className="font-medium text-white hover:underline"
            >
              enterprise@guest-glow.com
            </a>
          </div>
        </aside>

        <main className="flex w-full items-center justify-center bg-slate-50 px-6 py-12 text-slate-900 lg:w-1/2">
          <Card className="w-full max-w-lg border-slate-200 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-2xl font-semibold">
                {view === VIEW.SIGN_IN && "Sign in to ACG StaffLink"}
                {view === VIEW.SIGN_UP && "Create your ACG StaffLink tenant"}
                {view === VIEW.FORGOT_PASSWORD && "Reset your password"}
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                {view === VIEW.SIGN_IN &&
                  "Secure access for super admins, agency teams, and staff portals."}
                {view === VIEW.SIGN_UP &&
                  "Provision a new workspace or request access to an existing agency."}
                {view === VIEW.FORGOT_PASSWORD &&
                  "We will send a single-use recovery link to your verified email."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Tabs value={view} onValueChange={onTabChange} className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value={VIEW.SIGN_IN}>Sign in</TabsTrigger>
                  <TabsTrigger value={VIEW.SIGN_UP}>Sign up</TabsTrigger>
                  <TabsTrigger value={VIEW.FORGOT_PASSWORD}>Forgot</TabsTrigger>
                </TabsList>

                <TabsContent value={VIEW.SIGN_IN} className="pt-6">
                  <SignInForm
                    onSuccess={(nextView) => {
                      if (nextView) {
                        setView(nextView);
                        return;
                      }
                      handleAuthSuccess();
                    }}
                  />
                </TabsContent>

                <TabsContent value={VIEW.SIGN_UP} className="pt-6">
                  <SignUpForm
                    onSuccess={(nextView) => {
                      if (nextView) {
                        setView(nextView);
                        return;
                      }
                      handleAuthSuccess();
                    }}
                  />
                </TabsContent>

                <TabsContent value={VIEW.FORGOT_PASSWORD} className="pt-6">
                  <ForgotPasswordForm
                    onSuccess={(nextView) => {
                      if (nextView) {
                        setView(nextView);
                        return;
                      }
                      setView(VIEW.SIGN_IN);
                    }}
                  />
                </TabsContent>
              </Tabs>

              <Separator />

              <div className="flex flex-col gap-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Platform uptime (rolling 90-day): 99.982%
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-blue-500" />
                  ISO 27001-aligned controls · AES-256 encrypted storage · Supabase Row Level Security
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}

