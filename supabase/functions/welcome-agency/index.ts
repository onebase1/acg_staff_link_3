import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * 🎉 WELCOME NEW AGENCY TO ACG STAFFLINK
 *
 * Professional onboarding email sent when agency signs up
 * Includes: Welcome message, next steps, support information
 */

serve(async (req) => {
    try {
        // Initialize Supabase client
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        // Auth check
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: 'Unauthorized' }),
                { status: 401, headers: { "Content-Type": "application/json" } }
            );
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return new Response(
                JSON.stringify({ error: 'Unauthorized' }),
                { status: 401, headers: { "Content-Type": "application/json" } }
            );
        }

        const { agency_id } = await req.json();

        if (!agency_id) {
            return new Response(
                JSON.stringify({ error: 'Missing required field: agency_id' }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        // Get agency details
        const { data: agency, error: agencyError } = await supabase
            .from("agencies")
            .select("*")
            .eq("id", agency_id)
            .single();

        if (agencyError || !agency) {
            return new Response(
                JSON.stringify({ error: 'Agency not found' }),
                { status: 404, headers: { "Content-Type": "application/json" } }
            );
        }

        // Get agency admin user
        const { data: adminUsers, error: usersError } = await supabase
            .from("users")
            .select("*")
            .eq("agency_id", agency_id)
            .eq("user_type", "agency_admin");

        const adminEmail = adminUsers && adminUsers[0]?.email || agency.contact_email;
        const adminName = adminUsers && adminUsers[0]?.full_name || agency.name;

        const welcomeEmail = `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 700px; margin: 0 auto; background: #ffffff;">
                <!-- Header with Gradient -->
                <div style="background: linear-gradient(135deg, #06b6d4 0%, #0284c7 100%, #0369a1 100%); padding: 50px 40px; text-align: center; position: relative;">
                    <div style="background: rgba(255,255,255,0.15); backdrop-filter: blur(10px); border-radius: 20px; padding: 30px; display: inline-block;">
                        <h1 style="color: white; margin: 0; font-size: 36px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                            🎉 Welcome to ACG StaffLink!
                        </h1>
                        <p style="color: rgba(255,255,255,0.95); margin: 15px 0 0 0; font-size: 18px; font-weight: 400;">
                            The UK's Leading Healthcare Staffing Platform
                        </p>
                    </div>
                </div>

                <!-- Main Body -->
                <div style="padding: 50px 40px; background: linear-gradient(180deg, #f9fafb 0%, #ffffff 100%);">
                    <p style="font-size: 18px; color: #1f2937; margin: 0 0 25px 0; line-height: 1.6;">
                        Dear ${adminName},
                    </p>

                    <p style="font-size: 16px; color: #374151; line-height: 1.8; margin: 0 0 25px 0;">
                        We're absolutely delighted to welcome <strong style="color: #0284c7;">${agency.name}</strong> to the ACG StaffLink family!
                        You've just gained access to the most powerful healthcare staffing management platform in the UK.
                    </p>

                    <p style="font-size: 16px; color: #374151; line-height: 1.8; margin: 0 0 35px 0;">
                        ACG StaffLink is trusted by leading healthcare providers to streamline operations, reduce administrative burden,
                        and deliver exceptional care through intelligent workforce management.
                    </p>

                    <!-- What You Can Do Now - Feature Cards -->
                    <div style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border-radius: 16px; padding: 30px; margin: 35px 0; border: 2px solid #bfdbfe;">
                        <h2 style="color: #1e40af; margin: 0 0 25px 0; font-size: 24px; font-weight: 600; text-align: center;">
                            🚀 Get Started in Minutes
                        </h2>

                        <div style="margin: 20px 0;">
                            <div style="background: white; border-left: 4px solid #3b82f6; padding: 20px; margin: 15px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                                <h3 style="color: #1e40af; margin: 0 0 12px 0; font-size: 18px; font-weight: 600;">
                                    1️⃣ Add Your Staff
                                </h3>
                                <p style="color: #1f2937; margin: 0; font-size: 15px; line-height: 1.6;">
                                    Invite your temporary healthcare workers to join your team. They'll receive professional onboarding emails
                                    and can set up their profiles instantly.
                                </p>
                            </div>

                            <div style="background: white; border-left: 4px solid #8b5cf6; padding: 20px; margin: 15px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                                <h3 style="color: #6d28d9; margin: 0 0 12px 0; font-size: 18px; font-weight: 600;">
                                    2️⃣ Connect Your Clients
                                </h3>
                                <p style="color: #1f2937; margin: 0; font-size: 15px; line-height: 1.6;">
                                    Add care homes, hospitals, and facilities you work with. Set up contract terms,
                                    rates, and preferences for seamless shift management.
                                </p>
                            </div>

                            <div style="background: white; border-left: 4px solid #10b981; padding: 20px; margin: 15px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                                <h3 style="color: #059669; margin: 0 0 12px 0; font-size: 18px; font-weight: 600;">
                                    3️⃣ Post Your First Shift
                                </h3>
                                <p style="color: #1f2937; margin: 0; font-size: 15px; line-height: 1.6;">
                                    Create shifts with smart AI-powered matching. Our system automatically finds the best-fit
                                    staff based on skills, availability, and location.
                                </p>
                            </div>

                            <div style="background: white; border-left: 4px solid #f59e0b; padding: 20px; margin: 15px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                                <h3 style="color: #d97706; margin: 0 0 12px 0; font-size: 18px; font-weight: 600;">
                                    4️⃣ Automate Everything
                                </h3>
                                <p style="color: #1f2937; margin: 0; font-size: 15px; line-height: 1.6;">
                                    From timesheets to invoicing, compliance tracking to payment reminders - ACG StaffLink
                                    handles it all automatically, saving you hours every day.
                                </p>
                            </div>
                        </div>
                    </div>

                    <!-- What Makes Us Different -->
                    <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 16px; padding: 30px; margin: 35px 0; border: 2px solid #fbbf24;">
                        <h2 style="color: #92400e; margin: 0 0 20px 0; font-size: 22px; font-weight: 600; text-align: center;">
                            💎 Why Healthcare Leaders Choose ACG
                        </h2>
                        <ul style="margin: 0; padding-left: 25px; color: #78350f; font-size: 15px; line-height: 2;">
                            <li><strong>Intelligent Automation:</strong> AI-powered shift matching, auto-invoicing, smart compliance tracking</li>
                            <li><strong>Real-Time GPS Verification:</strong> Know exactly when staff arrive and leave shifts</li>
                            <li><strong>CQC-Ready Compliance:</strong> Automated document expiry alerts and digital audit trails</li>
                            <li><strong>Multi-Channel Communication:</strong> Email, SMS, and WhatsApp notifications included</li>
                            <li><strong>Financial Intelligence:</strong> Automated invoicing, payment tracking, and profitability analytics</li>
                            <li><strong>24/7 Support:</strong> Our team is here whenever you need us</li>
                        </ul>
                    </div>

                    <!-- Account Details -->
                    <div style="background: #f3f4f6; border-radius: 12px; padding: 25px; margin: 35px 0;">
                        <h3 style="color: #1f2937; margin: 0 0 20px 0; font-size: 20px; font-weight: 600;">
                            📋 Your Account Details
                        </h3>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 10px 0; color: #6b7280; font-size: 14px; font-weight: 600;">Agency Name:</td>
                                <td style="padding: 10px 0; color: #1f2937; font-size: 14px; font-weight: 500;">${agency.name}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px 0; color: #6b7280; font-size: 14px; font-weight: 600;">Registration Number:</td>
                                <td style="padding: 10px 0; color: #1f2937; font-size: 14px; font-weight: 500;">${agency.registration_number || 'Not provided'}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px 0; color: #6b7280; font-size: 14px; font-weight: 600;">Subscription Tier:</td>
                                <td style="padding: 10px 0; color: #1f2937; font-size: 14px; font-weight: 500; text-transform: capitalize;">${agency.subscription_tier || 'Starter'}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px 0; color: #6b7280; font-size: 14px; font-weight: 600;">Account Status:</td>
                                <td style="padding: 10px 0; color: #059669; font-size: 14px; font-weight: 600;">✓ Active</td>
                            </tr>
                        </table>
                    </div>

                    <!-- Need Help Section -->
                    <div style="background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); border-radius: 12px; padding: 25px; margin: 35px 0; border-left: 4px solid #ef4444;">
                        <h3 style="color: #991b1b; margin: 0 0 15px 0; font-size: 20px; font-weight: 600;">
                            🆘 Need Help Getting Started?
                        </h3>
                        <p style="color: #7f1d1d; margin: 0 0 15px 0; font-size: 15px; line-height: 1.6;">
                            Our dedicated onboarding specialists are here to help you get the most out of ACG StaffLink.
                        </p>
                        <p style="color: #7f1d1d; margin: 0; font-size: 15px;">
                            <strong>📧 Email:</strong> support@acgstafflink.com<br>
                            <strong>📞 Phone:</strong> Available 24/7 for setup assistance<br>
                            <strong>💬 Live Chat:</strong> Available in your dashboard
                        </p>
                    </div>

                    <p style="font-size: 16px; color: #374151; line-height: 1.8; margin: 35px 0 25px 0;">
                        We're thrilled to have you on board and can't wait to see how ACG StaffLink transforms your operations.
                        Here's to streamlined workflows, happier staff, and exceptional patient care!
                    </p>
                </div>

                <!-- Footer -->
                <div style="background: #1f2937; padding: 40px 30px; text-align: center;">
                    <p style="color: #9ca3af; font-size: 16px; margin: 0 0 10px 0;">
                        Welcome aboard,
                    </p>
                    <p style="color: #ffffff; font-size: 20px; font-weight: 600; margin: 0 0 5px 0;">
                        The ACG StaffLink Team
                    </p>
                    <p style="color: #9ca3af; font-size: 14px; margin: 20px 0 30px 0;">
                        Transforming Healthcare Staffing, One Agency at a Time
                    </p>

                    <div style="border-top: 1px solid #374151; padding-top: 25px; margin-top: 30px;">
                        <p style="color: #6b7280; font-size: 12px; margin: 0 0 10px 0;">
                            📧 support@acgstafflink.com | 🌐 www.acgstafflink.com
                        </p>
                        <p style="color: #6b7280; font-size: 11px; margin: 0;">
                            © ${new Date().getFullYear()} ACG StaffLink. All rights reserved.<br>
                            Building the future of healthcare workforce management.
                        </p>
                    </div>
                </div>
            </div>
        `;

        // Send welcome email
        await supabase.functions.invoke('send-email', {
            body: {
                to: adminEmail,
                subject: `🎉 Welcome to ACG StaffLink - Let's Transform Your Agency!`,
                html: welcomeEmail,
                from_name: 'ACG StaffLink'
            }
        });

        console.log(`✅ Welcome email sent to ${agency.name} (${adminEmail})`);

        return new Response(
            JSON.stringify({
                success: true,
                message: 'Welcome email sent successfully',
                agency_name: agency.name,
                sent_to: adminEmail
            }),
            { headers: { "Content-Type": "application/json" } }
        );

    } catch (error) {
        console.error('❌ Welcome email error:', error);
        return new Response(
            JSON.stringify({
                success: false,
                error: error.message
            }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
});
