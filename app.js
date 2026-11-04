import { inspectLocalFile } from './src/file-inspector.js';
import { createMigrationPlan } from './src/planner.js';

const $ = (id) => document.getElementById(id);
const input = $('file-input'); const dropzone = $('dropzone'); const target = $('target'); const download = $('download'); const report = $('report');
let current;
for (let version = 17; version <= 21; version += 1) { const option = document.createElement('option'); option.value = version; option.textContent = `TIA Portal V${version}`; target.append(option); }
$('pick').addEventListener('click', () => input.click());
input.addEventListener('change', () => input.files[0] && inspectFile(input.files[0]));
['dragover','dragenter'].forEach((event) => dropzone.addEventListener(event, (e) => { e.preventDefault(); dropzone.classList.add('active'); }));
['dragleave','drop'].forEach((event) => dropzone.addEventListener(event, (e) => { e.preventDefault(); dropzone.classList.remove('active'); }));
dropzone.addEventListener('drop', (e) => e.dataTransfer.files[0] && inspectFile(e.dataTransfer.files[0]));
$('demo').addEventListener('click', () => inspectFile({ name: 'synthetic-demo.ap18', size: 512, text: async () => '<Data Type="Project" ProjectCompatibilityVersion="18.0.1.0"><ProjectVersion>18.0.1.0</ProjectVersion></Data>' }));
target.addEventListener('change', updatePlan); download.addEventListener('click', () => { const plan = createMigrationPlan({ source: current, targetVersion: Number(target.value) }); const blob = new Blob([JSON.stringify(plan, null, 2)], { type: 'application/json' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `${current.name.replace(/\.[^.]+$/, '')}-migration-plan.json`; link.click(); URL.revokeObjectURL(link.href); });
async function inspectFile(file) { try { current = await inspectLocalFile(file); renderReport(); target.disabled = false; updatePlan(); } catch (error) { current = null; target.disabled = true; download.disabled = true; report.innerHTML = `<div class="report-box error"><h3>Inspection rejected</h3><p>${escapeHtml(error.message)}</p></div>`; } }
function renderReport() { const archive = current.kind === 'archive'; report.innerHTML = `<div class="report-box ${archive ? 'warn' : ''}"><h3>${archive ? 'Archive metadata recorded' : 'Project metadata inspected'}</h3><p><strong>${escapeHtml(current.name)}</strong> · ${current.size.toLocaleString()} bytes · detected V${current.detectedVersion}</p><p>${archive ? 'Archive ZIP structure and root project metadata were inspected locally; proprietary project payloads were not opened.' : 'Only the entry XML was read; proprietary project data was not opened.'}</p>${current.versionDisagreements.length ? `<p><strong>Version warning:</strong> ${escapeHtml(current.versionDisagreements.join(' '))}</p>` : ''}</div>`; }
function updatePlan() { if (!current) return; const version = Number(target.value); download.disabled = version >= current.detectedVersion || version < 17; }
function escapeHtml(value) { return String(value).replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }
