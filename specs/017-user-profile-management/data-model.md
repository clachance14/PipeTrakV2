# Data Model: User Profile Management

**Feature**: 017-user-profile-management
**Date**: 2025-10-27
**Purpose**: Define entities, relationships, validation rules, and database schema changes

## Entities

### 1. User Profile (Extended)

**Description**: Extends existing `users` table with avatar URL field to support profile photo uploads.

**Attributes**:
- `id` (UUID, PK): User identifier (references auth.users)
- `email` (TEXT, NOT NULL, UNIQUE): User email address (read-only in profile)
- `full_name` (TEXT, NULLABLE): User's display name (editable)
- `organization_id` (UUID, FK → organizations.id, NULLABLE): Organization membership (read-only in profile)
- `role` (TEXT, NULLABLE): User role in organization (read-only in profile)
- `avatar_url` (TEXT, NULLABLE): **NEW** - Public URL to avatar in Supabase Storage
- `created_at` (TIMESTAMPTZ): Account creation timestamp
- `updated_at` (TIMESTAMPTZ): Last profile update timestamp
- `deleted_at` (TIMESTAMPTZ, NULLABLE): Soft delete timestamp

**Validation Rules**:
- `full_name`: 1-100 characters when not null, trim whitespace before save
- `avatar_url`: Must be valid Supabase Storage URL or null
- `email`: Managed by Supabase Auth, cannot be changed via profile
- `organization_id`: Managed by organization admins, cannot be changed by user
- `role`: Managed by organization admins, cannot be changed by user

**State Transitions**: N/A (no complex state machine; simple CRUD)

**Relationships**:
- Belongs to one Organization (via `organization_id`)
- Owns zero or one Avatar in Supabase Storage

---

### 2. Avatar Storage

**Description**: Profile photos stored in Supabase Storage `avatars` bucket with RLS policies.

**Storage Structure**:
```
avatars/
└── {user_id}/
    └── avatar.{extension}  # JPG, PNG, or WebP
```

**Attributes** (Supabase Storage metadata):
- `bucket_id`: "avatars" (constant)
- `name`: "{user_id}/avatar.{extension}" (path)
- `owner`: User ID (from auth.uid())
- `created_at`: Upload timestamp
- `updated_at`: Last modification timestamp
- `metadata`: MIME type, size, etc.

**Validation Rules**:
- File size: Maximum 2MB (2,097,152 bytes)
- MIME types: `image/jpeg`, `image/png`, `image/webp`
- Filename pattern: `{user_id}/avatar.{ext}` (no user-provided filenames)
- One avatar per user (new upload overwrites previous)

**RLS Policies** (see research.md for SQL):
- SELECT: Authenticated users can read any avatar (public team photos)
- INSERT: Users can only upload to their own `{user_id}/` folder
- UPDATE: Users can only update files in their own `{user_id}/` folder
- DELETE: Users can only delete files in their own `{user_id}/` folder

**Relationships**:
- Owned by one User (via path structure `{user_id}/`)

---

### 3. Organization (Read-only Reference)

**Description**: Existing `organizations` table, referenced for displaying org name in profile.

**Relevant Attributes**:
- `id` (UUID, PK): Organization identifier
- `name` (TEXT, NOT NULL): Organization name (displayed in profile)

**Relationship**: Has many Users (via users.organization_id)

---

## Database Schema Changes

### Migration: 00050_add_avatar_url.sql

```sql
-- Add avatar_url column to users table
ALTER TABLE users ADD COLUMN avatar_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN users.avatar_url IS
  'Public URL to user avatar image in Supabase Storage avatars bucket. NULL if no avatar uploaded.';

-- No index needed (low cardinality, not used in WHERE clauses)

-- Update RLS policies for users table to allow avatar_url updates
-- Users can update their own avatar_url
CREATE POLICY "Users can update own avatar_url"
ON users FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());
```

### Storage Bucket Configuration

**Note**: Supabase Storage buckets cannot be created via SQL migrations. Use Supabase Dashboard or CLI:

```bash
# Create avatars bucket (run manually)
supabase storage create-bucket avatars --public

# Create RLS policies (via SQL migration or dashboard)
# See research.md for full SQL policy definitions
```

**Bucket Settings**:
- Name: `avatars`
- Public: TRUE
- File size limit: Enforced client-side (2MB)
- Allowed MIME types: Enforced via RLS + client validation

---

## Component Architecture

### Component Hierarchy

```
Layout
└── UserMenu (dropdown trigger)
    └── UserProfileModal (dialog)
        ├── ProfileHeader (avatar + name)
        ├── ProfileInfoSection (email, org, role)
        └── PasswordChangeForm (password update)
```

### Component Responsibilities

#### 1. UserMenu.tsx

**Purpose**: Avatar button with dropdown menu for profile access and sign out.

**State**:
- `open` (boolean): Dropdown open/closed state
- `user` (from AuthContext): Current user for avatar display

**Props**: None (reads from AuthContext)

