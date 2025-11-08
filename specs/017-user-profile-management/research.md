# Research: User Profile Management

**Feature**: 017-user-profile-management
**Date**: 2025-10-27
**Purpose**: Resolve technical unknowns before implementation

## 1. Supabase Storage Best Practices

### Decision
Use Supabase Storage with public bucket + RLS policies for avatar management.

### Configuration
**Bucket Setup**:
- Bucket name: `avatars`
- Public access: TRUE (allow public reads for profile photos)
- File size limit: 2MB (enforced client-side)
- Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`
- File path pattern: `{user_id}/avatar.{extension}`

**RLS Policies**:
```sql
-- Allow authenticated users to read any avatar (public profile photos)
CREATE POLICY "Public avatars are viewable by authenticated users"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'avatars');

-- Allow users to upload to their own folder only
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to update their own avatar only
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own avatar only
CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

### Rationale
- **Public bucket with RLS**: Allows team members to see each other's avatars (appropriate for team collaboration tool) while preventing unauthorized uploads to other users' folders
- **Path pattern `{user_id}/avatar.{ext}`**: Enforces one avatar per user, automatic overwrite on new upload (no accumulation)
- **RLS enforcement**: Database-level security ensures users cannot upload to paths they don't own, even if client code has bugs

### Alternatives Considered
1. **Private bucket with signed URLs**: Rejected because generating signed URLs for every avatar load adds latency and complexity; profile photos are not sensitive
2. **Cloudinary/Imgix CDN**: Rejected to minimize external dependencies; Supabase Storage sufficient for MVP
3. **Base64 in database**: Rejected due to database bloat and poor performance for image serving

### References
- Supabase Storage RLS: https://supabase.com/docs/guides/storage/security/access-control
- Supabase Storage best practices: https://supabase.com/docs/guides/storage

---

## 2. Supabase Auth Password Changes

### Decision
Use `supabase.auth.updateUser({ password: newPassword })` API without session invalidation.

### Implementation Pattern
```typescript
// Hook: useChangePassword.ts
export function useChangePassword() {
  const mutation = useMutation({
    mutationFn: async (newPassword: string) => {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      toast.success('Password updated successfully')
      // User remains logged in - no redirect needed
    },
    onError: (error) => {
      toast.error('Failed to update password: ' + error.message)
    }
  })
  return mutation
}
```

### Rationale
- **No session invalidation**: Supabase Auth maintains session after password update by design (user convenience)
- **Current password verification**: Not natively supported by Supabase Auth; requires manual check via `signInWithPassword` before update
- **Security trade-off**: Accepting that password changes without current password verification is a UX win; mitigated by fact that user is already authenticated

### Current Password Verification Approach
```typescript
// Verify current password before allowing change
const { error: verifyError } = await supabase.auth.signInWithPassword({
  email: user.email,
  password: currentPassword
})
if (verifyError) {
  throw new Error('Current password is incorrect')
}
// If successful, proceed with password update
await supabase.auth.updateUser({ password: newPassword })
```

### Alternatives Considered
1. **Force re-login after password change**: Rejected as poor UX; user should stay logged in
2. **Server-side password verification**: Rejected as unnecessary complexity for MVP; client-side `signInWithPassword` verification sufficient
3. **Password change email confirmation**: Considered for future enhancement but not MVP requirement

### References
- Supabase Auth updateUser: https://supabase.com/docs/reference/javascript/auth-updateuser
- Supabase Auth signInWithPassword: https://supabase.com/docs/reference/javascript/auth-signinwithpassword

---

## 3. Optimistic UI Updates with TanStack Query

### Decision
Use TanStack Query's `onMutate` + `onError` + `onSettled` lifecycle hooks for optimistic updates with rollback.

### Implementation Pattern
```typescript
// Hook: useUpdateProfile.ts
export function useUpdateProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (newName: string) => {
      const { data, error } = await supabase
        .from('users')
        .update({ full_name: newName })
        .eq('id', userId)
        .select()
        .single()
      if (error) throw error
      return data
    },

    // Optimistic update: Show new value immediately
    onMutate: async (newName) => {
      // Cancel outgoing refetches (prevent overwriting optimistic update)
      await queryClient.cancelQueries({ queryKey: ['userProfile'] })

      // Snapshot previous value for rollback
      const previousProfile = queryClient.getQueryData(['userProfile'])

      // Optimistically update cache
      queryClient.setQueryData(['userProfile'], (old: any) => ({
        ...old,
        full_name: newName
      }))

      // Return context with snapshot for rollback
      return { previousProfile }
    },

    // On error: Rollback to previous value
    onError: (err, newName, context) => {
      queryClient.setQueryData(['userProfile'], context?.previousProfile)
      toast.error('Failed to update name: ' + err.message)
    },

    // On settled: Refetch to sync with server truth
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['userProfile'] })
    }
  })
}
```

### Rationale
- **Immediate feedback**: User sees change instantly (<50ms), no waiting for server round-trip
- **Automatic rollback**: On error, cache automatically reverts to previous state (no manual state management)
- **Server as source of truth**: `onSettled` refetch ensures local state syncs with server, catching concurrent updates

