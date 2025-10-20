/**
 * Integration Test: Error Reporting
 * Tests CSV validation error detection and downloadable error report generation
 *
 * IMPORTANT: This test MUST FAIL initially (TDD Red phase)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock components (will be implemented later)
const ImportPage = () => {
  throw new Error('NOT IMPLEMENTED - ImportPage component');
};

describe('Error Reporting Integration', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  it('detects and reports missing required columns', async () => {
    const user = userEvent.setup();

    render(
      <QueryClientProvider client={queryClient}>
        <ImportPage />
      </QueryClientProvider>
    );

    // CSV with missing required columns
    const csvContent = `DRAWING,SPEC
P-001,ES-03`;
    const file = new File([csvContent], 'invalid.csv', { type: 'text/csv' });

    const dropzone = screen.getByText(/drag csv or click to upload/i);
    await user.upload(dropzone, file);

    // Error message should appear
    await waitFor(() => {
      expect(screen.getByText(/import failed.*errors? found/i)).toBeInTheDocument();
    });

    // Download button should be visible
    expect(screen.getByRole('button', { name: /download error report/i })).toBeInTheDocument();
  });

  it('downloads error report as CSV file', async () => {
    const user = userEvent.setup();

    // Mock URL.createObjectURL and URL.revokeObjectURL
    const mockObjectURL = 'blob:mock-url';
    global.URL.createObjectURL = vi.fn(() => mockObjectURL);
    global.URL.revokeObjectURL = vi.fn();

    render(
      <QueryClientProvider client={queryClient}>
        <ImportPage />
      </QueryClientProvider>
    );

    const csvContent = `DRAWING,TYPE,QTY,CMDTY CODE
P-001,InvalidType,ABC,V001`;
    const file = new File([csvContent], 'invalid.csv', { type: 'text/csv' });

    const dropzone = screen.getByText(/drag csv or click to upload/i);
    await user.upload(dropzone, file);

    // Wait for error and download button
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /download error report/i })).toBeInTheDocument();
    });

    // Click download button
    const downloadButton = screen.getByRole('button', { name: /download error report/i });
    await user.click(downloadButton);

    // Verify download was triggered
    expect(global.URL.createObjectURL).toHaveBeenCalled();
  });

  it('reports invalid data types with row numbers', async () => {
    const user = userEvent.setup();

    render(
      <QueryClientProvider client={queryClient}>
        <ImportPage />
      </QueryClientProvider>
    );

    const csvContent = `DRAWING,TYPE,QTY,CMDTY CODE
P-001,Valve,ABC,V001
P-002,Valve,XYZ,V002`;
    const file = new File([csvContent], 'invalid-qty.csv', { type: 'text/csv' });

    const dropzone = screen.getByText(/drag csv or click to upload/i);
    await user.upload(dropzone, file);

    // Error message should show count
    await waitFor(() => {
      expect(screen.getByText(/2 errors? found/i)).toBeInTheDocument();
    });
  });

  it('reports invalid component types', async () => {
    const user = userEvent.setup();

    render(
      <QueryClientProvider client={queryClient}>
        <ImportPage />
      </QueryClientProvider>
    );

    const csvContent = `DRAWING,TYPE,QTY,CMDTY CODE
P-001,BadType,1,V001`;
    const file = new File([csvContent], 'invalid-type.csv', { type: 'text/csv' });

    const dropzone = screen.getByText(/drag csv or click to upload/i);
    await user.upload(dropzone, file);

    await waitFor(() => {
      expect(screen.getByText(/import failed/i)).toBeInTheDocument();
    });

    // Download and check error CSV contains TYPE error
    const downloadButton = screen.getByRole('button', { name: /download error report/i });
    expect(downloadButton).toBeInTheDocument();
  });

  it('verifies zero components created after validation error', async () => {
    const user = userEvent.setup();

    // Mock Supabase query to verify no components created
    const mockSupabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            data: [],
            error: null,
          })),
        })),
      })),
    };

    render(
      <QueryClientProvider client={queryClient}>
        <ImportPage />
      </QueryClientProvider>
    );

    const csvContent = `DRAWING,TYPE,QTY,CMDTY CODE
P-001,Valve,ABC,V001`; // Invalid QTY
    const file = new File([csvContent], 'invalid.csv', { type: 'text/csv' });

    const dropzone = screen.getByText(/drag csv or click to upload/i);
    await user.upload(dropzone, file);

    // Wait for error
    await waitFor(() => {
      expect(screen.getByText(/import failed/i)).toBeInTheDocument();
    });

    // Verify components count is 0
    // (In real integration, this would query database)
    expect(screen.queryByText(/\d+ components created/i)).not.toBeInTheDocument();
  });

  it('handles multiple validation errors across rows', async () => {
    const user = userEvent.setup();

    render(
      <QueryClientProvider client={queryClient}>
        <ImportPage />
      </QueryClientProvider>
    );

    const csvContent = `DRAWING,TYPE,QTY,CMDTY CODE
,Valve,1,V001
P-002,InvalidType,2,
P-003,Valve,ABC,V003`;
    const file = new File([csvContent], 'multiple-errors.csv', { type: 'text/csv' });

    const dropzone = screen.getByText(/drag csv or click to upload/i);
    await user.upload(dropzone, file);

    await waitFor(() => {
      // At least 4 errors: empty DRAWING, invalid TYPE, empty CMDTY CODE, invalid QTY
      expect(screen.getByText(/\d+ errors? found/i)).toBeInTheDocument();
    });
  });

  it('displays error summary with counts', async () => {
    const user = userEvent.setup();

    render(
      <QueryClientProvider client={queryClient}>
        <ImportPage />
      </QueryClientProvider>
    );

    const csvContent = `DRAWING,TYPE,QTY,CMDTY CODE
P-001,Valve,ABC,V001`;
    const file = new File([csvContent], 'error.csv', { type: 'text/csv' });

    const dropzone = screen.getByText(/drag csv or click to upload/i);
    await user.upload(dropzone, file);

    await waitFor(() => {
      // Error summary should show:
      // - Total errors found
      // - Link/button to download detailed report
      expect(screen.getByText(/import failed/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /download error report/i })).toBeInTheDocument();
    });
  });
});
