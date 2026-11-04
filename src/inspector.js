import { DOMParser } from '@xmldom/xmldom';
import { unzipSync, strFromU8 } from 'fflate';

export const DEFAULT_MAX_BYTES = 25 * 1024 * 1024;
const DEFAULT_MAX_ENTRIES = 10000;
const DEFAULT_MAX_PROJECT_XML_BYTES = 4 * 1024 * 1024;
const DEFAULT_MAX_COMPRESSION_RATIO = 200;

export function parseVersion(name) { const m = String(name).match(/\.(?:zap|ap)(\d+)$/i); return m ? Number(m[1]) : null; }

function parseVersionToken(value) {
  const token = String(value).trim();
  if (!/^\d+(?:\.\d+){0,3}$/.test(token)) return null;
  const major = Number(token.split('.')[0]);
  return Number.isInteger(major) && major >= 17 && major <= 21 ? major : null;
}

function parseXmlVersion(text) {
  if (/<!DOCTYPE|<!ENTITY/i.test(text)) throw new Error('XML DOCTYPE and entity declarations are not permitted.');
  const errors = []; const doc = new DOMParser({ onError: (e) => errors.push(e) }).parseFromString(text, 'application/xml');
  if (errors.length || !doc?.documentElement || doc.getElementsByTagName('parsererror').length) throw new Error('Malformed XML.');
  const root = doc.documentElement;
  if (!(root.nodeName === 'Project' || (root.nodeName === 'Data' && root.getAttribute('Type') === 'Project'))) throw new Error('The XML is not a recognizable TIA project entry.');
  const values = []; if (root.hasAttribute('ProjectVersion') && Array.from(root.childNodes).some((n) => n.nodeType === 1 && n.nodeName === 'ProjectVersion')) throw new Error('TIA project XML has ambiguous version metadata.');
  if (root.hasAttribute('ProjectCompatibilityVersion')) values.push(root.getAttribute('ProjectCompatibilityVersion'));
  for (let i = 0; i < root.childNodes.length; i += 1) if (root.childNodes[i].nodeType === 1 && root.childNodes[i].nodeName === 'ProjectVersion') values.push(root.childNodes[i].textContent.trim());
  const versions = values.map(parseVersionToken); if (versions.some((v) => v === null)) throw new Error('TIA project XML has an invalid version token.');
  const unique = [...new Set(versions)]; if (unique.length !== 1) throw new Error(unique.length ? 'TIA project XML has ambiguous version metadata.' : 'TIA project XML does not declare a usable project version.'); return unique;
}

export function inspectProjectEntry({ name, size, text = '', maxBytes = DEFAULT_MAX_BYTES }) {
  const filenameVersion = parseVersion(name); if (!filenameVersion) throw new Error('Unsupported TIA project/archive extension. Use .apXX or .zapXX.');
  if (!Number.isSafeInteger(size) || size < 0 || size > maxBytes) throw new Error(`Input size exceeds the ${maxBytes} byte safety limit.`);
  if (/\.zap\d+$/i.test(name)) return { kind: 'archive', name, size, filenameVersion, detectedVersion: filenameVersion, xmlVersions: [], versionDisagreements: [], contentInspection: 'requires-local-archive-inspection' };
  const xmlVersions = parseXmlVersion(String(text)); const detectedVersion = xmlVersions[0];
  return { kind: 'project', name, size, filenameVersion, detectedVersion, xmlVersions, versionDisagreements: filenameVersion === detectedVersion ? [] : [`Filename indicates V${filenameVersion}, but XML metadata indicates V${detectedVersion}.`], contentInspection: 'metadata-only' };
}

