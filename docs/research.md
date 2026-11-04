# Feasibility research

## Confirmed direction

- Siemens TIA Openness is the supported automation API for TIA Portal engineering workflows such as project access and supported object export/import.
- Siemens documents that exported SimaticML is tied to the TIA Portal/Openness version performing the export. This prevents a newer installation from simply selecting an older SimaticML schema as an output format.
- Siemens' own Openness examples include software export/import patterns and compatibility libraries, supporting an object-level migration approach rather than direct proprietary database rewriting.

## Primary sources

- Siemens TIA Portal Openness documentation landing page: https://support.industry.siemens.com/cs/document/109815199
- Siemens TIA Portal Openness compatibility library: https://support.industry.siemens.com/cs/document/109815198
- Siemens support search for TIA Openness export/import examples: https://support.industry.siemens.com

## Local observations

A user-owned V18 project entry file is XML and declares both `ProjectCompatibilityVersion="18.0.1.0"` and `ProjectVersion>18.0.1.0`. The surrounding project folder contains proprietary `System/PEData.plf` and `System/PEData.idx` data plus auxiliary SQLite databases. This supports using the entry file for safe metadata inspection while reserving actual content migration for TIA Openness.

A matched user-owned fixture pair was also inspected locally: a V19 `.zap19` archive and the same project after TIA Portal upgraded it to V21. The V21 archive includes a `ConversionLog_19.0.0.0_to_21.0.0.0.xml` record, changed `PEData.plf`/`PEData.idx` payloads, changed auxiliary databases, and a different VCI schema. The conversion log records internal repair, rights/password-hash migration, cross-reference regeneration, package-container removal, and checksum warnings. This is direct evidence that version conversion performs structured transformations rather than an extension or metadata rename. Private fixture content and embedded paths are not committed or displayed by the public app.

## Open questions requiring real installations

- Exact side-by-side installation constraints for V17 plus each source version.
- Which project object families export/import cleanly across each version pair.
- Hardware catalog and option-package downgrade behavior.
- WinCC/HMI and safety object coverage.
- Protected/know-how-protected block behavior.
- Whether archive automation requires restoration through TIA Openness or a documented command surface before export.
