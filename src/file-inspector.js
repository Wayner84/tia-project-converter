import { inspectProjectEntry, inspectZapArchive, parseVersion, DEFAULT_MAX_BYTES } from './inspector.js';

export async function inspectLocalFile(file, { maxBytes = DEFAULT_MAX_BYTES } = {}) {
  if (!Number.isSafeInteger(file?.size) || file.size < 0 || file.size > maxBytes) throw new Error(`Input size exceeds the ${maxBytes} byte safety limit.`);
  if (!parseVersion(file?.name)) throw new Error('Unsupported TIA project/archive extension. Use .apXX or .zapXX.');
  if (/\.zap\d+$/i.test(file.name)) return inspectZapArchive({ name: file.name, size: file.size, bytes: new Uint8Array(await file.arrayBuffer()), maxBytes });
  return inspectProjectEntry({ name: file.name, size: file.size, text: await file.text(), maxBytes });
}
