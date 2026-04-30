import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Edit3, X, Save, Youtube, Clock, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { CAREER_SECTIONS_GROUPED } from '../../data/careerSections';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8001';

/** "1:23" → 83 seconds */
function mmssToSec(str) {
    if (!str && str !== 0) return null;
    const s = String(str).trim();
    if (s === '') return null;
    if (/^\d+$/.test(s)) return parseInt(s, 10);
    const parts = s.split(':').map(Number);
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return null;
}

/** 83 → "1:23" */
function secToMmss(sec) {
    if (sec == null || sec === '') return '';
    const n = Number(sec);
    if (isNaN(n)) return '';
    const m = Math.floor(n / 60);
    const s = n % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
}

/** Extract YouTube video ID from URL or raw ID */
function extractYtId(input) {
    const s = String(input).trim();
    const match = s.match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{11})/);
    return match ? match[1] : (s.length === 11 ? s : '');
}

const emptyForm = () => ({
    youtubeId: '',
    title: '',
    profession: '',
    sections: {},
});

function SectionRow({ section, ranges = [], onChange, onAddRange, onRemoveRange }) {
    const [open, setOpen] = useState(false);
    const hasData = ranges.length > 0;
    return (
        <div className={`border rounded-lg transition-colors ${hasData ? 'border-amber-500/30 bg-amber-500/5' : 'border-white/[0.06]'}`}>
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between px-3 py-2 text-left"
            >
                <span className={`text-xs font-medium ${hasData ? 'text-amber-300' : 'text-gray-400'}`}>
                    {section.label}
                    {hasData && (
                        <span className="ml-2 text-amber-500/70 font-mono text-[10px]">
                            {ranges.length} clip{ranges.length !== 1 ? 's' : ''} tagged
                        </span>
                    )}
                </span>
                {open ? <ChevronUp size={12} className="text-gray-500" /> : <ChevronDown size={12} className="text-gray-500" />}
            </button>
            {open && (
                <div className="px-3 pb-3 space-y-2">
                    {ranges.map((range, idx) => (
                        <div key={`${section.id}-${idx}`} className="flex gap-2 items-end">
                            <div className="flex-1">
                                <label className="text-[10px] text-gray-500 block mb-1">Start (m:ss)</label>
                                <input
                                    type="text"
                                    value={range.start || ''}
                                    onChange={e => onChange(section.id, idx, 'start', e.target.value)}
                                    placeholder="e.g. 0:45"
                                    className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white placeholder-gray-600 focus:border-amber-500/40 focus:outline-none font-mono"
                                />
                            </div>
                            <div className="flex-1">
                                <label className="text-[10px] text-gray-500 block mb-1">End (m:ss)</label>
                                <input
                                    type="text"
                                    value={range.end || ''}
                                    onChange={e => onChange(section.id, idx, 'end', e.target.value)}
                                    placeholder="e.g. 3:20"
                                    className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white placeholder-gray-600 focus:border-amber-500/40 focus:outline-none font-mono"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={() => onRemoveRange(section.id, idx)}
                                className="h-7 px-2 rounded bg-red-500/10 border border-red-500/25 text-red-300 hover:bg-red-500/20 text-[10px]"
                            >
                                Remove
                            </button>
                        </div>
                    ))}
                    <button
                        type="button"
                        onClick={() => onAddRange(section.id)}
                        className="text-[10px] uppercase tracking-[0.12em] px-2 py-1 rounded bg-amber-500/12 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20"
                    >
                        + Add Clip Range
                    </button>
                    {hasData && (
                        <p className="text-[10px] text-white/35">Tip: tag multiple interview moments from the same node as separate clip ranges.</p>
                    )}
                </div>
            )}
        </div>
    );
}

