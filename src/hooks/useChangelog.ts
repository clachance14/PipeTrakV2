import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import semver from 'semver'

interface GitHubRelease {
  tag_name: string
  name: string
  published_at: string
  body: string
}

const GITHUB_REPO = import.meta.env.VITE_GITHUB_REPO || 'clachance14/PipeTrakV2'

/**
 * Fetch latest GitHub release
 */
async function fetchLatestRelease(): Promise<GitHubRelease | null> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`,
      {
        headers: {
          Accept: 'application/vnd.github+json'
        }
      }
    )

    if (!response.ok) {
      console.warn('GitHub API error:', response.status)
      return null
    }

    return await response.json()
  } catch (error) {
    console.warn('Failed to fetch GitHub release:', error)
    return null
  }
}

/**
 * Strip "v" prefix from version string
 */
function stripVersionPrefix(version: string): string {
  return version.startsWith('v') ? version.slice(1) : version
}

/**
 * Compare two version strings using semver
 * Returns true if newVersion is greater than oldVersion
 */
function isNewerVersion(
  newVersion: string | null,
  oldVersion: string | null
): boolean {
  if (!newVersion) return false
  if (!oldVersion) return true

  const cleanNew = stripVersionPrefix(newVersion)
  const cleanOld = stripVersionPrefix(oldVersion)

  try {
    // Try semver comparison
    const isGreater = semver.gt(cleanNew, cleanOld)
    return isGreater
  } catch (error) {
    // Fallback to string comparison if semver fails
    console.warn('Semver comparison failed, using string comparison:', error)
    return cleanNew > cleanOld
  }
}

/**
 * Update user's last viewed release in database
 */
async function updateLastViewedRelease(
  userId: string,
  version: string
): Promise<void> {
  const cleanVersion = stripVersionPrefix(version)

  const { error } = await supabase
    .from('users')
    .update({ last_viewed_release: cleanVersion })
    .eq('id', userId)

  if (error) {
    console.error('Failed to update last_viewed_release:', error)
    throw error
  }
}

export interface UseChangelogReturn {
  shouldShowModal: boolean
  release: GitHubRelease | null
  markAsViewed: () => Promise<void>
  isLoading: boolean
}

/**
 * Hook to manage changelog modal logic
 * @param userId - Current user ID
 * @param lastViewedRelease - Last release version user viewed (null if never viewed)
 */
export function useChangelog(
  userId: string,
  lastViewedRelease: string | null
): UseChangelogReturn {
  const queryClient = useQueryClient()

  // Fetch latest release from GitHub
  const { data: release, isLoading } = useQuery({
    queryKey: ['github-release', 'latest'],
    queryFn: fetchLatestRelease,
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60, // 1 hour (renamed from cacheTime in v5)
    retry: 1 // Retry once on failure
  })

  // Determine if modal should be shown
  const shouldShowModal =
    release !== null &&
    release !== undefined &&
    isNewerVersion(release.tag_name, lastViewedRelease)

  // Mutation to mark release as viewed
  const markAsViewedMutation = useMutation({
    mutationFn: async () => {
      if (!release) return
      await updateLastViewedRelease(userId, release.tag_name)
    },
    onSuccess: () => {
      // Invalidate user query to refetch updated last_viewed_release
      queryClient.invalidateQueries({ queryKey: ['user', userId] })
    }
  })

  return {
    shouldShowModal,
    release: release ?? null,
    markAsViewed: async () => {
      await markAsViewedMutation.mutateAsync()
    },
    isLoading
  }
}
