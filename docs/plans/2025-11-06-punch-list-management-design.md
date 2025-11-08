# Punch List Management Feature Design

**Date**: 2025-11-06
**Status**: Future Feature (Documentation Only)
**Inspired by**: Fieldwire punch list workflow

## Overview

PipeTrak will add punch list management to track deficiencies and quality issues throughout project execution. Field workers will create punch items directly from component detail pages, drawing pages, or as standalone general items. The feature provides mobile-optimized capture with photo documentation, assignment tracking, and status workflows.

## Problem Statement

Industrial construction projects need systematic tracking of quality issues from initial installation through client turnover. Current tools require separate applications or paper processes. PipeTrak users need punch list management integrated with existing component and drawing data to eliminate duplicate entry and maintain context.

## User Stories

### Core Workflow

1. **As a QA inspector**, I create a punch item from the component detail page so I can document deficiencies in context.

2. **As a field worker**, I attach photos and notes from my phone so I can document issues immediately upon discovery.

3. **As a project manager**, I assign punch items to specific users with due dates so accountability is clear.

4. **As a contractor**, I update punch status to "In Progress" when I start work so the team knows work is underway.

5. **As a QA inspector**, I close punch items after verifying completion so the project maintains accurate completion status.

6. **As a project manager**, I filter punch items by status, priority, and phase so I can focus on critical items.

7. **As a client representative**, I export punch lists to PDF with photos so I have documentation for closeout packages.

### Extended Workflow

8. **As a project manager**, I view dashboard metrics showing open/closed counts by priority so I can assess project health at a glance.

9. **As a team member**, I receive email notifications when assigned to punch items so nothing falls through the cracks.

10. **As a field worker**, I create general punch items not tied to specific components so I can document issues like damaged site infrastructure.

## Feature Scope

### Included

**Punch Item Creation**
- Create from component detail page (primary workflow)
- Create from drawing page
- Create as standalone general item (no component/drawing association)
- Mobile-optimized creation flow with camera integration

**Data Fields**
- Title (required, 200 char max)
- Description (optional, rich text)
- Priority: High, Medium, Low (required)
- Phase: Pre-Hydro, Post-Hydro, Restore, Client Turnover (required)
- Status: Open, In Progress, Closed (default: Open)
- Assigned to: specific user (optional)
- Due date (optional)
- Created by, Created date (auto-populated)
- Closed by, Closed date (auto-populated on closure)

**Attachments**
- Photos (multiple, stored in Supabase Storage)
- File attachments: PDFs, documents (max 10MB per file)
- Comments/notes (threaded, timestamped)

**Assignment & Notifications**
- Assign to specific users in organization
- Due dates with overdue indicators
- Email notifications: assignment, status change, new comments
- In-app notifications

**Reporting & Export**
- Dashboard: counts by status, priority, phase
- Filter by status, priority, assignee, phase, date range
- Search by title/description
- PDF export with photos (formatted for client deliverables)
- Excel/CSV export for data analysis

### Excluded (Future Enhancements)

- Offline mode with sync (Phase 2)
- QR code scanning for quick component association (Phase 2)
- Role-based assignment (assign to "Welder" role instead of specific user)
- Location pins on drawing PDFs
- Custom fields/categories
- Four-state workflow with verification step
- Mobile app (native iOS/Android)

## Architecture

### Database Schema

**New Table: `punch_items`**
```sql
CREATE TABLE punch_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  component_id UUID REFERENCES components(id) ON DELETE SET NULL,
  drawing_id UUID REFERENCES drawings(id) ON DELETE SET NULL,

  title VARCHAR(200) NOT NULL,
  description TEXT,
  priority VARCHAR(20) NOT NULL CHECK (priority IN ('High', 'Medium', 'Low')),
  phase VARCHAR(50) NOT NULL CHECK (phase IN ('Pre-Hydro', 'Post-Hydro', 'Restore', 'Client Turnover')),
  status VARCHAR(20) NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'In Progress', 'Closed')),

  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  due_date DATE,

  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_by UUID REFERENCES users(id),
  closed_at TIMESTAMPTZ,

  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_punch_items_project ON punch_items(project_id);
CREATE INDEX idx_punch_items_component ON punch_items(component_id);
CREATE INDEX idx_punch_items_drawing ON punch_items(drawing_id);
CREATE INDEX idx_punch_items_assigned ON punch_items(assigned_to);
CREATE INDEX idx_punch_items_status ON punch_items(status);
CREATE INDEX idx_punch_items_priority ON punch_items(priority);
```

