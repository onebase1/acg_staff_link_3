const RESEND_API_KEY = process.env.RESEND_API_KEY;

if (!RESEND_API_KEY) {
  console.error("Missing RESEND_API_KEY in environment.");
  process.exit(1);
}

const toEmail = process.env.TEST_EMAIL || "g.basera@yahoo.com";
const fromEmail =
  process.env.RESEND_DEFAULT_FROM || "noreply@agilecaremanagement.co.uk";

const payload = {
  from: fromEmail,
  to: [toEmail],
  subject: "ACG StaffLink invite test (resend)",
  html: `<p>This is a test email from the Supabase migration harness confirming Resend credentials are working at ${new Date().toISOString()}.</p>`,
};

const response = await fetch("https://api.resend.com/emails", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${RESEND_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(payload),
});

if (!response.ok) {
  const text = await response.text();
  console.error("Resend API error:", response.status, text);
  process.exit(1);
}

const data = await response.json();
console.log("Resend test email enqueued:", data.id ?? data);

