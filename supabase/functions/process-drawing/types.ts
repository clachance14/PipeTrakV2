export interface ProcessDrawingRequest {
  projectId: string;
  filePath: string;
  /** 1-based page number for multi-page PDFs. Omit or null for single-page. */
  pageNumber?: number;
  /** Total pages in the PDF (informational, for progress tracking). */
  totalPages?: number;
}

export interface TitleBlockData {
  drawing_number: string | null;
  sheet_number: string | null;
  line_number: string | null;
  material: string | null;
  schedule: string | null;
  spec: string | null;
  nde_class: string | null;
  pwht: boolean;
  revision: string | null;
  hydro: string | null;
  insulation: string | null;
}

export interface BomItem {
  item_type: 'material' | 'support';
  classification: string;
  section: 'shop' | 'field';
  description: string | null;
  size: string | null;
  size_2: string | null;
  quantity: number;
  uom: string | null;
  spec: string | null;
  material_grade: string | null;
  schedule: string | null;
  schedule_2: string | null;
  rating: string | null;
  commodity_code: string | null;
  end_connection: string | null;
  item_number: number | null;
  needs_review: boolean;
  review_reason: string | null;
}

export interface ProcessingResult {
  success: boolean;
  drawingsProcessed: number;
  componentsCreated: number;
  bomItemsStored: number;
  spoolsCreated: number;
  errors: string[];
}
