/**
 * Field Weld Utility Functions (Feature 014)
 * Helper functions for formatting and status calculations
 */

export type WeldType = 'BW' | 'SW' | 'FW' | 'TW'
export type NDEType = 'RT' | 'UT' | 'PT' | 'MT'
export type WeldStatus = 'active' | 'accepted' | 'rejected'

/**
 * Format weld type code to readable name
 */
export function formatWeldType(type: string): string {
  const weldTypes: Record<string, string> = {
    BW: 'Butt Weld',
    SW: 'Socket Weld',
    FW: 'Fillet Weld',
    TW: 'Tack Weld',
  }
  return weldTypes[type.toUpperCase()] || type
}

/**
 * Format NDE type code to readable name
 */
export function formatNDEType(type: string): string {
  const ndeTypes: Record<string, string> = {
    RT: 'Radiographic Testing',
    UT: 'Ultrasonic Testing',
    PT: 'Penetrant Testing',
    MT: 'Magnetic Testing',
  }
  return ndeTypes[type.toUpperCase()] || type
}

/**
 * Check if a weld is a repair (has original_weld_id)
 */
export function isRepair(weld: { original_weld_id: string | null }): boolean {
  return weld.original_weld_id !== null
}

/**
 * Get status badge configuration based on weld status
 */
export function getStatusBadgeColor(status: WeldStatus): {
  bgColor: string
  textColor: string
  label: string
  icon: string
} {
  const configs: Record<WeldStatus, { bgColor: string; textColor: string; label: string; icon: string }> = {
    active: {
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-800',
      label: 'Active',
      icon: '🔵',
    },
    accepted: {
      bgColor: 'bg-green-100',
      textColor: 'text-green-800',
      label: 'Accepted',
      icon: '✅',
    },
    rejected: {
      bgColor: 'bg-red-100',
      textColor: 'text-red-800',
      label: 'Rejected',
      icon: '❌',
    },
  }
  return configs[status] || {
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-800',
    label: 'Unknown',
    icon: '❓',
  }
}

/**
 * Format weld size display
 */
export function formatWeldSize(size: string | null): string {
  if (!size) return 'N/A'
  // Replace X with × for better display
  return size.replace(/X/gi, '×')
}

/**
 * Get NDE result badge color
 */
export function getNDEResultColor(result: string | null): string {
  if (!result) return 'bg-gray-100 text-gray-800'
  
  const colors: Record<string, string> = {
    PASS: 'bg-green-100 text-green-800',
    FAIL: 'bg-red-100 text-red-800',
    PENDING: 'bg-yellow-100 text-yellow-800',
  }
  return colors[result.toUpperCase()] || 'bg-gray-100 text-gray-800'
}

/**
 * Calculate completion status label
 */
export function getCompletionLabel(percentComplete: number, status: WeldStatus): string {
  if (status === 'rejected') return 'Rejected'
  if (status === 'accepted') return 'Accepted'
  if (percentComplete === 0) return 'Not Started'
  if (percentComplete === 100) return 'Complete'
  return `${percentComplete}% Complete`
}

/**
 * Format identity key to display string
 * For field welds: "REPAIR-{id}" or "{weld_number}"
 */
export function formatIdentityKey(identityKey: Record<string, unknown> | null, _weldType: string): string {
  if (!identityKey) return 'Unknown'

  // Check if it's a repair weld
  if ('repair_of' in identityKey) {
    const repairId = identityKey.weld_number as string
    return repairId || 'REPAIR'
  }

  // Regular weld ID
  if ('weld_number' in identityKey) {
    return identityKey.weld_number as string
  }

  // Fallback: try to construct from available fields
  const parts: string[] = []
  if ('commodity_code' in identityKey) parts.push(identityKey.commodity_code as string)
  if ('size' in identityKey && identityKey.size !== 'NOSIZE') parts.push(identityKey.size as string)
  if ('seq' in identityKey) parts.push(`(${identityKey.seq})`)

  return parts.length > 0 ? parts.join(' ') : 'Unknown'
}
