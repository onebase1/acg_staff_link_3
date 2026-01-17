import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function debugWhatsApp() {
    console.log("📡 Debugging send-whatsapp function...");

    const payload = {
        to: "+447557679989",
        message: "🧪 ACG StaffLink - WhatsApp Debug Test",
    };

    const { data, error } = await supabase.functions.invoke("send-whatsapp", {
        body: payload
    });

    if (error) {
        console.log("❌ RAW ERROR:", JSON.stringify(error, null, 2));
        // Check for message in the error body if its a function error
        try {
            const errText = await error.context.text();
            console.log("❌ ERROR BODY:", errText);
        } catch (e) { }
    } else {
        console.log("✅ RAW DATA:", JSON.stringify(data, null, 2));
    }
}

debugWhatsApp();
