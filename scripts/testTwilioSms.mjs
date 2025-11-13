const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const FROM_NUMBER =
  process.env.TWILIO_PHONE_NUMBER || process.env.TWILIO_MESSAGING_SERVICE_SID;
const TO_NUMBER = process.env.TEST_SMS_TO || process.env.TWILIO_PHONE_NUMBER;

if (!ACCOUNT_SID || !AUTH_TOKEN || !FROM_NUMBER || !TO_NUMBER) {
  console.error(
    "Missing Twilio configuration. Ensure TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER (or messaging SID) and TEST_SMS_TO are set."
  );
  process.exit(1);
}

const params = new URLSearchParams();
params.set("To", TO_NUMBER);
params.set("Body", `ACG StaffLink SMS test at ${new Date().toISOString()}`);

if (process.env.TWILIO_MESSAGING_SERVICE_SID) {
  params.set("MessagingServiceSid", process.env.TWILIO_MESSAGING_SERVICE_SID);
} else {
  params.set("From", process.env.TWILIO_PHONE_NUMBER);
}

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
  console.error("Twilio SMS error:", response.status, text);
  process.exit(1);
}

const data = await response.json();
console.log("Twilio SMS message queued:", data.sid);

