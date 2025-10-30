// Demo Data Template
// Feature: 021-public-homepage
// Task: T007
// Description: Template data for demo projects (200 components, 20 drawings, 10 packages)

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * Template for demo project data
 * Used to populate new demo projects with realistic sample data
 */
export interface DemoTemplate {
  drawings: DemoDrawing[]
  areas: DemoArea[]
  systems: DemoSystem[]
  testPackages: DemoTestPackage[]
  components: DemoComponent[]
}

interface DemoDrawing {
  number: string
  description: string | null
}

interface DemoArea {
  code: string
  name: string
}

interface DemoSystem {
  code: string
  name: string
}

interface DemoTestPackage {
  code: string
  name: string
}

interface DemoComponent {
  drawing_number: string
  line_number: string
  size: string
  spec: string
  service: string | null
  area_code: string
  system_code: string
  test_package_code: string
}

/**
 * Generate demo template data
 * Returns a structured template with 200 components, 20 drawings, 10 packages
 */
export function generateDemoTemplate(): DemoTemplate {
  // 5 Areas
  const areas: DemoArea[] = [
    { code: 'A100', name: 'Utilities Area' },
    { code: 'A200', name: 'Process Area 1' },
    { code: 'A300', name: 'Process Area 2' },
    { code: 'A400', name: 'Storage Area' },
    { code: 'A500', name: 'Loading Area' }
  ]

  // 5 Systems
  const systems: DemoSystem[] = [
    { code: 'S100', name: 'Cooling Water' },
    { code: 'S200', name: 'Process Feed' },
    { code: 'S300', name: 'Product Transfer' },
    { code: 'S400', name: 'Waste Treatment' },
    { code: 'S500', name: 'Fire Protection' }
  ]

  // 10 Test Packages
  const testPackages: DemoTestPackage[] = [
    { code: 'TP-001', name: 'Utilities Package 1' },
    { code: 'TP-002', name: 'Utilities Package 2' },
    { code: 'TP-003', name: 'Process Package 1' },
    { code: 'TP-004', name: 'Process Package 2' },
    { code: 'TP-005', name: 'Process Package 3' },
    { code: 'TP-006', name: 'Transfer Package 1' },
    { code: 'TP-007', name: 'Transfer Package 2' },
    { code: 'TP-008', name: 'Waste Package 1' },
    { code: 'TP-009', name: 'Fire Protection Package' },
    { code: 'TP-010', name: 'Tie-Ins Package' }
  ]

  // 20 Drawings
  const drawings: DemoDrawing[] = [
    { number: 'P-100-001', description: 'Cooling Water Supply - North' },
    { number: 'P-100-002', description: 'Cooling Water Return - North' },
    { number: 'P-100-003', description: 'Cooling Water Supply - South' },
    { number: 'P-100-004', description: 'Cooling Water Return - South' },
    { number: 'P-200-001', description: 'Process Feed Line A' },
    { number: 'P-200-002', description: 'Process Feed Line B' },
    { number: 'P-200-003', description: 'Process Feed Line C' },
    { number: 'P-200-004', description: 'Process Feed Line D' },
    { number: 'P-300-001', description: 'Product Transfer Main' },
    { number: 'P-300-002', description: 'Product Transfer Branch 1' },
    { number: 'P-300-003', description: 'Product Transfer Branch 2' },
    { number: 'P-300-004', description: 'Product Transfer Branch 3' },
    { number: 'P-400-001', description: 'Waste Collection Header' },
    { number: 'P-400-002', description: 'Waste Treatment Feed' },
    { number: 'P-400-003', description: 'Waste Discharge Line' },
    { number: 'P-500-001', description: 'Fire Water Main Loop' },
    { number: 'P-500-002', description: 'Fire Water Branch North' },
    { number: 'P-500-003', description: 'Fire Water Branch South' },
    { number: 'P-500-004', description: 'Fire Water Branch East' },
    { number: 'P-500-005', description: 'Fire Water Branch West' }
  ]

  // 200 Components (10 per drawing, distributed across areas/systems/packages)
  const components: DemoComponent[] = []
  const sizes = ['2"', '3"', '4"', '6"', '8"', '10"', '12"']
  const specs = ['CS150', 'CS300', 'SS316L-150', 'SS316L-300']

  drawings.forEach((drawing, drawingIndex) => {
    const areaIndex = Math.floor(drawingIndex / 4) % areas.length
    const systemIndex = Math.floor(drawingIndex / 4) % systems.length
    const packageIndex = Math.floor(drawingIndex / 2) % testPackages.length

    for (let i = 1; i <= 10; i++) {
      const sizeIndex = Math.floor(Math.random() * sizes.length)
      const specIndex = Math.floor(Math.random() * specs.length)

      components.push({
        drawing_number: drawing.number,
        line_number: `${drawing.number.split('-')[1]}-${String(i).padStart(3, '0')}`,
        size: sizes[sizeIndex],
        spec: specs[specIndex],
        service: drawingIndex < 5 ? 'Cooling Water' :
                 drawingIndex < 9 ? 'Process Feed' :
                 drawingIndex < 13 ? 'Product Transfer' :
                 drawingIndex < 16 ? 'Waste Treatment' :
                 'Fire Protection',
        area_code: areas[areaIndex].code,
        system_code: systems[systemIndex].code,
        test_package_code: testPackages[packageIndex].code
      })
    }
  })

  return {
    drawings,
    areas,
    systems,
    testPackages,
    components
  }
}

