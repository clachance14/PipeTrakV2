import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * PDF Export customization options for Package Workflow Reports
 */
export interface PackageWorkflowPDFOptions {
  // Content Filtering - Package Information
  includePackageInfo: boolean;
  includeDescription: boolean;
  includeTestType: boolean;
  includeTargetDate: boolean;
  includeRequirements: boolean;

  // Content Filtering - Workflow Stages
  includeSkippedStages: boolean;
  showStageData: boolean;
  showSignOffs: boolean;

  // Custom Text Fields
  customTitle?: string;
  customHeaderText?: string;
  customNotes?: string;

  // Layout Options
  viewMode: 'summary' | 'detailed';
  includeCompanyLogo: boolean;

  // Data Transformations
  stageStatusFilter: 'all' | 'completed' | 'in-progress' | 'not-started';
}

/**
 * Default PDF export options
 */
export const DEFAULT_PDF_OPTIONS: PackageWorkflowPDFOptions = {
  // Package Information defaults - all enabled
  includePackageInfo: true,
  includeDescription: true,
  includeTestType: true,
  includeTargetDate: true,
  includeRequirements: true,

  // Workflow Stages defaults
  includeSkippedStages: true,
  showStageData: true,
  showSignOffs: true,

  // Custom Text defaults - empty
  customTitle: undefined,
  customHeaderText: undefined,
  customNotes: undefined,

  // Layout defaults
  viewMode: 'detailed',
  includeCompanyLogo: true,

  // Data Transformations defaults
  stageStatusFilter: 'all',
};

interface PackageWorkflowCustomizationStore {
  options: PackageWorkflowPDFOptions;
  setOption: <K extends keyof PackageWorkflowPDFOptions>(
    key: K,
    value: PackageWorkflowPDFOptions[K]
  ) => void;
  setOptions: (options: Partial<PackageWorkflowPDFOptions>) => void;
  resetToDefaults: () => void;
}

/**
 * Zustand store for Package Workflow PDF customization preferences.
 * Persists to localStorage to remember user's last customization choices.
 */
export const usePackageWorkflowCustomizationStore = create<PackageWorkflowCustomizationStore>()(
  persist(
    (set) => ({
      options: DEFAULT_PDF_OPTIONS,

      setOption: (key, value) =>
        set((state) => ({
          options: {
            ...state.options,
            [key]: value,
          },
        })),

      setOptions: (newOptions) =>
        set((state) => ({
          options: {
            ...state.options,
            ...newOptions,
          },
        })),

      resetToDefaults: () =>
        set({
          options: DEFAULT_PDF_OPTIONS,
        }),
    }),
    {
      name: 'pipetrak:package-workflow-pdf-options',
      onRehydrateStorage: () => (_state, error) => {
        if (error) {
          console.error('Failed to load Package Workflow PDF preferences:', error);
        }
      },
    }
  )
);
