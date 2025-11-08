# PipeTrak Homepage Design

**Date**: 2025-10-29
**Status**: Design Complete
**Implementation**: Pending

## Overview

Design for a dual-purpose homepage at www.pipetrak.co that serves both as a marketing landing page for prospects and a gateway for existing users to access the application. The homepage will be implemented as a public route within the existing React application.

## Purpose & Goals

### Primary Purpose
Dual-purpose homepage that:
1. **Attracts new customers** - Explains the product value and drives demo requests
2. **Serves existing users** - Provides quick login access to the application

### Target Audience
- **Construction Managers**: Day-to-day project managers needing better pipe tracking
- **Project Executives**: Senior leaders evaluating solutions, focused on ROI
- **Field Teams**: Welders, inspectors, field engineers using mobile interface daily

### Value Proposition
PipeTrak solves three core problems equally:
1. **Visibility & Control** - Real-time progress tracking across thousands of components
2. **Efficiency & Speed** - Eliminate spreadsheets with mobile-first updates
3. **Quality & Compliance** - Complete audit trail with milestone history

## Design Approach

**Selected Approach**: Full-Screen Impact
- Dramatic viewport-filling hero with background imagery
- Bold headline with 3 value proposition bullets
- Three call-to-action buttons (Demo Request, Demo Project, Learn More)
- Scroll reveals 3 feature highlight cards
- Login accessible via top-right navigation

## Layout & Structure

### Overall Layout

The homepage consists of three main sections:

1. **Hero Section** (100vh) - Full viewport height
2. **Feature Highlights Section** (60-70vh) - Revealed on scroll
3. **Footer** - Minimal copyright and contact info

### Hero Section (100vh)

**Background Treatment**:
- Semi-transparent dark overlay (40-60% opacity) over hero image
- Hero image options: industrial pipes on racks, construction site, or abstract blueprint pattern
- Alternative: Modern gradient (dark blue to slate) for industrial feel

**Visual Hierarchy** (top to bottom):
- **Top-left**: PipeTrak logo wordmark (white/light version)
- **Top-right**: "Login" link (opens modal or navigates to auth)
- **Center focal point**:
  - Large headline (48-72px)
  - Tagline below headline
  - 3 value proposition bullets (icon + short phrase)
  - 3 CTA buttons
- **Bottom center**: Animated scroll indicator (bouncing chevron or "Learn More" text)

### Hero Content

**Headline Options**:
- Option A: "Track Every Pipe. From Takeoff to Turnover."
- Option B: "Brownfield Construction Progress. In Real Time."
- Option C: "Stop Chasing Spreadsheets. Start Tracking Progress."

**Tagline**:
"Industrial pipe tracking for construction teams who demand visibility, efficiency, and control."

**Three Value Proposition Bullets** (icon + text):
1. 📊 **Real-Time Visibility** - Track thousands of components across every milestone
2. 📱 **Mobile-First Updates** - Field teams update progress in seconds, not hours
3. ✅ **Complete Audit Trail** - Full history for compliance, testing, and quality control

**Call-to-Action Buttons**:
1. **Primary CTA**: "Request a Demo" - Form submission or contact flow
2. **Secondary CTA**: "Try Demo Project" - Navigate to pre-populated demo project (details TBD)
3. **Tertiary CTA**: "Learn More" - Smooth scroll to feature highlights

**CTA Layout**:
- Desktop: Horizontal row (Demo | Demo Project | Learn More)
- Mobile: Stacked vertically with proper spacing
- Primary and secondary CTAs have equal visual weight (solid buttons)
- Tertiary CTA uses ghost button style

**Login Access**:
- Top-right corner link labeled "Login"
- Opens centered modal overlay or navigates to login page
- Modal includes username/password fields and link to app

### Feature Highlights Section (60-70vh)

Clean white background with 3 cards laid out horizontally (stacked on mobile).

**Card 1 - Mobile Milestone Updates**
- Icon: 📱 or simple phone illustration
- Title: "Mobile-First Field Updates"
- Description: "Welders and inspectors update milestones from any device. Touch-optimized interface means faster data entry and fewer errors."

