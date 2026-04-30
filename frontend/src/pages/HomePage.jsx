import { lazy, Suspense, useState, useEffect, useCallback, useMemo } from 'react';
import MirrorVideoPlayer from '../components/Video/MirrorVideoPlayer';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import Navbar from '../components/UI/Navbar';
import Starfield from '../components/UI/Starfield';
import { getVideosForCategory, getCareerOptions, fetchVideosForNode, getCareerPathMap } from '../data/careerVideos';
import { useIsMobile, useHasSidebars } from '../hooks/useIsMobile';

const loadDecisionNode = () => import('../components/Utils/DecisionNode');
const loadKineticSidebar = () => import('../components/Layout/KineticSidebar');
const IdentityFlipper = lazy(() => import('../components/Interactive/IdentityFlipper'));
const QuickEntryScreen = lazy(() => import('../components/Interactive/QuickEntryScreen'));
const JourneyMapper = lazy(() => import('../components/Interactive/JourneyMapper'));
const DecisionNode = lazy(loadDecisionNode);
const VideoLibrary = lazy(() => import('../components/Video/VideoLibrary'));
const KineticSidebar = lazy(loadKineticSidebar);
const AdminLogin = lazy(() => import('../components/Admin/AdminLogin'));

export default function HomePage() {
    const isMobile = useIsMobile();
    const hasSidebars = useHasSidebars();
    const shouldReduceMotion = useReducedMotion();
    const isTablet = !isMobile && typeof window !== 'undefined' && window.innerWidth < 1024;
    const [isShortViewport, setIsShortViewport] = useState(() =>
        typeof window !== 'undefined' ? window.innerHeight < 820 : false
    );
    const [phase, setPhase] = useState('intro');
    const [selectedNode, setSelectedNode] = useState(null);
    const [selectedVideo, setSelectedVideo] = useState(null);
    const [calendarVideos, setCalendarVideos] = useState([]);
    const [currentPath, setCurrentPath] = useState([]);
    const [activeNodePosition, setActiveNodePosition] = useState(null);
    const [zoomLevel, setZoomLevel] = useState(0);
    const [recenterDone, setRecenterDone] = useState(false);
    const [isPageActive, setIsPageActive] = useState(() =>
        typeof document === 'undefined' ? true : document.visibilityState === 'visible'
    );
    const [showAdminLogin, setShowAdminLogin] = useState(false);
    const [siteConfig, setSiteConfig] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [nodeVideos, setNodeVideos] = useState(null);
    const [historyVideos, setHistoryVideos] = useState(null);
    const [showMobileDrawer, setShowMobileDrawer] = useState(false);
    const [enableAmbientMotion, setEnableAmbientMotion] = useState(false);
    const [skipIntroOnLowEnd, setSkipIntroOnLowEnd] = useState(false);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [pendingEntryPath, setPendingEntryPath] = useState([]);
    const [visitorMirrorProfile, setVisitorMirrorProfile] = useState({ marks: '', entry: '', stream: '', dna: '' });
    const [mirrorPathNodeIds, setMirrorPathNodeIds] = useState([]);

    // Handle mouse movement for parallax
    useEffect(() => {
        if (isMobile || shouldReduceMotion) return;
        const handleMouseMove = (e) => {
            setMousePos({
                x: (e.clientX / window.innerWidth - 0.5) * 20,
                y: (e.clientY / window.innerHeight - 0.5) * 20,
            });
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, [isMobile, shouldReduceMotion]);

    useEffect(() => {
        if (typeof window === 'undefined') return undefined;
        const onResize = () => setIsShortViewport(window.innerHeight < 820);
        window.addEventListener('resize', onResize);
        onResize();
        return () => window.removeEventListener('resize', onResize);
    }, []);

    // ── Feature: Remember last place ──
    const [continueData, setContinueData] = useState(() => {
        try { return JSON.parse(localStorage.getItem('cr_last_place') || 'null'); }
        catch { return null; }
    });

    // ── Feature: Bookmarks ──
    const [bookmarks, setBookmarks] = useState(() => {
        try { return JSON.parse(localStorage.getItem('cr_bookmarks') || '[]'); }
        catch { return []; }
    });

    // ── When restoring a place or jumping to a bookmark ──
    const [jumpData, setJumpData] = useState(null); // { zoomStack, activePath, node }

    const currentCategory = currentPath.length > 0 ? currentPath[currentPath.length - 1] : 'general';
    const careerOptions = useMemo(() => getCareerOptions(), []);
    const { labelMap: careerPaths, idMap: careerIdPaths } = useMemo(() => getCareerPathMap(), []);
    // Sidebar always follows the active career node, not the search query
    const videoCategory = useMemo(() => currentCategory, [currentCategory]);
    const sidebarVideos = useMemo(
        () => getVideosForCategory(videoCategory, currentPath),
        [videoCategory, currentPath]
    );

    // Fetch site config from backend (optional; app works without it)
    useEffect(() => {
        const API = import.meta.env.VITE_API_URL || 'http://localhost:8001';
        fetch(`${API}/api/config`)
            .then(r => (r.ok ? r.json() : null))
            .then(c => { if (c) setSiteConfig(c); })
            .catch(() => { /* backend not running or network error — ignore */ });
    }, []);

    // ── URL deep-link: read ?path= on mount (also restores session if no URL param) ──
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const pathParam = params.get('path');
        if (pathParam) {
            const ids = pathParam.split(',').map(s => s.trim()).filter(Boolean);
            if (ids.length > 0) {
                setJumpData({ zoomStack: ids, activePath: ['start', ...ids] });
                // Seed currentPath so the URL-sync effect doesn't wipe the param before DecisionNode propagates
                setCurrentPath(ids);
                setPhase('tree');
                return;
            }
        }
        // No URL param — try sessionStorage (restores position after refresh)
        try {
            const stored = sessionStorage.getItem('pw_ss_zoom');
            if (stored) {
                const ids = JSON.parse(stored);
                if (Array.isArray(ids) && ids.length > 0) {
                    setJumpData({ zoomStack: ids, activePath: ['start', ...ids] });
                    setCurrentPath(ids);
                    setPhase('tree');
                }
            }
        } catch (err) { console.debug('[HomePage] sessionStorage restore skipped:', err?.message); }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // ── URL deep-link: update ?path= + sessionStorage when navigation changes ──
    useEffect(() => {
        const url = new URL(window.location.href);
        if (phase === 'tree' && currentPath.length > 0) {
            url.searchParams.set('path', currentPath.join(','));
            try { sessionStorage.setItem('pw_ss_zoom', JSON.stringify(currentPath)); }
            catch (err) { console.debug('[HomePage] sessionStorage write failed:', err?.message); }
        } else {
            url.searchParams.delete('path');
            if (phase !== 'tree') {
                try { sessionStorage.removeItem('pw_ss_zoom'); }
                catch (err) { console.debug('[HomePage] sessionStorage clear failed:', err?.message); }
            }
        }
        window.history.replaceState({}, '', url.toString());
    }, [currentPath, phase]);

    useEffect(() => {
        const syncActive = () => {
            const visible = typeof document !== 'undefined' ? document.visibilityState === 'visible' : true;
            const focused = typeof document !== 'undefined' ? document.hasFocus() : true;
            setIsPageActive(visible && focused);
        };

        document.addEventListener('visibilitychange', syncActive);
        window.addEventListener('focus', syncActive);
        window.addEventListener('blur', syncActive);
        window.addEventListener('pageshow', syncActive);

        syncActive();

        return () => {
            document.removeEventListener('visibilitychange', syncActive);
            window.removeEventListener('focus', syncActive);
            window.removeEventListener('blur', syncActive);
            window.removeEventListener('pageshow', syncActive);
        };
    }, []);

    const sidebarPaused = !isPageActive || Boolean(selectedVideo);

    // When user selects a node, fetch dual-rail clips from backend
    useEffect(() => {
        if (!selectedNode) { setNodeVideos(null); setHistoryVideos(null); return; }
        const sectionId = selectedNode.sectionId || selectedNode.id;
        const API = import.meta.env.VITE_API_URL || 'http://localhost:8001';
        const pathParam = currentPath.length > 0 ? currentPath.join(',') : sectionId;

        const marks = String(visitorMirrorProfile?.marks || '').trim();
        const entry = String(visitorMirrorProfile?.entry || '').trim();
        const strictQ = (marks || entry) ? '&strict=1' : '';
        const mirrorQuery = `${marks ? `&marks=${encodeURIComponent(marks)}` : ''}${entry ? `&entry=${encodeURIComponent(entry)}` : ''}${strictQ}`;
        fetch(`${API}/api/path-clips?path=${encodeURIComponent(pathParam)}&currentNode=${encodeURIComponent(sectionId)}${mirrorQuery}`)
            .then(r => r.ok ? r.json() : null)
            .then(data => {
                if (data) {
                    setNodeVideos(data.currentClips?.length ? data.currentClips : null);
                    setHistoryVideos(data.historyClips?.length ? data.historyClips : null);
                    return;
                }
                // Fallback to static videos if backend unavailable
                setNodeVideos(null);
                setHistoryVideos(null);
            })
            .catch(() => { setNodeVideos(null); setHistoryVideos(null); });

        // Also try static fallback for current node (always available)
        if (!nodeVideos) {
            fetchVideosForNode(sectionId).then(clips => {
                if (Array.isArray(clips) && clips.length > 0) setNodeVideos(prev => prev || clips);
            });
        }

        /* ── Auto-demand: fire once per session when backend returns no matches ── */
        const autoKey = 'cri_auto_demand_sent';
        const hasProfile = visitorMirrorProfile?.marks || visitorMirrorProfile?.entry || visitorMirrorProfile?.stream;
        if (hasProfile && !sessionStorage.getItem(autoKey)) {
            // We delay the check so nodeVideos state has time to settle
            setTimeout(() => {
                setNodeVideos(prev => {
                    if (prev === null || (Array.isArray(prev) && prev.length === 0)) {
                        sessionStorage.setItem(autoKey, '1');
                        const API = import.meta.env.VITE_API_URL || 'http://localhost:8001';
                        fetch(`${API}/api/demand`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                nodeId: sectionId,
                                nodeLabel: selectedNode?.label || sectionId,
                                visitorDna: visitorMirrorProfile?.dna || '',
                                marks: visitorMirrorProfile?.marks || '',
                                entry: visitorMirrorProfile?.entry || '',
                                stream: visitorMirrorProfile?.stream || '',
                                source: 'auto',
                            }),
                        }).catch(() => {});
                    }
                    return prev;
                });
            }, 900);
        }
    }, [selectedNode, currentPath, visitorMirrorProfile]);

    useEffect(() => {
        if (phase !== 'tree') return;
        const marks = String(visitorMirrorProfile?.marks || '').trim();
        const entry = String(visitorMirrorProfile?.entry || '').trim();
        if (!marks && !entry) {
            setMirrorPathNodeIds([]);
            return;
        }
        const API = import.meta.env.VITE_API_URL || 'http://localhost:8001';
        const q = `?marks=${encodeURIComponent(marks)}&entry=${encodeURIComponent(entry)}`;
        fetch(`${API}/api/visitor-mirror-nodes${q}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => { if (d?.nodeIds) setMirrorPathNodeIds(d.nodeIds); else setMirrorPathNodeIds([]); })
            .catch(() => setMirrorPathNodeIds([]));
    }, [phase, visitorMirrorProfile]);

    const inTree = phase === 'tree';
    const [treeLoading, setTreeLoading] = useState(false);

    const onFlipperDone = useCallback(() => {
        try { localStorage.setItem('cr_intro_seen', '1'); }
        catch (err) { console.debug('[HomePage] localStorage write failed:', err?.message); }
        setPhase('where');
    }, []);

    useEffect(() => {
        if (phase !== 'where') return;
        loadDecisionNode();
        loadKineticSidebar();
    }, [phase]);

    const handleQuickJump = useCallback((path) => {
        // path = array like ['student'] or ['professional'], or null = skip (start from root)
        setPendingEntryPath(Array.isArray(path) ? path : []);
        setSelectedVideo(null);
        setTreeLoading(false);
        setPhase('mapper');
    }, []);

    const handleJourneyComplete = useCallback((bridge) => {
        const basePath = Array.isArray(pendingEntryPath) ? [...pendingEntryPath] : [];
        const stream       = String(bridge?.stream           || '').toLowerCase();
        const marks        = String(bridge?.marks            || bridge?.academic_performance || '').trim().toLowerCase();
        const entry        = String(bridge?.entry            || bridge?.admission_mode       || '').trim().toLowerCase();
        const industry     = String(bridge?.industry     || bridge?.profession  || '').toLowerCase();
        const expTier      = String(bridge?.experience_tier || '').toLowerCase();
        const salaryRange  = String(bridge?.salary_range  || '').toLowerCase();

        // Student stream → tree node mapping
        const streamNodeMap = {
            pcm: 's_science', pcb: 's_science', science: 's_science',
            commerce: 's_commerce', arts: 's_arts', humanities: 's_arts',
        };
        // Professional experience tier → tree node mapping (matches careers.json IDs)
        const expNodeMap = {
            '0_2': 'p_first_job',
            '3_5': 'p_1_5yr',
            '5_10': 'p_5_10yr',
            '10_plus': 'p_money_reality',
        };

        /* 7-char 14-bit DNA — Pos 6 = Salary */
        const PROF_ENC    = { corporate: 'A', govt: 'B', startup: 'C', freelance: 'D' };
        const STREAM_ENC  = { pcm: 'A', pcb: 'A', science: 'A', stem: 'A', engineering: 'A', medical: 'A', btech: 'A', bsc: 'A', commerce: 'B', ca: 'B', finance: 'B', arts: 'C', humanities: 'C', law: 'C', vocational: 'D', diploma: 'D', other: 'D' };
        const EXP_ENC     = { '0_2': 'A', '3_5': 'B', '5_10': 'C', '10_plus': 'D' };
        const ENTRY_ENC   = { merit: 'A', entrance: 'B', donation: 'C', donation_management: 'C', lateral: 'D' };
        const MARKS_ENC   = { gold_medalist: 'A', above_80: 'B', '60_80': 'C', below_60: 'D' };
        const SALARY_ENC  = { below_6: 'A', '6_to_15': 'B', '15_to_40': 'C', above_40: 'D' };
        const visitorDna = (
            (PROF_ENC[industry]      || 'A') +   // Pos 0: Profession
            (STREAM_ENC[stream]      || 'D') +   // Pos 1: Stream
            (EXP_ENC[expTier]        || 'A') +   // Pos 2: Experience
            (ENTRY_ENC[entry]        || 'D') +   // Pos 3: Admission
            (MARKS_ENC[marks]        || 'D') +   // Pos 4: Marks
            'B'                                  + // Pos 5: Location (default Tier-2)
            (SALARY_ENC[salaryRange] || 'B')       // Pos 6: Salary
        );

        if (basePath[0] === 'student') {
            const streamNode = streamNodeMap[stream];
            if (streamNode && !basePath.includes(streamNode)) {
                basePath.push(streamNode);
            }
        }

        // Livelihood path: push correct child node based on experience tier
        if (basePath[0] === 'professional' && basePath.length === 1) {
            const expNode = expNodeMap[expTier];
            if (expNode) basePath.push(expNode);
        }

        if (basePath.length > 0) {
            setJumpData({ zoomStack: basePath, activePath: ['start', ...basePath] });
        } else {
            setJumpData(null);
        }

        setVisitorMirrorProfile({
            marks,
            entry: entry === 'donation_management' ? 'donation' : entry,
            stream,
            dna: visitorDna,
        });
        setSelectedVideo(null);
        setTreeLoading(false);
        setPhase('tree');
    }, [pendingEntryPath]);

    const onNodeSelect = useCallback((node) => {
        setSelectedNode(node);
        setZoomLevel(z => z + 1);
        setRecenterDone(false);
    }, []);

    const onPathChange = useCallback((path) => {
        setCurrentPath(path);
        // Sidebar always visible during tree phase
    }, []);

    // ── Save last place whenever selectedNode or path changes ──
    useEffect(() => {
        if (!selectedNode || currentPath.length === 0) return;
        const data = {
            nodeId: selectedNode.id,
            nodeLabel: selectedNode.label,
            path: currentPath,               // array of ids, no 'start'
            hasChildren: !!(selectedNode.children?.length),
            ts: Date.now(),
        };
        localStorage.setItem('cr_last_place', JSON.stringify(data));
        setContinueData(data);
    }, [selectedNode, currentPath]);

    // ── Toggle bookmark ──
    const onToggleBookmark = useCallback((node, path) => {
        setBookmarks(prev => {
            const exists = prev.find(b => b.id === node.id);
            const next = exists
                ? prev.filter(b => b.id !== node.id)
                : [...prev, { id: node.id, label: node.label, path, hasChildren: !!(node.children?.length) }];
            localStorage.setItem('cr_bookmarks', JSON.stringify(next));
            return next;
        });
    }, []);

    // ── Jump to a saved place or bookmark ──
    const buildJump = useCallback((savedPath, hasChildren) => {
        const zoomStack = hasChildren ? savedPath : savedPath.slice(0, -1);
        const activePath = ['start', ...savedPath];
        return { zoomStack, activePath };
    }, []);

    const onContinue = useCallback(() => {
        if (!continueData) return;
        setSelectedVideo(null);
        setJumpData(buildJump(continueData.path, continueData.hasChildren));
        setPhase('tree');
    }, [continueData, buildJump]);

    const onGotoBookmark = useCallback((bm) => {
        setJumpData(buildJump(bm.path, bm.hasChildren));
        setPhase('tree');
    }, [buildJump]);

    // Jump directly to a career option picked from the navbar autocomplete
    const onGotoOption = useCallback((opt) => {
        if (!opt?.id) return;
        const path = careerIdPaths?.[opt.id];
        if (!Array.isArray(path) || path.length === 0) return;
        // Leaf = treat as last node (use `hasChildren=false` so zoomStack backs up one level)
        // Lookup if the option has children from careers.json via labelMap presence
        setSearchQuery('');
        setJumpData(buildJump(path, false));
        if (phase !== 'tree') setPhase('tree');
    }, [careerIdPaths, buildJump, phase]);

    const onRecenterComplete = useCallback(() => {
        setRecenterDone(true);
    }, []);

    const onBack = useCallback((path) => {
        if (!path || path.length === 0) {
            setSelectedNode(null);
            setCurrentPath([]);
            setZoomLevel(0);
            setSearchQuery('');
            setJumpData(null);
            setSelectedVideo(null);
            setPhase('where');
        }
        setRecenterDone(false);
    }, []);

    const onVideoClick = useCallback((v) => setSelectedVideo(v), []);
    const onNodeVideoRequest = useCallback((video) => {
        if (!video) return;
        setCalendarVideos([video]);
        setSelectedVideo(video);
    }, []);
    const onCloseVideo = useCallback(() => setSelectedVideo(null), []);
    const onCalendarExpand = useCallback((vids) => {
        if (!vids?.length) return;
        setCalendarVideos(vids);
        setSelectedVideo(vids[0]);
    }, []);

    // Floating particles (memoised once)
    const particles = useState(() =>
        Array.from({ length: 12 }, (_, i) => ({
            id: i,
            w: 1 + Math.random() * 1.5,
            left: Math.random() * 100,
            top: Math.random() * 100,
            gold: Math.random() > 0.6,
            dur: 8 + Math.random() * 10,
            delay: Math.random() * 6,
            drift: -20 - Math.random() * 30,
        }))
    )[0];

    useEffect(() => {
        if (shouldReduceMotion) return;

        const enable = () => setEnableAmbientMotion(true);
        if ('requestIdleCallback' in window) {
            const id = window.requestIdleCallback(enable, { timeout: 1800 });
            return () => window.cancelIdleCallback?.(id);
        }

        const timeout = window.setTimeout(enable, 900);
        return () => window.clearTimeout(timeout);
    }, [shouldReduceMotion]);

    useEffect(() => {
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        const effectiveType = connection?.effectiveType || '';
        const lowNetwork = typeof effectiveType === 'string' && !effectiveType.includes('4g');
        const lowBandwidth = typeof connection?.downlink === 'number' && connection.downlink < 2;
        const lowCpu = typeof navigator.hardwareConcurrency === 'number' && navigator.hardwareConcurrency <= 4;
        const lowMemory = typeof navigator.deviceMemory === 'number' && navigator.deviceMemory <= 4;

        let hasSeenIntro = false;
        try {
            hasSeenIntro = localStorage.getItem('cr_intro_seen') === '1';
        } catch (err) { console.debug('[HomePage] localStorage read failed:', err?.message); }

        const shouldSkip = Boolean(isMobile && !hasSeenIntro && (lowNetwork || lowBandwidth || lowCpu || lowMemory));
        setSkipIntroOnLowEnd(shouldSkip);

        if (shouldSkip) {
            try { localStorage.setItem('cr_intro_seen', '1'); }
            catch (err) { console.debug('[HomePage] localStorage write failed:', err?.message); }
        }
    }, [isMobile]);

    return (
        <div className="flex h-full min-h-0 w-full min-w-0 max-w-full flex-1 flex-col overflow-x-hidden">
            {(inTree) && (
                <Suspense fallback={null}>
                    <KineticSidebar
                        category={videoCategory}
                        path={currentPath}
                        videos={selectedNode ? (nodeVideos ?? sidebarVideos) : sidebarVideos}
                        historyVideos={historyVideos}
                        onVideoClick={onVideoClick}
                        zoomLevel={zoomLevel}
                        isVisible={true}
                        paused={sidebarPaused}
                    />
                </Suspense>
            )}

            <main className="relative z-0 flex w-full min-h-0 flex-1 flex-col overflow-hidden pw-page-bg">
                {/* Premium Background Layer — only during intro/where to avoid stacking three atmospheres */}
                {(phase === 'intro' || phase === 'where') && (
                    <motion.div 
                        className="absolute inset-0 pointer-events-none z-0"
                        animate={{ 
                            x: -mousePos.x * 0.5, 
                            y: -mousePos.y * 0.5 
                        }}
                        transition={{ type: 'spring', stiffness: 45, damping: 25 }}
                    >
                        <Starfield density={isMobile ? 24 : 45} />
                    </motion.div>
                )}

                <AnimatePresence mode="wait">
                    {treeLoading ? (
                        <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 backdrop-blur-sm">
                            <motion.div
                                className="pw-spinner w-10 h-10"
                                animate={{ rotate: 360 }}
                                transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                            />
                            <span className="text-[#A89060]/50 text-xs uppercase tracking-[0.2em] font-mono">Loading paths...</span>
                        </motion.div>
                    ) : phase === 'intro' ? (
                        <motion.div
                            key="intro"
                            initial={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3, ease: 'easeInOut' }}
                            className="absolute inset-0 z-10"
                        >
                            <Suspense fallback={<div className="absolute inset-0 flex items-center justify-center text-[#A89060]/60 text-xs uppercase tracking-[0.15em]">Loading...</div>}>
                                <IdentityFlipper
                                    onComplete={onFlipperDone}
                                    config={siteConfig?.flipper}
                                    continueData={continueData}
                                    onContinue={onContinue}
                                    forceSkipFlip={skipIntroOnLowEnd}
                                />
                            </Suspense>
                        </motion.div>
                    ) : phase === 'where' ? (
                        <motion.div
                            key="where"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3, ease: 'easeInOut' }}
                            className="absolute inset-0 z-10"
                        >
                            <Suspense fallback={<div className="absolute inset-0 flex items-center justify-center text-[#A89060]/60 text-xs uppercase tracking-[0.15em]">Loading...</div>}>
                                <QuickEntryScreen
                                    onSelect={handleQuickJump}
                                    onSkip={() => handleQuickJump(null)}
                                    config={siteConfig?.mobileEntry}
                                />
                            </Suspense>
                        </motion.div>
                    ) : phase === 'mapper' ? (
                        <motion.div
                            key="mapper"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3, ease: 'easeInOut' }}
                            className="absolute inset-0 z-10 flex min-h-0 flex-col overflow-hidden"
                        >
                            <Suspense fallback={<div className="absolute inset-0 flex items-center justify-center text-[#A89060]/60 text-xs uppercase tracking-[0.15em]">Loading...</div>}>
                                <div className="flex h-full min-h-0 w-full min-w-0 max-w-full flex-1 flex-col overflow-x-hidden">
                                    <JourneyMapper
                                        onCompleteJourney={handleJourneyComplete}
                                        initialLens={pendingEntryPath?.[0] === 'professional' ? 'livelihood' : pendingEntryPath?.[0] === 'student' ? 'student' : null}
                                    />
                                </div>
                            </Suspense>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="tree"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.4, ease: 'easeOut' }}
                        className="relative flex-1 min-h-0 z-10 flex flex-col"
                        style={hasSidebars ? {
                            paddingTop: isMobile 
                                ? 'calc(var(--nav-height) + env(safe-area-inset-top, 0px) + 8px)' 
                                : 'calc(var(--nav-height) + 16px)',
                            paddingLeft:  isMobile 
                                ? 'max(16px, env(safe-area-inset-left, 0px))' 
                                : isTablet ? '54px' : 'clamp(50px, 10vw, 130px)',
                            paddingRight: isMobile 
                                ? 'max(16px, env(safe-area-inset-right, 0px))' 
                                : isTablet ? '54px' : 'clamp(50px, 10vw, 130px)',
                            paddingBottom: isMobile
                                ? 'env(safe-area-inset-bottom, 0px)'
                                : (isShortViewport ? '16px' : '0'),
                        } : {
                            paddingTop: isMobile 
                                ? 'calc(var(--nav-height) + env(safe-area-inset-top, 0px) + 8px)' 
                                : 'calc(var(--nav-height) + 16px)',
                            paddingLeft: 'env(safe-area-inset-left, 0px)',
                            paddingRight: 'env(safe-area-inset-right, 0px)',
                            paddingBottom: isMobile
                                ? 'env(safe-area-inset-bottom, 0px)'
                                : (isShortViewport ? '16px' : '0'),
                        }}
                    >
                            <div className="tree-stage-shell">
                                <div className="tree-stage-surface">
                                    <Suspense fallback={<div className="absolute inset-0 flex items-center justify-center text-[#A89060]/60 text-xs uppercase tracking-[0.15em]">Loading tree...</div>}>
                                        <DecisionNode
                                            onNodeSelect={onNodeSelect}
                                            onNodeVideoRequest={onNodeVideoRequest}
                                            onPathChange={onPathChange}
                                            onActiveNodePosition={setActiveNodePosition}
                                            onRecenterComplete={onRecenterComplete}
                                            onBack={onBack}
                                            activeFilters={{}}
                                            searchQuery={searchQuery}
                                            initialZoomStack={jumpData?.zoomStack || []}
                                            initialActivePath={jumpData?.activePath || []}
                                            framed={true}
                                            focusMode={mirrorPathNodeIds.length > 0}
                                            mirrorPathNodeIds={mirrorPathNodeIds}
                                        />
                                    </Suspense>
                                </div>
                            </div>

                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            {/* Navbar — always visible, variant changes per phase */}
            <Navbar
                variant={inTree ? 'tree' : 'default'}
                onAdminClick={() => setShowAdminLogin(true)}
                showHome={inTree}
                onHomeClick={() => { setPhase('intro'); setSelectedNode(null); setCurrentPath([]); setZoomLevel(0); setSearchQuery(''); setJumpData(null); setSelectedVideo(null); setVisitorMirrorProfile({ marks: '', entry: '' }); setMirrorPathNodeIds([]); }}
                brandName={siteConfig?.site?.brandName}
                searchValue={searchQuery}
                onSearchChange={setSearchQuery}
                careerOptions={careerOptions}
                careerPaths={careerPaths}
                selectedNode={selectedNode}
                currentPath={currentPath}
                bookmarks={bookmarks}
                onToggleBookmark={onToggleBookmark}
                onGotoBookmark={onGotoBookmark}
                onGotoOption={onGotoOption}
            />

            {/* Minimal credit bar — fixed bottom center, hidden when back button is visible */}
            {inTree && !selectedNode && !isMobile && !isShortViewport && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: 1.5, duration: 0.6 }}
                    className="fixed bottom-3 left-1/2 -translate-x-1/2 z-[55] pointer-events-none"
                >
                    <span className="text-white/35 text-[11px] tracking-[0.2em] uppercase select-none font-light italic font-sans">
                        Career Records Of India
                    </span>
                </motion.div>
            )}

            {/* Mirror Video Player — 70/30 split layout (Master Spec) */}
            <AnimatePresence>
                {selectedVideo && (
                    <MirrorVideoPlayer
                        selectedVideo={selectedVideo}
                        allVideos={calendarVideos.length ? calendarVideos : sidebarVideos}
                        onClose={onCloseVideo}
                        onNavigate={setSelectedVideo}
                        visitorMirrorProfile={visitorMirrorProfile}
                    />
                )}
            </AnimatePresence>


            {/* Mobile video FAB — shows on narrow screens when in tree */}
            <AnimatePresence>
                {inTree && isMobile && (
                    <motion.button
                        key="mobile-fab"
                        initial={{ opacity: 0, scale: 0.7, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.7, y: 20 }}
                        transition={{ type: 'spring', stiffness: 280, damping: 22 }}
                        onClick={() => setShowMobileDrawer(o => !o)}
                        className="fixed right-4 z-[65] flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 backdrop-blur-lg border border-white/10 shadow-2xl shadow-black/60 fx-pop hover:border-white/20 hover:-translate-y-1 touch-manipulation"
                        style={{ bottom: 'max(10px, env(safe-area-inset-bottom, 0px))' }}
                        aria-label="Open video drawer"
                        aria-expanded={showMobileDrawer}
                        aria-controls="mobile-video-drawer"
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.97 }}
                    >
                        <span
                            className="absolute inset-0 rounded-full pointer-events-none"
                            style={{
                                background: 'linear-gradient(135deg, rgba(10,11,18,0.95) 0%, rgba(8,9,16,0.9) 55%, rgba(18,14,8,0.9) 100%)',
                                border: '1px solid rgba(168,144,96,0.34)',
                                boxShadow: 'inset 0 0 12px rgba(168,144,96,0.08), 0 0 12px rgba(168,144,96,0.1)',
                            }}
                        />
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#A89060" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="5 3 19 12 5 21 5 3" />
                        </svg>
                        <span className="relative text-[10px] font-bold uppercase tracking-[1px] text-[#A89060]/88">Videos</span>
                        {sidebarVideos.length > 0 && (
                            <span className="relative ml-2 text-[9px] font-mono bg-[#A89060]/16 text-[#A89060]/88 px-2 rounded-full border border-[#A89060]/22">{sidebarVideos.length}</span>
                        )}
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Mobile video bottom drawer */}
            <AnimatePresence>
                {showMobileDrawer && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            key="drawer-backdrop"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="fixed inset-0 z-[66] bg-black/60 backdrop-blur-sm"
                            onClick={() => setShowMobileDrawer(false)}
                        />
                        {/* Sheet */}
                        <motion.div
                            key="drawer-sheet"
                            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
                            id="mobile-video-drawer"
                            role="dialog"
                            aria-modal="true"
                            className="fixed bottom-0 left-0 right-0 z-[67] rounded-t-2xl bg-white/5 backdrop-blur-2xl border-t border-white/10 shadow-2xl"
                            style={{ maxHeight: '70dvh', overflowY: 'auto' }}
                        >
                            {/* Handle */}
                            <div className="flex items-center justify-between px-4 pt-3 pb-2 sticky top-0 bg-[#08080f]/95 backdrop-blur-xl border-b border-white/[0.05] z-10">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-0.5 rounded-full bg-white/20 mx-auto absolute left-1/2 -translate-x-1/2 top-2" />
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#A89060" strokeWidth="2" strokeLinecap="round"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                                    <span className="text-[12px] font-bold uppercase tracking-[1.5px] text-[#A89060]/80">Career Videos</span>
                                    <span className="text-[11px] text-white/20 ml-1">· {sidebarVideos.length} clips</span>
                                </div>
                                <button onClick={() => setShowMobileDrawer(false)}
                                    className="text-white/25 hover:text-white/60 transition-colors p-1" aria-label="Close">
                                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2 2l8 8M10 2L2 10" /></svg>
                                </button>
                            </div>
                            {/* Video list */}
                            <div className="px-4 py-4 grid grid-cols-2 gap-4">
                                {(nodeVideos || sidebarVideos).map((v, i) => (
                                    <button key={v.youtubeId || v.id || i}
                                        onClick={() => { onVideoClick(v); setShowMobileDrawer(false); }}
                                        className="relative rounded-xl overflow-hidden border border-white/10 hover:border-white/20 fx-pop hover:-translate-y-1 group text-left bg-white/5 backdrop-blur-md flex-shrink-0"
                                        style={{ aspectRatio: '16/9' }}
                                    >
                                        <img
                                            src={`https://img.youtube.com/vi/${v.youtubeId}/mqdefault.jpg`}
                                            alt={v.title || ''}
                                            loading="lazy"
                                            className="w-full h-full object-cover opacity-70 group-hover:opacity-90 transition-opacity"
                                        />
                                        <div className="absolute inset-0 flex flex-col justify-end p-2 bg-gradient-to-t from-black/80 via-transparent to-transparent">
                                            <p className="text-white/90 text-[11px] font-semibold line-clamp-2 leading-tight">{v.title}</p>
                                        </div>
                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <div className="w-7 h-7 rounded-full bg-black/70 flex items-center justify-center">
                                                <svg width="10" height="10" viewBox="0 0 10 10" fill="white"><polygon points="2,1 9,5 2,9" /></svg>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                                {(nodeVideos || sidebarVideos).length === 0 && (
                                    <div className="col-span-2 flex flex-col items-center gap-2 py-8 text-white/20">
                                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                                        <span className="text-[12px] uppercase tracking-widest">No videos yet</span>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Admin login modal */}
            <Suspense fallback={null}>
                <AdminLogin isOpen={showAdminLogin} onClose={() => setShowAdminLogin(false)} />
            </Suspense>
        </div>
    );
}