**New Table: `punch_attachments`**
```sql
CREATE TABLE punch_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  punch_item_id UUID NOT NULL REFERENCES punch_items(id) ON DELETE CASCADE,

  file_name VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL, -- Supabase Storage path
  file_type VARCHAR(50) NOT NULL, -- 'photo', 'document'
  file_size INTEGER NOT NULL, -- bytes
  mime_type VARCHAR(100),

  uploaded_by UUID NOT NULL REFERENCES users(id),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE INDEX idx_punch_attachments_item ON punch_attachments(punch_item_id);
```

**New Table: `punch_comments`**
```sql
CREATE TABLE punch_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  punch_item_id UUID NOT NULL REFERENCES punch_items(id) ON DELETE CASCADE,

  comment TEXT NOT NULL,

  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE INDEX idx_punch_comments_item ON punch_comments(punch_item_id);
```

### Row Level Security (RLS)

All tables will enforce organization-level isolation:

```sql
-- punch_items policies
CREATE POLICY "Users can view punch items in their organization"
  ON punch_items FOR SELECT
  USING (organization_id = current_setting('app.current_organization_id')::uuid);

CREATE POLICY "Users can create punch items in their organization"
  ON punch_items FOR INSERT
  WITH CHECK (organization_id = current_setting('app.current_organization_id')::uuid);

CREATE POLICY "Users can update punch items in their organization"
  ON punch_items FOR UPDATE
  USING (organization_id = current_setting('app.current_organization_id')::uuid);

CREATE POLICY "Users can delete punch items in their organization"
  ON punch_items FOR DELETE
  USING (organization_id = current_setting('app.current_organization_id')::uuid);

-- Similar policies for punch_attachments and punch_comments
```

### Supabase Storage

**Bucket: `punch-attachments`**
- Public: false (requires authentication)
- File size limits: 10MB per file
- Allowed MIME types: images (jpg, png, heic), PDFs, documents (docx)
- Path structure: `{organization_id}/{project_id}/{punch_item_id}/{file_id}.{ext}`

### Frontend Components

**Pages**
- `/punch-lists` - Main punch list page with filtering and dashboard
- Punch creation integrated into existing pages (component detail, drawing detail)

**New Components**
- `PunchListDashboard.tsx` - Metrics cards (open/closed counts by priority)
- `PunchItemTable.tsx` - Virtualized table with filtering
- `CreatePunchDialog.tsx` - Modal form for punch creation
- `PunchDetailView.tsx` - Full punch item details with comments/attachments
- `PunchAttachmentUpload.tsx` - Photo/file upload with camera integration
- `PunchFilters.tsx` - Status, priority, phase, assignee filters
- `PunchCommentThread.tsx` - Threaded comments display

**Enhanced Components**
- `ComponentDetailView.tsx` - Add "Create Punch Item" button, show related punch items
- `DrawingDetailView.tsx` - Add "Create Punch Item" button, show related punch items

### State Management

**TanStack Query Hooks**
```typescript
// Queries
usePunchItems(projectId, filters)
usePunchItem(punchItemId)
usePunchAttachments(punchItemId)
usePunchComments(punchItemId)
usePunchDashboard(projectId)

// Mutations
useCreatePunchItem()
useUpdatePunchItem()
useDeletePunchItem()
useUploadPunchAttachment()
useDeletePunchAttachment()
useCreatePunchComment()
```

### Notifications

**Email Notifications** (via Resend API)
- New punch item assigned
- Status changed to "In Progress" or "Closed"
- New comment added
- Due date approaching (1 day before)
- Item overdue

