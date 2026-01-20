export const daily_agency_digest = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Daily Digest - {{agencyName}}</title>
    <style>
        :root {
            --primary: {{primaryColor}};
            --secondary: {{secondaryColor}};
            --bg: #f8fafc;
            --card-bg: #ffffff;
            --text-main: #1e293b;
            --text-muted: #64748b;
            --success: #10b981;
            --warning: #f59e0b;
            --danger: #ef4444;
        }
        body {
            margin: 0;
            padding: 0;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background-color: var(--bg);
            color: var(--text-main);
            line-height: 1.5;
        }
        .wrapper {
            width: 100%;
            table-layout: fixed;
            background-color: var(--bg);
            padding: 40px 0;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: var(--card-bg);
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        }
        .header {
            background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
            padding: 40px 30px;
            text-align: center;
            color: white;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 800;
            letter-spacing: -0.025em;
        }
        .header p {
            margin: 8px 0 0;
            font-size: 16px;
            opacity: 0.9;
            font-weight: 500;
        }
        .content {
            padding: 40px 30px;
        }
        .grid {
            display: table;
            width: 100%;
            border-spacing: 12px 0;
            margin: 0 -12px 30px;
        }
        .grid-item {
            display: table-cell;
            width: 33.33%;
            background: #fff;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 20px 10px;
            text-align: center;
        }
        .grid-value {
            display: block;
            font-size: 24px;
            font-weight: 700;
            color: var(--primary);
        }
        .grid-label {
            display: block;
            font-size: 12px;
            font-weight: 600;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-top: 4px;
        }
        .section-title {
            font-size: 14px;
            font-weight: 700;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 0.1em;
            margin-bottom: 16px;
            display: flex;
            align-items: center;
        }
        .section-title::after {
            content: "";
            flex: 1;
            height: 1px;
            background: #e2e8f0;
            margin-left: 12px;
        }
        .alert-card {
            padding: 16px;
            border-radius: 12px;
            margin-bottom: 12px;
            border-left: 4px solid;
        }
        .alert-card.critical {
            background-color: #fef2f2;
            border-left-color: var(--danger);
            color: #991b1b;
        }
        .alert-card.warning {
            background-color: #fffbeb;
            border-left-color: var(--warning);
            color: #92400e;
        }
        .alert-list {
            margin: 8px 0 0;
            padding-left: 20px;
            font-size: 14px;
        }
        .client-card {
            background: #f8fafc;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 16px;
        }
        .client-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
        }
        .client-name {
            font-size: 16px;
            font-weight: 700;
        }
        .shift-table {
            width: 100%;
            border-collapse: collapse;
        }
        .shift-table td {
            padding: 10px 0;
            font-size: 13px;
            border-bottom: 1px solid #e2e8f0;
        }
        .shift-table tr:last-child td {
            border-bottom: none;
        }
        .badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 9999px;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
        }
        .badge-confirmed { background: #d1fae5; color: #065f46; }
        .badge-pending { background: #fef3c7; color: #92400e; }
        .badge-open { background: #fee2e2; color: #991b1b; }
        
        .cta-section {
            text-align: center;
            padding: 40px 30px;
            background: #f1f5f9;
        }
        .btn {
            display: inline-block;
            padding: 14px 32px;
            background-color: var(--primary);
            color: white;
            text-decoration: none;
            border-radius: 10px;
            font-weight: 600;
            font-size: 15px;
            transition: all 0.2s;
        }
        .btn-secondary {
            background-color: white;
            color: var(--text-main);
            border: 1px solid #e2e8f0;
            margin-left: 12px;
        }
        .footer {
            padding: 40px 30px;
            text-align: center;
            font-size: 13px;
            color: var(--text-muted);
        }
        .footer a { color: var(--primary); text-decoration: none; font-weight: 500; }
        
        @media (max-width: 600px) {
            .grid-item { display: block; width: auto; margin: 0 12px 12px; }
            .btn { display: block; width: auto; margin: 10px 0; }
            .btn-secondary { margin-left: 0; }
        }
    </style>
</head>
<body>
    <div class="wrapper">
        <div class="container">
            <div class="header">
                <h1>Daily Agency Digest</h1>
                <p>{{agencyName}} • {{reportDate}}</p>
            </div>
            
            <div class="content">
                <div class="grid">
                    <div class="grid-item">
                        <span class="grid-value">{{totalShifts}}</span>
                        <span class="grid-label">Shifts Today</span>
                    </div>
                    <div class="grid-item">
                        <span class="grid-value">{{staffUtilization}}%</span>
                        <span class="grid-label">Utilization</span>
                    </div>
                    <div class="grid-item">
                        <span class="grid-value">{{notificationsSent}}</span>
                        <span class="grid-label">Alerts Sent</span>
                    </div>
                </div>

                {{#if hasAlerts}}
                <div class="section-title">Action Required</div>
                {{#if criticalAlerts}}
                <div class="alert-card critical">
                    <strong>Critical Issues</strong>
                    <ul class="alert-list">
                        {{#each criticalAlerts}}<li>{{this.message}}</li>{{/each}}
                    </ul>
                </div>
                {{/if}}
                {{#if warningAlerts}}
                <div class="alert-card warning">
                    <strong>Attention Needed</strong>
                    <ul class="alert-list">
                        {{#each warningAlerts}}<li>{{this.message}}</li>{{/each}}
                    </ul>
                </div>
                {{/if}}
                {{/if}}

                <div style="margin-top: 40px;"></div>
                <div class="section-title">Today's Schedule</div>
                {{#each clients}}
                <div class="client-card">
                    <div class="client-name">{{name}}</div>
                    <table class="shift-table">
                        {{#each shifts}}
                        <tr>
                            <td style="width: 35%;">{{startTime}} - {{endTime}}</td>
                            <td style="width: 40%;"><strong>{{staffName}}</strong><br/><span style="color:var(--text-muted)">{{role}}</span></td>
                            <td style="text-align: right;"><span class="badge badge-{{status}}">{{status}}</span></td>
                        </tr>
                        {{/each}}
                    </table>
                </div>
                {{/each}}

                {{#if pendingTimesheets}}
                <div style="margin-top: 40px;"></div>
                <div class="section-title">Pending Approvals</div>
                <div class="client-card" style="padding: 0 20px;">
                    <table class="shift-table">
                        {{#each pendingTimesheets}}
                        <tr>
                            <td>{{clientName}}<br/><span style="color:var(--text-muted)">{{staffName}}</span></td>
                            <td style="text-align: right;"><a href="{{approvalLink}}" style="color:var(--primary); font-weight:600;">Approve →</a></td>
                        </tr>
                        {{/each}}
                    </table>
                </div>
                {{/if}}
            </div>

            <div class="cta-section">
                <a href="{{dashboardUrl}}" class="btn">Open Admin Dashboard</a>
                <a href="{{approveTimesheetsUrl}}" class="btn btn-secondary">Review Timesheets</a>
            </div>

            <div class="footer">
                <p><strong>{{agencyName}}</strong></p>
                <p>{{agencyPhone}} • {{agencyEmail}}</p>
                <p style="margin-top: 20px;">
                    <a href="{{preferencesUrl}}">Email Preferences</a> • 
                    <a href="{{supportUrl}}">Help Center</a>
                </p>
                <p style="margin-top: 20px; opacity: 0.5; font-size: 11px;">
                    Powered by ACG StaffLink
                </p>
            </div>
        </div>
    </div>
</body>
</html>
`;