function VideoForm({ initial, onSave, onCancel, loading }) {
    const [form, setForm] = useState(() => {
        if (!initial) return emptyForm();
        // Convert seconds back to mm:ss for display (supports V1 object and V2 array)
        const secs = {};
        Object.entries(initial.sections || {}).forEach(([sid, val]) => {
            const rows = Array.isArray(val) ? val : [val];
            secs[sid] = rows.map((r) => ({ start: secToMmss(r?.start), end: secToMmss(r?.end) }));
        });
        return { youtubeId: initial.youtubeId || '', title: initial.title || '', profession: initial.profession || '', sections: secs };
    });

    const [ytUrlInput, setYtUrlInput] = useState(initial?.youtubeId || '');

    const handleUrlBlur = () => {
        const id = extractYtId(ytUrlInput);
        setForm(f => ({ ...f, youtubeId: id || ytUrlInput }));
    };

    const handleSectionChange = (sid, idx, field, val) => {
        setForm(f => ({
            ...f,
            sections: {
                ...f.sections,
                [sid]: (f.sections[sid] || []).map((row, rowIdx) => rowIdx === idx ? { ...row, [field]: val } : row),
            },
        }));
    };

    const handleAddSectionRange = (sid) => {
        setForm(f => ({
            ...f,
            sections: { ...f.sections, [sid]: [...(f.sections[sid] || []), { start: '', end: '' }] },
        }));
    };

    const handleRemoveSectionRange = (sid, idx) => {
        setForm(f => {
            const next = (f.sections[sid] || []).filter((_, i) => i !== idx);
            const sections = { ...f.sections };
            if (next.length === 0) delete sections[sid];
            else sections[sid] = next;
            return { ...f, sections };
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        // Convert mm:ss strings to seconds, keeping multiple clips per section.
        const sections = {};
        Object.entries(form.sections).forEach(([sid, vals]) => {
            const ranges = (Array.isArray(vals) ? vals : [vals])
                .map((row) => {
                    const s = mmssToSec(row?.start);
                    const en = mmssToSec(row?.end);
                    if (s == null && en == null) return null;
                    const range = {};
                    if (s != null) range.start = s;
                    if (en != null) range.end = en;
                    return range;
                })
                .filter(Boolean);
            if (ranges.length > 0) {
                sections[sid] = ranges;
            }
        });
        onSave({ youtubeId: form.youtubeId, title: form.title, profession: form.profession, sections });
    };

    const previewId = extractYtId(ytUrlInput) || form.youtubeId;

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* YouTube URL */}
            <div>
                <label className="text-xs text-gray-400 block mb-1">YouTube URL or Video ID *</label>
                <div className="flex gap-2">
                    <input
                        value={ytUrlInput}
                        onChange={e => setYtUrlInput(e.target.value)}
                        onBlur={handleUrlBlur}
                        placeholder="https://youtube.com/watch?v=... or dQw4w9WgXcQ"
                        required
                        className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-amber-500/40 focus:outline-none"
                    />
                    {previewId && (
                        <a href={`https://www.youtube.com/watch?v=${previewId}`} target="_blank" rel="noreferrer"
                            className="flex items-center gap-1 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg text-xs text-red-400 transition-colors">
                            <Youtube size={13} /> Preview
                        </a>
                    )}
                </div>
                {previewId && (
                    <p className="text-[10px] text-amber-500/70 mt-1 font-mono">Video ID: {previewId}</p>
                )}
            </div>

            {/* Title */}
            <div>
                <label className="text-xs text-gray-400 block mb-1">Title *</label>
                <input
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="e.g. Software Engineer's Journey"
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-amber-500/40 focus:outline-none"
                />
            </div>

            {/* Profession */}
            <div>
                <label className="text-xs text-gray-400 block mb-1">Person's Profession</label>
                <input
                    value={form.profession}
                    onChange={e => setForm(f => ({ ...f, profession: e.target.value }))}
                    placeholder="e.g. IIT Graduate → Software Engineer"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-amber-500/40 focus:outline-none"
                />
            </div>

            {/* Section timestamps */}
            <div>
                <div className="flex items-center gap-2 mb-2">
                    <Clock size={13} className="text-amber-400" />
                    <span className="text-xs text-amber-300 font-medium">Section Timestamps</span>
                    <span className="text-[10px] text-gray-600">— click any section to add its start/end time</span>
                </div>
                <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                    {CAREER_SECTIONS_GROUPED.map(({ group, color, sections }) => (
                        <div key={group}>
                            <p className="text-[9px] uppercase tracking-[0.2em] font-bold px-1 pt-2 pb-1" style={{ color }}>
                                {group}
                            </p>
                            {sections.map(sec => (
                                <SectionRow
                                    key={sec.id}
                                    section={sec}
                                    ranges={form.sections[sec.id] || []}
                                    onChange={handleSectionChange}
                                    onAddRange={handleAddSectionRange}
                                    onRemoveRange={handleRemoveSectionRange}
                                />
                            ))}
                        </div>
                    ))}
                </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
                <button type="submit" disabled={loading}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                    <Save size={14} /> {loading ? 'Saving…' : 'Save Video'}
                </button>
                <button type="button" onClick={onCancel}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-400 border border-white/10 rounded-lg text-sm transition-colors">
                    Cancel
                </button>
            </div>
        </form>
    );
}

