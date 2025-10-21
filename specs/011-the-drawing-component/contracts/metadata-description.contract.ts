/**
 * CONTRACT: Metadata Description Editing
 * 
 * Covers:
 * - FR-049 to FR-058: Metadata descriptions
 * 
 * Scenarios:
 * - Scenario 9: Edit metadata description inline
 */

import { describe, it } from 'vitest';

export interface UpdateMetadataDescriptionRequest {
  entity_type: 'area' | 'system' | 'test_package';
  entity_id: string;
  description: string | null;  // NULL clears description
  user_id: string;
}

export interface UpdateMetadataDescriptionResponse {
  success: true;
  entity_id: string;
  description: string | null;
}

export interface MetadataDescriptionService {
  /**
   * Update metadata description (area/system/test_package)
   * PATCH /api/metadata/:type/:id/description
   */
  updateDescription(
    request: UpdateMetadataDescriptionRequest
  ): Promise<UpdateMetadataDescriptionResponse>;
}

describe('Metadata Description Contract', () => {
  it.todo('PATCH /api/metadata/area/:id/description updates area description');
  it.todo('PATCH /api/metadata/system/:id/description updates system description');
  it.todo('PATCH /api/metadata/test_package/:id/description updates test package description');
  
  it.todo('PATCH /api/metadata/:type/:id/description enforces 100 char limit');
  it.todo('PATCH /api/metadata/:type/:id/description allows NULL to clear');
  it.todo('PATCH /api/metadata/:type/:id/description validates user permissions');
  it.todo('PATCH /api/metadata/:type/:id/description validates entity exists');
  it.todo('PATCH /api/metadata/:type/:id/description logs change in audit trail');
});

export const CONTRACT_VERSION = '1.0.0';
