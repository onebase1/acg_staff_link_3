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

Here is your summary for {{2}}:

📊 **Quick Stats**:
• Shifts Today: {{3}}
• Staff Utilization: {{4}}%
• Pending Workflows: {{5}}

⚠️ **Urgent Actions**:
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

### Variable Mapping Guide (for n8n mapping later):
*   `{{1}}`: Recipient First Name
*   `{{2}}`: Date (e.g., Sat, 17 Jan)
*   `{{3}}`: Total Shifts Count
*   `{{4}}`: Staff Utilization %
*   `{{5}}`: Pending Workflows Count
*   `{{6}}`: Formatted list of top alerts