**In-App Notifications**
- Real-time using Supabase Realtime subscriptions
- Toast notifications for immediate feedback
- Notification bell with unread count

### Export Functionality

**PDF Export**
- Header: Project name, export date, filter criteria
- Table: ID, Title, Priority, Phase, Status, Assigned To, Due Date
- Detail sections: Description, photos (inline), comments
- Footer: Page numbers, generated by PipeTrak

**Excel/CSV Export**
- Flat table with all fields
- Photos: include file URLs (not embedded)
- Comments: concatenate into single cell with timestamps

## Mobile Considerations

**Responsive Breakpoints**
- ≤1024px: Mobile-optimized layout
- Touch targets: ≥44px (WCAG 2.1 AA)
- Camera integration: HTML5 `<input type="file" accept="image/*" capture="environment">`

**Mobile UI Patterns**
- Bottom sheet for punch creation on mobile
- Swipe gestures for status changes (optional enhancement)
- Collapsible filters (following Feature 022 patterns)
- Large touch-friendly status/priority buttons

## Success Metrics

**Adoption**
- 80% of field workers create at least one punch item per week
- 50% of punch items created from mobile devices

**Efficiency**
- Average time to create punch item: <30 seconds
- 95% of punch items have at least one photo attached

**Completion**
- 90% of punch items closed within 7 days of due date
- <10% of items remain open past due date

## Fieldwire Workflow Inspiration

This design adopts Fieldwire's core workflow patterns:

1. **Quick Capture** - Create punch items directly in field with photos
2. **Clear Assignment** - Every item has owner, priority, due date
3. **Status Workflow** - Open → In Progress → Closed (simple 3-state)
4. **Real-time Notifications** - Email and push notifications for updates
5. **Mobile-First** - Camera integration, offline-capable (Phase 2)
6. **Photo Documentation** - Before/after photos central to workflow
7. **Export for Closeout** - PDF reports with photos for client deliverables

## Implementation Phases

**Phase 1: Core Functionality** (MVP - 3 weeks)
- Database tables and RLS policies
- Basic CRUD operations (create, read, update, delete)
- Punch item table with filtering
- Assignment and status tracking
- Photo upload (Supabase Storage)
- Integration with component detail page

**Phase 2: Enhanced Features** (2 weeks)
- Comments/notes system
- Email notifications (Resend API)
- Dashboard metrics
- PDF export with photos
- Excel/CSV export
- Mobile camera integration

**Phase 3: Advanced Capabilities** (Future)
- Offline mode with sync
- QR code scanning
- Drawing location pins
- Custom fields
- Advanced reporting/analytics

## Technical Dependencies

**Existing Infrastructure**
- Supabase PostgreSQL (database)
- Supabase Storage (file storage)
- Supabase Auth (user authentication)
- Resend API (email notifications)
- TanStack Query (state management)
- jsPDF + jsPDF-AutoTable (PDF generation)
- xlsx library (Excel export)

**New Dependencies**
- None required (leverage existing stack)

## Security Considerations

**File Upload Security**
- Validate MIME types server-side
- Scan for malware (future enhancement)
- Enforce file size limits (10MB)
- Store files in organization-scoped buckets

**Data Privacy**
- RLS enforces organization isolation
- Soft deletes for audit trail
- Attachment deletion cascades to storage cleanup

**Permission Model**
- All organization users can create/view punch items
- Only assigned user + admins can close items (future refinement)
- Attachment upload requires authentication

## Open Questions

1. Should we allow bulk status updates (select multiple items, change status)?
2. Should closed items be re-openable? By whom?
3. Do we need item priority escalation (auto-escalate if overdue)?
4. Should notifications be configurable per user (opt-in/opt-out)?
5. Should punch items support watchers (get notifications without being assigned)?

## References

- Fieldwire punch list workflow: https://www.fieldwire.com
- Feature 022 (Mobile UI patterns): `specs/022-weld-log-mobile/`
- Feature 019 (PDF/Excel export): `specs/019-weekly-progress-reports/`
- Feature 021 (Resend email integration): `specs/021-public-homepage/`
- PipeTrak Constitution: `.specify/memory/constitution.md`
