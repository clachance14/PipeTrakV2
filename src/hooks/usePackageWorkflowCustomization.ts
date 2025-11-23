import { useState, useCallback } from 'react';
import { PackageWorkflowPDFOptions } from '@/stores/usePackageWorkflowCustomizationStore';

/**
 * Modal state for Package Workflow customization dialog
 */
interface CustomizationState {
  isOpen: boolean;
  tempOptions: PackageWorkflowPDFOptions | null;
}

/**
 * Hook for managing Package Workflow customization modal state.
 * Separates modal UI state from persisted preferences (Zustand store).
 *
 * Pattern:
 * - openCustomization() loads current options into temp state
 * - User edits in modal (modifies temp state)
 * - saveCustomization() commits temp state to store
 * - closeCustomization() discards temp state without saving
 *
 * Similar to usePDFPreviewState pattern.
 */
export function usePackageWorkflowCustomization() {
  const [state, setState] = useState<CustomizationState>({
    isOpen: false,
    tempOptions: null,
  });

  /**
   * Open customization modal with initial options
   */
  const openCustomization = useCallback((initialOptions: PackageWorkflowPDFOptions) => {
    setState({
      isOpen: true,
      tempOptions: { ...initialOptions }, // Clone to prevent direct mutation
    });
  }, []);

  /**
   * Close customization modal without saving (discard changes)
   */
  const closeCustomization = useCallback(() => {
    setState({
      isOpen: false,
      tempOptions: null,
    });
  }, []);

  /**
   * Update a single option in temp state (while modal is open)
   */
  const updateTempOption = useCallback(
    <K extends keyof PackageWorkflowPDFOptions>(
      key: K,
      value: PackageWorkflowPDFOptions[K]
    ) => {
      setState((prev) => {
        if (!prev.tempOptions) return prev;
        return {
          ...prev,
          tempOptions: {
            ...prev.tempOptions,
            [key]: value,
          },
        };
      });
    },
    []
  );

  /**
   * Update multiple options in temp state at once
   */
  const updateTempOptions = useCallback((updates: Partial<PackageWorkflowPDFOptions>) => {
    setState((prev) => {
      if (!prev.tempOptions) return prev;
      return {
        ...prev,
        tempOptions: {
          ...prev.tempOptions,
          ...updates,
        },
      };
    });
  }, []);

  return {
    customizationState: state,
    openCustomization,
    closeCustomization,
    updateTempOption,
    updateTempOptions,
  };
}