**Card 2 - Real-Time Dashboard**
- Icon: 📊 or dashboard/chart illustration
- Title: "Live Progress Tracking"
- Description: "See exactly where every component stands across all milestones. Filter by drawing, system, area, or test package for instant insights."

**Card 3 - Complete History & Compliance**
- Icon: ✅ or checklist/document illustration
- Title: "Audit-Ready Documentation"
- Description: "Track field welds, repairs, NDE results, and milestone history. Export progress reports to PDF, Excel, or CSV for stakeholders."

**Card Design**:
- White background with subtle shadow
- Rounded corners
- Icons at top (or left on desktop)
- Title in medium-weight font
- Description in lighter gray text
- Hover effect: slight lift with shadow increase

### Footer

Minimal footer with:
- Copyright notice
- Email contact (optional)
- Link to terms/privacy (optional)

## Technical Implementation

### Integration Approach

**Same repo, public route** - Add homepage as a public route in existing React/Vite application:
- Public `/` route (no authentication required)
- Login button navigates to `/dashboard` or triggers existing auth flow
- Demo Project button navigates to `/demo-project` (authenticated route with pre-populated data)
- Single deployment to Vercel
- Shares Tailwind styling, design system, and components

### File Structure

```
src/
├── pages/
│   ├── HomePage.tsx              (new - the hero page)
│   ├── DashboardPage.tsx         (existing)
│   └── ...
├── components/
│   ├── homepage/
│   │   ├── HeroSection.tsx       (full-screen hero)
│   │   ├── FeatureCards.tsx      (3 feature highlights)
│   │   └── LoginModal.tsx        (if needed, or use existing auth)
│   └── ...
└── App.tsx                        (add `/` route)
```

### Routing Configuration

In `App.tsx`:
```tsx
<Route path="/" element={<HomePage />} />           // Public
<Route path="/login" element={<LoginPage />} />     // Public
<Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
```

### Technology Stack

- **Framework**: React 18 + TypeScript (existing stack)
- **Styling**: Tailwind CSS v4 (existing)
- **Routing**: React Router v7 (existing)
- **Animations**: CSS transitions + Intersection Observer API for scroll-triggered animations
- **No additional dependencies** - leverage existing project stack

### Benefits of This Approach

1. Shares Tailwind styling and design system
2. Login uses existing `useAuth()` context
3. Single deployment to Vercel
4. Consistent user experience across marketing and app
5. Can reuse existing components (buttons, modals, etc.)

## Responsive Design

### Breakpoints

**Mobile (< 768px)**:
- Hero headline: 32-40px
- Value prop bullets: stack vertically
- CTAs: stack vertically with full width
- Feature cards: single column stack
- Login link: stays visible in top-right or moves to hamburger menu

**Tablet (768px - 1024px)**:
- Hero headline: 48px
- CTAs: stacked or 2-up layout
- Feature cards: single column or 2-column grid

**Desktop (> 1024px)**:
- Hero headline: 60-72px
- CTAs: horizontal row
- Feature cards: 3-column grid

### Touch Targets

- All interactive elements ≥44px touch target (mobile)
- Generous spacing between stacked CTAs on mobile
- Feature cards have adequate spacing for touch selection

## Visual Design

### Color Scheme

