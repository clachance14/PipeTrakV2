# Feature Specification: Weekly Progress Reports

**Feature Branch**: `019-weekly-progress-reports`
**Created**: 2025-10-28
**Status**: Draft
**Input**: User description: "Weekly Progress Reports by Area/System/Test Package - Generate reports showing component completion across 5 standardized milestones (Received, Installed, Punch, Tested, Restored) grouped by metadata dimensions using earned value methodology. Support manual generation with PDF/Excel/CSV export."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Generate Basic Progress Report (Priority: P1)

A project manager needs to generate a progress report grouped by Area showing completion percentages across standardized milestones to share with stakeholders in a weekly status meeting.

**Why this priority**: This is the core MVP - generating a single report type manually. Without this, the feature provides no value. This story delivers immediate utility by allowing project managers to visualize progress data that currently exists but is difficult to aggregate.

**Independent Test**: Can be fully tested by selecting "Group by Area", clicking "Generate Report", and verifying a table displays with Area rows and milestone percentage columns (Received, Installed, Punch, Tested, Restored, Total). Delivers immediate value by providing a visual summary of project progress.

**Acceptance Scenarios**:

1. **Given** I am on the Reports page, **When** I select "Group by Area" and click "Generate Report", **Then** I see a table with Area names as rows and milestone completion percentages as columns
2. **Given** the report is displayed, **When** I view the data, **Then** milestone percentages reflect earned value calculations (partially complete work contributes proportionally)
3. **Given** an Area has no components, **When** the report generates, **Then** that Area shows 0% for all milestones and 0 in the Budget column
4. **Given** the report displays 10+ areas, **When** I scroll the page, **Then** column headers remain visible (sticky headers)
5. **Given** the report is displayed, **When** I view the bottom row, **Then** I see a "Grand Total" row showing aggregated percentages across all areas

---

### User Story 2 - Export Report to PDF (Priority: P1)

A project manager needs to export the generated report as a formatted PDF document to attach to email updates for executives and external stakeholders.

**Why this priority**: PDF export is critical for the weekly workflow - stakeholders need distributable documents, not just on-screen data. This completes the MVP by enabling the sharing workflow.

**Independent Test**: Can be fully tested by generating any report and clicking "Export PDF". Verifies that a downloadable PDF file is created with proper formatting, company header, and matches the on-screen data. Delivers value by enabling stakeholder distribution.

**Acceptance Scenarios**:

1. **Given** a report is displayed on screen, **When** I click "Export PDF", **Then** a PDF file downloads with filename format "PipeTrak_[Project]_[Dimension]_[Date].pdf"
2. **Given** the PDF is opened, **When** I view the header, **Then** I see company logo, report title "Pipe Tracker - by [Dimension]", project name, and current date
3. **Given** the PDF is opened, **When** I view the content, **Then** all data matches the on-screen report exactly (same rows, columns, percentages)
4. **Given** the report has 20+ rows, **When** viewing the PDF, **Then** content automatically page breaks and headers repeat on each page
5. **Given** the PDF is opened, **When** I print it, **Then** landscape orientation is used for better table readability

---

### User Story 3 - Export Report to Excel/CSV (Priority: P2)

A project manager needs to export report data to Excel or CSV format to perform additional analysis, create custom visualizations, or import into other project management systems.

**Why this priority**: Excel/CSV export enables power users to extend reporting capabilities beyond what's built into the app. This is secondary to PDF (which serves the primary stakeholder communication need) but valuable for analytical workflows.

**Independent Test**: Can be fully tested by generating any report and clicking "Export Excel" or "Export CSV". Verifies downloaded files contain correct data with proper formatting. Delivers value by enabling custom analysis and system integration.

**Acceptance Scenarios**:

1. **Given** a report is displayed, **When** I click "Export Excel", **Then** an .xlsx file downloads with formatted table (borders, frozen headers, percentage formatting)
2. **Given** a report is displayed, **When** I click "Export CSV", **Then** a .csv file downloads with comma-separated plain text values compatible with any spreadsheet software
3. **Given** I open the Excel export, **When** I view percentage columns, **Then** values are formatted as percentages (e.g., "53%" not "0.53")
4. **Given** I open the Excel export, **When** I scroll down, **Then** the header row remains frozen at the top
5. **Given** I open the CSV export in Excel, **When** I view the data, **Then** all numeric values are correctly parsed without formatting issues

