const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const FROM_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER;
const TO_NUMBER = process.env.TEST_WHATSAPP_TO || process.env.TWILIO_WHATSAPP_NUMBER;

if (!ACCOUNT_SID || !AUTH_TOKEN || !FROM_NUMBER || !TO_NUMBER) {
  console.error(
    "Missing WhatsApp configuration. Ensure TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER and TEST_WHATSAPP_TO are set."
  );
  process.exit(1);
}

const params = new URLSearchParams();
params.set("To", TO_NUMBER.startsWith("whatsapp:") ? TO_NUMBER : `whatsapp:${TO_NUMBER.replace(/^whatsapp:/, "")}`);
params.set("From", FROM_NUMBER);
params.set("Body", `ACG StaffLink WhatsApp test at ${new Date().toISOString()}`);

const response = await fetch(
  `https://api.twilio.com/2010-04-01/Accounts/${ACCOUNT_SID}/Messages.json`,
  {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(
        `${ACCOUNT_SID}:${AUTH_TOKEN}`
      ).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  }
);

if (!response.ok) {
  const text = await response.text();
  console.error("Twilio WhatsApp error:", response.status, text);
  process.exit(1);
}

const data = await response.json();
console.log("Twilio WhatsApp message queued:", data.sid);

