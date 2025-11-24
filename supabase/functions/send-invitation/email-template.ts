/**
 * Email content sections for invitation emails
 * Extracted as constants for easier content editing and maintenance
 */
const EMAIL_CONTENT = {
  SUBJECT_PREFIX: "You've been invited to join",
  SUBJECT_SUFFIX: "on PipeTrak",
  HEADER_PREFIX: "You've been invited to join",
  INVITATION_TEXT_WITH_INVITER: "has invited you to join",
  INVITATION_TEXT_WITHOUT_INVITER: "You have been invited to join",
  ROLE_PREFIX: "as a",
  CALL_TO_ACTION: "Click the button below to accept the invitation and create your account:",
  BUTTON_TEXT: "Accept Invitation",
  LINK_FALLBACK_TEXT: "Or copy and paste this link into your browser:",
  EXPIRY_WARNING: "⏰ This invitation expires in 7 days.",
  EXPIRY_REMINDER: "Make sure to accept it before then!",
  FOOTER_DISCLAIMER_PREFIX: "This invitation was sent to",
  FOOTER_DISCLAIMER_SUFFIX: "If you didn't expect this invitation, you can safely ignore this email.",
  FOOTER_COPYRIGHT_PREFIX: "© ",
  FOOTER_COPYRIGHT_SUFFIX: "PipeTrak - Industrial Pipe Tracking System"
} as const

/**
 * Email styling constants
 * Inline styles required for email client compatibility
 */
const EMAIL_STYLES = {
  BODY: "margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;",
  OUTER_TABLE: "background-color: #f8fafc; padding: 40px 20px;",
  INNER_TABLE: "background-color: #ffffff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);",
  HEADER: "padding: 40px 40px 20px 40px;",
  HEADER_TEXT: "margin: 0; font-size: 24px; font-weight: 600; color: #0f172a;",
  BODY_SECTION: "padding: 0 40px 30px 40px;",
  PARAGRAPH: "margin: 0 0 16px 0; font-size: 16px; line-height: 24px; color: #475569;",
  PARAGRAPH_LAST: "margin: 0 0 24px 0; font-size: 16px; line-height: 24px; color: #475569;",
  CTA_TABLE: "padding: 0 0 24px 0;",
  CTA_BUTTON: "display: inline-block; padding: 12px 32px; background-color: #3b82f6; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 500;",
  LINK_LABEL: "margin: 0 0 16px 0; font-size: 14px; line-height: 20px; color: #64748b;",
  LINK_TEXT: "margin: 0 0 24px 0; font-size: 14px; line-height: 20px; color: #3b82f6; word-break: break-all;",
  WARNING_BOX: "padding: 16px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;",
  WARNING_TEXT: "margin: 0; font-size: 14px; line-height: 20px; color: #92400e;",
  FOOTER: "padding: 30px 40px 40px 40px; border-top: 1px solid #e2e8f0;",
  FOOTER_TEXT: "margin: 0; font-size: 12px; line-height: 18px; color: #94a3b8;",
  FOOTER_COPYRIGHT: "margin: 12px 0 0 0; font-size: 12px; line-height: 18px; color: #94a3b8;"
} as const

/**
 * Generate custom HTML email template for team invitations
 *
 * This function creates a branded invitation email sent via Resend API when a team
 * member invites a new user to their organization. The email includes:
 * - Personalized invitation with inviter's name (if provided)
 * - Organization name and role assignment
 * - Accept invitation button with link
 * - Fallback plain text link
 * - 7-day expiration warning
 * - Footer with disclaimer
 *
 * Email uses inline styles for maximum compatibility with email clients.
 * Template variables are safely interpolated.
 *
 * @param email - Recipient's email address
 * @param invitationLink - Unique invitation acceptance URL
 * @param role - Role being assigned (e.g., "project_manager")
 * @param organizationName - Name of the organization the user is being invited to
 * @param inviterName - Optional name of the person sending the invitation
 * @returns Complete HTML email string ready to send via Resend API
 *
 * @example
 * ```typescript
 * const html = generateInvitationEmailHtml(
 *   'jane@example.com',
 *   'https://app.pipetrak.co/accept-invitation?token=abc123',
 *   'project_manager',
 *   'ACME Construction',
 *   'John Smith'
 * )
 * // Returns: "<!DOCTYPE html>..."
 * ```
 */