---

### User Story 4 - Change Report Grouping Dimension (Priority: P2)

A project manager needs to view the same progress data grouped by System instead of Area to analyze progress from different perspectives for different stakeholder audiences.

**Why this priority**: Multi-dimensional grouping is a core feature differentiator mentioned in the requirements. However, getting one grouping dimension working (Area in P1) is more important than supporting all three. This extends the MVP to cover the second most common grouping.

**Independent Test**: Can be fully tested by selecting "Group by System" and verifying the report displays System names as rows with the same milestone columns. Delivers value by enabling different analytical perspectives without requiring separate features.

**Acceptance Scenarios**:

1. **Given** I am on the Reports page, **When** I select "Group by System" and generate a report, **Then** I see System names as rows instead of Area names
2. **Given** I select "Group by Test Package" and generate a report, **When** I view the results, **Then** I see Test Package names as rows
3. **Given** I switch from "Group by Area" to "Group by System", **When** the report regenerates, **Then** milestone percentages recalculate correctly for the new grouping
4. **Given** a System spans multiple Areas, **When** I view the System report, **Then** percentages aggregate all components across all Areas in that System
5. **Given** I generate reports by different dimensions, **When** I compare Budget (component count) totals, **Then** the Grand Total Budget is consistent across all grouping dimensions

---

### User Story 5 - Save Report Configuration (Priority: P3)

A project manager needs to save frequently used report configurations (e.g., "Weekly Area Report", "Monthly System Report") to avoid reconfiguring parameters every week.

**Why this priority**: Saved configurations improve efficiency for recurring reports but aren't required for basic functionality. Users can manually select options each time in the MVP.

**Independent Test**: Can be fully tested by configuring a report, clicking "Save Configuration", naming it "Test Report", then navigating away and reloading it from a saved reports list. Delivers value by reducing repetitive configuration work for weekly workflows.

**Acceptance Scenarios**:

1. **Given** I have configured a report (selected grouping dimension), **When** I click "Save Configuration" and enter name "Weekly Area Report", **Then** the configuration is saved and appears in my saved reports list
2. **Given** I have saved reports, **When** I view the Reports landing page, **Then** I see a list of my saved configurations with names and creation dates
3. **Given** I click on a saved report, **When** it loads, **Then** all parameters (grouping dimension, filters) are restored and the report auto-generates
4. **Given** I have a saved report, **When** I click "Edit", **Then** I can modify the name, description, or parameters and save changes
5. **Given** I have a saved report, **When** I click "Delete" and confirm, **Then** the configuration is removed from my list

---

### User Story 6 - Access Reports from Navigation (Priority: P1)

A user needs to easily find and access the reporting features from anywhere in the application without hunting through multiple menus.

**Why this priority**: Navigation is fundamental infrastructure - without it, users can't reach the feature at all. This must be part of the MVP.

**Independent Test**: Can be fully tested by logging into the app and clicking a "Reports" link in the sidebar, which navigates to the Reports landing page. Delivers value by making the feature discoverable and accessible.

**Acceptance Scenarios**:

1. **Given** I am logged into the application, **When** I view the sidebar navigation, **Then** I see a "Reports" menu item with an appropriate icon
2. **Given** I am on any page in the app, **When** I click the "Reports" link, **Then** I navigate to the Reports landing page
3. **Given** I am on mobile (screen width ≤1024px), **When** I open the mobile menu, **Then** the "Reports" link is visible and accessible
4. **Given** I am viewing a report, **When** I check the navigation, **Then** the "Reports" menu item is highlighted to indicate current location

---

### Edge Cases

