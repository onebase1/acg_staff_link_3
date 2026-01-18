# Instructions for WhatsApp Template Creation

Please create a new **Utility** template in the Meta Business Suite with the following specifications:

### 1. General Details
*   **Template Name**: `agency_digest`
*   **Category**: Utility
*   **Language**: English (UK)

### 2. Header (Optional)
*   **Type**: Text
*   **Text**: Daily Agency Digest

### 3. Body Text
Hi {{1}}, ☀️

Here is your agency summary for {{2}}:

📊 *Quick Stats*:
• Shifts Today: {{3}}
• Staff Utilization: {{4}}
• Pending Workflow: {{5}}

📍 *Key Updates & Schedule*:
{{6}}

Click below to manage your operations:

---
*Reply STOP to unsubscribe*

### 4. Buttons (Call to Action)
Create two "Visit Website" buttons:

1.  **Button 1 Label**: 📥 View Workflows
    *   **Type**: Static URL
    *   **URL**: `https://agilecaremanagement.co.uk/AdminWorkflows`
2.  **Button 2 Label**: 📊 Open Dashboard
    *   **Type**: Static URL
    *   **URL**: `https://agilecaremanagement.co.uk/Dashboard`

---

### Variable Mapping Guide (Use these as Sample Values):
*   `{{1}}`: `Admin` (Recipient Name)
*   `{{2}}`: `Sun 18 Jan` (Formatted Date)
*   `{{3}}`: `12` (Total Shifts Count)
*   `{{4}}`: `85%` (Staff Utilization with suffix)
*   `{{5}}`: `3` (Pending Workflows Count)
*   `{{6}}`: `• Critical Alert\n\nShift Schedule:\nRICHMOND COURT\n- Confirmed` (Combined alerts and schedule)

> [!IMPORTANT]
> When creating the template in Meta, ensure you provide **Sample Values** that look like the examples above. Meta uses these to verify your template category (Utility). If you don't include the `%` in the sample for `{{4}}`, they might reject it later when the n8n data includes it.