export default function VideoManager({ token, showToast }) {
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [formMode, setFormMode] = useState(null); // null | 'add' | {video}
    const [saving, setSaving] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(null);

    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch(`${API}/api/interviews`, { headers });
            if (res.ok) {
                const data = await res.json();
                const transformed = (data.interviews || []).map(iv => ({
                    id: iv.id,
                    youtubeId: iv.videoId,
                    title: iv.title,
                    profession: iv.persona || '',
                    durationSec: iv.durationSec || 0,
                    sections: (iv.segments || []).reduce((acc, seg) => {
                        if (!acc[seg.nodeId]) acc[seg.nodeId] = [];
                        acc[seg.nodeId].push({ start: seg.startSec, end: seg.endSec });
                        return acc;
                    }, {}),
                }));
                setVideos(transformed);
            }
        } catch { showToast('Could not reach backend', 'error'); }
        finally { setLoading(false); }
    }, [token]);

    useEffect(() => { load(); }, [load]);

    const handleSave = async (data) => {
        setSaving(true);
        try {
            const isEdit = formMode && typeof formMode === 'object';
            const interviewId = isEdit ? formMode.id : data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '').slice(0, 40);
            const segments = [];
            Object.entries(data.sections || {}).forEach(([nodeId, ranges]) => {
                (Array.isArray(ranges) ? ranges : [ranges]).forEach(r => {
                    segments.push({ nodeId, label: nodeId, startSec: r.start || 0, endSec: r.end || 0, summary: '', tags: [] });
                });
            });
            const body = {
                id: interviewId, title: data.title, persona: data.profession || '',
                videoId: data.youtubeId, durationSec: isEdit ? (formMode.durationSec || 0) : 0,
                segments,
            };
            const res = await fetch(`${API}/api/interviews`, { method: 'POST', headers, body: JSON.stringify(body) });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Save failed');
            showToast(isEdit ? 'Interview updated' : 'Interview added');
            setFormMode(null);
            load();
        } catch (err) { showToast(err.message, 'error'); }
        finally { setSaving(false); }
    };

    const handleDelete = async (id) => {
        try {
            const res = await fetch(`${API}/api/interviews/${id}`, { method: 'DELETE', headers });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error);
            showToast('Interview deleted');
            setConfirmDelete(null);
            load();
        } catch (err) { showToast(err.message, 'error'); }
    };

    const sectionCount = (v) => Object.values(v.sections || {}).reduce((sum, entry) => {
        if (Array.isArray(entry)) return sum + entry.length;
        if (entry && typeof entry === 'object' && (entry.start != null || entry.end != null)) return sum + 1;
        return sum;
    }, 0);

    return (
        <div className="flex h-full">
            {/* Left: Video list */}
            <div className="w-80 border-r border-white/[0.06] flex flex-col flex-shrink-0 bg-[#0a0a14]">
                <div className="p-3 border-b border-white/[0.06] flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-300">All Videos ({videos.length})</span>
                    <button
                        onClick={() => setFormMode('add')}
                        className="flex items-center gap-1 px-2 py-2 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 rounded-lg text-xs font-medium transition-colors">
                        <Plus size={12} /> Add Video
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto py-2">
                    {loading ? (
                        <div className="flex items-center justify-center h-24 text-gray-600 text-sm">Loading…</div>
                    ) : videos.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-32 text-center px-4">
                            <Youtube size={28} className="text-gray-700 mb-2" />
                            <p className="text-gray-600 text-xs">No videos yet.</p>
                            <p className="text-gray-700 text-[10px] mt-1">Click "Add Video" to upload your first interview.</p>
                        </div>
                    ) : (
                        videos.map(v => (
                            <div key={v.id}
                                onClick={() => setFormMode(v)}
                                className={`mx-2 mb-1 rounded-lg px-3 py-2 cursor-pointer transition-colors group ${
                                    formMode?.id === v.id ? 'bg-amber-500/15 border border-amber-500/25' : 'hover:bg-white/[0.04] border border-transparent'
                                }`}>
                                <div className="flex items-start gap-2">
                                    <img
                                        src={`https://img.youtube.com/vi/${v.youtubeId}/default.jpg`}
                                        alt=""
                                        className="w-10 h-7 rounded object-cover flex-shrink-0 opacity-70"
                                    />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs text-white truncate">{v.title}</p>
                                        <p className="text-[10px] text-gray-500 truncate">{v.profession || '—'}</p>
                                        <p className="text-[10px] text-amber-600/70 mt-1">
                                            {sectionCount(v)} clip{sectionCount(v) !== 1 ? 's' : ''} tagged
                                        </p>
                                    </div>
                                    <button
                                        onClick={e => { e.stopPropagation(); setConfirmDelete(v); }}
                                        className="opacity-0 group-hover:opacity-100 p-1 text-red-400/60 hover:text-red-400 hover:bg-red-500/10 rounded fx-pop">
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Right: Form / placeholder */}
            <div className="flex-1 overflow-y-auto bg-[#080810]">
                <AnimatePresence mode="wait">
                    {formMode ? (
                        <motion.div
                            key={typeof formMode === 'string' ? 'add' : formMode.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="p-8 max-w-2xl"
                        >
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                                    <Youtube size={20} className="text-red-400" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold">
                                        {typeof formMode === 'string' ? 'Add New Video' : 'Edit Video'}
                                    </h2>
                                    <p className="text-xs text-gray-500">
                                        Enter timestamps for each career stage shown in this interview
                                    </p>
                                </div>
                            </div>
                            <VideoForm
                                initial={typeof formMode === 'object' ? formMode : null}
                                onSave={handleSave}
                                onCancel={() => setFormMode(null)}
                                loading={saving}
                            />
                        </motion.div>
                    ) : (
                        <motion.div
                            key="placeholder"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex flex-col items-center justify-center h-full text-center px-8"
                        >
                            <Youtube size={40} className="text-gray-700 mb-4" />
                            <h3 className="text-gray-400 font-medium mb-2">Video Section Manager</h3>
                            <p className="text-gray-600 text-sm max-w-xs">
                                Select a video to edit its timestamps, or click <span className="text-amber-400">Add Video</span> to add a new interview.
                            </p>
                            <div className="mt-6 text-left bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 text-xs text-gray-500 max-w-sm">
                                <p className="text-gray-400 font-medium mb-2">How it works:</p>
                                <ol className="space-y-1.5 list-decimal list-inside">
                                    <li>Paste the YouTube URL of the interview</li>
                                    <li>Fill in start &amp; end times for each career stage the person talks about</li>
                                    <li>Save — those clips appear in the sidebar when users click that node</li>
                                </ol>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Delete confirmation overlay */}
            <AnimatePresence>
                {confirmDelete && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center"
                        onClick={() => setConfirmDelete(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.9 }}
                            onClick={e => e.stopPropagation()}
                            className="bg-[#0e0e1c] border border-white/10 rounded-xl p-6 max-w-sm w-full mx-4"
                        >
                            <h3 className="text-white font-semibold mb-1">Delete Video?</h3>
                            <p className="text-gray-400 text-sm mb-4">
                                "{confirmDelete.title}" and all its section timestamps will be removed.
                            </p>
                            <div className="flex gap-2">
                                <button onClick={() => handleDelete(confirmDelete.id)}
                                    className="flex-1 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 rounded-lg text-sm transition-colors">
                                    Delete
                                </button>
                                <button onClick={() => setConfirmDelete(null)}
                                    className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-400 border border-white/10 rounded-lg text-sm transition-colors">
                                    Cancel
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
