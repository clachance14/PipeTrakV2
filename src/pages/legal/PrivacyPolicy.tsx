export function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white shadow-sm rounded-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Privacy Policy</h1>

        <div className="prose prose-slate max-w-none space-y-6 text-gray-700">
          <p className="text-sm text-gray-600">
            <strong>Effective Date:</strong> November 2, 2025<br />
            <strong>Last Updated:</strong> November 2, 2025
          </p>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">1. Introduction</h2>
            <p>
              PipeTrak ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy
              explains how we collect, use, disclose, and safeguard your information when you use our
              industrial pipe tracking system for brownfield construction projects (the "Service").
            </p>
            <p>
              By using PipeTrak, you agree to the collection and use of information in accordance with
              this policy. If you do not agree with our policies and practices, please do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">2. Information We Collect</h2>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">2.1 Account Information</h3>
            <p>When you create an account, we collect:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Email address (required for authentication)</li>
              <li>Full name</li>
              <li>Organization name and details</li>
              <li>Role and permissions within your organization</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">2.2 Project and Operational Data</h3>
            <p>When you use our Service, we store:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Project information (names, descriptions, locations)</li>
              <li>Component tracking data (pipe specifications, drawings, metadata)</li>
              <li>Milestone progress records</li>
              <li>Weld logs and inspection records</li>
              <li>Test packages and quality assurance data</li>
              <li>Team member assignments and activities</li>
              <li>File uploads (drawings, documents, images)</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">2.3 Usage Information</h3>
            <p>We automatically collect:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Log data (IP address, browser type, device information)</li>
              <li>Usage patterns and feature interactions</li>
              <li>Session information and authentication events</li>
              <li>Error reports and performance metrics</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">2.4 Demo Account Information</h3>
            <p>For demo accounts, we additionally track:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Demo creation timestamp and expiration date</li>
              <li>IP address for rate limiting</li>
              <li>Email address usage frequency</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">3. How We Use Your Information</h2>
            <p>We use the collected information for:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Service Delivery:</strong> Providing and maintaining the PipeTrak platform</li>
              <li><strong>Authentication:</strong> Verifying your identity via magic link email authentication</li>
              <li><strong>Communication:</strong> Sending transactional emails (account verification, team invitations, notifications)</li>
              <li><strong>Security:</strong> Detecting and preventing fraud, abuse, and unauthorized access</li>
              <li><strong>Improvement:</strong> Analyzing usage patterns to improve features and user experience</li>
              <li><strong>Support:</strong> Responding to your requests and providing customer support</li>
              <li><strong>Compliance:</strong> Meeting legal obligations and enforcing our Terms of Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">4. Data Storage and Security</h2>
            <p>
              Your data is stored securely using <strong>Supabase</strong>, a PostgreSQL-based platform with
              enterprise-grade security features including:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Row Level Security (RLS) policies ensuring data isolation</li>
              <li>Encrypted data transmission (TLS/SSL)</li>
              <li>Encrypted data at rest</li>
              <li>Regular automated backups</li>
              <li>Role-based access control (RBAC)</li>
            </ul>
            <p className="mt-4">
              While we implement industry-standard security measures, no method of transmission or storage
              is 100% secure. We cannot guarantee absolute security of your information.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">5. Third-Party Services</h2>
            <p>We use the following third-party services that may collect or process your data:</p>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">5.1 Supabase</h3>
            <p>
              Provides authentication, database, and storage infrastructure. View their privacy policy at{' '}
              <a href="https://supabase.com/privacy" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
                https://supabase.com/privacy
              </a>
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">5.2 Resend</h3>
            <p>
              Handles transactional email delivery (authentication links, team invitations). View their privacy policy at{' '}
              <a href="https://resend.com/legal/privacy-policy" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
                https://resend.com/legal/privacy-policy
              </a>
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">5.3 Vercel</h3>
            <p>
              Hosts our web application. View their privacy policy at{' '}
              <a href="https://vercel.com/legal/privacy-policy" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
                https://vercel.com/legal/privacy-policy
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">6. Data Sharing and Disclosure</h2>
            <p>We do not sell your personal information. We may share your data only in these circumstances:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Within Your Organization:</strong> Team members in your organization can access shared project data according to their assigned permissions</li>
              <li><strong>Service Providers:</strong> Third-party vendors who assist in operating our Service (as listed in Section 5)</li>
              <li><strong>Legal Requirements:</strong> When required by law, court order, or governmental regulation</li>
              <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets (with prior notice to you)</li>
              <li><strong>Protection:</strong> To protect the rights, property, or safety of PipeTrak, our users, or the public</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">7. Your Rights and Choices</h2>
            <p>You have the following rights regarding your personal information:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Access:</strong> Request a copy of the personal information we hold about you</li>
              <li><strong>Correction:</strong> Update or correct inaccurate information through your account settings</li>
              <li><strong>Deletion:</strong> Request deletion of your account and associated data (subject to legal retention requirements)</li>
              <li><strong>Export:</strong> Export your project data in CSV, Excel, or PDF format</li>
              <li><strong>Opt-Out:</strong> Unsubscribe from non-essential communications (account security emails cannot be disabled)</li>
              <li><strong>Portability:</strong> Request your data in a machine-readable format</li>
            </ul>
            <p className="mt-4">
              To exercise these rights, contact us at privacy@pipetrak.co. We will respond within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">8. Data Retention</h2>
            <p>We retain your information as follows:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Active Accounts:</strong> Data is retained while your account is active and as needed to provide services</li>
              <li><strong>Demo Accounts:</strong> Automatically deleted after 7 days via automated cleanup</li>
              <li><strong>Deleted Accounts:</strong> Data is permanently deleted within 90 days of account closure, except where required for legal compliance</li>
              <li><strong>Backups:</strong> Backup copies may persist for up to 90 days before permanent deletion</li>
              <li><strong>Legal Holds:</strong> Data subject to legal proceedings may be retained longer as required by law</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">9. Cookies and Tracking</h2>
            <p>
              PipeTrak uses essential cookies and local storage to maintain your authentication session.
              We do not use advertising cookies or third-party tracking pixels. Session data includes:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Authentication tokens (required for login persistence)</li>
              <li>User preferences and UI state</li>
              <li>Feature flags and A/B test assignments</li>
            </ul>
            <p className="mt-4">
              You can control cookies through your browser settings, but disabling essential cookies
              will prevent you from using the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">10. Children's Privacy</h2>
            <p>
              PipeTrak is not intended for users under the age of 18. We do not knowingly collect
              personal information from children. If you believe we have collected information from
              a child, please contact us immediately at privacy@pipetrak.co, and we will delete it.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">11. International Data Transfers</h2>
            <p>
              Your data may be transferred to and processed in countries other than your country of residence.
              Our infrastructure providers (Supabase, Vercel) operate globally with data centers in multiple regions.
              We ensure appropriate safeguards are in place for cross-border data transfers in compliance with
              applicable data protection laws.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">12. California Privacy Rights (CCPA)</h2>
            <p>If you are a California resident, you have additional rights under the California Consumer Privacy Act:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Right to know what personal information is collected, used, shared, or sold</li>
              <li>Right to delete personal information held by us</li>
              <li>Right to opt-out of sale of personal information (we do not sell your data)</li>
              <li>Right to non-discrimination for exercising your CCPA rights</li>
            </ul>
            <p className="mt-4">
              To exercise these rights, email privacy@pipetrak.co with "CCPA Request" in the subject line.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">13. GDPR Rights (European Users)</h2>
            <p>If you are in the European Economic Area (EEA), you have rights under the General Data Protection Regulation:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Right to access your personal data</li>
              <li>Right to rectification of inaccurate data</li>
              <li>Right to erasure ("right to be forgotten")</li>
              <li>Right to restrict processing</li>
              <li>Right to data portability</li>
              <li>Right to object to processing</li>
              <li>Right to lodge a complaint with a supervisory authority</li>
            </ul>
            <p className="mt-4">
              Our legal basis for processing is: (1) contract performance, (2) legitimate business interests,
              or (3) your consent (which you may withdraw at any time).
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">14. Changes to This Privacy Policy</h2>
            <p>
              We may update this Privacy Policy from time to time to reflect changes in our practices or legal requirements.
              We will notify you of material changes by:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Posting the updated policy on this page with a new "Last Updated" date</li>
              <li>Sending an email notification to your registered email address</li>
              <li>Displaying a prominent notice in the application</li>
            </ul>
            <p className="mt-4">
              Your continued use of the Service after changes take effect constitutes acceptance of the updated policy.
              If you do not agree with changes, you must stop using the Service and request account deletion.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">15. Contact Us</h2>
            <p>
              If you have questions, concerns, or requests regarding this Privacy Policy or our data practices,
              please contact us:
            </p>
            <div className="pl-6 mt-4">
              <p><strong>Email:</strong> privacy@pipetrak.co</p>
              <p><strong>Website:</strong> <a href="https://www.pipetrak.co" className="text-blue-600 hover:underline">https://www.pipetrak.co</a></p>
              <p className="mt-2">We will respond to your inquiry within 30 business days.</p>
            </div>
          </section>

          <section className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-600 italic">
              This Privacy Policy was last updated on November 2, 2025. By using PipeTrak, you acknowledge
              that you have read and understood this Privacy Policy.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
