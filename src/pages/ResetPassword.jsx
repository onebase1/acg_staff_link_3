import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/api/supabaseClient";
import { supabaseAuth } from "@/api/supabaseAuth";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [verifying, setVerifying] = useState(true);
  const [tokenError, setTokenError] = useState(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const verifyToken = async () => {
      try {
        const hash = window.location.hash.substring(1);

        if (hash) {
          const params = new URLSearchParams(hash);
          const accessToken = params.get("access_token");
          const refreshToken = params.get("refresh_token");

          if (accessToken && refreshToken) {
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (error) {
              setTokenError(error.message);
              setVerifying(false);
              return;
            }

            // clean up URL hash to avoid leaking tokens
            window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
          }
        }

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !session) {
          setTokenError("Reset link expired or already used. Please request a new link.");
        }
      } catch (error) {
        setTokenError(error.message);
      } finally {
        setVerifying(false);
      }
    };

    verifyToken();
  }, []);

  const handleReset = async (event) => {
    event.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    if (password.length < 10) {
      toast.error("Password must be at least 10 characters for enterprise compliance.");
      return;
    }

    try {
      setLoading(true);
      await supabaseAuth.updatePassword(password);
      setSuccess(true);
      toast.success("Password updated. Sign in with your new credentials.");
      setTimeout(() => navigate("/login"), 1200);
    } catch (error) {
      toast.error(error.message || "Unable to update password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto flex min-h-screen max-w-4xl items-center justify-center px-4">
        <Card className="w-full max-w-xl border-slate-200 bg-slate-50 text-slate-900 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold">Secure password reset</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Complete the reset process to regain access. Links expire for security reasons—request another if needed.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {verifying && (
              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-100 p-4 text-sm text-muted-foreground">
                Verifying reset link…
              </div>
            )}

            {!verifying && tokenError && (
              <div className="space-y-4">
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {tokenError}
                </div>
                <Button variant="outline" onClick={() => navigate("/login")}>
                  Return to sign in
                </Button>
              </div>
            )}

            {!verifying && !tokenError && (
              <>
                <form onSubmit={handleReset} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="new-password">New password</Label>
                    <Input
                      id="new-password"
                      type="password"
                      autoComplete="new-password"
                      placeholder="Create a strong password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm-new-password">Confirm password</Label>
                    <Input
                      id="confirm-new-password"
                      type="password"
                      autoComplete="new-password"
                      placeholder="Re-enter your password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      required
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Updating…" : "Update password"}
                  </Button>
                </form>

                {success && (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                    Password updated successfully. Redirecting you to sign in…
                  </div>
                )}
              </>
            )}

            <Separator />

            <div className="text-xs text-muted-foreground">
              Need help? Contact{" "}
              <a href="mailto:support@guest-glow.com" className="font-medium text-primary hover:underline">
                support@guest-glow.com
              </a>{" "}
              for a manual reset.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}



