export function createMigrationPlan({ source, targetVersion }) {
  if (!Number.isInteger(targetVersion) || targetVersion < 17) throw new Error('Target must be V17 or newer.');
  if (targetVersion >= source.detectedVersion) throw new Error('Target must be older than the detected source version.');
  const warnings = [
    'Planning only: this browser tool does not convert or rewrite TIA projects.',
    'Downgrade requires a matching installed source worker and target worker.',
    'Engineering-critical output requires compile checks and human review.'
  ];
  if (source.versionDisagreements?.length) warnings.push(...source.versionDisagreements);
  return {
    schema: 'tia-migration-plan/v1', source, targetVersion,
    requiredWorkers: { source: `TIA Portal V${source.detectedVersion} + Openness`, target: `TIA Portal V${targetVersion} + Openness` },
    warnings,
    limitations: [
      'No proprietary project databases are opened or modified.',
      'Unsupported hardware, HMI, safety, library, protected, or option-package objects may not migrate.',
      'Proprietary project payload migration requires restore through matching TIA Portal/Openness workers.'
    ],
    privacy: 'Files are inspected in this browser only; nothing is uploaded and no analytics are used.'
  };
}
