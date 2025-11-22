/**
 * Integration Tests: Package Certificate Form
 * Feature: 030-test-package-workflow (User Story 3)
 *
 * Test Scenarios:
 * 1. Save complete certificate with all required fields
 * 2. Test type "Other" shows conditional text field
 * 3. Draft certificate save (partial data allowed)
 * 4. Required field validation errors
 * 5. Read-only certificate display with edit button
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { PackageDetailPage } from '@/pages/PackageDetailPage';

// Mock Supabase with proper chaining
const mockFrom = vi.fn();
const mockRpc = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
    rpc: (...args: any[]) => mockRpc(...args),
  },
}));

// Mock Auth Context
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id' },
    profile: { organization_id: 'test-org-id', project_id: 'test-project-id' },
  }),
}));

// Mock Project Context
vi.mock('@/contexts/ProjectContext', () => ({
  useProject: () => ({
    selectedProjectId: 'test-project-id',
    projects: [],
  }),
}));

// Mock useParams
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ packageId: 'test-package-id' }),
    useNavigate: () => vi.fn(),
  };
});

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, cacheTime: 0 },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{ui}</BrowserRouter>
    </QueryClientProvider>
  );
}

describe('PackageCertificate - User Story 3', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock package readiness data
    mockRpc.mockImplementation((name: string) => {
      if (name === 'get_package_readiness') {
        return Promise.resolve({
          data: [
            {
              package_id: 'test-package-id',
              package_name: 'Test Package',
              description: 'Test Description',
              target_date: '2024-12-31',
              total_components: 10,
              completed_components: 5,
              test_type: 'hydro',
            },
          ],
          error: null,
        });
      }
      if (name === 'generate_certificate_number') {
        return Promise.resolve({ data: 'CERT-2024-001', error: null });
      }
      return Promise.resolve({ data: null, error: null });
    });

    // Mock component data and certificate data
    mockFrom.mockImplementation((table: string) => {
      if (table === 'components') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: [
              {
                id: 'comp-1',
                component_type: 'spool',
                identity_key: { spool_id: 'SP-001' },
                area_id: 'area-1',
                system_id: 'system-1',
              },
            ],
            error: null,
          }),
        };
      }
      if (table === 'package_certificates') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
          insert: vi.fn().mockReturnThis(),
          update: vi.fn().mockReturnThis(),
        };
      }
      if (table === 'package_workflow_stages') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
    });
  });

  describe('Scenario 1: Save complete certificate with all required fields', () => {
    it('should save certificate when all required fields are filled', async () => {
      const user = userEvent.setup();

      renderWithProviders(<PackageDetailPage />);

      // Wait for page to load
      await waitFor(() => {
        expect(screen.getByText(/certificate/i)).toBeInTheDocument();
      });

      // Fill out all required fields
      const pressureInput = screen.getByLabelText(/test pressure/i);
      await user.clear(pressureInput);
      await user.type(pressureInput, '1125');

      const pressureUnitSelect = screen.getByLabelText(/pressure unit/i);
      await user.selectOptions(pressureUnitSelect, 'PSIG');

      const mediaInput = screen.getByLabelText(/test media/i);
      await user.clear(mediaInput);
      await user.type(mediaInput, 'Condensate');

      const temperatureInput = screen.getByLabelText(/temperature/i);
      await user.clear(temperatureInput);
      await user.type(temperatureInput, '75');

      const temperatureUnitSelect = screen.getByLabelText(/temperature unit/i);
      await user.selectOptions(temperatureUnitSelect, 'F');

      // Optional fields
      const clientInput = screen.getByLabelText(/client/i);
      await user.clear(clientInput);
      await user.type(clientInput, 'DOW');

      const specInput = screen.getByLabelText(/client spec/i);
      await user.clear(specInput);
      await user.type(specInput, 'HC-05');

      // Submit form
      const submitButton = screen.getByRole('button', { name: /submit & begin testing/i });
      await user.click(submitButton);

      // Verify success
      await waitFor(() => {
        expect(screen.getByText(/certificate saved/i)).toBeInTheDocument();
      });
    });
  });

  describe('Scenario 2: Test type "Other" shows conditional text field', () => {
    it('should show "Other" text field when test type is "Other"', async () => {
      const user = userEvent.setup();

      renderWithProviders(<PackageDetailPage />);

      await waitFor(() => {
        expect(screen.getByText(/certificate/i)).toBeInTheDocument();
      });

      // Find test type dropdown (should be pre-filled from package)
      const testTypeSelect = screen.getByLabelText(/test type/i);

      // Change to "Other"
      await user.selectOptions(testTypeSelect, 'Other');

      // Verify conditional field appears
      await waitFor(() => {
        expect(screen.getByLabelText(/specify test type/i)).toBeInTheDocument();
      });

      // Change to different test type
      await user.selectOptions(testTypeSelect, 'Hydrostatic Test');

      // Verify conditional field disappears
      await waitFor(() => {
        expect(screen.queryByLabelText(/specify test type/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Scenario 3: Draft certificate save (partial data allowed)', () => {
    it('should save draft with partial data', async () => {
      const user = userEvent.setup();

      renderWithProviders(<PackageDetailPage />);

      await waitFor(() => {
        expect(screen.getByText(/certificate/i)).toBeInTheDocument();
      });

      // Fill only some fields
      const clientInput = screen.getByLabelText(/client/i);
      await user.clear(clientInput);
      await user.type(clientInput, 'DOW');

      // Click "Save as Draft" (should not validate required fields)
      const draftButton = screen.getByRole('button', { name: /save as draft/i });
      await user.click(draftButton);

      // Verify success (no validation errors)
      await waitFor(() => {
        expect(screen.getByText(/draft saved/i)).toBeInTheDocument();
      });
    });
  });

  describe('Scenario 4: Required field validation errors', () => {
    it('should show validation errors when submitting incomplete form', async () => {
      const user = userEvent.setup();

      renderWithProviders(<PackageDetailPage />);

      await waitFor(() => {
        expect(screen.getByText(/certificate/i)).toBeInTheDocument();
      });

      // Try to submit without filling required fields
      const submitButton = screen.getByRole('button', { name: /submit & begin testing/i });
      await user.click(submitButton);

      // Verify validation errors
      await waitFor(() => {
        expect(screen.getByText(/test pressure is required/i)).toBeInTheDocument();
        expect(screen.getByText(/test media is required/i)).toBeInTheDocument();
        expect(screen.getByText(/temperature is required/i)).toBeInTheDocument();
      });
    });
  });

  describe('Scenario 5: Read-only certificate display with edit button', () => {
    it('should display read-only certificate with edit button when certificate exists', async () => {
      const user = userEvent.setup();

      // Mock existing certificate data
      const mockCertificate = {
        id: 'cert-1',
        package_id: 'test-package-id',
        certificate_number: 'PKG-001',
        test_pressure: 1125,
        pressure_unit: 'PSIG',
        test_media: 'Condensate',
        temperature: 75,
        temperature_unit: 'F',
        client: 'DOW',
        client_spec: 'HC-05',
        line_number: 'LINE-100',
      };

      vi.mocked(vi.importActual('@/lib/supabase')).supabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockCertificate, error: null }),
      } as any);

      renderWithProviders(<PackageDetailPage />);

      // Wait for certificate to load
      await waitFor(() => {
        expect(screen.getByText('PKG-001')).toBeInTheDocument();
      });

      // Verify read-only display
      expect(screen.getByText('1125 PSIG')).toBeInTheDocument();
      expect(screen.getByText('Condensate')).toBeInTheDocument();
      expect(screen.getByText('75 F')).toBeInTheDocument();
      expect(screen.getByText('DOW')).toBeInTheDocument();
      expect(screen.getByText('HC-05')).toBeInTheDocument();

      // Verify edit button exists
      const editButton = screen.getByRole('button', { name: /edit certificate/i });
      expect(editButton).toBeInTheDocument();

      // Click edit button
      await user.click(editButton);

      // Verify form appears (edit mode)
      await waitFor(() => {
        expect(screen.getByLabelText(/test pressure/i)).toBeInTheDocument();
      });
    });
  });

  describe('Scenario 6: Workflow stages auto-created on certificate submission', () => {
    it('should automatically create 7 workflow stages when certificate is created', async () => {
      const user = userEvent.setup();

      // Mock package query (no certificate yet)
      mockFrom.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'test-package-id',
            name: 'Test Package',
            test_type: 'Hydrostatic',
          },
          error: null,
        }),
      }));

      // Mock certificate query (none exists)
      mockFrom.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' }, // Not found
        }),
      }));

      // Mock workflow stages query (none exist yet)
      mockFrom.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }));

      // Mock components query
      mockFrom.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }));

      renderWithProviders(<PackageDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('Test Package')).toBeInTheDocument();
      });

      // Fill out certificate form
      const testPressureInput = screen.getByLabelText(/test pressure/i);
      const testMediaInput = screen.getByLabelText(/test media/i);
      const temperatureInput = screen.getByLabelText(/temperature/i);

      await user.clear(testPressureInput);
      await user.type(testPressureInput, '1125');
      await user.type(testMediaInput, 'Water');
      await user.clear(temperatureInput);
      await user.type(temperatureInput, '75');

      // Mock certificate number generation
      mockRpc.mockResolvedValueOnce({
        data: 'PKG-001',
        error: null,
      });

      // Mock certificate creation
      const createdCertificate = {
        id: 'cert-id',
        package_id: 'test-package-id',
        certificate_number: 'PKG-001',
        test_pressure: 1125,
        pressure_unit: 'PSIG',
        test_media: 'Water',
        temperature: 75,
        temperature_unit: 'F',
        client: null,
        client_spec: null,
        line_number: null,
      };

      mockFrom.mockImplementationOnce(() => ({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: createdCertificate,
          error: null,
        }),
      }));

      // Mock workflow stages creation (this should be called automatically)
      const mockWorkflowInsert = vi.fn().mockReturnThis();
      const mockWorkflowSelect = vi.fn().mockResolvedValue({
        data: [
          { id: 'stage-1', package_id: 'test-package-id', stage_name: 'Pre-Hydro Acceptance', stage_order: 1, status: 'not_started' },
          { id: 'stage-2', package_id: 'test-package-id', stage_name: 'Test Acceptance', stage_order: 2, status: 'not_started' },
          { id: 'stage-3', package_id: 'test-package-id', stage_name: 'Drain/Flush Acceptance', stage_order: 3, status: 'not_started' },
          { id: 'stage-4', package_id: 'test-package-id', stage_name: 'Post-Hydro Acceptance', stage_order: 4, status: 'not_started' },
          { id: 'stage-5', package_id: 'test-package-id', stage_name: 'Protective Coatings Acceptance', stage_order: 5, status: 'not_started' },
          { id: 'stage-6', package_id: 'test-package-id', stage_name: 'Insulation Acceptance', stage_order: 6, status: 'not_started' },
          { id: 'stage-7', package_id: 'test-package-id', stage_name: 'Final Package Acceptance', stage_order: 7, status: 'not_started' },
        ],
        error: null,
      });

      mockFrom.mockImplementationOnce(() => ({
        insert: mockWorkflowInsert,
        select: mockWorkflowSelect,
      }));

      // Submit certificate
      const submitButton = screen.getByRole('button', { name: /submit & begin testing/i });
      await user.click(submitButton);

      // Verify workflow stages were created
      await waitFor(() => {
        expect(mockWorkflowInsert).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              package_id: 'test-package-id',
              stage_name: 'Pre-Hydro Acceptance',
              stage_order: 1,
              status: 'not_started',
            }),
            expect.objectContaining({
              package_id: 'test-package-id',
              stage_name: 'Test Acceptance',
              stage_order: 2,
              status: 'not_started',
            }),
            expect.objectContaining({
              package_id: 'test-package-id',
              stage_name: 'Drain/Flush Acceptance',
              stage_order: 3,
              status: 'not_started',
            }),
            expect.objectContaining({
              package_id: 'test-package-id',
              stage_name: 'Post-Hydro Acceptance',
              stage_order: 4,
              status: 'not_started',
            }),
            expect.objectContaining({
              package_id: 'test-package-id',
              stage_name: 'Protective Coatings Acceptance',
              stage_order: 5,
              status: 'not_started',
            }),
            expect.objectContaining({
              package_id: 'test-package-id',
              stage_name: 'Insulation Acceptance',
              stage_order: 6,
              status: 'not_started',
            }),
            expect.objectContaining({
              package_id: 'test-package-id',
              stage_name: 'Final Package Acceptance',
              stage_order: 7,
              status: 'not_started',
            }),
          ])
        );
      });
    });
  });
});
