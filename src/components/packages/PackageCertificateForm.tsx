/**
 * Component: PackageCertificateForm
 * Feature: 030-test-package-workflow (User Story 3)
 *
 * Form for filling out Pipe Testing Acceptance Certificate.
 * Both "Save as Draft" and "Submit" require full validation (DB constraints enforce this).
 * Draft: Saves certificate only (workflow stages not created).
 * Submit: Saves certificate AND triggers workflow creation.
 */

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  usePackageCertificate,
  useCreateCertificate,
  useUpdateCertificate,
  type CreateCertificateInput,
  type UpdateCertificateInput,
} from '@/hooks/usePackageCertificate';
import { useCreateWorkflowStages } from '@/hooks/usePackageWorkflow';
import type { TestType } from '@/types/package.types';

// Validation schema for complete certificate (submit mode)
// Note: test_type is read from the package, not from this form
// Using string fields for numbers due to HTML input type="number" returning strings
const certificateSchema = z.object({
  client: z.string().optional(),
  client_spec: z.string().optional(),
  line_number: z.string().optional(),
  test_pressure: z.string().min(1, 'Test pressure is required'),
  pressure_unit: z.enum(['PSIG', 'BAR', 'KPA', 'PSI']),
  test_media: z.string().min(1, 'Test media is required'),
  temperature: z.string().min(1, 'Temperature is required'),
  temperature_unit: z.enum(['F', 'C', 'K']),
});

type CertificateFormValues = z.infer<typeof certificateSchema>;

interface PackageCertificateFormProps {
  packageId: string;
  projectId: string;
  packageName: string;
  packageTestType: TestType | null;
  onSuccess?: () => void;
}

export function PackageCertificateForm({
  packageId,
  projectId,
  packageName,
  packageTestType,
  onSuccess,
}: PackageCertificateFormProps) {
  const { data: certificate, isLoading } = usePackageCertificate(packageId);
  const createMutation = useCreateCertificate();
  const updateMutation = useUpdateCertificate();
  const createWorkflowStages = useCreateWorkflowStages();

  const form = useForm({
    resolver: zodResolver(certificateSchema),
    defaultValues: {
      client: '',
      client_spec: '',
      line_number: '',
      test_pressure: '',
      pressure_unit: 'PSIG' as const,
      test_media: '',
      temperature: '',
      temperature_unit: 'F' as const,
    },
  });

  // Pre-fill form if certificate exists
  useEffect(() => {
    if (certificate) {
      form.reset({
        client: certificate.client || '',
        client_spec: certificate.client_spec || '',
        line_number: certificate.line_number || '',
        test_pressure: String(certificate.test_pressure),
        pressure_unit: certificate.pressure_unit,
        test_media: certificate.test_media,
        temperature: String(certificate.temperature),
        temperature_unit: certificate.temperature_unit,
      });
    }
  }, [certificate, form]);

  const handleDraftSave = async () => {
    // Run validation to satisfy DB constraints
    // (test_pressure > 0, test_media non-empty, temperature required)
    const values = certificateSchema.parse(form.getValues());

    const input: CreateCertificateInput | UpdateCertificateInput = certificate
      ? {
          id: certificate.id,
          client: values.client || null,
          client_spec: values.client_spec || null,
          line_number: values.line_number || null,
          test_pressure: parseFloat(values.test_pressure),
          pressure_unit: values.pressure_unit,
          test_media: values.test_media,
          temperature: parseFloat(values.temperature),
          temperature_unit: values.temperature_unit,
        }
      : {
          package_id: packageId,
          project_id: projectId,
          client: values.client || null,
          client_spec: values.client_spec || null,
          line_number: values.line_number || null,
          test_pressure: parseFloat(values.test_pressure),
          pressure_unit: values.pressure_unit,
          test_media: values.test_media,
          temperature: parseFloat(values.temperature),
          temperature_unit: values.temperature_unit,
        };

    if (certificate) {
      await updateMutation.mutateAsync(input as UpdateCertificateInput);
    } else {
      // Create certificate as draft (workflow stages NOT created)
      await createMutation.mutateAsync(input as CreateCertificateInput);
    }

    onSuccess?.();
  };

  const onSubmit = async (values: CertificateFormValues) => {
    const input: CreateCertificateInput | UpdateCertificateInput = certificate
      ? {
          id: certificate.id,
          client: values.client || null,
          client_spec: values.client_spec || null,
          line_number: values.line_number || null,
          test_pressure: parseFloat(values.test_pressure),
          pressure_unit: values.pressure_unit,
          test_media: values.test_media,
          temperature: parseFloat(values.temperature),
          temperature_unit: values.temperature_unit,
        }
      : {
          package_id: packageId,
          project_id: projectId,
          client: values.client || null,
          client_spec: values.client_spec || null,
          line_number: values.line_number || null,
          test_pressure: parseFloat(values.test_pressure),
          pressure_unit: values.pressure_unit,
          test_media: values.test_media,
          temperature: parseFloat(values.temperature),
          temperature_unit: values.temperature_unit,
        };

    if (certificate) {
      await updateMutation.mutateAsync(input as UpdateCertificateInput);
    } else {
      // Create certificate
      await createMutation.mutateAsync(input as CreateCertificateInput);

      // Auto-create 7 workflow stages after certificate is created
      await createWorkflowStages.mutateAsync({ packageId });
    }

    onSuccess?.();
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending || createWorkflowStages.isPending;

  if (isLoading) {
    return <div className="p-4 text-gray-500">Loading certificate...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <h2 className="text-lg font-semibold">Pipe Testing Acceptance Certificate</h2>
        <p className="text-sm text-gray-500">
          Package: {packageName}
          {certificate && (
            <span className="ml-2 text-blue-600">
              Certificate #{certificate.certificate_number}
            </span>
          )}
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Test Type (Read-only - from package) */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Test Type</label>
            <div className="px-3 py-2 bg-gray-50 border rounded-md text-sm">
              {packageTestType || 'Not specified'}
            </div>
            <p className="text-xs text-gray-500">
              Test type is set when creating the package and cannot be changed here.
            </p>
          </div>

          {/* Grid layout for form fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Client */}
            <FormField
              control={form.control}
              name="client"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter client name..."
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Client Spec */}
            <FormField
              control={form.control}
              name="client_spec"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client Specification</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter specification..."
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Line Number */}
            <FormField
              control={form.control}
              name="line_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Line Number</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter line number..."
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Test Pressure */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="test_pressure"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>
                    Test Pressure <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Enter pressure value..."
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="pressure_unit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pressure Unit</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger disabled={isSubmitting}>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="PSIG">PSIG</SelectItem>
                      <SelectItem value="BAR">BAR</SelectItem>
                      <SelectItem value="KPA">KPA</SelectItem>
                      <SelectItem value="PSI">PSI</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Test Media */}
          <FormField
            control={form.control}
            name="test_media"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Test Media <span className="text-red-500">*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter test media (e.g., Condensate, Water, Air)..."
                    {...field}
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Temperature */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="temperature"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>
                    Temperature <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Enter temperature value..."
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="temperature_unit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Temperature Unit</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger disabled={isSubmitting}>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="F">F (Fahrenheit)</SelectItem>
                      <SelectItem value="C">C (Celsius)</SelectItem>
                      <SelectItem value="K">K (Kelvin)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleDraftSave}
              disabled={isSubmitting}
            >
              Save as Draft
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Submit & Begin Testing'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