**Behavior**:
- Display avatar (photo or initial letter) in navigation bar
- On click: Open dropdown with "View Profile" and "Sign Out" options
- On "View Profile": Open UserProfileModal
- On "Sign Out": Call AuthContext.signOut()

**Accessibility**:
- Button has `aria-label="User menu"`
- Dropdown menu has proper ARIA roles (via Radix DropdownMenu)

---

#### 2. UserProfileModal.tsx

**Purpose**: Modal container coordinating profile sections.

**State**:
- `open` (boolean): Modal open/closed state (passed from UserMenu)

**Props**:
- `open` (boolean): Controlled open state
- `onOpenChange` (function): Callback to close modal

**Behavior**:
- Render Dialog overlay + content
- Coordinate ProfileHeader, ProfileInfoSection, PasswordChangeForm
- Close on Escape key or outside click

**Accessibility**:
- Focus trap within modal (via Radix Dialog)
- Return focus to avatar button on close
- `aria-labelledby` references "Profile" heading

---

#### 3. ProfileHeader.tsx

**Purpose**: Avatar display/upload + full name editing.

**State**:
- `isEditing` (boolean): Full name edit mode
- `fullName` (string): Local input state
- `isUploading` (boolean): Avatar upload in progress
- `uploadProgress` (number): Upload progress (0-100)

**Props**:
- `user` (User): Current user data
- `onNameUpdate` (function): Callback to save name
- `onAvatarUpdate` (function): Callback to upload avatar

**Behavior**:
- Display large avatar (128px) with hover overlay for upload button
- On avatar click: Open file picker
- On file selected: Validate → Upload → Update avatar_url
- Display full name with inline edit button
- On name edit: Show input field with Save/Cancel buttons

**Hooks Used**:
- `useUpdateProfile` (for name updates)
- `useUpdateAvatar` (for avatar uploads)

**Accessibility**:
- Avatar upload button has `aria-label="Upload profile photo"`
- File input has `accept="image/jpeg,image/png,image/webp"`
- Name input has `aria-label="Full name"`

---

#### 4. ProfileInfoSection.tsx

**Purpose**: Display read-only profile information.

**State**: None (presentational component)

**Props**:
- `email` (string): User email
- `organizationName` (string | null): Organization name or "No organization"
- `role` (string | null): User role or null

**Behavior**:
- Display email, organization, role as labeled text fields
- Show "No organization" placeholder if `organizationName` is null
- Format role for display (e.g., "project_manager" → "Project Manager")

**Accessibility**:
- Each field has `aria-label` (e.g., "Email address")
- Use semantic HTML (`<dl>`, `<dt>`, `<dd>` for labeled data)

---

#### 5. PasswordChangeForm.tsx

**Purpose**: Password update with current password verification.

**State**:
- `currentPassword` (string): Current password input
- `newPassword` (string): New password input
- `confirmPassword` (string): Confirm new password input
- `showPasswords` (boolean): Toggle password visibility
- `isSubmitting` (boolean): Form submission in progress

**Props**: None (uses AuthContext for user)

**Behavior**:
- Display collapsible/expandable section (or always visible)
- Validate passwords on change:
  - Current password not empty
  - New password ≥8 characters
  - New password !== current password
  - Confirm password === new password
- On submit:
  1. Verify current password via `signInWithPassword`
  2. Update password via `auth.updateUser`
  3. Show success toast
  4. Clear form

**Hooks Used**:
- `useChangePassword` (custom hook wrapping password update logic)

**Accessibility**:
- Password inputs have `aria-label` and `type="password"`
- Toggle visibility button has `aria-label="Show/hide passwords"`
- Error messages announced to screen readers (via aria-live)

---

## Data Hooks (TanStack Query)

### 1. useUserProfile

**Purpose**: Fetch full user profile (user + organization data).

**Query Key**: `['userProfile', userId]`

**Fetch Function**:
```typescript
async function fetchUserProfile(userId: string) {
  const { data, error } = await supabase
    .from('users')
    .select(`
      *,
      organization:organizations(id, name)
    `)
    .eq('id', userId)
    .single()
  if (error) throw error
  return data
}
```

**Cache Behavior**:
- `staleTime`: 5 minutes (profile data changes infrequently)
- `cacheTime`: 10 minutes
- Auto-refetch on window focus: FALSE
- Retry on error: 1 time

---

### 2. useUpdateProfile

**Purpose**: Update user's full name with optimistic updates.

**Mutation Function**:
```typescript
async function updateProfile(userId: string, fullName: string) {
  const { data, error } = await supabase
    .from('users')
    .update({ full_name: fullName.trim(), updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single()
  if (error) throw error
  return data
}
```

**Optimistic Update**: See research.md for full implementation (onMutate/onError/onSettled)

**Cache Invalidation**: Invalidates `['userProfile', userId]` on success

---

### 3. useUpdateAvatar

**Purpose**: Upload avatar to Storage + update avatar_url in database.