### Alternatives Considered
1. **Manual state management with useState**: Rejected as more complex and error-prone; TanStack Query handles edge cases automatically
2. **No optimistic updates**: Rejected as poor UX; users expect immediate feedback for simple text changes
3. **Debounced auto-save**: Considered for future enhancement but requires more complex conflict resolution

### References
- TanStack Query Optimistic Updates: https://tanstack.com/query/latest/docs/react/guides/optimistic-updates
- TanStack Query Mutations: https://tanstack.com/query/latest/docs/react/guides/mutations

---

## 4. Avatar Image Optimization

### Decision
Client-side validation only (file type, size checks). No resizing before upload. Use browser-native resizing via CSS on display.

### Rationale
- **Simplicity**: Avoid adding image processing libraries (increases bundle size)
- **Browser-native performance**: Modern browsers efficiently render images at display size via CSS
- **File size constraint**: 2MB limit is reasonable for high-quality 256x256 avatars (JPG ~200KB, PNG ~400KB typical)
- **Future enhancement**: Can add server-side or client-side resizing later if storage costs become concern

### Client-side Validation
```typescript
// lib/avatar-utils.ts
export function validateAvatarFile(file: File): { valid: boolean; error?: string } {
  // Check file type
  const validTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (!validTypes.includes(file.type)) {
    return { valid: false, error: 'Invalid file type. Please upload JPG, PNG, or WebP.' }
  }

  // Check file size (2MB = 2 * 1024 * 1024 bytes)
  const maxSize = 2 * 1024 * 1024
  if (file.size > maxSize) {
    return { valid: false, error: 'File too large. Maximum size is 2MB.' }
  }

  return { valid: true }
}
```

### Alternatives Considered
1. **Client-side resizing with canvas API**: Rejected to avoid bundle size increase and complexity; CSS resizing sufficient
2. **Server-side resizing with Supabase Functions**: Considered for future but adds latency to upload flow
3. **Cloudinary/Imgix transformations**: Rejected to minimize external dependencies

### Display Optimization
- Use CSS `object-fit: cover` + `border-radius: 50%` for circular avatars
- Set explicit dimensions (e.g., 128px modal header, 32px navigation) for browser optimization
- Consider lazy loading for avatar lists (future enhancement)

### References
- File API validation: https://developer.mozilla.org/en-US/docs/Web/API/File
- CSS object-fit: https://developer.mozilla.org/en-US/docs/Web/CSS/object-fit

---

## 5. Modal Focus Management

### Decision
Use Radix UI Dialog primitive's built-in focus management. Radix handles focus trap and return focus automatically.

### Implementation
```tsx
// UserProfileModal.tsx
import * as Dialog from '@radix-ui/react-dialog'

export function UserProfileModal({ open, onOpenChange }: Props) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <Dialog.Content
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          // Radix automatically:
          // - Traps focus within Dialog.Content
          // - Returns focus to trigger button on close
          // - Closes on Escape key
        >
          {/* Profile content here */}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
```

### Rationale
- **Zero custom code**: Radix Dialog handles all ARIA attributes, focus trap, and Escape key behavior out of the box
- **WCAG compliance**: Radix primitives tested for accessibility; meets WCAG 2.1 AA requirements
- **Keyboard navigation**: Tab cycles through focusable elements within modal; Escape closes modal

### Radix Dialog Features (Built-in)
- ✅ Focus trap (Tab/Shift+Tab stay within modal)
- ✅ Return focus on close (to trigger button)
- ✅ Escape key to close
- ✅ Click outside to close (configurable)
- ✅ ARIA attributes (`role="dialog"`, `aria-labelledby`, etc.)
- ✅ Scroll lock on body when modal open

### Alternatives Considered
1. **Custom focus trap with manual event listeners**: Rejected as reinventing the wheel and error-prone
2. **React Focus Lock library**: Rejected since Radix Dialog already includes this functionality
3. **Headless UI Dialog**: Considered but Radix better matches shadcn/ui patterns already in use

### References
- Radix UI Dialog: https://www.radix-ui.com/primitives/docs/components/dialog
- WAI-ARIA Dialog Pattern: https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/

---

## Summary of Decisions

| Research Area | Decision | Key Rationale |
|---------------|----------|---------------|
| Supabase Storage | Public bucket + RLS policies | Balances security and performance for team avatars |
| Password Changes | `auth.updateUser` with manual current password check | Maintains session, good UX |
| Optimistic Updates | TanStack Query `onMutate`/`onError`/`onSettled` | Automatic rollback, server as truth |
| Image Optimization | Client-side validation only, no resizing | Simplicity, browser-native performance |
| Focus Management | Radix Dialog primitive | Zero custom code, WCAG compliant |

All decisions align with Constitution v1.0.2 principles:
- ✅ Type Safety: All APIs typed with TypeScript interfaces
- ✅ Component-Driven: Radix primitives follow single responsibility
- ✅ Testing: All decisions testable with Vitest + Testing Library
- ✅ Supabase Integration: RLS policies, TanStack Query wrappers
- ✅ Specify Workflow: Research complete before design phase

**Next**: Phase 1 (data-model.md, contracts/, quickstart.md)
