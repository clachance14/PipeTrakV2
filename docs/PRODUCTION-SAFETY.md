# Production Safety Guide

**Last Updated:** 2025-11-24
**Triggered By:** Critical production bug from incomplete migration (milestone scale change)

## Executive Summary

This guide documents lessons learned from a critical production bug and establishes processes to prevent similar issues in the future.

---

## Incident Report: Milestone Scale Migration (2025-11-24)

### What Happened
- **Migration 20251122152612** changed milestone values from 1/0 to 100/0 scale
- Only updated `update_component_milestone` RPC function
- **Forgot to update:**
  - `calculate_component_percent` function (used by trigger)
  - UI checkbox rendering logic (`checked={value === 1}`)
  - UI onChange handlers (sent boolean instead of numeric)
  - Materialized view refresh mechanism

### Impact
- **Live project affected:** Dark Knight Rail Car Loading (722 components)
- All progress showed 0% despite completed milestones
- Checkboxes displayed incorrectly
- Clicking checkboxes didn't save updates
- Required 3 emergency fixes deployed over 2 hours

### Root Cause
**Incomplete impact analysis before data type change**

---

## Prevention Strategies

### 1. Mandatory Pre-Migration Checklist

For **ANY** data type change, create impact analysis document:

```markdown
## Migration Impact Analysis
**Field:** [field_name]
**Change:** [old_type] → [new_type]
**Date:** [YYYY-MM-DD]

### Database Code Paths
- [ ] RPC functions: [list all]
- [ ] Trigger functions: [list all]
- [ ] Materialized views: [list all]
- [ ] Calculated fields: [list all]

### Frontend Code Paths
- [ ] Read operations: [file:line, file:line]
- [ ] Write operations: [file:line, file:line]
- [ ] Display logic: [file:line, file:line]
- [ ] Form validation: [file:line, file:line]

### Testing Plan
- [ ] Unit tests written
- [ ] Integration tests written
- [ ] Manual testing checklist

### Deployment Plan
- [ ] Staging tested
- [ ] Rollback plan documented
- [ ] Monitoring alerts configured
```

### 2. Automated Testing Requirements

#### Critical Path Tests (MANDATORY)
For milestone updates specifically:

```typescript
// Example: Full milestone update flow test
describe('Milestone update flow', () => {
  it('updates component → triggers recalculation → refreshes view → updates UI', async () => {
    // 1. Update milestone
    await updateMilestone(componentId, 'Receive', 100);

    // 2. Verify trigger fired
    const component = await getComponent(componentId);
    expect(component.percent_complete).toBe(expectedPercent);

    // 3. Verify materialized view updated
    const drawing = await getDrawingProgress(drawingId);
    expect(drawing.avg_percent_complete).toBeGreaterThan(0);

    // 4. Verify UI displays correctly
    render(<ComponentRow component={component} />);
    expect(screen.getByRole('checkbox')).toBeChecked();
  });
});
```

#### Test Coverage Requirements
- **Database functions:** 100% coverage for critical paths
- **Frontend components:** Milestone rendering + updates
- **Integration tests:** Full data flow (DB → UI → DB)

### 3. Staging Environment Protocol

**NEVER deploy data type changes without staging verification:**

1. **Deploy to staging**
   ```bash
   # Apply migration
   ./db-push.sh

   # Run data backfill
   node scripts/backfill_milestone_values.mjs

   # Refresh materialized views
   REFRESH MATERIALIZED VIEW mv_drawing_progress;
   ```

2. **Manual verification checklist:**
   - [ ] Open affected page (drawings, packages, etc.)
   - [ ] Verify data displays correctly
   - [ ] Click all interactive elements
   - [ ] Verify updates save to database
   - [ ] Check calculated values update
   - [ ] Test edge cases (0%, 100%, partial values)

3. **Smoke test script:**
   ```bash
   npm run test:e2e:critical-paths
   ```

### 4. Code Review Requirements

**Data type changes require TWO approvals:**
- One from database/backend team
- One from frontend team

**Review checklist:**
- [ ] Impact analysis document complete
- [ ] All code paths identified and updated
- [ ] Tests written for new behavior
- [ ] Staging verification completed
- [ ] Rollback plan documented

### 5. Deployment Process

**Order of operations:**

1. **Pre-deployment**
   - [ ] Run full test suite
   - [ ] Review deployment checklist
   - [ ] Notify team of deployment window

2. **Database migration**
   ```bash
   ./db-push.sh
   ```

3. **Data backfill** (if needed)
   ```bash
   node scripts/backfill_script.mjs
   ```

4. **Refresh dependent objects**
   ```sql
   REFRESH MATERIALIZED VIEW mv_drawing_progress;
   ```

5. **Frontend deployment**
   ```bash
   git push origin main
   # Vercel auto-deploys
   ```

6. **Post-deployment verification**
   - [ ] Check production logs for errors
   - [ ] Manually verify critical paths work
   - [ ] Monitor user activity for 15 minutes
   - [ ] Verify progress values display correctly

7. **Rollback if issues detected**
   ```bash
   git revert HEAD
   git push origin main
   # Database rollback via migration
   ```

### 6. Monitoring & Alerts

**Set up alerts for:**
- Zero progress values (should trigger if all components show 0%)
- Failed database mutations
- High error rates in milestone updates
- Materialized view staleness

**Monitoring dashboard should show:**
- Average progress across all projects
- Failed mutation count (last hour)
- Materialized view last refresh time

### 7. Documentation Requirements

**After ANY data type change, update:**
- [ ] CLAUDE.md (if pattern changes)
- [ ] Database schema documentation
- [ ] API documentation (if RPC signatures change)
- [ ] Type definitions (database.types.ts)
- [ ] This incident log (if new lessons learned)

---

## Quick Reference: Data Type Change Checklist

```bash
# 1. Impact Analysis
grep -r "field_name" supabase/
grep -r "field_name" src/

# 2. Create migration
supabase migration new change_field_type

# 3. Write tests
npm test -- --watch field_name

# 4. Deploy to staging
./db-push.sh
node scripts/backfill.mjs

# 5. Manual verification
# (Open app, test all affected features)

# 6. Deploy to production
git push origin main

# 7. Monitor
# (Watch logs for 15 minutes)
```

---

## Lessons Learned

### What Worked Well
- Systematic debugging approach identified root cause quickly
- Materialized view + trigger solution prevents future staleness
- Comprehensive fix covered all affected code paths

### What Could Be Improved
- **Pre-migration impact analysis** - Should have used checklist
- **Staging testing** - Should have caught UI issues before production
- **Automated tests** - Integration tests would have caught calculation bug
- **Incremental rollout** - Could deploy to single project first

### Action Items
- [x] Add data type change checklist to CLAUDE.md
- [x] Create PRODUCTION-SAFETY.md guide
- [ ] Add E2E tests for milestone update flow
- [ ] Set up staging environment verification script
- [ ] Create monitoring dashboard for progress values
- [ ] Add pre-commit hook to check for data type changes

---

## Contact

If you encounter a production issue:
1. **Document the issue** - Screenshots, error messages, affected users
2. **Assess severity** - Is data lost? Is app unusable?
3. **Follow systematic debugging** - Use superpowers:systematic-debugging skill
4. **Communicate** - Notify team of issue and ETA for fix
5. **Post-mortem** - Update this document with lessons learned

---

**Remember:** Data type changes have cascading effects. When in doubt, over-communicate and over-test.