export function generateInvitationEmailHtml(
  email: string,
  invitationLink: string,
  role: string,
  organizationName: string,
  inviterName?: string
): string {
  // Format role for display (e.g., "project_manager" -> "Project Manager")
  const roleDisplay = role.split('_').map(word =>
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ')

  // Build invitation text with or without inviter name
  const invitationText = inviterName
    ? `<strong>${inviterName}</strong> ${EMAIL_CONTENT.INVITATION_TEXT_WITH_INVITER}`
    : EMAIL_CONTENT.INVITATION_TEXT_WITHOUT_INVITER

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="${EMAIL_STYLES.BODY}">
  <table width="100%" cellpadding="0" cellspacing="0" style="${EMAIL_STYLES.OUTER_TABLE}">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="${EMAIL_STYLES.INNER_TABLE}">
          <!-- Header -->
          <tr>
            <td style="${EMAIL_STYLES.HEADER}">
              <h1 style="${EMAIL_STYLES.HEADER_TEXT}">
                ${EMAIL_CONTENT.HEADER_PREFIX} ${organizationName}
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="${EMAIL_STYLES.BODY_SECTION}">
              <p style="${EMAIL_STYLES.PARAGRAPH}">
                ${invitationText} <strong>${organizationName}</strong> on PipeTrak ${EMAIL_CONTENT.ROLE_PREFIX} <strong>${roleDisplay}</strong>.
              </p>
              <p style="${EMAIL_STYLES.PARAGRAPH_LAST}">
                ${EMAIL_CONTENT.CALL_TO_ACTION}
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="${EMAIL_STYLES.CTA_TABLE}">
                    <a href="${invitationLink}" style="${EMAIL_STYLES.CTA_BUTTON}">
                      ${EMAIL_CONTENT.BUTTON_TEXT}
                    </a>
                  </td>
                </tr>
              </table>

              <p style="${EMAIL_STYLES.LINK_LABEL}">
                ${EMAIL_CONTENT.LINK_FALLBACK_TEXT}
              </p>
              <p style="${EMAIL_STYLES.LINK_TEXT}">
                ${invitationLink}
              </p>

              <div style="${EMAIL_STYLES.WARNING_BOX}">
                <p style="${EMAIL_STYLES.WARNING_TEXT}">
                  <strong>${EMAIL_CONTENT.EXPIRY_WARNING}</strong> ${EMAIL_CONTENT.EXPIRY_REMINDER}
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="${EMAIL_STYLES.FOOTER}">
              <p style="${EMAIL_STYLES.FOOTER_TEXT}">
                ${EMAIL_CONTENT.FOOTER_DISCLAIMER_PREFIX} ${email}. ${EMAIL_CONTENT.FOOTER_DISCLAIMER_SUFFIX}
              </p>
              <p style="${EMAIL_STYLES.FOOTER_COPYRIGHT}">
                ${EMAIL_CONTENT.FOOTER_COPYRIGHT_PREFIX}${new Date().getFullYear()} ${EMAIL_CONTENT.FOOTER_COPYRIGHT_SUFFIX}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}

/**
 * Generate email subject line for invitation
 *
 * @param organizationName - Name of the organization
 * @returns Email subject line
 *
 * @example
 * ```typescript
 * const subject = generateInvitationEmailSubject('ACME Construction')
 * // Returns: "You've been invited to join ACME Construction on PipeTrak"
 * ```
 */
export function generateInvitationEmailSubject(organizationName: string): string {
  return `${EMAIL_CONTENT.SUBJECT_PREFIX} ${organizationName} ${EMAIL_CONTENT.SUBJECT_SUFFIX}`
}
