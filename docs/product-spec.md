# Product specification

## Product name

**TIA Project Converter**

## Goal

Provide a guided, auditable way to migrate a Siemens TIA Portal project from a newer major release to an older supported release, initially targeting **TIA Portal V17 and newer**. Earlier targets are desirable but remain research targets until proven with real installations and fixtures.

## User outcome

A user selects a TIA Portal project or archive, selects a target version, receives a compatibility report, and—when the required local TIA installations are available—runs an assisted export/rebuild pipeline that produces a separate target-version project plus a detailed migration report.

## Non-negotiable safety rules

1. Never modify the source project in place.
2. Never claim that renaming `.apXX` / `.zapXX` extensions converts a project.
3. Never claim a complete conversion when unsupported objects were skipped.
4. Preserve source and output hashes, tool versions, warnings, and object-level outcomes in a report.
5. Default to a new output directory and retain the original project/archive.
6. Run locally; user project content must not be uploaded by the public website.
7. Treat PLC/HMI/safety code as engineering-critical output requiring compile checks and human review before use.

## Technical reality and chosen architecture

TIA Portal project entry files expose useful XML metadata, but the main project data is stored in proprietary project structures. Siemens documents TIA Openness as the supported automation interface for opening projects and exporting/importing supported objects. Version-specific SimaticML output is tied to the installed TIA Portal/Openness version, so a robust down-conversion pipeline needs isolated workers for the relevant source and target TIA versions rather than a browser-only file rewrite.

The planned pipeline is:

1. **Inspector** — identify project/archive version, source layout, hashes, and conversion prerequisites without modifying it.
2. **Source worker** — use the matching installed TIA Portal + Openness version to open a copy and export supported engineering objects.
3. **Neutral migration bundle** — store exported XML/source files, hardware inventory, diagnostics, and a manifest.
4. **Compatibility transformer** — apply explicit, testable schema/object downgrades only where understood; never silently discard unsupported features.
5. **Target worker** — use the target TIA Portal + Openness version (V17 first) to create/open a clean project and import supported content.
6. **Verifier** — compile supported software units, compare inventories, and emit pass/warn/fail outcomes.

Separate worker processes are required because Siemens Openness assemblies and object models are version-specific.

## Milestones

### M0 — Public project and local-first web inspector

- Public GitHub repository and GitHub Pages site.
- Browser-local project metadata inspection for `.ap17` and newer entry files.
- Archive/project extension detection for `.apXX` / `.zapXX`.
- Target version planning with V17 as the minimum selectable target.
- Downloadable JSON migration plan.
- Clear labels that planning/inspection is not conversion.
- Automated tests and live-route verification.

### M1 — Windows CLI foundation

- Discover installed TIA Portal/Openness versions.
- Inspect unarchived project folders without opening or modifying them.
- Produce deterministic migration manifests and source hashes.
- Dry-run prerequisite checks for source and target workers.

### M2 — V18 to V17 PLC proof

- Use user-owned V18 and V17 installations.
- Export/import a bounded PLC fixture through documented Openness APIs.
- Cover blocks, PLC data types, tag tables, and external source fallbacks where available.
- Compile in V17 and compare object inventory.
- Record unsupported hardware/HMI/safety content explicitly.

### M3 — Additional source versions

- Add one source-version adapter at a time using real fixtures and compile gates.
- Prioritize V19/V20/V21 → V17 after V18 → V17 is proven.

### M4 — Earlier targets

- Investigate V16 and below only after version-specific SDK/install availability, licensing, schemas, and fixtures are confirmed.

## M0 acceptance criteria

- Metadata parser derives version from both filename and XML and reports disagreement.
- Invalid/non-TIA XML is rejected without reading arbitrary external resources.
- Files stay in-browser; there are no upload endpoints or analytics.
- Target selector includes V17 through the newest version represented in the compatibility data.
- Downgrade requests receive explicit risk and prerequisite warnings.
- JSON report includes source identity, detected version, selected target, required local workers, and limitations.
- Static build works under the GitHub Pages project subpath.
- Unit tests, build, browser interaction smoke test, Pages workflow, and live URL all pass.

## Out of scope until proven

- Direct editing of `PEData.plf` / `PEData.idx`.
- Guaranteed preservation of every hardware device, option package, HMI object, drive configuration, safety object, library type, or protected block.
- Cloud conversion of proprietary customer projects.
- Conversion without the legally installed Siemens engineering software required to interpret and rebuild the project.
- Any claim that an output is production-safe without compilation and engineering review.

## Initial real fixture

A local user-owned TIA Portal V18 project is available for metadata and read-only structure inspection. It may be used only as a private local fixture and must never be committed or uploaded.
