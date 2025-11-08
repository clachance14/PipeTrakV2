/**
 * Avatar Display Component
 * Feature: 017-user-profile-management
 * Purpose: Display user avatar (photo URL or initials fallback)
 */

interface AvatarProps {
  /** Avatar image URL (or null for fallback) */
  url: string | null
  /** User email (for initials fallback) */
  email: string
  /** Avatar size in pixels */
  size?: number
  /** Additional CSS classes */
  className?: string
}

export function Avatar({ url, email, size = 32, className = '' }: AvatarProps) {
  const initial = email.charAt(0).toUpperCase()

  if (url) {
    return (
      <img
        src={url}
        alt="Avatar"
        className={`rounded-full object-cover ${className}`}
        style={{ width: size, height: size }}
        onError={(e) => {
          // Fallback to initials if image fails to load
          const target = e.target as HTMLImageElement
          target.style.display = 'none'
        }}
      />
    )
  }

  // Fallback: Initial letter avatar
  return (
    <div
      className={`rounded-full bg-slate-600 flex items-center justify-center text-white font-semibold ${className}`}
      style={{ width: size, height: size, fontSize: size / 2 }}
    >
      {initial}
    </div>
  )
}
