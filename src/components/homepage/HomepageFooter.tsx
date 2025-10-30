// Homepage Footer Component
// Feature: 021-public-homepage
// Task: T016
// Description: Minimal footer with copyright, email contact, and terms/privacy links

export function HomepageFooter() {
  const currentYear = new Date().getFullYear()

  return (
    <footer
      className="bg-slate-900 border-t border-slate-800 py-8"
      role="contentinfo"
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          {/* Copyright */}
          <div className="text-slate-400 text-sm">
            © {currentYear} PipeTrak. All rights reserved.
          </div>

          {/* Links */}
          <div className="flex flex-wrap gap-6 items-center justify-center">
            <a
              href="mailto:info@pipetrak.co"
              className="text-slate-400 hover:text-white transition-colors text-sm"
              style={{ minHeight: '44px', minWidth: '44px', display: 'flex', alignItems: 'center' }}
            >
              Contact Us
            </a>
            <a
              href="/legal/terms"
              className="text-slate-400 hover:text-white transition-colors text-sm"
              style={{ minHeight: '44px', minWidth: '44px', display: 'flex', alignItems: 'center' }}
            >
              Terms of Service
            </a>
            <a
              href="/legal/privacy"
              className="text-slate-400 hover:text-white transition-colors text-sm"
              style={{ minHeight: '44px', minWidth: '44px', display: 'flex', alignItems: 'center' }}
            >
              Privacy Policy
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
