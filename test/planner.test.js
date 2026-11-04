import test from 'node:test';
import assert from 'node:assert/strict';
import { createMigrationPlan } from '../src/planner.js';

test('creates a deterministic local migration plan with workers and warnings', () => {
  const plan = createMigrationPlan({
    source: { name: 'Line.ap18', size: 128, detectedVersion: 18, kind: 'project' },
    targetVersion: 17
  });
  assert.deepEqual(plan, {
    schema: 'tia-migration-plan/v1',
    source: { name: 'Line.ap18', size: 128, detectedVersion: 18, kind: 'project' },
    targetVersion: 17,
    requiredWorkers: { source: 'TIA Portal V18 + Openness', target: 'TIA Portal V17 + Openness' },
    warnings: [
      'Planning only: this browser tool does not convert or rewrite TIA projects.',
      'Downgrade requires a matching installed source worker and target worker.',
      'Engineering-critical output requires compile checks and human review.'
    ],
    limitations: [
      'No proprietary project databases are opened or modified.',
      'Unsupported hardware, HMI, safety, library, protected, or option-package objects may not migrate.',
      'Proprietary project payload migration requires restore through matching TIA Portal/Openness workers.'
    ],
    privacy: 'Files are inspected in this browser only; nothing is uploaded and no analytics are used.'
  });
  assert.equal(JSON.stringify(plan), JSON.stringify(createMigrationPlan({ source: plan.source, targetVersion: 17 })));
});

test('rejects targets below V17 and targets not older than the source', () => {
  const source = { name: 'Line.ap18', size: 1, detectedVersion: 18, kind: 'project' };
  assert.throws(() => createMigrationPlan({ source, targetVersion: 16 }), /V17/i);
  assert.throws(() => createMigrationPlan({ source, targetVersion: 18 }), /older/i);
});
