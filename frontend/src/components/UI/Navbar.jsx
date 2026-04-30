import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Lock, Home, Share2, Check, Search, Bookmark, BookmarkCheck, Menu, X } from 'lucide-react';
import { useIsMobile } from '../../hooks/useIsMobile';
import { useToast } from './Toast';
import Magnetic from '../Utils/Magnetic';

const ROUTE_PREFETCHERS = {
    '/submit': () => import('../../pages/SubmitJourneyPage'),
    '/contact': () => import('../../pages/ContactPage'),
    '/admin': () => import('../../pages/AdminPanel'),
};

export default function Navbar({
    onAdminClick,
    onHomeClick,
    showHome = false,
    variant = 'default',
    brandName,
    searchValue = '',
    onSearchChange,
    careerOptions = [],
    careerPaths = {},
    selectedNode = null,
    currentPath = [],
    bookmarks = [],
    onToggleBookmark,
    onGotoBookmark,
    onGotoOption,
}) {
    const brand = brandName || 'Career Records Of India';
    const isMobile = useIsMobile();
    const shouldReduceMotion = useReducedMotion();
    const toast = useToast();
    const navNavigate = useNavigate();
    const [scrolled, setScrolled] = useState(false);
    const [copied, setCopied] = useState(false);
    const [showGuide, setShowGuide] = useState(false);
    const [showMobileSearch, setShowMobileSearch] = useState(false);
    const [showBookmarks, setShowBookmarks] = useState(false);
    const [bookmarkFlash, setBookmarkFlash] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [scrollProgress, setScrollProgress] = useState(0);
    const [searchFocused, setSearchFocused] = useState(false);
    const [searchCursor, setSearchCursor] = useState(0);
    const [treeProgress, setTreeProgress] = useState(0);
    const menuPanelRef = useRef(null);
    const bookmarkPanelRef = useRef(null);
    const searchWrapRef = useRef(null);

    const isBookmarked = selectedNode ? bookmarks.some(b => b.id === selectedNode.id) : false;

    useEffect(() => {
        if (bookmarks.length === 0) setShowBookmarks(false);
    }, [bookmarks.length]);

    useEffect(() => {
        if (!showBookmarks) return;
        const handler = (e) => {
            if (bookmarkPanelRef.current && !bookmarkPanelRef.current.contains(e.target)) setShowBookmarks(false);
        };
        window.addEventListener('pointerdown', handler, true);
        return () => window.removeEventListener('pointerdown', handler, true);
    }, [showBookmarks]);

    useEffect(() => {
        if (!showMenu) return;
        const handler = (e) => {
            if (menuPanelRef.current && !menuPanelRef.current.contains(e.target)) setShowMenu(false);
        };
        window.addEventListener('pointerdown', handler, true);
        return () => window.removeEventListener('pointerdown', handler, true);
    }, [showMenu]);

    // Track visited nodes → compute tree-exploration progress hairline
    useEffect(() => {
        if (variant !== 'tree') { setTreeProgress(0); return; }
        try {
            const raw = localStorage.getItem('cr_visited_nodes');
            const visited = new Set(raw ? JSON.parse(raw) : []);
            // Seed from URL ?path=a,b,c if present (covers deep-links before currentPath propagates)
            try {
                const params = new URLSearchParams(window.location.search);
                const pp = params.get('path');
                if (pp) pp.split(',').map(s => s.trim()).filter(Boolean).forEach(id => visited.add(id));
            } catch { /* ignore */ }
            (currentPath || []).forEach(id => visited.add(id));
            if (selectedNode?.id) visited.add(selectedNode.id);
            localStorage.setItem('cr_visited_nodes', JSON.stringify(Array.from(visited)));
            const total = Math.max(1, (careerOptions || []).length);
            setTreeProgress(Math.min(1, visited.size / total));
        } catch {
            setTreeProgress(0);
        }
    }, [variant, currentPath, selectedNode, careerOptions.length]);

    // Close autocomplete on outside click
    useEffect(() => {
        if (!searchFocused) return;
        const handler = (e) => {
            if (searchWrapRef.current && !searchWrapRef.current.contains(e.target)) setSearchFocused(false);
        };
        window.addEventListener('pointerdown', handler, true);
        return () => window.removeEventListener('pointerdown', handler, true);
    }, [searchFocused]);

    // Compute top matches for autocomplete (substring + word-start, max 6)
    const searchMatches = React.useMemo(() => {
        const q = (searchValue || '').trim().toLowerCase();
        if (!q || !Array.isArray(careerOptions) || careerOptions.length === 0) return [];
        const scored = [];
        for (const opt of careerOptions) {
            const label = String(opt.label || '').toLowerCase();
            if (!label) continue;
            if (label === q) scored.push({ opt, score: 0 });
            else if (label.startsWith(q)) scored.push({ opt, score: 1 });
            else if (new RegExp(`\\b${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(label)) scored.push({ opt, score: 2 });
            else if (label.includes(q)) scored.push({ opt, score: 3 });
        }
        scored.sort((a, b) => a.score - b.score || a.opt.label.length - b.opt.label.length);
        return scored.slice(0, 6).map(s => s.opt);
    }, [searchValue, careerOptions]);

    useEffect(() => { setSearchCursor(0); }, [searchValue]);

    useEffect(() => {
        if (variant !== 'tree') return;
        if (isMobile) {
            try { localStorage.setItem('cr_guide_seen', '1'); } catch (e) { console.debug("[non-fatal]", e?.message); }
            setShowGuide(false);
            return;
        }
        if (currentPath.length > 0) return;
        const seen = localStorage.getItem('cr_guide_seen');
        if (!seen) {
            const timer = setTimeout(() => setShowGuide(true), 1200);
            return () => clearTimeout(timer);
        }
    }, [variant, currentPath.length, isMobile]);

    useEffect(() => {
        if (currentPath.length > 0 && showGuide) setShowGuide(false);
    }, [currentPath.length, showGuide]);

    const dismissGuide = useCallback(() => {
        setShowGuide(false);
        localStorage.setItem('cr_guide_seen', '1');
    }, []);

    useEffect(() => {
        let ticking = false;
        const handler = () => {
            if (!ticking) {
                ticking = true;
                requestAnimationFrame(() => {
                    setScrolled(window.scrollY > 50);
                    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
                    setScrollProgress(scrollHeight > 0 ? Math.min(1, window.scrollY / scrollHeight) : 0);
                    ticking = false;
                });
            }
        };
        window.addEventListener('scroll', handler, { passive: true });
        return () => window.removeEventListener('scroll', handler);
    }, []);

    useEffect(() => {
        const onKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                const searchInput = document.querySelector('input[type="search"]');
                if (searchInput) searchInput.focus();
            }
            if (e.key !== 'Escape') return;
            setShowMenu(false); setShowBookmarks(false); setShowMobileSearch(false); setShowGuide(false);
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, []);

    const isTree = variant === 'tree';

    const prefetchRoute = useCallback((route) => {
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        const effectiveType = connection?.effectiveType || '';
        const isSlowNetwork = typeof effectiveType === 'string' && !effectiveType.includes('4g');
        const isLowBandwidth = typeof connection?.downlink === 'number' && connection.downlink < 3;
        const lowCpu = typeof navigator.hardwareConcurrency === 'number' && navigator.hardwareConcurrency <= 4;
        const lowMemory = typeof navigator.deviceMemory === 'number' && navigator.deviceMemory <= 4;
        if (connection?.saveData || isSlowNetwork || isLowBandwidth || lowCpu || lowMemory) return;
        const run = ROUTE_PREFETCHERS[route];
        if (!run) return;
        run().catch(() => {});
    }, []);

    const handleBookmarkToggle = () => {
        if (!selectedNode) return;
        const willRemove = isBookmarked;
        onToggleBookmark?.(selectedNode, currentPath);
        setBookmarkFlash(true);
        setTimeout(() => setBookmarkFlash(false), 600);
        toast(willRemove ? 'Bookmark removed' : 'Saved to bookmarks', willRemove ? 'info' : 'success');
    };

    return (
        <>
            <motion.nav
                initial={shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: -16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.55, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
                role="navigation"
                aria-label="Primary"
                className={`fixed top-0 left-0 right-0 z-[70] flex items-center justify-between px-4 sm:px-7 h-16 min-h-[56px] safe-area-top fx-pop ${
                    scrolled || isTree
                        ? 'glass-morphism border-b border-[#A89060]/22 shadow-premium'
                        : 'border-b border-white/[0.05]'
                }`}
                style={{
                    background: scrolled || isTree ? 'rgba(8,9,16,0.78)' : 'rgba(5,6,12,0.45)',
                    backdropFilter: 'blur(18px) saturate(140%)',
                    WebkitBackdropFilter: 'blur(18px) saturate(140%)',
                }}
            >
                {/* LEFT — Brand lockup */}
                <div className="flex items-center gap-3 min-w-0 flex-shrink-0">
                    {showHome && onHomeClick && (
                        <Magnetic className="inline-block">
                            <motion.button
                                whileHover={{ y: -2 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={onHomeClick}
                                aria-label="Return to introduction"
                                data-testid="navbar-back-button"
                                className="flex items-center justify-center w-10 h-10 min-w-[44px] min-h-[44px] text-white/55 hover:text-[#CDB88A] hover:bg-[#A89060]/10 rounded-xl fx-pop focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A89060]/55"
                                title="Back to intro"
                            >
                                <Home size={17} />
                            </motion.button>
                        </Magnetic>
                    )}
                    <div
                        className="flex items-center gap-3 select-none min-w-0 group cursor-pointer"
                        onClick={onHomeClick}
                        data-testid="navbar-brand-link"
                    >
                        <motion.div
                            whileHover={{ y: -2, rotate: 4 }}
                            transition={{ type: 'spring', stiffness: 280, damping: 22 }}
                            className="w-10 h-10 flex-shrink-0 rounded-[10px] flex items-center justify-center overflow-hidden fx-pop"
                            style={{
                                background: 'linear-gradient(135deg, rgba(205,184,138,0.12) 0%, rgba(8,9,16,0.85) 70%)',
                                border: '1px solid rgba(205,184,138,0.30)',
                                boxShadow: '0 8px 24px rgba(0,0,0,0.45), 0 0 14px rgba(205,184,138,0.08), inset 0 1px 0 rgba(255,255,255,0.08)',
                            }}
                        >
                            <img src="/favicon.svg" alt="Career Records Of India logo" className="w-6 h-6 sm:w-6.5 sm:h-6.5 object-contain" />
                        </motion.div>
                        <div className="flex flex-col min-w-0">
                            <span
                                className={`font-display font-semibold text-[14px] sm:text-[15.5px] tracking-tightest leading-none whitespace-nowrap truncate group-hover:text-[#CDB88A] transition-colors duration-300 ${isTree ? 'max-w-[40vw] sm:max-w-[180px] md:max-w-[210px] xl:max-w-none' : 'max-w-[45vw] sm:max-w-none'}`}
                                style={{ color: 'var(--text-primary)' }}
                            >
                                {brand}
                            </span>
                            <span className="hidden sm:inline-block mt-0.5 text-[9px] uppercase tracking-[0.32em] text-[#CDB88A]/55 font-medium">
                                Real careers · Real journeys
                            </span>
                        </div>
                    </div>
                </div>

                {/* CENTER — Career search */}
                {isTree && !isMobile && (
                    <div className="flex-1 min-w-0 px-4 lg:px-8 flex justify-center">
                        <div ref={searchWrapRef} className="relative w-full max-w-[28rem] min-w-0 group neon-search rounded-2xl">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/35 group-focus-within:text-[#CDB88A] transition-colors pointer-events-none" />
                            <input
                                type="search"
                                value={searchValue}
                                onChange={(e) => onSearchChange?.(e.target.value)}
                                onFocus={() => setSearchFocused(true)}
                                onKeyDown={(e) => {
                                    if (!searchMatches.length) return;
                                    if (e.key === 'ArrowDown') { e.preventDefault(); setSearchCursor(c => Math.min(searchMatches.length - 1, c + 1)); setSearchFocused(true); }
                                    else if (e.key === 'ArrowUp') { e.preventDefault(); setSearchCursor(c => Math.max(0, c - 1)); }
                                    else if (e.key === 'Enter') {
                                        e.preventDefault();
                                        const match = searchMatches[searchCursor] || searchMatches[0];
                                        if (match) {
                                            if (onGotoOption) onGotoOption(match);
                                            else onSearchChange?.(match.label);
                                            setSearchFocused(false);
                                        }
                                    } else if (e.key === 'Escape') {
                                        setSearchFocused(false);
                                    }
                                }}
                                role="combobox"
                                aria-expanded={searchFocused && searchMatches.length > 0}
                                aria-controls="navbar-search-listbox"
                                aria-activedescendant={searchMatches[searchCursor] ? `search-opt-${searchMatches[searchCursor].id}` : undefined}
                                placeholder="Search career paths…"
                                aria-label="Search career paths"
                                data-testid="navbar-search-input"
                                className="w-full pl-12 pr-4 py-3 rounded-2xl bg-white/[0.035] border border-white/10 text-white/92 placeholder-white/38 text-[13.5px] focus:outline-none focus:bg-white/[0.06] focus:border-[#A89060]/55 fx-pop shadow-inner font-sans"
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                {searchValue ? (
                                    <button
                                        type="button"
                                        onClick={() => { onSearchChange?.(''); setSearchFocused(false); }}
                                        aria-label="Clear search"
                                        className="text-white/35 hover:text-white/65 text-[10px] font-bold uppercase tracking-widest px-2 py-1.5 hover:bg-white/5 rounded-md fx-soft"
                                    >
                                        ESC
                                    </button>
                                ) : (
                                    <span className="text-white/22 text-[10px] font-bold tracking-[0.16em] px-2 py-1 border border-white/10 rounded-md pointer-events-none select-none font-mono">
                                        {/Mac|iPad|iPhone/.test(typeof navigator !== 'undefined' ? navigator.platform : '') ? '⌘ K' : 'Ctrl K'}
                                    </span>
                                )}
                            </div>

                            {/* Autocomplete dropdown */}
                            <AnimatePresence>
                                {searchFocused && searchMatches.length > 0 && (
                                    <motion.div
                                        initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: -8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
                                        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                                        id="navbar-search-listbox"
                                        role="listbox"
                                        aria-label="Matching career paths"
                                        className="pw-panel absolute left-0 right-0 top-full mt-2 overflow-hidden z-[80]"
                                        data-testid="navbar-search-autocomplete"
                                    >
                                        <div className="px-4 py-2 border-b border-white/[0.06] flex items-center justify-between">
                                            <span className="pw-eyebrow text-[#CDB88A]/85" style={{ fontSize: 9.5, letterSpacing: '0.28em' }}>Matching paths</span>
                                            <span className="text-[10.5px] font-mono text-white/35">{searchMatches.length} result{searchMatches.length === 1 ? '' : 's'}</span>
                                        </div>
                                        <ul className="max-h-[320px] overflow-y-auto py-1">
                                            {searchMatches.map((opt, i) => {
                                                const active = i === searchCursor;
                                                const crumb = Array.isArray(careerPaths?.[opt.id]) ? careerPaths[opt.id] : null;
                                                return (
                                                    <li
                                                        key={opt.id}
                                                        id={`search-opt-${opt.id}`}
                                                        role="option"
                                                        aria-selected={active}
                                                        data-testid={`search-option-${opt.id}`}
                                                        onMouseEnter={() => setSearchCursor(i)}
                                                        onMouseDown={(e) => {
                                                            e.preventDefault();
                                                            if (onGotoOption) onGotoOption(opt);
                                                            else onSearchChange?.(opt.label);
                                                            setSearchFocused(false);
                                                        }}
                                                        className={`flex items-start gap-3 px-4 py-2.5 cursor-pointer transition-colors ${active ? 'bg-[#A89060]/10' : 'hover:bg-white/[0.04]'}`}
                                                    >
                                                        <span className={`flex-shrink-0 mt-1 w-2 h-2 rounded-full ${active ? 'bg-[#CDB88A]' : 'bg-[#A89060]/50'}`} />
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-[13px] text-white/90 font-medium truncate">{opt.label}</p>
                                                            {crumb && crumb.length > 0 && (
                                                                <p className="text-[11px] text-white/40 truncate mt-0.5">{crumb.join(' → ')}</p>
                                                            )}
                                                        </div>
                                                        {active && (
                                                            <span className="flex-shrink-0 text-[10px] font-mono text-[#CDB88A]/85 tracking-wider">↵</span>
                                                        )}
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                )}
                {isTree && isMobile && (
                    <button
                        type="button"
                        onClick={() => setShowMobileSearch(s => !s)}
                        aria-label={showMobileSearch ? 'Close search' : 'Search career paths'}
                        aria-expanded={showMobileSearch}
                        className="flex items-center justify-center w-10 h-10 min-w-[44px] min-h-[44px] rounded-lg text-white/72 hover:text-white hover:bg-white/[0.08] touch-manipulation"
                    >
                        <Search size={19} />
                    </button>
                )}

                {/* RIGHT — Controls */}
                <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                    {isTree && (
                        <Magnetic className="inline-block">
                            <button
                                onClick={async () => {
                                    const shareData = { title: 'Career Records Of India', text: 'Explore real career journeys.', url: window.location.href };
                                    if (navigator.share && isMobile) {
                                        try { await navigator.share(shareData); toast('Shared successfully', 'success'); }
                                        catch (e) { if (e.name !== 'AbortError') toast('Could not share', 'error'); }
                                    } else {
                                        navigator.clipboard.writeText(window.location.href).then(() => {
                                            setCopied(true); setTimeout(() => setCopied(false), 2000); toast('Link copied to clipboard', 'copy');
                                        }).catch(() => toast('Could not copy link', 'error'));
                                    }
                                }}
                                aria-label={copied ? 'Link copied' : 'Share link'}
                                className="flex items-center justify-center w-10 h-10 min-w-[44px] min-h-[44px] rounded-lg text-white/45 hover:text-white/85 hover:bg-white/[0.06] fx-pop focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A89060]/55"
                                title="Share"
                            >
                                {copied ? <Check size={17} className="text-[#6FAF8A]" /> : <Share2 size={17} />}
                                <span className="sr-only" aria-live="polite">{copied ? 'Link copied' : 'Share current page'}</span>
                            </button>
                        </Magnetic>
                    )}

                    {isTree && selectedNode && (
                        <Magnetic className="inline-block">
                            <motion.button
                                onClick={handleBookmarkToggle}
                                animate={bookmarkFlash ? { scale: [1, 1.3, 1] } : {}}
                                transition={{ duration: 0.32 }}
                                aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark this career'}
                                aria-pressed={isBookmarked}
                                data-testid="bookmark-button"
                                className="flex items-center justify-center w-10 h-10 min-w-[44px] min-h-[44px] rounded-lg hover:bg-white/[0.06] fx-pop focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A89060]/55"
                                title={isBookmarked ? 'Remove bookmark' : 'Save this career'}
                                whileTap={{ scale: 0.92 }}
                            >
                                {isBookmarked
                                    ? <BookmarkCheck size={17} className="text-[#CDB88A]" />
                                    : <Bookmark size={17} className="text-white/55 hover:text-white/80" />
                                }
                            </motion.button>
                        </Magnetic>
                    )}

                    {isTree && bookmarks.length > 0 && (
                        <div className="relative" ref={bookmarkPanelRef}>
                            <Magnetic className="inline-block">
                                <button
                                    onClick={(e) => { e.stopPropagation(); setShowBookmarks(s => !s); }}
                                    aria-label="View saved careers"
                                    aria-expanded={showBookmarks}
                                    aria-haspopup="menu"
                                    className="flex items-center gap-1.5 h-10 min-h-[44px] px-3 rounded-lg text-white/55 hover:text-[#CDB88A] hover:bg-[#A89060]/8 fx-pop focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A89060]/55"
                                    title="Saved careers"
                                >
                                    <BookmarkCheck size={15} className="text-[#CDB88A]/85" />
                                    <span className="text-[11px] font-mono text-[#CDB88A]/85">{bookmarks.length}</span>
                                </button>
                            </Magnetic>

                            <AnimatePresence>
                                {showBookmarks && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -8, scale: 0.96 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: -8, scale: 0.96 }}
                                        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                                        className="pw-panel absolute right-0 top-full mt-2 w-72 overflow-hidden z-[80]"
                                        onClick={e => e.stopPropagation()}
                                    >
                                        <div className="px-4 pt-4 pb-2 border-b border-white/[0.06]">
                                            <span className="pw-eyebrow text-[#CDB88A]/85" style={{ fontSize: 10, letterSpacing: '0.28em' }}>Saved careers</span>
                                            <p className="text-[11px] text-white/35 mt-1">Quick access to your bookmarked paths</p>
                                        </div>
                                        <div className="max-h-72 overflow-y-auto py-1.5" role="menu">
                                            {bookmarks.map(bm => (
                                                <div key={bm.id} className="flex items-center gap-2 px-4 py-2.5 hover:bg-white/[0.04] group fx-pop">
                                                    <button
                                                        role="menuitem"
                                                        onClick={() => { onGotoBookmark?.(bm); setShowBookmarks(false); }}
                                                        className="flex-1 text-left"
                                                        title={bm.label}
                                                    >
                                                        <p className="text-[13.5px] text-white/85 group-hover:text-white transition-colors truncate font-medium">{bm.label}</p>
                                                        {bm.path?.length > 0 && (
                                                            <p className="text-[11.5px] text-white/35 truncate mt-0.5">
                                                                {bm.path.slice(0, -1).map(id => {
                                                                    const opt = careerOptions.find(o => o.id === id);
                                                                    return opt ? opt.label : id;
                                                                }).join(' → ')}
                                                            </p>
                                                        )}
                                                    </button>
                                                    <button
                                                        role="menuitem"
                                                        onClick={() => onToggleBookmark?.({ id: bm.id, label: bm.label }, bm.path)}
                                                        className="opacity-0 group-hover:opacity-100 transition-opacity text-white/30 hover:text-[#D07A7A] p-1.5"
                                                        title="Remove"
                                                        aria-label={`Remove ${bm.label} from bookmarks`}
                                                    >✕</button>
                                                </div>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )}

                    {/* Divider */}
                    <div className="w-px h-5 bg-white/8 mx-1.5" />

                    {/* Hamburger menu */}
                    <div className="relative" ref={menuPanelRef}>
                        <Magnetic className="inline-block">
                            <button
                                onClick={(e) => { e.stopPropagation(); setShowMenu(s => !s); }}
                                aria-label="Open menu"
                                aria-expanded={showMenu}
                                aria-haspopup="menu"
                                data-testid="navbar-menu-button"
                                className="flex items-center justify-center w-10 h-10 min-w-[44px] min-h-[44px] rounded-lg text-white/85 hover:text-[#CDB88A] hover:bg-white/[0.08] border border-white/[0.08] hover:border-[#A89060]/35 fx-pop focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A89060]/55"
                                title="Menu"
                            >
                                {showMenu ? <X size={19} /> : <Menu size={19} />}
                            </button>
                        </Magnetic>

                        <AnimatePresence>
                            {showMenu && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10, scale: 0.96 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -10, scale: 0.96 }}
                                    transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                                    className="pw-panel absolute right-0 top-full mt-2 w-80 overflow-hidden z-[80]"
                                    onClick={e => e.stopPropagation()}
                                >
                                    {/* Brand block */}
                                    <div className="px-5 pt-5 pb-3 border-b border-white/[0.06]">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                                                style={{ background: 'linear-gradient(135deg, #d8c192 0%, #8a7550 100%)', color: '#1a1410' }}>
                                                <span className="font-display font-bold text-[12px] tracking-tightest">CR</span>
                                            </div>
                                            <span className="font-display text-white/92 text-[14px] font-semibold tracking-tightest">Career Records Of India</span>
                                        </div>
                                        <p className="mt-2 text-[12px] text-white/52 leading-relaxed">Real journeys, real numbers, no fluff.</p>
                                    </div>

                                    {/* Nav links */}
                                    <div className="py-2">
                                        {[
                                            { label: 'Home', to: '/' },
                                            { label: 'Map your path', to: '/submit' },
                                            { label: 'Contact us', to: '/contact' },
                                        ].map(item => (
                                            <Link
                                                key={item.to}
                                                to={item.to}
                                                onMouseEnter={() => prefetchRoute(item.to)}
                                                onFocus={() => prefetchRoute(item.to)}
                                                onTouchStart={() => prefetchRoute(item.to)}
                                                onClick={() => setShowMenu(false)}
                                                className="flex items-center justify-between px-5 py-3 text-[13.5px] text-white/68 hover:text-white hover:bg-white/[0.04] fx-pop group"
                                            >
                                                <span>{item.label}</span>
                                                <span className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 fx-pop text-[#CDB88A] text-[14px]">→</span>
                                            </Link>
                                        ))}
                                    </div>

                                    {/* Disclaimer */}
                                    <div className="px-5 py-3 border-t border-white/[0.06]">
                                        <p className="text-[11.5px] text-white/40 leading-relaxed">
                                            <span className="text-[#CDB88A]/65 font-semibold">Disclaimer:</span> This platform documents experiences, not recommendations. Your path will be different.
                                        </p>
                                    </div>

                                    {/* Footer row */}
                                    <div className="px-5 py-3 border-t border-white/[0.06] flex items-center justify-between bg-white/[0.012]">
                                        <span className="text-[10.5px] text-white/30">© 2026 Career Records Of India</span>
                                        {onAdminClick && (
                                            <button
                                                onMouseEnter={() => prefetchRoute('/admin')}
                                                onFocus={() => prefetchRoute('/admin')}
                                                onClick={() => {
                                                    setShowMenu(false);
                                                    const token = localStorage.getItem('cr_admin_token');
                                                    if (token) navNavigate('/admin');
                                                    else onAdminClick();
                                                }}
                                                className="flex items-center gap-1.5 text-[11px] text-[#CDB88A]/65 hover:text-[#CDB88A] hover:bg-[#A89060]/[0.08] fx-pop px-2 py-1.5 rounded-md"
                                            >
                                                <Lock size={10} />
                                                Admin
                                            </button>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </motion.nav>

            {/* Progress hairline — in tree variant shows exploration %, else scroll % */}
            {(isTree || scrollProgress > 0) && (
                <div
                    className="fixed top-16 left-0 right-0 z-[69] h-px bg-transparent"
                    title={isTree ? `Explored ${Math.round(treeProgress * 100)}% of the career tree` : undefined}
                    data-testid={isTree ? 'tree-progress-hairline' : 'scroll-progress-hairline'}
                    aria-label={isTree ? `Career tree explored ${Math.round(treeProgress * 100)} percent` : undefined}
                >
                    <div
                        className="h-full transition-[width] duration-500 ease-out"
                        style={{
                            width: `${Math.max(isTree ? 2 : 0, (isTree ? treeProgress : scrollProgress) * 100)}%`,
                            background: isTree
                                ? 'linear-gradient(90deg, rgba(205,184,138,0.25), rgba(205,184,138,0.92), rgba(238,151,119,0.85))'
                                : 'linear-gradient(90deg, rgba(205,184,138,0.4), rgba(205,184,138,0.85), rgba(205,184,138,0.4))',
                            boxShadow: isTree ? '0 0 10px rgba(205,184,138,0.45)' : 'none',
                        }}
                    />
                </div>
            )}

            {/* Mobile search overlay */}
            <AnimatePresence>
                {isTree && isMobile && showMobileSearch && (
                    <motion.div
                        initial={shouldReduceMotion ? { opacity: 1, height: 'auto' } : { opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.22 }}
                        className="fixed left-0 right-0 z-[69] pt-2 pb-4 px-4 bg-black/92 backdrop-blur-xl border-b border-white/[0.06]"
                        style={{ top: 64 }}
                    >
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/45 pointer-events-none" />
                            <input
                                type="search"
                                value={searchValue}
                                onChange={(e) => onSearchChange?.(e.target.value)}
                                placeholder="Search career paths…"
                                aria-label="Search career paths"
                                autoFocus
                                className="w-full pl-12 pr-14 py-3 rounded-xl bg-white/8 border border-white/15 text-white placeholder-white/55 text-[15px] focus:outline-none focus:ring-2 focus:ring-[#A89060]/45 touch-manipulation"
                            />
                            <button
                                type="button"
                                onClick={() => { setShowMobileSearch(false); onSearchChange?.(''); }}
                                aria-label="Close search"
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-white/55 hover:text-white text-[12px] py-1 px-2 min-h-[44px] flex items-center"
                            >
                                Close
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* First-visit guide overlay */}
            <AnimatePresence>
                {showGuide && (
                    <motion.div
                        initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.45 }}
                        className="fixed inset-0 z-[200] pointer-events-none"
                    >
                        <motion.div
                            initial={shouldReduceMotion ? { scale: 1, y: 0 } : { scale: 0.94, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.94, opacity: 0 }}
                            transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.4, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                            className="pw-panel pointer-events-auto absolute top-[78px] right-4 sm:right-8 p-7 max-w-sm"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <span className="pw-eyebrow text-[#CDB88A]" style={{ fontSize: 10, letterSpacing: '0.28em' }}>How to navigate</span>
                                <button onClick={dismissGuide} className="text-white/40 hover:text-white/80 text-base px-2 -mr-2 py-1 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A89060]/55" aria-label="Close guide">×</button>
                            </div>
                            <h3 className="font-display text-white text-lg font-semibold tracking-tightest mb-4">Three quick gestures</h3>
                            <div className="space-y-3.5 mb-6">
                                {[
                                    { icon: '\u203a', text: 'Tap any planet to drill into that career' },
                                    { icon: '\u2039', text: 'Top-left button goes back a level' },
                                    { icon: '\u2315', text: 'Search bar filters careers as you type' },
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center gap-3">
                                        <span className="flex items-center justify-center w-7 h-7 rounded-md bg-[#A89060]/15 border border-[#A89060]/25 text-[#CDB88A] text-base font-display select-none">{item.icon}</span>
                                        <span className="text-[13px] text-white/72 leading-relaxed">{item.text}</span>
                                    </div>
                                ))}
                            </div>
                            <button onClick={dismissGuide} className="w-full pw-btn-primary py-3 text-[12px] uppercase tracking-[0.18em]">Got it</button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