- **Primary brand color**: Deep industrial blue (#1e40af or similar)
  - Used for: primary CTAs, links, brand elements
- **Secondary/accent**: Bright action color (teal #06b6d4 or green #10b981)
  - Used for: hover states, highlights, secondary CTAs
- **Neutral palette**: Slate grays from Tailwind (slate-50 to slate-900)
  - Used for: text, backgrounds, borders
- **Hero overlay**: Dark gradient or semi-transparent navy overlay on background image

### Typography

**Font Family**: Bold, modern sans-serif (Inter, or system font stack)

**Hierarchy**:
- Hero headline: 60-72px, font-weight 700
- Tagline: 20-24px, font-weight 400, text-slate-300
- Value props: 18px, font-weight 500
- Feature card titles: 24px, font-weight 600
- Feature descriptions: 16px, font-weight 400, text-slate-600
- Body text base: 16px, line-height 1.6

### Spacing & Layout

- **Spacing scale**: 8px base unit (8, 16, 24, 32, 48, 64, 96px)
- **Max content width**: 1200px for feature cards section
- **Hero section**: full-width, vertically centered content
- **Generous whitespace** for breathing room and modern feel

### Visual Assets

- **Logo**: PipeTrak wordmark (white/light version for dark hero background)
- **Hero background**: Construction site or pipe rack image (desaturated with overlay)
- **Icons**: Simple line icons or filled icons for:
  - 3 value proposition bullets
  - 3 feature card icons
- **No stock photos of people** - keep focus on product and industry

## Animations & Interactions

### Entrance Animations

- **Hero entrance**: Fade-in + slight upward slide on page load (0.6s ease-out)
- **Scroll indicator**: Subtle bounce animation (infinite loop)
- **Feature cards**: Fade-in + slide-up when scrolled into view
  - Stagger animation by 150ms per card
  - Use Intersection Observer API to trigger

### Interactive States

- **CTA buttons**:
  - Hover: scale 1.05, shadow increase
  - Transition: 200ms ease
  - Focus visible for keyboard navigation
- **Login modal**:
  - Backdrop blur effect
  - Center fade-in animation when opened
  - ESC key to close

### Scroll Behavior

- Smooth scroll to feature section when "Learn More" clicked
- Animated scroll indicator disappears when scrolled past hero

## Accessibility

### Semantic HTML
- `<header>` for top navigation
- `<main>` for page content
- `<section>` for hero and features
- `<footer>` for footer

### ARIA & Screen Readers
- ARIA labels for icon buttons and scroll indicator
- Alt text for all images and icons
- Descriptive button text (not just "Click here")
- Screen reader announcements for modal open/close

### Keyboard Navigation
- Tab through all CTAs in logical order
- ESC key closes login modal
- Focus visible styles on all interactive elements
- Skip link to main content (optional)

### Color Contrast
- WCAG 2.1 AA minimum compliance
- Text on hero background: sufficient contrast with overlay
- Button text on colored backgrounds: 4.5:1 ratio minimum

## Implementation Notes

### Demo Project Details
- Button labeled "Try Demo Project" included in CTA set
- Implementation details to be determined (authentication requirements, data seeding, etc.)
- Should provide immediate value and showcase key features
- Consider anonymous demo vs. requiring account creation

### Login Flow
- Integrate with existing `AuthContext` and Supabase authentication
- Modal vs. dedicated login page - choose based on UX preference
- Redirect authenticated users to `/dashboard`
- Handle email confirmation flow if required

### Performance Considerations
- Optimize hero background image (WebP format, responsive images)
- Lazy load feature section images
- Minimize JavaScript bundle size
- Fast initial page load critical for first impression

### Content Management
- Headlines, taglines, and descriptions should be editable
- Consider extracting content to constants or CMS in future
- Feature cards may need to be updated as product evolves

## Next Steps

1. **Phase 5**: Set up git worktree for isolated development
2. **Phase 6**: Create detailed implementation plan with tasks
3. Implement HomePage component and sub-components
4. Add routing configuration to App.tsx
5. Source or create visual assets (logo, hero image, icons)
6. Implement animations and interactions
7. Test responsive design across breakpoints
8. Verify accessibility compliance
9. Deploy and configure www.pipetrak.co domain

## Open Questions

1. **Demo Project authentication**: Should "Try Demo Project" require account creation or allow anonymous access?
2. **Hero headline**: Which option (A, B, or C) resonates most with brand voice?
3. **Login modal vs. page**: Should login open in modal or navigate to dedicated page?
4. **Analytics**: What tracking/analytics should be implemented for marketing insights?
5. **A/B testing**: Should we plan for headline/CTA testing infrastructure?
