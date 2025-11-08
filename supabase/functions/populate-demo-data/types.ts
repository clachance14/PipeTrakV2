/**
 * Edge Function Types: populate-demo-data
 * Feature: 023-demo-data-population
 */

export interface PopulateDemoDataRequest {
  projectId: string;       // UUID of demo project to populate
  organizationId: string;  // UUID of demo organization
}

export interface PopulateDemoDataResponse {
  success: boolean;
  componentsCreated: number;
  drawingsCreated: number;
  weldsCreated: number;
  milestonesUpdated: number;
  weldersAssigned: number;
  executionTimeMs: number;
  errors?: string[];
}
