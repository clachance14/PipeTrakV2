interface ProfileInfoSectionProps {
  email: string
  organizationName: string | null
  role: string | null
}

function formatRole(role: string | null): string {
  if (!role) return ''

  // Convert snake_case to Title Case
  return role
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function ProfileInfoSection({
  email,
  organizationName,
  role,
}: ProfileInfoSectionProps) {
  return (
    <dl className="space-y-4">
      <div>
        <dt className="text-sm font-medium text-slate-500">Email</dt>
        <dd className="mt-1 text-sm text-slate-900">{email}</dd>
      </div>

      <div>
        <dt className="text-sm font-medium text-slate-500">Organization</dt>
        <dd className="mt-1 text-sm text-slate-900">
          {organizationName || 'No organization'}
        </dd>
      </div>

      {role && (
        <div>
          <dt className="text-sm font-medium text-slate-500">Role</dt>
          <dd className="mt-1 text-sm text-slate-900">{formatRole(role)}</dd>
        </div>
      )}
    </dl>
  )
}