**Mutation Function**:
```typescript
async function updateAvatar(userId: string, file: File) {
  // 1. Upload to Storage
  const fileExt = file.name.split('.').pop()
  const filePath = `${userId}/avatar.${fileExt}`

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true  // Overwrite existing avatar
    })

  if (uploadError) throw uploadError

  // 2. Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('avatars')
    .getPublicUrl(filePath)

  // 3. Update user record
  const { data, error: dbError } = await supabase
    .from('users')
    .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single()

  if (dbError) throw dbError
  return data
}
```

**Progress Tracking**: Use `onUploadProgress` callback if available in future Supabase SDK versions

**Cache Invalidation**: Invalidates `['userProfile', userId]` on success

---

## Validation Rules Summary

### Full Name
- **Client-side**:
  - Not empty (minimum 1 character after trim)
  - Maximum 100 characters
  - Trim leading/trailing whitespace before submit
- **Database**: TEXT column (no database-level constraints beyond type)

### Avatar File
- **Client-side**:
  - File type: `image/jpeg`, `image/png`, `image/webp`
  - File size: ≤2MB (2,097,152 bytes)
  - Filename: Auto-generated as `{user_id}/avatar.{ext}`
- **Storage RLS**: Enforces path ownership (user can only upload to own folder)

### Password
- **Client-side**:
  - Current password: Not empty
  - New password: Minimum 8 characters (Supabase Auth default)
  - Confirm password: Must match new password
  - New password !== current password (optional, but good UX)
- **Server-side**: Supabase Auth enforces minimum length (configured in dashboard)

### Email, Organization, Role
- **Read-only**: No validation needed (cannot be edited in profile)

---

## Error Handling Patterns

### Network Errors
- **Scenario**: Request timeout or offline
- **Handling**: TanStack Query automatic retry (1 time), show toast with "Retry" button

### RLS Policy Violations
- **Scenario**: User tries to update another user's profile (should never happen in correct implementation)
- **Handling**: Supabase returns 403 error, display generic "Permission denied" message, log error for debugging

### Storage Quota Exceeded
- **Scenario**: Organization storage limit reached
- **Handling**: Supabase Storage returns quota error, display "Unable to upload photo. Please contact your organization administrator."

### Concurrent Updates
- **Scenario**: User updates profile in two browser tabs simultaneously
- **Handling**: Last write wins (Supabase default), `onSettled` refetch shows server truth, warn user if detected

### Validation Errors
- **Scenario**: User enters invalid data (empty name, weak password, large file)
- **Handling**: Show inline error messages below form fields, prevent submit until resolved

---

## Testing Strategy

### Unit Tests (Components)
- **UserMenu.test.tsx**: Dropdown open/close, menu items, avatar display
- **UserProfileModal.test.tsx**: Modal open/close, Escape key, focus trap
- **ProfileHeader.test.tsx**: Avatar upload validation, name editing, save/cancel
- **ProfileInfoSection.test.tsx**: Data display, placeholder for null values
- **PasswordChangeForm.test.tsx**: Password validation, show/hide toggle, submit

### Unit Tests (Hooks)
- **useUserProfile.test.ts**: Data fetching, loading states, error handling
- **useUpdateProfile.test.ts**: Optimistic updates, rollback on error, cache invalidation
- **useUpdateAvatar.test.ts**: File upload, URL generation, database update sequence

### Integration Tests
- **profile-workflow.test.tsx**: Complete flow:
  1. Click avatar → Open dropdown
  2. Click "View Profile" → Modal opens
  3. Edit name → Save → Success toast
  4. Upload avatar → Progress → Avatar updates
  5. Change password → Verify → Success toast
  6. Close modal → Focus returns to avatar

### RLS Policy Tests
- **Manual testing** (via Supabase SQL Editor or Postman):
  - User can update own avatar_url: PASS
  - User cannot update another user's avatar_url: FAIL (expected)
  - User can upload to own storage folder: PASS
  - User cannot upload to another user's folder: FAIL (expected)

---

## Performance Considerations

### Caching Strategy
- **User profile**: Cache 5 minutes (infrequent changes)
- **Avatar images**: Browser caches via Supabase CDN (Cache-Control: 3600s)
- **Organization data**: Cached with user profile (joined query)

### Lazy Loading
- **Profile modal**: Components not rendered until modal opens (reduces initial bundle)
- **Avatar images**: Use `loading="lazy"` for avatar lists (future enhancement)

### Bundle Size
- **Radix Dialog**: ~5KB gzipped
- **Radix DropdownMenu**: ~3KB gzipped
- **Total feature cost**: ~8-10KB additional bundle size (acceptable)

---

## Future Enhancements (Out of Scope for MVP)

- Server-side image resizing (Supabase Functions or Edge Functions)
- Avatar cropping tool (react-image-crop or similar)
- Profile completion percentage ("75% complete" indicator)
- Profile visibility settings (public/private)
- Social media links (LinkedIn, GitHub, etc.)
- Two-factor authentication setup
- Session management (view active sessions, revoke access)

---

**Status**: ✅ Data model complete, ready for contracts generation
**Next**: Create TypeScript contracts in `contracts/` directory