- **What happens when an Area/System/Test Package has zero components?** The row appears with Budget=0 and all milestone percentages showing 0% or "N/A"
- **What happens when a report would have 100+ rows?** The table uses virtualization to render smoothly, with sticky headers and scroll performance remaining responsive
- **What happens when a component has a partially complete Threaded Pipe milestone?** The earned value calculation includes partial percentage contributions (e.g., Fabricate at 50% contributes 8% to Installed column since Fabricate has 16% weight)
- **What happens when exporting a report with no data?** Export succeeds but shows an empty table with headers and a message indicating no components found
- **What happens when percentage columns show 0.333...?** All percentages are rounded to whole numbers (e.g., 33%) for readability
- **What happens when a user's browser doesn't support PDF generation?** The system falls back to downloading raw data and displays a message suggesting alternative export formats
- **What happens when milestone names change in the database after a report is saved?** Reports always query live data, so they reflect current milestone structures (no stale data from save time)
- **What happens when a component belongs to multiple metadata dimensions (e.g., Area A + System S)?** It contributes to both dimensions' percentages when grouped separately (Area report counts it in Area A, System report counts it in System S)

## Requirements *(mandatory)*

### Functional Requirements

#### Report Generation

- **FR-001**: System MUST allow users to select a grouping dimension from three options: Area, System, or Test Package
- **FR-002**: System MUST generate a progress report table with rows representing the selected grouping dimension (Area names, System names, or Test Package names)
- **FR-003**: System MUST display seven columns in the report table: Budget, % Received, % Installed, % Punch, % Tested, % Restored, % Total
- **FR-004**: System MUST calculate Budget column as the count of non-retired components in that grouping
- **FR-005**: System MUST calculate milestone percentage columns using earned value methodology where partially complete milestones contribute proportionally to the percentage
- **FR-006**: System MUST calculate % Total column as the average of all components' weighted percent_complete values in that grouping
- **FR-007**: System MUST include a Grand Total row at the bottom showing aggregated percentages across all groups
- **FR-008**: System MUST display the report with sticky column headers that remain visible when scrolling
- **FR-009**: System MUST show an empty state message when no components exist for the selected project and grouping

#### Milestone Mapping (Earned Value)

- **FR-010**: System MUST map component-specific milestones to standardized report milestones as follows:
  - **% Received**: Spool/Support/Valve/etc → Receive (5-10% weight), Field Weld → Fit-Up (10% weight)
  - **% Installed**: Spool → Erect (40%) + Connect (40%), Field Weld → Weld Made (60%), Support/Valve/Fitting/etc → Install (60%), Threaded Pipe → Fabricate (16%) + Install (16%) + Erect (16%) + Connect (16%) + Support (16%)
  - **% Punch**: All types → Punch milestone (5-10% weight)
  - **% Tested**: All types → Test milestone (5-15% weight)
  - **% Restored**: All types → Restore milestone (5% weight)
- **FR-011**: System MUST calculate milestone percentages as (sum of earned milestone values across all components) / (sum of total milestone weights across all components) × 100
- **FR-012**: System MUST treat discrete milestones (complete/incomplete) as 0% or 100% earned values
- **FR-013**: System MUST treat partial milestones (Threaded Pipe only) as percentage values (0-100%) contributing proportionally to earned value
- **FR-014**: System MUST aggregate components of different types within the same grouping (e.g., Spools + Valves + Supports in Area B-64)

#### PDF Export

- **FR-015**: System MUST provide an "Export PDF" button that generates a downloadable PDF file
- **FR-016**: PDF MUST use landscape orientation for better table readability
- **FR-017**: PDF MUST include a header section with: company logo, report title "Pipe Tracker - by [Dimension]", project name, and current date
- **FR-018**: PDF MUST contain the same table data displayed on screen with identical values
- **FR-019**: PDF MUST automatically page break for reports exceeding one page, repeating column headers on each page
- **FR-020**: PDF filename MUST follow the format: PipeTrak_[ProjectName]_[GroupingDimension]_[YYYY-MM-DD].pdf

#### Excel/CSV Export

- **FR-021**: System MUST provide an "Export Excel" button that generates a downloadable .xlsx file
- **FR-022**: Excel export MUST format percentage columns as percentages (e.g., 53% not 0.53)
- **FR-023**: Excel export MUST freeze the header row so it remains visible when scrolling
- **FR-024**: Excel export MUST apply borders to table cells and bold formatting to headers
- **FR-025**: System MUST provide an "Export CSV" button that generates a downloadable .csv file with comma-separated plain text values
- **FR-026**: CSV export MUST be compatible with common spreadsheet applications (Excel, Google Sheets)
- **FR-027**: Both Excel and CSV filenames MUST follow the same naming pattern as PDF

