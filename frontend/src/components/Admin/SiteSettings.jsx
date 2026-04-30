import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Save, Plus, X, Trash2, Check, AlertTriangle, RefreshCw,
    Type, Globe, Share2, FileText, Eye, GripVertical
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8001';

export default function SiteSettings({ token, showToast }) {
    const [config, setConfig] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(null); // which section is saving
    const [error, setError] = useState('');
    const [activeSection, setActiveSection] = useState('flipper');

    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

    useEffect(() => { fetchConfig(); }, []);

    const fetchConfig = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${API}/api/config`, { headers });
            if (!res.ok) throw new Error('Failed to load config');
            setConfig(await res.json());
        } catch (err) {
            setError(err.message);
        } finally { setLoading(false); }
    };

    const saveSection = async (section) => {
        setSaving(section);
        try {
            const res = await fetch(`${API}/api/config/${section}`, {
                method: 'PATCH', headers,
                body: JSON.stringify(config[section])
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setConfig(data.config);
            showToast(`${section.charAt(0).toUpperCase() + section.slice(1)} settings saved`);
        } catch (err) {
            showToast(err.message, 'error');
        } finally { setSaving(null); }
    };

    const updateField = (section, field, value) => {
        setConfig(prev => ({
            ...prev,
            [section]: { ...prev[section], [field]: value }
        }));
    };

    /* ── Flipper title helpers ── */
    const addTitle = () => {
        setConfig(prev => ({
            ...prev,
            flipper: { ...prev.flipper, titles: [...prev.flipper.titles, ''] }
        }));
    };

    const removeTitle = (idx) => {
        setConfig(prev => ({
            ...prev,
            flipper: { ...prev.flipper, titles: prev.flipper.titles.filter((_, i) => i !== idx) }
        }));
    };

    const updateTitle = (idx, value) => {
        setConfig(prev => ({
            ...prev,
            flipper: {
                ...prev.flipper,
                titles: prev.flipper.titles.map((t, i) => i === idx ? value.toUpperCase() : t)
            }
        }));
    };

    /* ── Footer link helpers ── */
    const addFooterLink = () => {
        setConfig(prev => ({
            ...prev,
            footer: {
                ...prev.footer,
                links: [...prev.footer.links, { label: '', href: '' }]
            }
        }));
    };

    const removeFooterLink = (idx) => {
        setConfig(prev => ({
            ...prev,
            footer: {
                ...prev.footer,
                links: prev.footer.links.filter((_, i) => i !== idx)
            }
        }));
    };

    const updateFooterLink = (idx, field, value) => {
        setConfig(prev => ({
            ...prev,
            footer: {
                ...prev.footer,
                links: prev.footer.links.map((l, i) => i === idx ? { ...l, [field]: value } : l)
            }
        }));
    };

    const SECTIONS = [
        { id: 'flipper', label: 'Intro Flipper', icon: Type, desc: 'Career titles, tagline, button text' },
        { id: 'mobileEntry', label: 'Mobile Entry View', icon: Eye, desc: 'Mobile quick-entry text and spacing' },
        { id: 'site', label: 'Site Info', icon: Globe, desc: 'Brand name, description, disclaimer' },
        { id: 'social', label: 'Social Links', icon: Share2, desc: 'Twitter, LinkedIn, Instagram, etc.' },
        { id: 'footer', label: 'Footer', icon: FileText, desc: 'Copyright, links' },
    ];

    if (loading) return (
        <div className="flex-1 flex items-center justify-center">
            <div className="flex items-center gap-3 text-gray-400">
                <RefreshCw size={20} className="animate-spin" />
                <span>Loading site config…</span>
            </div>
        </div>
    );

    if (error) return (
        <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
                <AlertTriangle size={40} className="text-red-400 mx-auto mb-3" />
                <p className="text-white mb-2">Failed to load config</p>
                <p className="text-gray-500 text-sm mb-4">{error}</p>
                <button onClick={fetchConfig} className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white rounded-lg text-sm">Retry</button>
            </div>
        </div>
    );

    return (
        <div className="flex-1 flex overflow-hidden">
            {/* ─── LEFT: Section Nav ─── */}
            <aside className="w-64 border-r border-white/[0.06] flex flex-col flex-shrink-0 bg-[#0a0a14]">
                <div className="p-4 border-b border-white/[0.06]">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Settings</h3>
                </div>
                <div className="flex-1 py-2">
                    {SECTIONS.map(sec => {
                        const Icon = sec.icon;
                        const isActive = activeSection === sec.id;
                        return (
                            <button key={sec.id} onClick={() => setActiveSection(sec.id)}
                                className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors ${
                                    isActive ? 'bg-amber-500/10 text-amber-300 border-r-2 border-amber-500' : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.03]'
                                }`}>
                                <Icon size={16} className={isActive ? 'text-amber-400' : 'text-gray-600'} />
                                <div>
                                    <div className="text-sm font-medium">{sec.label}</div>
                                    <div className="text-[10px] text-gray-600">{sec.desc}</div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </aside>

            {/* ─── RIGHT: Settings Editor ─── */}
            <main className="flex-1 overflow-y-auto bg-[#080810] p-8">
                <AnimatePresence mode="wait">
                    {/* ═══ FLIPPER SETTINGS ═══ */}
                    {activeSection === 'flipper' && (
                        <motion.div key="flipper" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="max-w-2xl">
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h2 className="text-xl font-bold text-white">Intro Flipper</h2>
                                    <p className="text-sm text-gray-500 mt-1">The career titles that flip on the intro screen</p>
                                </div>
                                <button onClick={() => saveSection('flipper')} disabled={saving === 'flipper'}
                                    className="flex items-center gap-2 px-5 py-2 bg-amber-500 hover:bg-amber-400 disabled:bg-gray-700 text-black font-semibold rounded-xl text-sm transition-colors">
                                    {saving === 'flipper' ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                                    Save
                                </button>
                            </div>

                            {/* Titles */}
                            <div className="mb-6">
                                <label className="text-xs text-gray-400 mb-3 block font-semibold uppercase tracking-wider">
                                    Career Titles ({config.flipper.titles.length})
                                </label>
                                <div className="space-y-2">
                                    {config.flipper.titles.map((title, i) => (
                                        <div key={i} className="flex items-center gap-2 group">
                                            <span className="text-[10px] text-gray-600 w-5 text-right">{i + 1}</span>
                                            <input value={title}
                                                onChange={e => updateTitle(i, e.target.value)}
                                                className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-amber-500/50 focus:outline-none font-medium tracking-wider"
                                                placeholder="e.g. SURGEON" />
                                            <button onClick={() => removeTitle(i)}
                                                className="p-2 text-gray-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg opacity-0 group-hover:opacity-100 fx-pop">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <button onClick={addTitle}
                                    className="mt-3 flex items-center gap-2 text-xs text-emerald-400 hover:text-emerald-300 px-3 py-2 hover:bg-emerald-500/10 rounded-lg transition-colors">
                                    <Plus size={14} /> Add Title
                                </button>
                            </div>

                            {/* Tagline */}
                            <div className="mb-6">
                                <label className="text-xs text-gray-400 mb-2 block font-semibold uppercase tracking-wider">Tagline</label>
                                <input value={config.flipper.tagline}
                                    onChange={e => updateField('flipper', 'tagline', e.target.value)}
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-amber-500/50 focus:outline-none"
                                    placeholder="The message shown after titles stop flipping" />
                            </div>

                            {/* Button text */}
                            <div className="mb-6">
                                <label className="text-xs text-gray-400 mb-2 block font-semibold uppercase tracking-wider">Button Text</label>
                                <input value={config.flipper.buttonText}
                                    onChange={e => updateField('flipper', 'buttonText', e.target.value)}
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-amber-500/50 focus:outline-none"
                                    placeholder="Proceed to know more" />
                            </div>

                            {/* Speed controls */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-gray-400 mb-2 block font-semibold uppercase tracking-wider">
                                        Flip Duration <span className="text-gray-600 normal-case">(ms)</span>
                                    </label>
                                    <input type="number" value={config.flipper.flipDuration}
                                        onChange={e => updateField('flipper', 'flipDuration', parseInt(e.target.value) || 2500)}
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-amber-500/50 focus:outline-none font-mono" />
                                    <p className="text-[10px] text-gray-600 mt-1">Total flip time before tagline shows</p>
                                </div>
                                <div>
                                    <label className="text-xs text-gray-400 mb-2 block font-semibold uppercase tracking-wider">
                                        Flip Speed <span className="text-gray-600 normal-case">(ms)</span>
                                    </label>
                                    <input type="number" value={config.flipper.flipSpeed}
                                        onChange={e => updateField('flipper', 'flipSpeed', parseInt(e.target.value) || 120)}
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-amber-500/50 focus:outline-none font-mono" />
                                    <p className="text-[10px] text-gray-600 mt-1">Interval between each flip</p>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* ═══ SITE INFO ═══ */}
                    {activeSection === 'site' && (
                        <motion.div key="site" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="max-w-2xl">
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h2 className="text-xl font-bold text-white">Site Info</h2>
                                    <p className="text-sm text-gray-500 mt-1">Brand name and description shown across the site</p>
                                </div>
                                <button onClick={() => saveSection('site')} disabled={saving === 'site'}
                                    className="flex items-center gap-2 px-5 py-2 bg-amber-500 hover:bg-amber-400 disabled:bg-gray-700 text-black font-semibold rounded-xl text-sm transition-colors">
                                    {saving === 'site' ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                                    Save
                                </button>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="text-xs text-gray-400 mb-2 block font-semibold uppercase tracking-wider">Brand Name</label>
                                    <input value={config.site.brandName}
                                        onChange={e => updateField('site', 'brandName', e.target.value)}
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-amber-500/50 focus:outline-none"
                                        placeholder="MARKS" />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-400 mb-2 block font-semibold uppercase tracking-wider">Description</label>
                                    <textarea value={config.site.description}
                                        onChange={e => updateField('site', 'description', e.target.value)}
                                        rows={3}
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-amber-500/50 focus:outline-none resize-none"
                                        placeholder="A short description of your site" />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-400 mb-2 block font-semibold uppercase tracking-wider">Disclaimer</label>
                                    <textarea value={config.site.disclaimer}
                                        onChange={e => updateField('site', 'disclaimer', e.target.value)}
                                        rows={4}
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-amber-500/50 focus:outline-none resize-none"
                                        placeholder="Disclaimer text shown in the footer" />
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {activeSection === 'mobileEntry' && (
                        <motion.div key="mobileEntry" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="max-w-3xl">
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h2 className="text-xl font-bold text-white">Mobile Entry View</h2>
                                    <p className="text-sm text-gray-500 mt-1">Tune the three-option mobile selector without code edits</p>
                                </div>
                                <button onClick={() => saveSection('mobileEntry')} disabled={saving === 'mobileEntry'}
                                    className="flex items-center gap-2 px-5 py-2 bg-amber-500 hover:bg-amber-400 disabled:bg-gray-700 text-black font-semibold rounded-xl text-sm transition-colors">
                                    {saving === 'mobileEntry' ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                                    Save
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="text-xs text-gray-400 mb-2 block font-semibold uppercase tracking-wider">Eyebrow Text</label>
                                    <input value={config.mobileEntry.eyebrowText}
                                        onChange={e => updateField('mobileEntry', 'eyebrowText', e.target.value)}
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-amber-500/50 focus:outline-none" />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-400 mb-2 block font-semibold uppercase tracking-wider">Title Text</label>
                                    <input value={config.mobileEntry.titleText}
                                        onChange={e => updateField('mobileEntry', 'titleText', e.target.value)}
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-amber-500/50 focus:outline-none" />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-400 mb-2 block font-semibold uppercase tracking-wider">Select Label</label>
                                    <input value={config.mobileEntry.selectLabel}
                                        onChange={e => updateField('mobileEntry', 'selectLabel', e.target.value)}
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-amber-500/50 focus:outline-none" />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-400 mb-2 block font-semibold uppercase tracking-wider">Browse Button Text</label>
                                    <input value={config.mobileEntry.browseLabel}
                                        onChange={e => updateField('mobileEntry', 'browseLabel', e.target.value)}
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-amber-500/50 focus:outline-none" />
                                </div>
                            </div>

                            <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                    <label className="text-xs text-gray-400 mb-2 block font-semibold uppercase tracking-wider">Panel Top</label>
                                    <input type="number" value={config.mobileEntry.panelPaddingTop}
                                        onChange={e => updateField('mobileEntry', 'panelPaddingTop', parseInt(e.target.value) || 0)}
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-amber-500/50 focus:outline-none font-mono" />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-400 mb-2 block font-semibold uppercase tracking-wider">Panel X</label>
                                    <input type="number" value={config.mobileEntry.panelPaddingX}
                                        onChange={e => updateField('mobileEntry', 'panelPaddingX', parseInt(e.target.value) || 0)}
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-amber-500/50 focus:outline-none font-mono" />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-400 mb-2 block font-semibold uppercase tracking-wider">Panel Bottom</label>
                                    <input type="number" value={config.mobileEntry.panelPaddingBottom}
                                        onChange={e => updateField('mobileEntry', 'panelPaddingBottom', parseInt(e.target.value) || 0)}
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-amber-500/50 focus:outline-none font-mono" />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-400 mb-2 block font-semibold uppercase tracking-wider">Card Gap</label>
                                    <input type="number" value={config.mobileEntry.cardGap}
                                        onChange={e => updateField('mobileEntry', 'cardGap', parseInt(e.target.value) || 0)}
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-amber-500/50 focus:outline-none font-mono" />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-400 mb-2 block font-semibold uppercase tracking-wider">Header Eyebrow Size</label>
                                    <input type="number" value={config.mobileEntry.headerEyebrowSize}
                                        onChange={e => updateField('mobileEntry', 'headerEyebrowSize', parseInt(e.target.value) || 0)}
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-amber-500/50 focus:outline-none font-mono" />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-400 mb-2 block font-semibold uppercase tracking-wider">Header Title Size</label>
                                    <input type="number" value={config.mobileEntry.headerTitleSize}
                                        onChange={e => updateField('mobileEntry', 'headerTitleSize', parseInt(e.target.value) || 0)}
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-amber-500/50 focus:outline-none font-mono" />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-400 mb-2 block font-semibold uppercase tracking-wider">Card Padding Y</label>
                                    <input type="number" value={config.mobileEntry.cardPaddingY}
                                        onChange={e => updateField('mobileEntry', 'cardPaddingY', parseInt(e.target.value) || 0)}
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-amber-500/50 focus:outline-none font-mono" />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-400 mb-2 block font-semibold uppercase tracking-wider">Card Padding X</label>
                                    <input type="number" value={config.mobileEntry.cardPaddingX}
                                        onChange={e => updateField('mobileEntry', 'cardPaddingX', parseInt(e.target.value) || 0)}
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-amber-500/50 focus:outline-none font-mono" />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-400 mb-2 block font-semibold uppercase tracking-wider">Icon Size</label>
                                    <input type="number" value={config.mobileEntry.iconSize}
                                        onChange={e => updateField('mobileEntry', 'iconSize', parseInt(e.target.value) || 0)}
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-amber-500/50 focus:outline-none font-mono" />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-400 mb-2 block font-semibold uppercase tracking-wider">Eyebrow Size</label>
                                    <input type="number" value={config.mobileEntry.eyebrowSize}
                                        onChange={e => updateField('mobileEntry', 'eyebrowSize', parseInt(e.target.value) || 0)}
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-amber-500/50 focus:outline-none font-mono" />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-400 mb-2 block font-semibold uppercase tracking-wider">Label Size</label>
                                    <input type="number" value={config.mobileEntry.labelSize}
                                        onChange={e => updateField('mobileEntry', 'labelSize', parseInt(e.target.value) || 0)}
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-amber-500/50 focus:outline-none font-mono" />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-400 mb-2 block font-semibold uppercase tracking-wider">Arrow Size</label>
                                    <input type="number" value={config.mobileEntry.arrowSize}
                                        onChange={e => updateField('mobileEntry', 'arrowSize', parseInt(e.target.value) || 0)}
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-amber-500/50 focus:outline-none font-mono" />
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* ═══ SOCIAL LINKS ═══ */}
                    {activeSection === 'social' && (
                        <motion.div key="social" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="max-w-2xl">
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h2 className="text-xl font-bold text-white">Social Links</h2>
                                    <p className="text-sm text-gray-500 mt-1">Your social media profiles (leave empty to hide)</p>
                                </div>
                                <button onClick={() => saveSection('social')} disabled={saving === 'social'}
                                    className="flex items-center gap-2 px-5 py-2 bg-amber-500 hover:bg-amber-400 disabled:bg-gray-700 text-black font-semibold rounded-xl text-sm transition-colors">
                                    {saving === 'social' ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                                    Save
                                </button>
                            </div>

                            <div className="space-y-4">
                                {['twitter', 'linkedin', 'instagram', 'youtube', 'github'].map(platform => (
                                    <div key={platform}>
                                        <label className="text-xs text-gray-400 mb-2 block font-semibold uppercase tracking-wider">{platform}</label>
                                        <input value={config.social[platform] || ''}
                                            onChange={e => updateField('social', platform, e.target.value)}
                                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-amber-500/50 focus:outline-none"
                                            placeholder={`https://${platform}.com/your-profile`} />
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* ═══ FOOTER ═══ */}
                    {activeSection === 'footer' && (
                        <motion.div key="footer" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="max-w-2xl">
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h2 className="text-xl font-bold text-white">Footer</h2>
                                    <p className="text-sm text-gray-500 mt-1">Copyright text and bottom links</p>
                                </div>
                                <button onClick={() => saveSection('footer')} disabled={saving === 'footer'}
                                    className="flex items-center gap-2 px-5 py-2 bg-amber-500 hover:bg-amber-400 disabled:bg-gray-700 text-black font-semibold rounded-xl text-sm transition-colors">
                                    {saving === 'footer' ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                                    Save
                                </button>
                            </div>

                            <div className="mb-6">
                                <label className="text-xs text-gray-400 mb-2 block font-semibold uppercase tracking-wider">Copyright Text</label>
                                <input value={config.footer.copyright}
                                    onChange={e => updateField('footer', 'copyright', e.target.value)}
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-amber-500/50 focus:outline-none"
                                    placeholder="2026 MARKS. All rights reserved." />
                            </div>

                            <div>
                                <label className="text-xs text-gray-400 mb-3 block font-semibold uppercase tracking-wider">
                                    Footer Links ({config.footer.links.length})
                                </label>
                                <div className="space-y-3">
                                    {config.footer.links.map((link, i) => (
                                        <div key={i} className="flex items-center gap-2 group">
                                            <span className="text-[10px] text-gray-600 w-5 text-right">{i + 1}</span>
                                            <input value={link.label}
                                                onChange={e => updateFooterLink(i, 'label', e.target.value)}
                                                className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-amber-500/50 focus:outline-none"
                                                placeholder="Label" />
                                            <input value={link.href}
                                                onChange={e => updateFooterLink(i, 'href', e.target.value)}
                                                className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-amber-500/50 focus:outline-none font-mono"
                                                placeholder="/path or https://..." />
                                            <button onClick={() => removeFooterLink(i)}
                                                className="p-2 text-gray-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg opacity-0 group-hover:opacity-100 fx-pop">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <button onClick={addFooterLink}
                                    className="mt-3 flex items-center gap-2 text-xs text-emerald-400 hover:text-emerald-300 px-3 py-2 hover:bg-emerald-500/10 rounded-lg transition-colors">
                                    <Plus size={14} /> Add Link
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
}
