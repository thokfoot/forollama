import { useMemo, useState } from 'react';
import { Plus, Save, Trash2, Youtube } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8001';

function extractYoutubeId(input = '') {
    const raw = String(input || '').trim();
    if (!raw) return '';
    if (/^[A-Za-z0-9_-]{11}$/.test(raw)) return raw;
    const match = raw.match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{11})/);
    return match ? match[1] : '';
}

function flattenNodes(node, acc = []) {
    if (!node || typeof node !== 'object') return acc;
    if (node.id && node.id !== 'start') {
        acc.push({ id: node.id, label: node.label || node.id });
    }
    const children = Array.isArray(node.children) ? node.children : [];
    children.forEach((child) => flattenNodes(child, acc));
    return acc;
}

function newSegment(nodeId = '') {
    return { nodeId, start: '', end: '' };
}

export default function VideoMapper({ token, tree, showToast }) {
    const [youtubeUrl, setYoutubeUrl] = useState('');
    const [professionalName, setProfessionalName] = useState('');
    const [professionId, setProfessionId] = useState('');
    const [segments, setSegments] = useState([newSegment('')]);
    const [saving, setSaving] = useState(false);

    const nodeOptions = useMemo(() => {
        const flat = flattenNodes(tree, []);
        const unique = new Map(flat.map((n) => [n.id, n]));
        return Array.from(unique.values()).sort((a, b) => a.label.localeCompare(b.label));
    }, [tree]);

    const nodeLabelById = useMemo(() => new Map(nodeOptions.map((n) => [n.id, n.label])), [nodeOptions]);

    const youtubeId = useMemo(() => extractYoutubeId(youtubeUrl), [youtubeUrl]);

    const updateSegment = (index, key, value) => {
        setSegments((prev) => prev.map((row, i) => (i === index ? { ...row, [key]: value } : row)));
    };

    const addSegment = () => setSegments((prev) => [...prev, newSegment(professionId)]);
    const removeSegment = (index) => setSegments((prev) => prev.filter((_, i) => i !== index));

    const resetForm = () => {
        setYoutubeUrl('');
        setProfessionalName('');
        setProfessionId('');
        setSegments([newSegment('')]);
    };

    const handleSave = async () => {
        const validSegments = segments
            .map((seg) => ({
                nodeId: String(seg.nodeId || '').trim(),
                start: Number(seg.start),
                end: Number(seg.end),
            }))
            .filter((seg) => seg.nodeId && Number.isFinite(seg.start) && Number.isFinite(seg.end) && seg.end > seg.start);

        if (!youtubeId) {
            showToast?.('Valid YouTube link/ID required', 'error');
            return;
        }
        if (!professionalName.trim()) {
            showToast?.('Professional name required', 'error');
            return;
        }
        if (!professionId) {
            showToast?.('Select profession/node', 'error');
            return;
        }
        if (!validSegments.length) {
            showToast?.('Add at least one valid segment (end > start)', 'error');
            return;
        }

        const payload = {
            title: `${professionalName.trim()} Interview`,
            professionalName: professionalName.trim(),
            youtubeUrl: youtubeUrl.trim(),
            professionId,
            persona: professionId,
            segments: validSegments.map((seg) => ({
                phase: seg.nodeId,
                nodeId: seg.nodeId,
                label: nodeLabelById.get(seg.nodeId) || seg.nodeId,
                start: seg.start,
                end: seg.end,
                startSec: seg.start,
                endSec: seg.end,
            })),
        };

        setSaving(true);
        try {
            const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
            const res = await fetch(`${API}/api/interviews`, {
                method: 'POST',
                headers,
                body: JSON.stringify(payload),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data?.ok) {
                throw new Error(data?.error || 'Failed to save interview mapping');
            }
            showToast?.('Video mapping saved successfully', 'success');
            resetForm();
        } catch (err) {
            showToast?.(err?.message || 'Save failed', 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <main className="h-full overflow-y-auto pw-page-bg p-8">
            <div className="mx-auto max-w-5xl space-y-6">
                <div className="glass-card rounded-2xl p-6">
                    <p className="pw-kicker mb-2">Admin Video Mapper</p>
                    <h2 className="text-2xl font-bold text-white">Interview Segment Mapper</h2>
                    <p className="mt-2 text-sm text-white/65">
                        Paste a YouTube link, pick profession/node, and map multiple start/end segment ranges in seconds.
                    </p>
                </div>

                <div className="glass-card rounded-2xl p-6 space-y-5">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                            <label className="mb-2 block text-xs uppercase tracking-[0.08em] text-white/65">Professional Name</label>
                            <input
                                type="text"
                                value={professionalName}
                                onChange={(e) => setProfessionalName(e.target.value)}
                                placeholder="e.g. Ankit"
                                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white focus:border-[#A89060]/60 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="mb-2 block text-xs uppercase tracking-[0.08em] text-white/65">Profession / Node</label>
                            <select
                                value={professionId}
                                onChange={(e) => {
                                    const next = e.target.value;
                                    setProfessionId(next);
                                    setSegments((prev) => prev.map((row) => ({ ...row, nodeId: row.nodeId || next })));
                                }}
                                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white focus:border-[#A89060]/60 focus:outline-none"
                            >
                                <option value="">Select node</option>
                                {nodeOptions.map((node) => (
                                    <option key={node.id} value={node.id}>
                                        {node.label} ({node.id})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="mb-2 block text-xs uppercase tracking-[0.08em] text-white/65">YouTube Link</label>
                        <div className="flex flex-wrap items-center gap-3">
                            <input
                                type="text"
                                value={youtubeUrl}
                                onChange={(e) => setYoutubeUrl(e.target.value)}
                                placeholder="https://www.youtube.com/watch?v=..."
                                className="min-w-[320px] flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white focus:border-[#A89060]/60 focus:outline-none"
                            />
                            {youtubeId && (
                                <a
                                    href={`https://www.youtube.com/watch?v=${youtubeId}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300 transition-colors hover:bg-red-500/20"
                                >
                                    <Youtube size={14} />
                                    Preview
                                </a>
                            )}
                        </div>
                    </div>
                </div>

                <div className="glass-card rounded-2xl p-6">
                    <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-white">Segments (seconds)</h3>
                        <button
                            type="button"
                            onClick={addSegment}
                            className="inline-flex items-center gap-2 rounded-lg border border-[#A89060]/35 bg-[#A89060]/15 px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#f2dfb3]"
                        >
                            <Plus size={12} />
                            Add Segment
                        </button>
                    </div>

                    <div className="space-y-3">
                        {segments.map((seg, index) => (
                            <div key={`segment-${index}`} className="rounded-xl border border-white/10 bg-black/20 p-4">
                                <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                                    <div className="md:col-span-2">
                                        <label className="mb-1 block text-[11px] uppercase tracking-[0.08em] text-white/50">Phase / Node</label>
                                        <select
                                            value={seg.nodeId}
                                            onChange={(e) => updateSegment(index, 'nodeId', e.target.value)}
                                            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-[#A89060]/60 focus:outline-none"
                                        >
                                            <option value="">Select phase</option>
                                            {nodeOptions.map((node) => (
                                                <option key={`${index}-${node.id}`} value={node.id}>
                                                    {node.label} ({node.id})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-[11px] uppercase tracking-[0.08em] text-white/50">Start Time</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={seg.start}
                                            onChange={(e) => updateSegment(index, 'start', e.target.value)}
                                            placeholder="605"
                                            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-[#A89060]/60 focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-[11px] uppercase tracking-[0.08em] text-white/50">End Time</label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                min="0"
                                                value={seg.end}
                                                onChange={(e) => updateSegment(index, 'end', e.target.value)}
                                                placeholder="860"
                                                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-[#A89060]/60 focus:outline-none"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => removeSegment(index)}
                                                disabled={segments.length === 1}
                                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 disabled:opacity-40"
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-5 flex justify-end">
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={saving}
                            className="inline-flex items-center gap-2 rounded-xl border border-[#A89060]/45 bg-[#A89060]/20 px-5 py-3 text-sm font-semibold text-[#f2dfb3] fx-pop hover:-translate-y-1 disabled:opacity-50"
                        >
                            <Save size={14} />
                            {saving ? 'Saving...' : 'Save Interview Mapping'}
                        </button>
                    </div>
                </div>
            </div>
        </main>
    );
}
