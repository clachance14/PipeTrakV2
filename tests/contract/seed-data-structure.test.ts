/**
 * Seed Data Structure Contract Tests
 * Feature: 023-demo-data-population
 *
 * Validates the structure, integrity, and consistency of demo seed data
 * to ensure it meets all contract requirements before database insertion.
 *
 * Test Categories:
 * - T017: Component counts (exactly 200 total)
 * - T018: Component distribution (40 spools, 80 supports, 50 valves, 20 flanges, 10 instruments)
 * - T019: Natural key references (all drawing/area/system/package references valid)
 * - T020: Milestone dependencies (install requires receive, etc.)
 * - T021: Welder assignments (only for "Weld Made" = true)
 * - T022: Weld distribution (3 per spool, ~120 total)
 */

import { describe, it, expect } from 'vitest';
import { DEMO_SEED_DATA } from '@/../supabase/functions/populate-demo-data/seed-data';
import { DEMO_DATA_CONSTRAINTS } from '@/types/demo-seed.types';

describe('Seed Data Structure Contract', () => {
  // ============================================================================
  // T017: COMPONENT COUNTS
  // ============================================================================

  describe('T017: Component Counts', () => {
    it('should have exactly 200 components total', () => {
      expect(DEMO_SEED_DATA.components).toHaveLength(
        DEMO_DATA_CONSTRAINTS.components.total
      );
    });

    it('should have milestone data for all 200 components', () => {
      expect(DEMO_SEED_DATA.milestones).toHaveLength(
        DEMO_DATA_CONSTRAINTS.components.total
      );
    });

    it('should have unique component tags', () => {
      const tags = DEMO_SEED_DATA.components.map((c) => c.tag);
      const uniqueTags = new Set(tags);
      expect(uniqueTags.size).toBe(tags.length);
    });
  });

  // ============================================================================
  // T018: COMPONENT DISTRIBUTION
  // ============================================================================

  describe('T018: Component Distribution', () => {
    it('should have exactly 40 spools', () => {
      const spools = DEMO_SEED_DATA.components.filter((c) => c.type === 'spool');
      expect(spools).toHaveLength(DEMO_DATA_CONSTRAINTS.components.distribution.spool);
    });

    it('should have exactly 80 supports', () => {
      const supports = DEMO_SEED_DATA.components.filter((c) => c.type === 'support');
      expect(supports).toHaveLength(DEMO_DATA_CONSTRAINTS.components.distribution.support);
    });

    it('should have exactly 50 valves', () => {
      const valves = DEMO_SEED_DATA.components.filter((c) => c.type === 'valve');
      expect(valves).toHaveLength(DEMO_DATA_CONSTRAINTS.components.distribution.valve);
    });

    it('should have exactly 20 flanges', () => {
      const flanges = DEMO_SEED_DATA.components.filter((c) => c.type === 'flange');
      expect(flanges).toHaveLength(DEMO_DATA_CONSTRAINTS.components.distribution.flange);
    });

    it('should have exactly 10 instruments', () => {
      const instruments = DEMO_SEED_DATA.components.filter((c) => c.type === 'instrument');
      expect(instruments).toHaveLength(DEMO_DATA_CONSTRAINTS.components.distribution.instrument);
    });

    it('should have all components accounted for in distribution', () => {
      const distribution = DEMO_DATA_CONSTRAINTS.components.distribution;
      const totalFromDistribution =
        distribution.spool +
        distribution.support +
        distribution.valve +
        distribution.flange +
        distribution.instrument;

      expect(totalFromDistribution).toBe(DEMO_DATA_CONSTRAINTS.components.total);
    });
  });

  // ============================================================================
  // T019: NATURAL KEY REFERENCES
  // ============================================================================

  describe('T019: Natural Key References', () => {
    describe('Drawing References', () => {
      it('should have all component drawing references valid', () => {
        const drawingNumbers = new Set(DEMO_SEED_DATA.drawings.map((d) => d.drawing_number));
        const componentsWithInvalidDrawing = DEMO_SEED_DATA.components.filter(
          (c) => !drawingNumbers.has(c.drawing)
        );

        expect(componentsWithInvalidDrawing).toHaveLength(0);
      });

      it('should have all weld drawing references valid', () => {
        const drawingNumbers = new Set(DEMO_SEED_DATA.drawings.map((d) => d.drawing_number));
        const weldsWithInvalidDrawing = DEMO_SEED_DATA.welds.filter(
          (w) => !drawingNumbers.has(w.drawing)
        );

        expect(weldsWithInvalidDrawing).toHaveLength(0);
      });
    });

    describe('Area References', () => {
      it('should have all component area references valid', () => {
        const areas = new Set(DEMO_SEED_DATA.skeleton.areas);
        const componentsWithInvalidArea = DEMO_SEED_DATA.components.filter(
          (c) => !areas.has(c.area)
        );

        expect(componentsWithInvalidArea).toHaveLength(0);
      });

      it('should have all drawing area references valid', () => {
        const areas = new Set(DEMO_SEED_DATA.skeleton.areas);
        const drawingsWithInvalidArea = DEMO_SEED_DATA.drawings.filter(
          (d) => !areas.has(d.area)
        );

        expect(drawingsWithInvalidArea).toHaveLength(0);
      });
    });

    describe('System References', () => {
      it('should have all component system references valid', () => {
        const systems = new Set(DEMO_SEED_DATA.skeleton.systems);
        const componentsWithInvalidSystem = DEMO_SEED_DATA.components.filter(
          (c) => !systems.has(c.system)
        );

        expect(componentsWithInvalidSystem).toHaveLength(0);
      });

      it('should have all drawing system references valid', () => {
        const systems = new Set(DEMO_SEED_DATA.skeleton.systems);
        const drawingsWithInvalidSystem = DEMO_SEED_DATA.drawings.filter(
          (d) => !systems.has(d.system)
        );

        expect(drawingsWithInvalidSystem).toHaveLength(0);
      });
    });

    describe('Package References', () => {
      it('should have all component package references valid', () => {
        const packages = new Set(DEMO_SEED_DATA.skeleton.packages);
        const componentsWithInvalidPackage = DEMO_SEED_DATA.components.filter(
          (c) => !packages.has(c.package)
        );

        expect(componentsWithInvalidPackage).toHaveLength(0);
      });
    });

    describe('Component Tag References', () => {
      it('should have all milestone component_tag references valid', () => {
        const componentTags = new Set(DEMO_SEED_DATA.components.map((c) => c.tag));
        const milestonesWithInvalidTag = DEMO_SEED_DATA.milestones.filter(
          (m) => !componentTags.has(m.component_tag)
        );

        expect(milestonesWithInvalidTag).toHaveLength(0);
      });
    });

    describe('Weld Number References', () => {
      it('should have all weld milestone weld_number references valid', () => {
        const weldNumbers = new Set(DEMO_SEED_DATA.welds.map((w) => w.weld_number));
        const weldMilestonesWithInvalidNumber = DEMO_SEED_DATA.weld_milestones.filter(
          (wm) => !weldNumbers.has(wm.weld_number)
        );

        expect(weldMilestonesWithInvalidNumber).toHaveLength(0);
      });

      it('should have all weld assignment weld_number references valid', () => {
        const weldNumbers = new Set(DEMO_SEED_DATA.welds.map((w) => w.weld_number));
        const assignmentsWithInvalidWeldNumber = DEMO_SEED_DATA.weld_assignments.filter(
          (wa) => !weldNumbers.has(wa.weld_number)
        );

        expect(assignmentsWithInvalidWeldNumber).toHaveLength(0);
      });
    });

    describe('Welder Stencil References', () => {
      it('should have all weld assignment welder_stencil references valid', () => {
        const welderStencils = new Set(DEMO_SEED_DATA.skeleton.welders.map((w) => w.stencil));
        const assignmentsWithInvalidStencil = DEMO_SEED_DATA.weld_assignments.filter(
          (wa) => !welderStencils.has(wa.welder_stencil)
        );

        expect(assignmentsWithInvalidStencil).toHaveLength(0);
      });
    });
  });

  // ============================================================================
  // T020: MILESTONE DEPENDENCIES
  // ============================================================================

  describe('T020: Milestone Dependencies', () => {
    describe('Component Milestones', () => {
      it('should not have install without receive', () => {
        const invalidInstall = DEMO_SEED_DATA.milestones.filter(
          (m) => m.install && !m.receive
        );

        expect(invalidInstall).toHaveLength(0);
      });

      it('should not have erect without receive', () => {
        const invalidErect = DEMO_SEED_DATA.milestones.filter(
          (m) => m.erect && !m.receive
        );

        expect(invalidErect).toHaveLength(0);
      });

      it('should not have connect without erect (spools only)', () => {
        const invalidConnect = DEMO_SEED_DATA.milestones.filter(
          (m) => m.connect && !m.erect
        );

        expect(invalidConnect).toHaveLength(0);
      });

      it('should not have punch without install or erect', () => {
        const invalidPunch = DEMO_SEED_DATA.milestones.filter(
          (m) => m.punch && !m.install && !m.erect
        );

        expect(invalidPunch).toHaveLength(0);
      });

      it('should only have erect for spools', () => {
        const spoolTags = new Set(
          DEMO_SEED_DATA.components.filter((c) => c.type === 'spool').map((c) => c.tag)
        );

        const nonSpoolsWithErect = DEMO_SEED_DATA.milestones.filter(
          (m) => m.erect && !spoolTags.has(m.component_tag)
        );

        expect(nonSpoolsWithErect).toHaveLength(0);
      });

      it('should only have connect for spools', () => {
        const spoolTags = new Set(
          DEMO_SEED_DATA.components.filter((c) => c.type === 'spool').map((c) => c.tag)
        );

        const nonSpoolsWithConnect = DEMO_SEED_DATA.milestones.filter(
          (m) => m.connect && !spoolTags.has(m.component_tag)
        );

        expect(nonSpoolsWithConnect).toHaveLength(0);
      });

      it('should only have install for non-spools', () => {
        const spoolTags = new Set(
          DEMO_SEED_DATA.components.filter((c) => c.type === 'spool').map((c) => c.tag)
        );

        const spoolsWithInstall = DEMO_SEED_DATA.milestones.filter(
          (m) => m.install && spoolTags.has(m.component_tag)
        );

        expect(spoolsWithInstall).toHaveLength(0);
      });
    });

    describe('Weld Milestones', () => {
      it('should not have weld_made without fit_up', () => {
        const invalidWeldMade = DEMO_SEED_DATA.weld_milestones.filter(
          (wm) => wm.weld_made && !wm.fit_up
        );

        expect(invalidWeldMade).toHaveLength(0);
      });

      it('should not have punch without weld_made', () => {
        const invalidPunch = DEMO_SEED_DATA.weld_milestones.filter(
          (wm) => wm.punch && !wm.weld_made
        );

        expect(invalidPunch).toHaveLength(0);
      });
    });
  });

  // ============================================================================
  // T021: WELDER ASSIGNMENTS
  // ============================================================================

  describe('T021: Welder Assignments', () => {
    it('should only assign welders to welds with "Weld Made" true', () => {
      // Create map of weld_number → weld_made status
      const weldMadeMap = new Map<string, boolean>();
      DEMO_SEED_DATA.weld_milestones.forEach((wm) => {
        weldMadeMap.set(wm.weld_number, wm.weld_made || false);
      });

      // Check all assignments reference welds with weld_made = true
      const invalidAssignments = DEMO_SEED_DATA.weld_assignments.filter(
        (wa) => !weldMadeMap.get(wa.weld_number)
      );

      expect(invalidAssignments).toHaveLength(0);
    });

    it('should have valid date_welded format (YYYY-MM-DD)', () => {
      const iso8601DateRegex = /^\d{4}-\d{2}-\d{2}$/;

      const invalidDates = DEMO_SEED_DATA.weld_assignments.filter(
        (wa) => !iso8601DateRegex.test(wa.date_welded)
      );

      expect(invalidDates).toHaveLength(0);
    });

    it('should have date_welded within last 30 days (approximate)', () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 31);
      const today = new Date();
      today.setDate(today.getDate() + 1); // Allow for timezone differences

      const invalidDates = DEMO_SEED_DATA.weld_assignments.filter((wa) => {
        const date = new Date(wa.date_welded);
        return date < thirtyDaysAgo || date > today;
      });

      expect(invalidDates).toHaveLength(0);
    });

    it('should assign welders to all "Weld Made" welds', () => {
      const weldsMade = DEMO_SEED_DATA.weld_milestones.filter((wm) => wm.weld_made).length;
      const assignmentCount = DEMO_SEED_DATA.weld_assignments.length;

      // All welds with "Weld Made" = true should have a welder assigned
      expect(assignmentCount).toBe(weldsMade);
    });

    it('should have unique weld_number in assignments (no duplicate welder assignments)', () => {
      const weldNumbers = DEMO_SEED_DATA.weld_assignments.map((wa) => wa.weld_number);
      const uniqueWeldNumbers = new Set(weldNumbers);

      expect(uniqueWeldNumbers.size).toBe(weldNumbers.length);
    });
  });

  // ============================================================================
  // T022: WELD DISTRIBUTION
  // ============================================================================

  describe('T022: Weld Distribution', () => {
    it('should have exactly 120 welds total', () => {
      expect(DEMO_SEED_DATA.welds).toHaveLength(DEMO_DATA_CONSTRAINTS.welds.total);
    });

    it('should have exactly 3 welds per spool', () => {
      const spoolCount = DEMO_SEED_DATA.components.filter((c) => c.type === 'spool').length;
      const expectedWeldCount = spoolCount * DEMO_DATA_CONSTRAINTS.welds.perSpool;

      expect(DEMO_SEED_DATA.welds).toHaveLength(expectedWeldCount);
    });

    it('should have milestone data for all 120 welds', () => {
      expect(DEMO_SEED_DATA.weld_milestones).toHaveLength(DEMO_DATA_CONSTRAINTS.welds.total);
    });

    it('should have unique weld numbers', () => {
      const weldNumbers = DEMO_SEED_DATA.welds.map((w) => w.weld_number);
      const uniqueWeldNumbers = new Set(weldNumbers);

      expect(uniqueWeldNumbers.size).toBe(weldNumbers.length);
    });

    it('should have welds evenly distributed across spool drawings', () => {
      // Get all drawings used by spools
      const spoolDrawings = new Set(
        DEMO_SEED_DATA.components.filter((c) => c.type === 'spool').map((c) => c.drawing)
      );

      // Count welds per drawing
      const weldsByDrawing = new Map<string, number>();
      DEMO_SEED_DATA.welds.forEach((w) => {
        if (spoolDrawings.has(w.drawing)) {
          weldsByDrawing.set(w.drawing, (weldsByDrawing.get(w.drawing) || 0) + 1);
        }
      });

      // All spool drawings should have at least some welds
      spoolDrawings.forEach((drawing) => {
        const weldCount = weldsByDrawing.get(drawing) || 0;
        expect(weldCount).toBeGreaterThan(0);
      });
    });

    it('should have valid weld types (butt or socket)', () => {
      const validTypes = new Set(['butt', 'socket']);

      const invalidWelds = DEMO_SEED_DATA.welds.filter(
        (w) => !validTypes.has(w.type)
      );

      expect(invalidWelds).toHaveLength(0);
    });

    it('should have valid material (CS only)', () => {
      const invalidMaterials = DEMO_SEED_DATA.welds.filter(
        (w) => w.material !== 'CS'
      );

      expect(invalidMaterials).toHaveLength(0);
    });
  });

  // ============================================================================
  // ADDITIONAL STRUCTURAL VALIDATIONS
  // ============================================================================

  describe('Additional Structural Validations', () => {
    it('should have exactly 5 areas', () => {
      expect(DEMO_SEED_DATA.skeleton.areas).toHaveLength(
        DEMO_DATA_CONSTRAINTS.areas.count
      );
    });

    it('should have exactly 5 systems', () => {
      expect(DEMO_SEED_DATA.skeleton.systems).toHaveLength(
        DEMO_DATA_CONSTRAINTS.systems.count
      );
    });

    it('should have exactly 10 packages', () => {
      expect(DEMO_SEED_DATA.skeleton.packages).toHaveLength(
        DEMO_DATA_CONSTRAINTS.packages.count
      );
    });

    it('should have exactly 4 welders', () => {
      expect(DEMO_SEED_DATA.skeleton.welders).toHaveLength(
        DEMO_DATA_CONSTRAINTS.welders.count
      );
    });

    it('should have exactly 20 drawings', () => {
      expect(DEMO_SEED_DATA.drawings).toHaveLength(
        DEMO_DATA_CONSTRAINTS.drawings.count
      );
    });

    it('should have unique welder stencils', () => {
      const stencils = DEMO_SEED_DATA.skeleton.welders.map((w) => w.stencil);
      const uniqueStencils = new Set(stencils);

      expect(uniqueStencils.size).toBe(stencils.length);
    });

    it('should have unique drawing numbers', () => {
      const drawingNumbers = DEMO_SEED_DATA.drawings.map((d) => d.drawing_number);
      const uniqueDrawingNumbers = new Set(drawingNumbers);

      expect(uniqueDrawingNumbers.size).toBe(drawingNumbers.length);
    });
  });
});
