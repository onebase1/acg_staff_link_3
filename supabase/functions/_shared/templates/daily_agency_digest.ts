export const daily_agency_digest = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Daily Digest - {{agencyName}}</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background-color: #f5f5f5;
            color: #333;
        }
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
        }
        .header {
            background: linear-gradient(135deg, {{primaryColor}} 0%, {{secondaryColor}} 100%);
            color: white;
            padding: 30px 20px;
            text-align: center;
        }
        .header h1 {
            margin: 0 0 10px 0;
            font-size: 24px;
            font-weight: 600;
        }
        .header p {
            margin: 0;
            font-size: 14px;
            opacity: 0.9;
        }
        .content {
            padding: 30px 20px;
        }
        .stat-cards {
            display: table;
            width: 100%;
            margin-bottom: 30px;
        }
        .stat-card {
            display: table-cell;
            width: 33.33%;
            text-align: center;
            padding: 15px;
            background-color: #f8f9fa;
            border-radius: 8px;
        }
        .stat-card + .stat-card {
            padding-left: 10px;
        }
        .stat-number {
            font-size: 32px;
            font-weight: 700;
            color: {{primaryColor}};
            display: block;
            margin-bottom: 5px;
        }
        .stat-label {
            font-size: 12px;
            color: #6c757d;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .section {
            margin-bottom: 30px;
        }
        .section-title {
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 15px;
            color: #1a1a1a;
            border-bottom: 2px solid {{primaryColor}};
            padding-bottom: 8px;
        }
        .client-block {
            background-color: #f8f9fa;
            border-left: 4px solid {{primaryColor}};
            padding: 15px;
            margin-bottom: 15px;
            border-radius: 4px;
        }
        .client-name {
            font-size: 16px;
            font-weight: 600;
            color: #1a1a1a;
            margin-bottom: 10px;
        }
        .shift-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
        }
        .shift-table th {
            text-align: left;
            font-size: 11px;
            text-transform: uppercase;
            color: #6c757d;
            padding: 8px 5px;
            border-bottom: 1px solid #dee2e6;
        }
        .shift-table td {
            padding: 10px 5px;
            font-size: 14px;
            border-bottom: 1px solid #f1f3f5;
        }
        .shift-table tr:last-child td {
            border-bottom: none;
        }
        .status-badge {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
        }
        .status-confirmed {
            background-color: #d4edda;
            color: #155724;
        }
        .status-pending {
            background-color: #fff3cd;
            color: #856404;
        }
        .status-open {
            background-color: #f8d7da;
            color: #721c24;
        }
        .alert-box {
            background-color: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin-bottom: 15px;
            border-radius: 4px;
        }
        .alert-box.critical {
            background-color: #f8d7da;
            border-left-color: #dc3545;
        }
        .alert-icon {
            font-size: 18px;
            margin-right: 8px;
        }
        .alert-title {
            font-weight: 600;
            margin-bottom: 8px;
            font-size: 14px;
        }
        .alert-list {
            margin: 0;
            padding-left: 20px;
            font-size: 13px;
            color: #495057;
        }
        .alert-list li {
            margin-bottom: 5px;
        }
        .cta-container {
            text-align: center;
            margin: 30px 0;
        }
        .cta-button {
            display: inline-block;
            padding: 12px 30px;
            background-color: {{primaryColor}};
            color: white;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            margin: 0 5px;
            font-size: 14px;
        }
        .cta-button.secondary {
            background-color: #6c757d;
        }
        .footer {
            background-color: #f8f9fa;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #6c757d;
        }
        .footer a {
            color: {{primaryColor}};
            text-decoration: none;
        }
        @media only screen and (max-width: 600px) {
            .stat-card {
                display: block;
                width: 100%;
                margin-bottom: 10px;
            }
            .stat-card + .stat-card {
                padding-left: 15px;
            }
            .cta-button {
                display: block;
                margin: 10px 0;
            }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <!-- Header -->
        <div class="header">
            <h1>Good Morning!</h1>
            <p>Daily Digest for {{agencyName}} - {{reportDate}}</p>
        </div>

        <!-- Content -->
        <div class="content">
            <!-- Quick Stats -->
            <div class="stat-cards">
                <div class="stat-card">
                    <span class="stat-number">{{totalShifts}}</span>
                    <span class="stat-label">Shifts Today</span>
                </div>
                <div class="stat-card">
                    <span class="stat-number">{{staffUtilization}}%</span>
                    <span class="stat-label">Staff Utilization</span>
                </div>
                <div class="stat-card">
                    <span class="stat-number">{{notificationsSent}}</span>
                    <span class="stat-label">Notifications Sent</span>
                </div>
            </div>

            <!-- Action Items -->
            {{#if hasAlerts}}
            <div class="section">
                <div class="section-title"> Action Items</div>

                {{#if criticalAlerts}}
                <div class="alert-box critical">
                    <div class="alert-title"><span class="alert-icon"></span>Urgent</div>
                    <ul class="alert-list">
                        {{#each criticalAlerts}}
                        <li>{{this}}</li>
                        {{/each}}
                    </ul>
                </div>
                {{/if}}

                {{#if warningAlerts}}
                <div class="alert-box">
                    <div class="alert-title"><span class="alert-icon"></span>Needs Attention</div>
                    <ul class="alert-list">
                        {{#each warningAlerts}}
                        <li>{{this}}</li>
                        {{/each}}
                    </ul>
                </div>
                {{/if}}
            </div>
            {{/if}}

            <!-- Today's Shifts by Client -->
            <div class="section">
                <div class="section-title"> Today's Shifts</div>

                {{#each clients}}
                <div class="client-block">
                    <div class="client-name">{{name}}</div>
                    <table class="shift-table">
                        <thead>
                            <tr>
                                <th>Time</th>
                                <th>Role</th>
                                <th>Staff</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {{#each shifts}}
                            <tr>
                                <td>{{startTime}} - {{endTime}}</td>
                                <td>{{role}}</td>
                                <td>{{staffName}}</td>
                                <td><span class="status-badge status-{{status}}">{{status}}</span></td>
                            </tr>
                            {{/each}}
                        </tbody>
                    </table>
                </div>
                {{/each}}
            </div>

            <!-- Pending Timesheets -->
            {{#if pendingTimesheets}}
            <div class="section">
                <div class="section-title"> Pending Timesheets (Yesterday)</div>
                <table class="shift-table">
                    <thead>
                        <tr>
                            <th>Client</th>
                            <th>Staff</th>
                            <th>Shift</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {{#each pendingTimesheets}}
                        <tr>
                            <td>{{clientName}}</td>
                            <td>{{staffName}}</td>
                            <td>{{shiftDate}} {{shiftTime}}</td>
                            <td><a href="{{approvalLink}}" style="color: {{primaryColor}};">Review →</a></td>
                        </tr>
                        {{/each}}
                    </tbody>
                </table>
            </div>
            {{/if}}

            <!-- Call to Action -->
            <div class="cta-container">
                <a href="{{dashboardUrl}}" class="cta-button">View Full Dashboard</a>
                <a href="{{approveTimesheetsUrl}}" class="cta-button secondary">Approve Timesheets</a>
            </div>
        </div>

        <!-- Footer -->
        <div class="footer">
            <p><strong>{{agencyName}}</strong></p>
            <p>{{agencyPhone}} | {{agencyEmail}}</p>
            <p style="margin-top: 15px;">
                <a href="{{preferencesUrl}}">Email Preferences</a> |
                <a href="{{supportUrl}}">Support</a>
            </p>
            <p style="margin-top: 10px; color: #adb5bd; font-size: 11px;">
                Powered by ACG StaffLink
            </p>
        </div>
    </div>
</body>
</html>
`;
