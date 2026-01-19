/**
 * Email Templates for Dreambox Deluxe Application
 * User & Authentication Templates Only
 */

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export interface EmailTemplateData {
  [key: string]: string | number | boolean;
}

/**
 * Generate email template with variable substitution
 * Variables in template should be wrapped in {{variable}}
 */
export const substituteVariables = (template: string, data: EmailTemplateData): string => {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return String(data[key] || match);
  });
};

// ============================================================================
// USER & AUTHENTICATION EMAILS
// ============================================================================

/**
 * Welcome Email Template
 * Sent when a new user account is created
 */
export const welcomeEmailTemplate = (data: { firstName: string; email: string; loginUrl: string; username: string }): EmailTemplate => ({
  subject: 'Welcome to Dreambox Deluxe',
  text: `
Hello {{firstName}},

Welcome to Dreambox Deluxe! Your account has been successfully created.

Account Details:
- Email: {{email}}
- Username: {{username}}

You can now log in here: {{loginUrl}}

If you have any questions, please don't hesitate to contact our support team.

Best regards,
Dreambox Deluxe Team
  `.trim(),
  html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; background-color: #f5f5f5; }
    .container { background-color: white; max-width: 600px; margin: 20px auto; padding: 30px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .header { color: #2c3e50; font-size: 24px; font-weight: bold; margin-bottom: 20px; }
    .content { color: #555; line-height: 1.6; margin-bottom: 20px; }
    .credentials { background-color: #f8f9fa; padding: 15px; border-left: 4px solid #3498db; margin: 20px 0; }
    .credentials p { margin: 8px 0; color: #2c3e50; }
    .button { background-color: #3498db; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 20px 0; }
    .footer { color: #999; font-size: 12px; border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">Welcome to Dreambox Deluxe!</div>
    <div class="content">
      <p>Hello {{firstName}},</p>
      <p>Your account has been successfully created. You're now ready to access all features of Dreambox Deluxe.</p>
    </div>
    <div class="credentials">
      <p><strong>Account Details:</strong></p>
      <p>Email: {{email}}</p>
      <p>Username: {{username}}</p>
    </div>
    <p><a href="{{loginUrl}}" class="button">Log In Now</a></p>
    <div class="footer">
      <p>If you have any questions, contact our support team.</p>
      <p>© 2026 Dreambox Deluxe. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `.trim()
});

/**
 * Account Approval Email Template
 * Sent when a user account has been approved by an admin
 */
export const accountApprovalTemplate = (data: { firstName: string; email: string; role: string; loginUrl: string }): EmailTemplate => ({
  subject: 'Your Dreambox Account Has Been Approved',
  text: `
Hello {{firstName}},

Great news! Your Dreambox Deluxe account has been approved.

Account Status: Active
Role: {{role}}

You can now log in here: {{loginUrl}}

Thank you for joining our platform!

Best regards,
Dreambox Deluxe Admin
  `.trim(),
  html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; background-color: #f5f5f5; }
    .container { background-color: white; max-width: 600px; margin: 20px auto; padding: 30px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .header { color: #27ae60; font-size: 24px; font-weight: bold; margin-bottom: 20px; }
    .success-badge { background-color: #d4edda; color: #155724; padding: 10px 15px; border-radius: 4px; margin: 15px 0; display: inline-block; }
    .button { background-color: #27ae60; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 20px 0; }
    .footer { color: #999; font-size: 12px; border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">Account Approved! ✓</div>
    <div class="success-badge">Your account is now active</div>
    <p>Hello {{firstName}},</p>
    <p>We're pleased to inform you that your Dreambox Deluxe account has been approved.</p>
    <p><strong>Role:</strong> {{role}}</p>
    <p><a href="{{loginUrl}}" class="button">Access Your Account</a></p>
    <div class="footer">
      <p>© 2026 Dreambox Deluxe. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `.trim()
});

/**
 * Password Reset Email Template
 * Sent when a user requests to reset their password
 */
export const passwordResetTemplate = (data: { firstName: string; resetUrl: string; expiryMinutes: number }): EmailTemplate => ({
  subject: 'Reset Your Dreambox Password',
  text: `
Hello {{firstName}},

You requested to reset your password. Click the link below to create a new password:

{{resetUrl}}

This link will expire in {{expiryMinutes}} minutes.

If you didn't request this, you can safely ignore this email.

Best regards,
Dreambox Deluxe Team
  `.trim(),
  html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; background-color: #f5f5f5; }
    .container { background-color: white; max-width: 600px; margin: 20px auto; padding: 30px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .warning { background-color: #fff3cd; color: #856404; padding: 12px; border-radius: 4px; margin: 15px 0; }
    .button { background-color: #e74c3c; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 20px 0; }
    .footer { color: #999; font-size: 12px; border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <h2>Password Reset Request</h2>
    <p>Hello {{firstName}},</p>
    <p>You requested to reset your password. Click the button below:</p>
    <p><a href="{{resetUrl}}" class="button">Reset Password</a></p>
    <div class="warning">
      <strong>⏱️ Link expires in {{expiryMinutes}} minutes</strong>
    </div>
    <p>If you didn't request this reset, you can safely ignore this email.</p>
    <div class="footer">
      <p>© 2026 Dreambox Deluxe. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `.trim()
});

// ============================================================================
// UTILITY FUNCTION FOR SENDING EMAILS
// ============================================================================

/**
 * Helper function to send emails
 * Integrate with your backend email service (Supabase, SendGrid, etc.)
 */
export const sendEmail = async (
  to: string,
  template: EmailTemplate,
  data: EmailTemplateData,
  options?: {
    cc?: string[];
    bcc?: string[];
    replyTo?: string;
  }
): Promise<{ success: boolean; messageId?: string; error?: string }> => {
  try {
    // Substitute variables in subject and HTML
    const subject = substituteVariables(template.subject, data);
    const html = substituteVariables(template.html, data);
    const text = substituteVariables(template.text, data);

    // TODO: Integrate with your email service
    // Example: SendGrid, AWS SES, Supabase, etc.
    
    console.log('Email prepared:', { to, subject, html, text });

    // Placeholder implementation
    return {
      success: true,
      messageId: `msg_${Date.now()}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

// ============================================================================
// EXPORT ALL TEMPLATES AS A REGISTRY
// ============================================================================

export const emailTemplateRegistry = {
  welcome: welcomeEmailTemplate,
  accountApproval: accountApprovalTemplate,
  passwordReset: passwordResetTemplate,
};