#### Saved Report Configurations

- **FR-028**: System MUST allow users to save report configurations with a required name and optional description
- **FR-029**: System MUST persist saved configurations including: grouping dimension, hierarchical grouping flag (future), and component type filters (future)
- **FR-030**: System MUST display a list of saved report configurations on the Reports landing page showing name, description, and creation date
- **FR-031**: System MUST allow users to load a saved configuration, which auto-populates parameters and generates the report
- **FR-032**: System MUST allow users to edit the name and description of their saved configurations
- **FR-033**: System MUST allow users to delete their saved configurations with a confirmation dialog
- **FR-034**: System MUST only allow users to edit/delete configurations they created (creator ownership)

#### Navigation and Access

- **FR-035**: System MUST add a "Reports" navigation link in the sidebar menu visible to all authenticated users
- **FR-036**: System MUST position the Reports link between "Weld Log" and "Imports" in the navigation menu
- **FR-037**: System MUST navigate users to the Reports landing page when clicking the Reports link
- **FR-038**: Reports link MUST be accessible on mobile devices (screen width ≤1024px) via the mobile menu drawer
- **FR-039**: System MUST highlight the Reports navigation item when users are on any Reports page

#### Data and Performance

- **FR-040**: System MUST query live component data, not cached snapshots, ensuring reports always reflect current progress
- **FR-041**: System MUST handle projects with 10,000+ components without performance degradation (target: <3 seconds to generate report)
- **FR-042**: System MUST round all percentage values to whole numbers (e.g., 53% not 53.27%) for readability
- **FR-043**: System MUST exclude retired components from all report calculations (Budget counts and milestone percentages)
- **FR-044**: System MUST support components that belong to multiple metadata dimensions, counting them in all applicable groupings

#### User Interface

- **FR-045**: Reports landing page MUST display two sections: "Saved Reports" (list of configurations) and "Create New Report" (button)
- **FR-046**: Report configuration UI MUST include a clear dimension selector (radio buttons or dropdown) for Area/System/Test Package
- **FR-047**: Report preview MUST display immediately after selecting grouping dimension and clicking "Generate Report"
- **FR-048**: Export buttons (PDF/Excel/CSV) MUST only appear after a report has been successfully generated
- **FR-049**: All report pages MUST be responsive with mobile layout changes at ≤1024px breakpoint
- **FR-050**: System MUST use touch-friendly button sizes (≥32px) on mobile devices

### Key Entities

- **Report Configuration**: Represents a saved report template with parameters for reuse. Key attributes: unique identifier, configuration name, description, owning user, owning project, grouping dimension (area/system/test_package), hierarchical grouping flag, component type filters, creation timestamp, last updated timestamp. Relationships: Belongs to a Project, Created by a User.

- **Progress Report (transient)**: Represents generated report data (not persisted). Key attributes: report title, generation timestamp, grouping dimension, array of report rows. Relationships: Generated from Components grouped by the selected dimension (Area/System/Test Package).

- **Report Row (transient)**: Represents one row in the generated report. Key attributes: group name (e.g., "B-64 OSBL"), budget (component count), received percentage, installed percentage, punch percentage, tested percentage, restored percentage, total percentage. Calculated in real-time from component milestone data.

- **Standardized Milestone**: Virtual concept mapping component-specific milestones to report columns. Five categories: Received, Installed, Punch, Tested, Restored. Each maps to different component type milestones with specific earned value calculations.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Project managers can generate a complete Area-grouped progress report in under 30 seconds from navigation to on-screen display
- **SC-002**: Exported PDF reports match the screenshot layout provided (company header, 7 columns, Grand Total row) with zero data discrepancies compared to on-screen display
- **SC-003**: System generates reports for projects with 10,000+ components in under 3 seconds
- **SC-004**: 90% of users successfully export a report to their preferred format (PDF/Excel/CSV) on first attempt without errors
- **SC-005**: Milestone percentage calculations accurately reflect earned value methodology where a Spool with Erect complete (40%) and Connect incomplete (0%) shows 50% in the Installed column (40 earned / 80 total possible)
- **SC-006**: Reports remain accessible and functional on mobile devices (≤1024px) with touch targets ≥32px and readable text without horizontal scrolling
- **SC-007**: Saved report configurations load and regenerate identically to their original parameters, with 100% accuracy in restored settings
- **SC-008**: Users can locate the Reports feature within 10 seconds of logging in (single click from main navigation)

