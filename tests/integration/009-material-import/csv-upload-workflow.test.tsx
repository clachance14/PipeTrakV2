/**
 * Integration Test: CSV Upload Workflow
 * Tests the complete CSV import workflow from file upload to component creation
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

describe('CSV Upload Workflow Integration', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  it('uploads valid CSV and displays success message', async () => {
    const user = userEvent.setup();

    render(
      <QueryClientProvider client={queryClient}>
        <ImportPage />
      </QueryClientProvider>
    );

    // Create mock CSV file
    const csvContent = `DRAWING,TYPE,QTY,CMDTY CODE,SPEC,DESCRIPTION,SIZE,Comments
P-001,Valve,2,VBALU-001,ES-03,Test Valve,2,Test comment`;
    const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

    // Find and interact with dropzone
    const dropzone = screen.getByText(/drag csv or click to upload/i);

    // Simulate file drop
    await user.upload(dropzone, file);

    // Wait for success message
    await waitFor(() => {
      expect(screen.getByText(/successfully imported 2 components/i)).toBeInTheDocument();
    }, { timeout: 10000 });

    // Verify summary shows correct counts
    expect(screen.getByText(/2 components/i)).toBeInTheDocument();
    expect(screen.getByText(/1 rows? processed/i)).toBeInTheDocument();
  });

  it('shows upload progress during import', async () => {
    const user = userEvent.setup();

    render(
      <QueryClientProvider client={queryClient}>
        <ImportPage />
      </QueryClientProvider>
    );

    const csvContent = `DRAWING,TYPE,QTY,CMDTY CODE
P-001,Valve,100,VBALU-001`;
    const file = new File([csvContent], 'large-test.csv', { type: 'text/csv' });

    const dropzone = screen.getByText(/drag csv or click to upload/i);
    await user.upload(dropzone, file);

    // Progress indicator should appear
    await waitFor(() => {
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  it('handles drag-and-drop upload', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ImportPage />
      </QueryClientProvider>
    );

    const csvContent = `DRAWING,TYPE,QTY,CMDTY CODE
P-001,Valve,1,V001`;
    const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

    const dropzone = screen.getByText(/drag csv or click to upload/i);

    // Simulate drag over
    await userEvent.dragOver(dropzone, [file]);

    // Dropzone should show active state
    expect(screen.getByText(/drop csv here/i)).toBeInTheDocument();
  });

  it('rejects non-CSV files', async () => {
    const user = userEvent.setup();

    render(
      <QueryClientProvider client={queryClient}>
        <ImportPage />
      </QueryClientProvider>
    );

    const file = new File(['{}'], 'test.json', { type: 'application/json' });
    const dropzone = screen.getByText(/drag csv or click to upload/i);

    await user.upload(dropzone, file);

    // Error message should appear
    await waitFor(() => {
      expect(screen.getByText(/only csv files/i)).toBeInTheDocument();
    });
  });

  it('enforces 5MB file size limit', async () => {
    const user = userEvent.setup();

    render(
      <QueryClientProvider client={queryClient}>
        <ImportPage />
      </QueryClientProvider>
    );

    // Create large file (>5MB)
    const largeContent = 'DRAWING,TYPE,QTY,CMDTY CODE\n' + 'P-001,Valve,1,V001\n'.repeat(200000);
    const file = new File([largeContent], 'large.csv', { type: 'text/csv' });

    const dropzone = screen.getByText(/drag csv or click to upload/i);
    await user.upload(dropzone, file);

    // Error message should appear
    await waitFor(() => {
      expect(screen.getByText(/file too large.*5mb/i)).toBeInTheDocument();
    });
  });
});