/**
 * Clone demo template data to a project
 * Performs bulk INSERT operations in batches of 50 for performance
 *
 * @param supabase - Supabase client (must have service role permissions)
 * @param projectId - Target project UUID
 * @param organizationId - Target organization UUID
 * @returns Statistics about cloned records
 */
export async function cloneDemoDataToProject(
  supabase: SupabaseClient,
  projectId: string,
  organizationId: string
): Promise<{ success: boolean; stats: { areas: number; systems: number; testPackages: number; drawings: number; components: number }; error?: string }> {
  try {
    const template = generateDemoTemplate()

    // Insert areas
    const { data: areasData, error: areasError } = await supabase
      .from('areas')
      .insert(
        template.areas.map(area => ({
          name: area.name,
          description: area.code,
          project_id: projectId
        }))
      )

    if (areasError) throw new Error(`Failed to insert areas: ${areasError.message}`)

    // Insert systems
    const { data: systemsData, error: systemsError } = await supabase
      .from('systems')
      .insert(
        template.systems.map(system => ({
          name: system.name,
          description: system.code,
          project_id: projectId
        }))
      )

    if (systemsError) throw new Error(`Failed to insert systems: ${systemsError.message}`)

    // Insert test packages
    const { data: packagesData, error: packagesError } = await supabase
      .from('test_packages')
      .insert(
        template.testPackages.map(pkg => ({
          name: pkg.name,
          description: pkg.code,
          project_id: projectId
        }))
      )

    if (packagesError) throw new Error(`Failed to insert test packages: ${packagesError.message}`)

    // Insert drawings
    const { data: drawingsData, error: drawingsError } = await supabase
      .from('drawings')
      .insert(
        template.drawings.map(drawing => ({
          ...drawing,
          project_id: projectId,
          organization_id: organizationId
        }))
      )

    if (drawingsError) throw new Error(`Failed to insert drawings: ${drawingsError.message}`)

    // Insert components in batches of 50
    const batchSize = 50
    let componentsInserted = 0

    for (let i = 0; i < template.components.length; i += batchSize) {
      const batch = template.components.slice(i, i + batchSize)

      const { data: componentsData, error: componentsError } = await supabase
        .from('components')
        .insert(
          batch.map(component => ({
            ...component,
            project_id: projectId,
            organization_id: organizationId
          }))
        )

      if (componentsError) throw new Error(`Failed to insert components batch ${i / batchSize + 1}: ${componentsError.message}`)

      componentsInserted += batch.length
    }

    return {
      success: true,
      stats: {
        areas: template.areas.length,
        systems: template.systems.length,
        testPackages: template.testPackages.length,
        drawings: template.drawings.length,
        components: componentsInserted
      }
    }
  } catch (error) {
    console.error('Error cloning demo data:', error)
    return {
      success: false,
      stats: { areas: 0, systems: 0, testPackages: 0, drawings: 0, components: 0 },
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