### User Satisfaction

- **SC-009**: Project managers report reduced time spent manually aggregating progress data for weekly meetings (measured via user feedback survey)
- **SC-010**: Stakeholders receiving PDF reports confirm the format is professional and suitable for executive distribution (measured via user feedback)

## Assumptions

1. **Company logo location**: We assume the company logo will be stored in the `organizations` table with a `logo_url` field. If this field doesn't exist, we'll add it during implementation.

2. **Authentication and permissions**: We assume all authenticated users with `can_view_dashboards` permission can access reports. No special "reports" permission is needed for Phase 1.

3. **Project selection**: We assume users have already selected a project via the existing ProjectContext before navigating to Reports. Reports always generate for the currently selected project.

4. **Metadata completeness**: We assume most components have Area, System, or Test Package assigned. Components without metadata in the selected dimension will be grouped in a "(Unassigned)" row.

5. **Export library availability**: We assume adding npm dependencies (jspdf, jspdf-autotable, xlsx) is acceptable and won't conflict with existing dependencies.

6. **Threaded Pipe rarity**: We assume Threaded Pipe components (the only type with partial milestones) are relatively rare. If they become common, we may need UI enhancements to show partial progress more prominently.

7. **Report persistence**: Phase 1 reports are generated on-demand and not persisted. Users must regenerate reports weekly. Future phases may add scheduled generation and storage.

8. **Hierarchical grouping**: Phase 1 supports single-dimension grouping only (Area OR System OR Test Package). Multi-level hierarchical grouping (Area → System → Test Package) is deferred to Phase 4.

9. **Date range filtering**: Phase 1 reports show current state only ("as of today"). Historical "as of date" reporting is out of scope for MVP.

10. **Component type filtering**: Phase 1 reports include all component types by default. Per-type filtering (e.g., "Spools only") is deferred to future enhancements.

## Out of Scope

The following are explicitly excluded from this feature specification:

1. **Scheduled/automated report generation**: No weekly email delivery, no Supabase Edge Functions for auto-generation, no cron jobs. All reports are manually generated on-demand.

2. **In-app notifications**: No notification badges, banners, or alerts for report availability. Users must manually navigate to Reports page.

3. **Historical reporting**: No "as of" date picker to view past progress snapshots. Reports always show current live data.

4. **Hierarchical/drill-down grouping**: No expandable rows showing Area → System → Test Package hierarchies. Single-dimension grouping only (Area OR System OR Test Package).

5. **Custom milestone selection**: Users cannot choose which milestones appear as columns. All reports use the fixed 5-column structure (Received, Installed, Punch, Tested, Restored).

6. **Component type filtering**: Cannot filter reports to show only Spools, only Valves, etc. All component types are always included.

7. **Report sharing/collaboration**: No sharing saved configurations with other users, no report comments or annotations, no collaborative editing.

8. **Chart/graph visualizations**: Text table only. No bar charts, pie charts, trend lines, or other visual analytics.

9. **Budget customization**: Budget column always shows component count. Cannot switch to labor hours, cost dollars, or other metrics.

10. **Excel advanced features**: No formulas, pivot tables, conditional formatting, or macros in Excel exports. Simple data table only.

11. **Multi-project reports**: Cannot aggregate data across multiple projects. Each report is scoped to a single selected project.

12. **Real-time collaboration**: No concurrent editing, no "User X is viewing this report" indicators, no live cursors.

13. **Audit trail**: No tracking of "who generated which report when" beyond the database created_by field on saved configurations.

14. **Report templates**: Beyond the single built-in template (Area/System/Test Package with 5 milestones), no custom templates or layouts.