function centralEntries(bytes, maxEntries, maxProjectXmlBytes, maxCompressionRatio) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength); let eocd = -1;
  for (let i = bytes.length - 22; i >= 0; i -= 1) if (view.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error('Archive is invalid, encrypted, or unsupported.');
  const disk = view.getUint16(eocd + 4, true), cdDisk = view.getUint16(eocd + 6, true), entriesOnDisk = view.getUint16(eocd + 8, true), count = view.getUint16(eocd + 10, true), cdSize = view.getUint32(eocd + 12, true), cdOffset = view.getUint32(eocd + 16, true), commentLength = view.getUint16(eocd + 20, true);
  if (eocd + 22 + commentLength !== bytes.length || disk || cdDisk || entriesOnDisk !== count || count === 0xffff || cdSize === 0xffffffff || cdOffset === 0xffffffff || count > maxEntries || cdOffset + cdSize !== eocd) throw new Error('Archive central directory exceeds the safety limit or uses unsupported ZIP64/multi-disk/trailing layout.');
  const entries = []; let offset = cdOffset; let total = 0;
  for (let i = 0; i < count; i += 1) {
    if (offset + 46 > eocd || view.getUint32(offset, true) !== 0x02014b50) throw new Error('Archive central directory is invalid.');
    const flags = view.getUint16(offset + 8, true), method = view.getUint16(offset + 10, true), compressed = view.getUint32(offset + 20, true), uncompressed = view.getUint32(offset + 24, true), nameLength = view.getUint16(offset + 28, true), extraLength = view.getUint16(offset + 30, true), commentLength = view.getUint16(offset + 32, true), diskStart = view.getUint16(offset + 34, true);
    if ((flags & 1) || (flags & 0x20) || ![0, 8].includes(method) || diskStart || compressed === 0xffffffff || uncompressed === 0xffffffff) throw new Error('Archive is encrypted, multi-disk, ZIP64, or uses an unsupported compression method.');
    if (offset + 46 + nameLength + extraLength + commentLength > eocd) throw new Error('Archive central directory is invalid.');
    const name = new TextDecoder().decode(bytes.subarray(offset + 46, offset + 46 + nameLength)); entries.push({ name, uncompressed }); total += uncompressed;
    if (!Number.isSafeInteger(total) || uncompressed > maxProjectXmlBytes || total > maxProjectXmlBytes * maxEntries || total / Math.max(1, bytes.length) > maxCompressionRatio) throw new Error('Archive declared uncompressed size or compression ratio exceeds the safety limit.');
    offset += 46 + nameLength + extraLength + commentLength;
  }
  if (offset !== cdOffset + cdSize) throw new Error('Archive central directory size is inconsistent.');
  return entries;
}

export function inspectZapArchive({ name, size, bytes, maxBytes = DEFAULT_MAX_BYTES, maxEntries = DEFAULT_MAX_ENTRIES, maxProjectXmlBytes = DEFAULT_MAX_PROJECT_XML_BYTES, maxCompressionRatio = DEFAULT_MAX_COMPRESSION_RATIO }) {
  const outerVersion = parseVersion(name); if (!outerVersion || !/\.zap\d+$/i.test(name)) throw new Error('Expected a .zapXX archive.');
  if (!(bytes instanceof Uint8Array) || !Number.isSafeInteger(size) || size < 0 || size !== bytes.length) throw new Error('Declared archive size must equal the byte payload length.');
  if (size > maxBytes) throw new Error(`Input size exceeds the ${maxBytes} byte safety limit.`);
  const entries = centralEntries(bytes, maxEntries, maxProjectXmlBytes, maxCompressionRatio); const projects = entries.filter((e) => /\.ap\d+$/i.test(e.name));
  if (projects.length !== 1) throw new Error('Archive must contain exactly one root project entry.'); const projectEntry = projects[0];
  if (projectEntry.name.includes('/') || projectEntry.name.includes('\\')) throw new Error('Project entry must be at archive root.');
  let files; try { files = unzipSync(bytes, { filter: (file) => file.name === projectEntry.name }); } catch { throw new Error('Archive is invalid, encrypted, or unsupported.'); }
  const projectBytes = files[projectEntry.name]; if (!projectBytes || projectBytes.length > maxProjectXmlBytes) throw new Error('Project XML decompressed size exceeds the safety limit.');
  const project = inspectProjectEntry({ name: projectEntry.name, size: projectBytes.length, text: strFromU8(projectBytes) }); if (project.filenameVersion !== outerVersion || project.detectedVersion !== outerVersion) throw new Error('Archive, project entry, and XML versions do not match.');
  const conversionLogs = entries.map(({ name: n }) => n.match(/(?:^|\/)ConversionLog_(\d+)\.0\.0\.0_to_(\d+)\.0\.0\.0\.xml$/i)).filter(Boolean).map((m) => ({ sourceVersion: Number(m[1]), targetVersion: Number(m[2]) }));
  return { kind: 'archive', name, size, filenameVersion: outerVersion, detectedVersion: outerVersion, projectEntry: projectEntry.name, xmlVersions: project.xmlVersions, versionDisagreements: [], conversionLogs, contentInspection: 'bounded-local-metadata-only' };
}