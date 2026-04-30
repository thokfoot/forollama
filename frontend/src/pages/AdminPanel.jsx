import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronRight, ChevronDown, Plus, Trash2, Edit3, Save, X,
    LogOut, ArrowUp, ArrowDown, FolderTree, Search, AlertTriangle,
    Check, RefreshCw, KeyRound, BarChart3, Lock, Settings,
    LayoutDashboard, Download, Upload, ExternalLink, Copy,
    Activity, Database, Layers, Clock, Sliders, Undo2, Bell, MailX
} from 'lucide-react';
import SiteSettings from '../components/Admin/SiteSettings';
import VideoManager from '../components/Admin/VideoManager';
import VideoMapper from '../components/Admin/VideoMapper';
import NodeShapesPanel from '../components/Admin/NodeShapesPanel';
import DecisionNode from '../components/Utils/DecisionNode';
import careersData from '../data/careers.json';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8001';

const DEFAULT_TREE_LAYOUT = {
    version: 1,
    global: {
        preferNodePosition: true,
        autoDistributeFallback: true,
        layout: {
            marginXRatio: 0.05,
            minNodeSpacingX: 18,
            rootY: 33,
            zoomedRootY: 35,
            childrenYStart: 46,
            zoomedChildrenYStart: 42,
            childrenYEndDesktop: 82,
            childrenYEndMobile: 64,
            targetRows: 2,
            maxCols: 0,
        },
        node: { sizeScale: 1, shape: 'planet' },
        scaling: {
            tiers: [
                { minCount: 8, scale: 0.52 },
                { minCount: 6, scale: 0.62 },
                { minCount: 4, scale: 0.74 },
                { minCount: 3, scale: 0.88 },
            ],
            fallbackScale: 1,
        },
        labels: {
            rootWidth: 160,
            minWidth: 64,
            mobileMinWidth: 72,
            maxWidth: 160,
            mobileSidebarGutter: 22,
            mobileGap: 4,
            desktopDenseWidth: 80,
            desktopMidWidth: 96,
            desktopSparseWidth: 128,
            desktopDenseRatio: 0.07,
            desktopMidRatio: 0.082,
            desktopSparseRatio: 0.115,
            nonRootOffsetY: 10,
            rootOffsetY: 16,
        },
        planets: {
            earth: { r: 7, c1: '#4FC3F7' },
            mars: { r: 6, c1: '#EF7C5A' },
            jupiter: { r: 9.5, c1: '#D4A968' },
            saturn: { r: 7.5, c1: '#E8D090' },
            neptune: { r: 6.5, c1: '#6496DC' },
            uranus: { r: 7, c1: '#7ADFE8' },
        },
        connector: {
            curve: 0.25,
            baseThickness: 1,
            midThickness: 0.333,
            thinThickness: 0.125,
            activeThickness: 0.667,
        },
        linkedSiblingShapes: true,
        linkedSiblingShapesByRoot: {},
        siblingTemplates: {},
        siblingTemplatesMobile: {},
        sunTemplateDesktop: { x: 50, y: 22 },
        sunTemplateMobile: { x: 50, y: 28 },
    },
    nodes: {},
};

function deepClone(obj) {
    if (typeof structuredClone === 'function') return structuredClone(obj);
    return JSON.parse(JSON.stringify(obj));
}

function getNodeVisualConfig(layout, nodeId) {
    return (layout?.nodes && layout.nodes[nodeId]) || {};
}

function countTreeMetrics(node, depth = 0) {
    if (!node || typeof node !== 'object') return { total: 0, maxDepth: depth };
    let total = 1;
    let maxDepth = depth;
    for (const child of (Array.isArray(node.children) ? node.children : [])) {
        const result = countTreeMetrics(child, depth + 1);
        total += result.total;
        maxDepth = Math.max(maxDepth, result.maxDepth);
    }
    return { total, maxDepth };
}

function isCollapsedPersonaTree(tree) {
    const branches = Array.isArray(tree?.children) ? tree.children : [];
    if (branches.length < 3) return true;
    const professional = branches.find((node) => node?.id === 'professional');
    return (professional?.children?.length || 0) < 6;
}

function collectTreeNodeIds(root) {
    const ids = new Set();
    if (!root || typeof root !== 'object') return ids;
    const walk = (node) => {
        if (!node || typeof node !== 'object') return;
        if (node.id) ids.add(node.id);
        (Array.isArray(node.children) ? node.children : []).forEach(walk);
    };
    walk(root);
    return ids;
}

/* ═══════════════════════════════════════════════════════════
   ADMIN PANEL — Full career tree editor
   ═══════════════════════════════════════════════════════════ */
export default function AdminPanel() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const resetToken = searchParams.get('token');
    const nodeParam = searchParams.get('node'); // e.g. ?node=student,after-10th

    const [tree, setTree] = useState(null);
    const [selectedId, setSelectedId] = useState(null);
    const [expandedNodes, setExpandedNodes] = useState(new Set(['start']));
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [toast, setToast] = useState(null);
    const [stats, setStats] = useState(null);
    const [demandStats, setDemandStats] = useState({ totalRequests: 0, uniqueNodes: 0, topNodes: [] });
    const [demandLoading, setDemandLoading] = useState(false);
    const [notifData, setNotifData]       = useState({ total: 0, queued: 0, unsubscribed: 0, results: [] });
    const [notifLoading, setNotifLoading] = useState(false);
    const [notifFilter, setNotifFilter]   = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [editMode, setEditMode] = useState(false); // editing existing node
    const [addMode, setAddMode] = useState(null); // parentId for adding child
    const [editLabel, setEditLabel] = useState('');
    const [editId, setEditId] = useState('');
    const [newLabel, setNewLabel] = useState('');
    const [newId, setNewId] = useState('');
    const [confirmDelete, setConfirmDelete] = useState(null);
    const [changePassOpen, setChangePassOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [importError, setImportError] = useState('');
    const [unsavedChanges, setUnsavedChanges] = useState(false);
    const [layoutConfig, setLayoutConfig] = useState(DEFAULT_TREE_LAYOUT);
    const [layoutLoading, setLayoutLoading] = useState(true);
    const [layoutSaving, setLayoutSaving] = useState(false);
    const [mirrorPreviewMode, setMirrorPreviewMode] = useState('desktop');
    const [previewEngine, setPreviewEngine] = useState('mirror');
    const [showLayoutStudio, setShowLayoutStudio] = useState(false);
    const [dragUndoStack, setDragUndoStack] = useState([]);
    const [selectedPersonaId, setSelectedPersonaId] = useState(null);

    const mirrorZoomStack = useMemo(() => {
        if (!nodeParam) return [];
        return nodeParam.split(',').map((s) => s.trim()).filter(Boolean);
    }, [nodeParam]);

    const personaRootOptions = useMemo(() => {
        if (!tree?.children?.length) return [];
        const byId = new Map((tree.children || []).map((n) => [n.id, n]));
        return [
            { id: 'student', label: 'Student', subtitle: 'Class 10 to career start', emoji: '🎓' },
            { id: 'professional', label: 'Earning Livelihood', subtitle: 'Job, business, and freelance paths', emoji: '💼' },
        ].map((p) => ({ ...p, node: byId.get(p.id) || null }));
    }, [tree]);

    const selectedPersonaNode = useMemo(() => {
        return personaRootOptions.find((p) => p.id === selectedPersonaId)?.node || null;
    }, [personaRootOptions, selectedPersonaId]);

    const selectedPageLinkedEnabled = useMemo(() => {
        const globalCfg = layoutConfig?.global && typeof layoutConfig.global === 'object' ? layoutConfig.global : {};
        const byRoot = globalCfg.linkedSiblingShapesByRoot && typeof globalCfg.linkedSiblingShapesByRoot === 'object'
            ? globalCfg.linkedSiblingShapesByRoot
            : {};
        const pageId = selectedPersonaId || 'start';
        if (Object.prototype.hasOwnProperty.call(byRoot, pageId)) {
            return byRoot[pageId] !== false;
        }
        return globalCfg.linkedSiblingShapes !== false;
    }, [layoutConfig, selectedPersonaId]);

    const layoutHealth = useMemo(() => {
        const treeIds = collectTreeNodeIds(tree);
        const nodeMap = layoutConfig?.nodes && typeof layoutConfig.nodes === 'object' ? layoutConfig.nodes : {};
        const savedIds = Object.keys(nodeMap);

        if (treeIds.size === 0) {
            return {
                totalTreeNodes: 0,
                savedCount: savedIds.length,
                missingIds: [],
                incompleteIds: [],
                outOfRangeIds: [],
                mismatchIds: [],
                staleIds: savedIds,
            };
        }

        const missingIds = [];
        const incompleteIds = [];
        const outOfRangeIds = [];
        const mismatchIds = [];

        treeIds.forEach((id) => {
            if (id === 'start') return;
            const entry = nodeMap[id];
            if (!entry || typeof entry !== 'object') {
                missingIds.push(id);
                return;
            }

            const x = Number(entry.x);
            const y = Number(entry.y);
            const mobileX = Number(entry.mobileX);
            const mobileY = Number(entry.mobileY);
            const hasAll = Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(mobileX) && Number.isFinite(mobileY);

            if (!hasAll) {
                incompleteIds.push(id);
                return;
            }

            if ([x, y, mobileX, mobileY].some((n) => n < 0 || n > 100)) {
                outOfRangeIds.push(id);
            }
            if (x !== mobileX || y !== mobileY) {
                mismatchIds.push(id);
            }
        });

        const staleIds = savedIds.filter((id) => !treeIds.has(id));

        return {
            totalTreeNodes: treeIds.size,
            savedCount: savedIds.length,
            missingIds,
            incompleteIds,
            outOfRangeIds,
            mismatchIds,
            staleIds,
        };
    }, [tree, layoutConfig]);

    const token = localStorage.getItem('cr_admin_token');
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

    /* ── Toast helper ── */
    const showToast = useCallback((msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    }, []);

    /* ── Auth check & initial load ── */
    useEffect(() => {
        if (resetToken) return; // skip fetch when showing reset form
        if (!token) { navigate('/'); return; }
        fetchTree();
        fetchStats();
        fetchLayout();
        fetchDemandStats();
        fetchNotifications('');
    }, []);

    /* ── Auto-navigate to node from ?node= param or sessionStorage ── */
    const nodeParamApplied = useRef(false);
    useEffect(() => {
        if (nodeParamApplied.current || !tree) return;
        // Source 1: ?node= URL param (e.g. /admin?node=student,s_after10th)
        let ids = nodeParam ? nodeParam.split(',').map(s => s.trim()).filter(Boolean) : [];
        // Source 2: sessionStorage from frontend tree navigation
        if (ids.length === 0) {
            try {
                const stored = sessionStorage.getItem('pw_ss_zoom');
                if (stored) {
                    const parsed = JSON.parse(stored);
                    if (Array.isArray(parsed) && parsed.length > 0) ids = parsed;
                }
            } catch (e) { console.debug("[AdminPanel] non-fatal:", e?.message); }
        }
        if (ids.length === 0) return;
        const lastId = ids[ids.length - 1];
        if (!lastId || !findNode(tree, lastId)) return;
        nodeParamApplied.current = true;
        setActiveTab('tree');
        expandToNode(lastId);
        selectNode(lastId);
    }, [tree, nodeParam]);

    /* ── Warn before leaving with unsaved changes ── */
    useEffect(() => {
        const handler = (e) => {
            if (unsavedChanges) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, [unsavedChanges]);

    // If there's a reset token, show the reset password form
    if (resetToken) return <ResetPasswordView token={resetToken} />;

    const fetchTree = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${API}/api/careers`, { headers });
            if (res.status === 401) { localStorage.removeItem('cr_admin_token'); navigate('/'); return; }
            if (!res.ok) throw new Error('Failed to load tree');
            const data = await res.json();
            if (isCollapsedPersonaTree(data)) {
                setTree(careersData);
                setError(null);
            } else {
                setTree(data);
                setError(null);
            }
        } catch (err) {
            setTree(careersData);
            setError(null);
        } finally { setLoading(false); }
    };

    const fetchStats = async () => {
        try {
            const res = await fetch(`${API}/api/careers/stats`, { headers });
            if (res.ok) {
                setStats(await res.json());
                return;
            }
        } catch (e) { console.debug("[AdminPanel] non-fatal:", e?.message); }

        const fallbackStats = countTreeMetrics(careersData);
        setStats({ totalNodes: fallbackStats.total, maxDepth: fallbackStats.maxDepth, rootChildren: careersData.children?.length || 0 });
    };

    const fetchLayout = async () => {
        try {
            setLayoutLoading(true);
            const res = await fetch(`${API}/api/tree-layout`, { headers });
            if (!res.ok) throw new Error('Failed to load tree layout config');
            const data = await res.json();
            const layout = data?.layout && typeof data.layout === 'object' ? data.layout : DEFAULT_TREE_LAYOUT;
            setLayoutConfig(layout);
        } catch (err) {
            showToast(err.message || 'Layout config load failed', 'error');
        } finally {
            setLayoutLoading(false);
        }
    };

    async function fetchDemandStats() {
        try {
            setDemandLoading(true);
            const res = await fetch(`${API}/api/demands/stats`, { headers });
            if (!res.ok) throw new Error('Failed to load demand analytics');
            const data = await res.json();
            setDemandStats({
                totalRequests: Number(data?.totalRequests || 0),
                uniqueNodes: Number(data?.uniqueNodes || 0),
                topNodes: Array.isArray(data?.topNodes) ? data.topNodes : [],
            });
        } catch (err) {
            setDemandStats({ totalRequests: 0, uniqueNodes: 0, topNodes: [] });
            showToast(err.message || 'Demand analytics load failed', 'error');
        } finally {
            setDemandLoading(false);
        }
    }

    async function fetchNotifications(filter) {
        const f = filter !== undefined ? filter : notifFilter;
        try {
            setNotifLoading(true);
            const qs = f ? `?status=${encodeURIComponent(f)}` : '';
            const res = await fetch(`${API}/api/admin/notifications${qs}`, { headers });
            if (!res.ok) throw new Error('Failed to load notifications');
            const data = await res.json();
            setNotifData({
                total:        Number(data?.total        || 0),
                queued:       Number(data?.queued       || 0),
                unsubscribed: Number(data?.unsubscribed || 0),
                results:      Array.isArray(data?.results) ? data.results : [],
            });
        } catch (err) {
            showToast(err.message || 'Notifications load failed', 'error');
        } finally {
            setNotifLoading(false);
        }
    }

    /* ── Find node in tree ── */
    const findNode = (node, id) => {
        if (!node) return null;
        if (node.id === id) return node;
        if (node.children) {
            for (const c of node.children) {
                const f = findNode(c, id);
                if (f) return f;
            }
        }
        return null;
    };

    /* ── Get path to node ── */
    const getPath = (node, id, path = []) => {
        if (!node) return null;
        const newPath = [...path, { id: node.id, label: node.label }];
        if (node.id === id) return newPath;
        if (node.children) {
            for (const c of node.children) {
                const result = getPath(c, id, newPath);
                if (result) return result;
            }
        }
        return null;
    };

    /* ── Select node ── */
    const selectNode = (id) => {
        setSelectedId(id);
        setEditMode(false);
        setAddMode(null);
        setConfirmDelete(null);
        const node = findNode(tree, id);
        if (node) {
            setEditLabel(node.label);
            setEditId(node.id);
        }
    };

    /* ── Toggle expand ── */
    const toggleExpand = (id) => {
        setExpandedNodes(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    /* ── Expand all parents of a node ── */
    const expandToNode = (id) => {
        const path = getPath(tree, id);
        if (path) {
            setExpandedNodes(prev => {
                const next = new Set(prev);
                path.forEach(p => next.add(p.id));
                return next;
            });
        }
    };

    /* ── API operations ── */
    const apiCall = async (method, url, body) => {
        try {
            const res = await fetch(`${API}${url}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
            if (res.status === 401) {
                localStorage.removeItem('cr_admin_token');
                showToast('Session expired — please log in again', 'error');
                setTimeout(() => navigate('/'), 1500);
                throw new Error('Session expired');
            }
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Operation failed');
            if (data.tree) {
                setTree(data.tree);
                setUnsavedChanges(true);
            }
            fetchStats();
            return data;
        } catch (err) {
            showToast(err.message, 'error');
            throw err;
        }
    };

    const handleUpdateNode = async () => {
        if (!editLabel.trim()) { showToast('Label cannot be empty', 'error'); return; }
        try {
            await apiCall('PUT', `/api/careers/node/${selectedId}`, { label: editLabel.trim().toUpperCase(), newId: editId.trim() || undefined });
            showToast('Node updated');
            setEditMode(false);
            setSelectedId(editId.trim() || selectedId);
        } catch (e) { console.debug("[AdminPanel] non-fatal:", e?.message); }
    };

    const handleAddChild = async () => {
        if (!newLabel.trim()) { showToast('Label is required', 'error'); return; }
        const id = newId.trim() || newLabel.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
        try {
            await apiCall('POST', '/api/careers/node', { parentId: addMode, node: { id, label: newLabel.trim().toUpperCase() } });
            showToast('Node added');
            expandToNode(addMode);
            setAddMode(null);
            setNewLabel('');
            setNewId('');
            selectNode(id);
        } catch (e) { console.debug("[AdminPanel] non-fatal:", e?.message); }
    };

    const handleDeleteNode = async (id) => {
        try {
            await apiCall('DELETE', `/api/careers/node/${id}`);
            showToast('Node deleted');
            setConfirmDelete(null);
            if (selectedId === id) setSelectedId(null);
        } catch (e) { console.debug("[AdminPanel] non-fatal:", e?.message); }
    };

    const handleMoveNode = async (id, direction) => {
        try {
            await apiCall('POST', `/api/careers/node/${id}/move`, { direction });
            showToast(`Moved ${direction}`);
        } catch (e) { console.debug("[AdminPanel] non-fatal:", e?.message); }
    };

    const updateLayoutField = (path, value) => {
        setLayoutConfig(prev => {
            const next = deepClone(prev || DEFAULT_TREE_LAYOUT);
            let ref = next;
            for (let i = 0; i < path.length - 1; i++) {
                if (!ref[path[i]] || typeof ref[path[i]] !== 'object') ref[path[i]] = {};
                ref = ref[path[i]];
            }
            ref[path[path.length - 1]] = value;
            return next;
        });
    };

    const updateNodeLayoutField = (nodeId, key, value) => {
        if (!nodeId) return;
        setLayoutConfig(prev => {
            const next = deepClone(prev || DEFAULT_TREE_LAYOUT);
            if (!next.nodes || typeof next.nodes !== 'object') next.nodes = {};
            if (!next.nodes[nodeId] || typeof next.nodes[nodeId] !== 'object') next.nodes[nodeId] = {};
            next.nodes[nodeId][key] = value;
            return next;
        });
    };

    const updateFullLayoutConfig = useCallback((nextLayout) => {
        if (!nextLayout || typeof nextLayout !== 'object') return;
        setLayoutConfig(nextLayout);
    }, []);

    const toggleLinkedShapesForSelectedPage = useCallback(async () => {
        const pageId = selectedPersonaId || 'start';
        const nextLayout = deepClone(layoutConfig || DEFAULT_TREE_LAYOUT);
        if (!nextLayout.global || typeof nextLayout.global !== 'object') {
            nextLayout.global = deepClone(DEFAULT_TREE_LAYOUT.global);
        }
        if (!nextLayout.global.linkedSiblingShapesByRoot || typeof nextLayout.global.linkedSiblingShapesByRoot !== 'object') {
            nextLayout.global.linkedSiblingShapesByRoot = {};
        }

        const byRoot = nextLayout.global.linkedSiblingShapesByRoot;
        const current = Object.prototype.hasOwnProperty.call(byRoot, pageId)
            ? byRoot[pageId] !== false
            : (nextLayout.global.linkedSiblingShapes !== false);
        byRoot[pageId] = !current;

        setLayoutConfig(nextLayout);

        try {
            setLayoutSaving(true);
            const res = await fetch(`${API}/api/tree-layout`, {
                method: 'PUT',
                headers,
                body: JSON.stringify({ layout: nextLayout }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || 'Failed to update page link toggle');
            if (data?.layout && typeof data.layout === 'object') {
                setLayoutConfig(data.layout);
                localStorage.setItem('cr_layout_config_cache', JSON.stringify(data.layout));
            }
            localStorage.setItem('cr_layout_updated_at', String(Date.now()));
            showToast(`${selectedPersonaId || 'start'} page linking ${!current ? 'enabled' : 'disabled'}`);
        } catch (err) {
            showToast(err.message || 'Failed to update page linking', 'error');
        } finally {
            setLayoutSaving(false);
        }
    }, [selectedPersonaId, layoutConfig, API, headers, showToast]);

    const resetNodeLayout = (nodeId) => {
        if (!nodeId) return;
        setLayoutConfig(prev => {
            const next = deepClone(prev || DEFAULT_TREE_LAYOUT);
            if (next.nodes && next.nodes[nodeId]) delete next.nodes[nodeId];
            return next;
        });
    };

    const saveLayoutConfig = async () => {
        try {
            setLayoutSaving(true);
            const res = await fetch(`${API}/api/tree-layout`, {
                method: 'PUT',
                headers,
                body: JSON.stringify({ layout: layoutConfig })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || 'Failed to save tree layout');
            if (data?.layout && typeof data.layout === 'object') {
                setLayoutConfig(data.layout);
            }
            localStorage.setItem('cr_layout_updated_at', String(Date.now()));
            showToast('Tree layout controls saved');
        } catch (err) {
            showToast(err.message || 'Failed to save layout', 'error');
        } finally {
            setLayoutSaving(false);
        }
    };

    const cleanupStaleLayoutIds = useCallback(async () => {
        const staleIds = layoutHealth?.staleIds || [];
        if (staleIds.length === 0) {
            showToast('No stale layout IDs found');
            return;
        }

        const cleanedLayout = deepClone(layoutConfig || DEFAULT_TREE_LAYOUT);
        if (!cleanedLayout.nodes || typeof cleanedLayout.nodes !== 'object') cleanedLayout.nodes = {};
        staleIds.forEach((id) => {
            delete cleanedLayout.nodes[id];
        });

        setLayoutConfig(cleanedLayout);

        try {
            setLayoutSaving(true);
            const res = await fetch(`${API}/api/tree-layout`, {
                method: 'PUT',
                headers,
                body: JSON.stringify({ layout: cleanedLayout })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || 'Failed to clean stale layout IDs');
            if (data?.layout && typeof data.layout === 'object') {
                setLayoutConfig(data.layout);
                try {
                    localStorage.setItem('cr_layout_config_cache', JSON.stringify(data.layout));
                } catch (e) { console.debug("[AdminPanel] non-fatal:", e?.message); }
            }
            localStorage.setItem('cr_layout_updated_at', String(Date.now()));
            showToast(`Removed ${staleIds.length} stale layout ID${staleIds.length > 1 ? 's' : ''}`);
        } catch (err) {
            showToast(err.message || 'Cleanup failed', 'error');
        } finally {
            setLayoutSaving(false);
        }
    }, [layoutHealth, layoutConfig, API, headers, showToast]);

    const autoFillMissingLayoutIds = useCallback(async () => {
        const missingIds = (layoutHealth?.missingIds || []).filter((id) => id !== 'start');
        if (!tree) {
            showToast('Tree data is not ready yet', 'error');
            return;
        }
        if (missingIds.length === 0) {
            showToast('No missing node positions found');
            return;
        }

        const nextLayout = deepClone(layoutConfig || DEFAULT_TREE_LAYOUT);
        if (!nextLayout.nodes || typeof nextLayout.nodes !== 'object') nextLayout.nodes = {};

        const nodeById = new Map();
        const parentById = new Map();
        const depthById = new Map();
        const walk = (node, parentId = null, depth = 0) => {
            if (!node || typeof node !== 'object' || !node.id) return;
            nodeById.set(node.id, node);
            parentById.set(node.id, parentId);
            depthById.set(node.id, depth);
            (Array.isArray(node.children) ? node.children : []).forEach((child) => walk(child, node.id, depth + 1));
        };
        walk(tree, null, 0);

        const clampPct = (n) => Math.max(2, Math.min(98, Math.round(Number(n) || 0)));
        const getManualPos = (id) => {
            const entry = nextLayout.nodes[id];
            if (entry && Number.isFinite(entry.x) && Number.isFinite(entry.y)) {
                return { x: Number(entry.x), y: Number(entry.y) };
            }
            const node = nodeById.get(id);
            if (node?.pos && Number.isFinite(node.pos.x) && Number.isFinite(node.pos.y)) {
                return { x: Number(node.pos.x), y: Number(node.pos.y) };
            }
            return null;
        };

        const rowPlanFor = (count) => {
            if (count <= 1) return [1];
            if (count === 2) return [2];
            if (count === 3) return [1, 2];
            if (count === 4) return [2, 2];
            if (count === 5) return [2, 3];
            if (count === 6) return [2, 2, 2];
            const rows = [];
            let left = count;
            while (left > 0) {
                const take = Math.min(3, left);
                rows.push(take);
                left -= take;
            }
            return rows;
        };

        const slotFractions = (count) => {
            if (count <= 1) return [0.5];
            if (count === 2) return [0.26, 0.74];
            if (count === 3) return [0.16, 0.5, 0.84];
            return Array.from({ length: count }, (_, i) => 0.12 + ((0.76 * i) / Math.max(1, count - 1)));
        };

        let applied = 0;
        const orderedMissing = [...missingIds].sort((a, b) => (depthById.get(a) || 0) - (depthById.get(b) || 0));

        orderedMissing.forEach((id) => {
            if (nextLayout.nodes[id] && typeof nextLayout.nodes[id] === 'object') return;

            const node = nodeById.get(id);
            if (!node) return;

            let resolved = getManualPos(id);
            if (!resolved) {
                const parentId = parentById.get(id);
                const parentNode = parentId ? nodeById.get(parentId) : null;
                const siblings = Array.isArray(parentNode?.children) ? parentNode.children : [];
                const sibCount = Math.max(1, siblings.length);
                const sibIndex = Math.max(0, siblings.findIndex((s) => s.id === id));

                if (!parentId || parentId === 'start') {
                    resolved = {
                        x: 8 + (((sibIndex + 1) / (sibCount + 1)) * 84),
                        y: 34,
                    };
                } else {
                    const parentPos = getManualPos(parentId) || { x: 50, y: 26 + ((depthById.get(parentId) || 0) * 10) };
                    const plan = rowPlanFor(sibCount);
                    let cursor = 0;
                    let rowIndex = 0;
                    let colIndex = 0;
                    for (let r = 0; r < plan.length; r += 1) {
                        const count = plan[r];
                        if (sibIndex < cursor + count) {
                            rowIndex = r;
                            colIndex = sibIndex - cursor;
                            break;
                        }
                        cursor += count;
                    }
                    const yOffsets = [14, 26, 38, 50];
                    const spread = Math.min(62, 24 + sibCount * 7);
                    const frac = slotFractions(plan[rowIndex] || 1)[colIndex] ?? 0.5;
                    resolved = {
                        x: (parentPos.x - spread / 2) + spread * frac,
                        y: parentPos.y + (yOffsets[rowIndex] ?? (14 + rowIndex * 12)),
                    };
                }
            }

            const x = clampPct(resolved.x);
            const y = clampPct(resolved.y);
            nextLayout.nodes[id] = { x, y, mobileX: x, mobileY: y };
            applied += 1;
        });

        if (applied === 0) {
            showToast('No new node positions were generated');
            return;
        }

        setLayoutConfig(nextLayout);

        try {
            setLayoutSaving(true);
            const res = await fetch(`${API}/api/tree-layout`, {
                method: 'PUT',
                headers,
                body: JSON.stringify({ layout: nextLayout })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || 'Failed to save generated node positions');
            if (data?.layout && typeof data.layout === 'object') {
                setLayoutConfig(data.layout);
                try {
                    localStorage.setItem('cr_layout_config_cache', JSON.stringify(data.layout));
                } catch (e) { console.debug("[AdminPanel] non-fatal:", e?.message); }
            }
            localStorage.setItem('cr_layout_updated_at', String(Date.now()));
            showToast(`Generated positions for ${applied} missing node${applied > 1 ? 's' : ''}`);
        } catch (err) {
            showToast(err.message || 'Auto-fill failed', 'error');
        } finally {
            setLayoutSaving(false);
        }
    }, [layoutHealth, tree, layoutConfig, API, headers, showToast]);

    /* ── Drag auto-save: PATCH /api/nodes/positions when drag ends ── */
    // Receives fresh x/y directly from InteractiveTimeline's drag ref — no stale closure issue
    const handleUndoDrag = useCallback(async () => {
        if (dragUndoStack.length === 0) return;
        const prevLayout = dragUndoStack[dragUndoStack.length - 1];
        setDragUndoStack(s => s.slice(0, -1));
        try {
            const res = await fetch(`${API}/api/tree-layout`, {
                method: 'PUT',
                headers,
                body: JSON.stringify({ layout: prevLayout }),
            });
            if (res.ok) {
                const data = await res.json().catch(() => null);
                if (data?.layout) {
                    setLayoutConfig(data.layout);
                    localStorage.setItem('cr_layout_config_cache', JSON.stringify(data.layout));
                }
                showToast?.('Position undone');
            }
        } catch (err) {
            console.warn('[Admin] Undo error:', err);
        }
    }, [dragUndoStack, API, headers, showToast]);

    const handleAutoSaveDrag = useCallback(async (nodeId, freshX, freshY, layoutSnapshot) => {
        // Push current layout to undo stack before saving
        setDragUndoStack(s => [...s.slice(-19), JSON.parse(JSON.stringify(layoutConfig))]);

        let x = freshX;
        let y = freshY;
        if (!Number.isFinite(x) || !Number.isFinite(y)) {
            const nodeCfg = layoutConfig?.nodes?.[nodeId];
            if (nodeCfg) {
                x = Number(nodeCfg.x ?? nodeCfg.mobileX);
                y = Number(nodeCfg.y ?? nodeCfg.mobileY);
            }
        }

        const effectiveLayout = layoutSnapshot && typeof layoutSnapshot === 'object'
            ? layoutSnapshot
            : layoutConfig;

        if (!effectiveLayout || typeof effectiveLayout !== 'object') return;
        try {
            // Save full layout so linked sibling templates and node positions persist together
            const patchRes = await fetch(`${API}/api/tree-layout`, {
                method: 'PUT',
                headers,
                body: JSON.stringify({ layout: effectiveLayout }),
            });
            if (!patchRes.ok) {
                console.warn('[Admin] Position save failed:', patchRes.status);
                return;
            }
            const patchData = await patchRes.json().catch(() => null);
            if (patchData?.layout && typeof patchData.layout === 'object') {
                setLayoutConfig(patchData.layout);
                localStorage.setItem('cr_layout_config_cache', JSON.stringify(patchData.layout));
            }
            localStorage.setItem('cr_layout_updated_at', String(Date.now()));
        } catch (err) {
            console.warn('[Admin] Drag save error:', err);
        }
    }, [layoutConfig, headers, API]);

    const handleLogout = () => {
        localStorage.removeItem('cr_admin_token');
        navigate('/');
    };

    /* ── Search filter ── */
    const matchesSearch = (node) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        if (node.label.toLowerCase().includes(q) || node.id.toLowerCase().includes(q)) return true;
        if (node.children) return node.children.some(c => matchesSearch(c));
        return false;
    };

    /* ── Selected node info ── */
    const selectedNode = selectedId ? findNode(tree, selectedId) : null;
    const selectedPath = selectedId ? getPath(tree, selectedId) : [];

    /* ═══ LOADING ═══ */
    if (loading) return (
        <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col items-center justify-center pw-page-bg">
            <div className="flex items-center gap-3 text-gray-400">
                <RefreshCw size={20} className="animate-spin" />
                <span>Loading career tree…</span>
            </div>
        </div>
    );

    /* ═══ ERROR ═══ */
    if (error) return (
        <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col items-center justify-center pw-page-bg">
            <div className="text-center">
                <AlertTriangle size={40} className="text-red-400 mx-auto mb-3" />
                <p className="text-white mb-2">Failed to load</p>
                <p className="text-gray-500 text-sm mb-4">{error}</p>
                <button onClick={fetchTree} className="px-4 py-2 bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/10 text-white rounded-lg text-sm fx-pop hover:-translate-y-1">
                    Retry
                </button>
            </div>
        </div>
    );

    return (
        <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden pw-page-bg text-white">
            {/* ═══ HEADER ═══ */}
            <header className="h-14 border-b border-white/[0.06] flex items-center justify-between px-6 flex-shrink-0 bg-[#0a0a16]">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
                        <FolderTree size={16} className="text-amber-400" />
                    </div>
                    <span className="font-semibold text-sm tracking-wide">CR Admin</span>

                    {/* ── Tabs ── */}
                    <div className="flex items-center gap-2 ml-6 bg-white/5 rounded-lg p-1 border border-white/10">
                        {[
                            { id: 'dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
                            { id: 'tree',          icon: FolderTree,      label: 'Career Tree' },
                            { id: 'shapes',        icon: Sliders,         label: 'Node Shapes' },
                            { id: 'videos',        icon: Activity,        label: 'Videos' },
                            { id: 'video-mapper',  icon: Clock,           label: 'Video Mapper' },
                            { id: 'demands',       icon: BarChart3,       label: 'Demand Analytics' },
                            { id: 'notifications', icon: Bell,            label: 'Notifications', badge: notifData.queued },
                            { id: 'settings',      icon: Settings,        label: 'Site Settings' },
                        ].map(tab => (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium fx-pop relative ${
                                    activeTab === tab.id ? 'bg-amber-500/20 text-amber-300' : 'text-gray-500 hover:text-gray-300'
                                }`}>
                                <tab.icon size={13} /> <span className="hidden md:inline">{tab.label}</span>
                                {tab.id === 'tree' && unsavedChanges && (
                                    <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></span>
                                )}
                                {(tab.badge || 0) > 0 && (
                                    <span className="ml-1 min-w-[16px] h-4 px-1 rounded-full bg-teal-500/80 text-[10px] font-bold text-white flex items-center justify-center">
                                        {tab.badge}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>

                    {activeTab === 'tree' && stats && (
                        <div className="hidden sm:flex items-center gap-4 ml-4 text-xs text-gray-500">
                            <span>{stats.totalNodes} nodes</span>
                            <span>{stats.maxDepth} levels deep</span>
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {activeTab === 'tree' && tree && (
                        <button onClick={saveLayoutConfig} disabled={layoutSaving || layoutLoading}
                            className="flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg border border-white/10 fx-pop bg-blue-500/20 hover:bg-blue-500/30 hover:-translate-y-1 disabled:bg-gray-700 disabled:text-gray-500 text-blue-200">
                            <Save size={14} />
                            {layoutSaving ? 'Saving Layout…' : 'Save Layout Controls'}
                        </button>
                    )}
                    {activeTab === 'tree' && tree && (
                        <button onClick={async () => {
                            try {
                                await fetch(`${API}/api/careers`, {
                                    method: 'PUT',
                                    headers,
                                    body: JSON.stringify(tree)
                                });
                                setUnsavedChanges(false);
                                showToast('✓ Changes published to frontend!', 'success');
                            } catch (err) {
                                showToast('Failed to publish changes', 'error');
                            }
                        }} 
                            className={`flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg fx-pop ${
                                unsavedChanges 
                                    ? 'bg-amber-500/30 hover:bg-amber-500/40 text-amber-200 shadow-lg shadow-amber-500/20' 
                                    : 'bg-green-500/20 hover:bg-green-500/30 text-green-300'
                            }`}>
                            <Save size={14} /> 
                            {unsavedChanges ? 'Publish Changes' : 'Saved'}
                            {unsavedChanges && <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse ml-1"></span>}
                        </button>
                    )}
                    <button onClick={() => setChangePassOpen(true)}
                        className="flex items-center gap-2 px-3 py-2 text-xs text-gray-400 hover:text-white hover:bg-white/5 rounded-lg fx-pop hover:-translate-y-1">
                        <KeyRound size={14} /> Password
                    </button>
                    <button onClick={handleLogout}
                        className="flex items-center gap-2 px-3 py-2 text-xs text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg fx-pop hover:-translate-y-1">
                        <LogOut size={14} /> Logout
                    </button>
                </div>
            </header>

            {/* ═══ MAIN ═══ */}
            <div className={`flex-1 flex overflow-hidden ${activeTab === 'tree' ? '' : 'mt-0'}`}>
                {/* ─── DASHBOARD TAB ─── */}
                {activeTab === 'dashboard' && (
                    <main className="flex-1 overflow-y-auto pw-page-bg p-8">
                        <div className="max-w-4xl mx-auto">
                            <p className="pw-kicker mb-1">Admin Overview</p>
                            <h2 className="text-2xl font-bold text-white mb-2">Dashboard</h2>
                            <p className="text-sm text-gray-300 mb-8 leading-relaxed">Overview of your career tree and quick actions</p>

                            {/* Stats cards */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                                {[
                                    { label: 'Total Nodes', value: stats?.totalNodes || 0, icon: Database, color: 'amber' },
                                    { label: 'Max Depth', value: stats?.maxDepth || 0, icon: Layers, color: 'emerald' },
                                    { label: 'Root Branches', value: stats?.rootChildren || 0, icon: FolderTree, color: 'blue' },
                                    { label: 'Status', value: 'Active', icon: Activity, color: 'green' },
                                ].map((card, i) => {
                                    const Icon = card.icon;
                                    return (
                                        <div key={i} className="p-6 pw-panel-soft backdrop-blur-md shadow-2xl border border-white/10">
                                            <div className="flex items-center gap-2 mb-3">
                                                <Icon size={16} className={`text-${card.color}-400`} />
                                                <span className="text-xs text-gray-400 uppercase tracking-wider">{card.label}</span>
                                            </div>
                                            <p className="text-2xl font-bold text-white">{card.value}</p>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Quick Actions */}
                            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Quick Actions</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                                {/* Export JSON */}
                                <button onClick={() => {
                                    const blob = new Blob([JSON.stringify(tree, null, 2)], { type: 'application/json' });
                                    const a = document.createElement('a');
                                    a.href = URL.createObjectURL(blob);
                                    a.download = `career-explorer-tree-${new Date().toISOString().slice(0,10)}.json`;
                                    a.click();
                                    URL.revokeObjectURL(a.href);
                                    showToast('Tree exported as JSON');
                                }}
                                    className="flex items-center gap-4 p-6 pw-panel-soft backdrop-blur-md shadow-2xl border border-white/10 hover:bg-white/[0.06] hover:border-white/20 fx-pop hover:-translate-y-1 group text-left">
                                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                                        <Download size={18} className="text-amber-400" />
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium text-white group-hover:text-amber-300 transition-colors">Export Career Tree</div>
                                        <div className="text-xs text-gray-500">Download as JSON backup file</div>
                                    </div>
                                </button>

                                {/* Import JSON */}
                                <label className="flex items-center gap-4 p-6 pw-panel-soft backdrop-blur-md shadow-2xl border border-white/10 hover:bg-white/[0.06] hover:border-white/20 fx-pop hover:-translate-y-1 group text-left cursor-pointer">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                                        <Upload size={18} className="text-emerald-400" />
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium text-white group-hover:text-emerald-300 transition-colors">Import Career Tree</div>
                                        <div className="text-xs text-gray-500">Restore from JSON file</div>
                                        {importError && <div className="text-xs text-red-400 mt-1">{importError}</div>}
                                    </div>
                                    <input type="file" accept=".json" className="hidden" onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        try {
                                            const text = await file.text();
                                            const data = JSON.parse(text);
                                            if (!data.id || !data.label) throw new Error('Invalid tree structure');
                                            await apiCall('PUT', '/api/careers', data);
                                            setTree(data);
                                            fetchStats();
                                            showToast('Tree imported successfully');
                                            setImportError('');
                                        } catch (err) {
                                            setImportError(err.message);
                                            showToast('Import failed: ' + err.message, 'error');
                                        }
                                        e.target.value = '';
                                    }} />
                                </label>

                                {/* Preview site */}
                                <button onClick={() => window.open('/', '_blank')}
                                    className="flex items-center gap-4 p-6 pw-panel-soft backdrop-blur-md shadow-2xl border border-white/10 hover:bg-white/[0.06] hover:border-white/20 fx-pop hover:-translate-y-1 group text-left">
                                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                                        <ExternalLink size={18} className="text-blue-400" />
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium text-white group-hover:text-blue-300 transition-colors">Preview Site</div>
                                        <div className="text-xs text-gray-500">Open main site in new tab</div>
                                    </div>
                                </button>

                                {/* Edit Tree */}
                                <button onClick={() => setActiveTab('tree')}
                                    className="flex items-center gap-4 p-6 pw-panel-soft backdrop-blur-md shadow-2xl border border-white/10 hover:bg-white/[0.06] hover:border-white/20 fx-pop hover:-translate-y-1 group text-left">
                                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                                        <Edit3 size={18} className="text-purple-400" />
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium text-white group-hover:text-purple-300 transition-colors">Edit Career Tree</div>
                                        <div className="text-xs text-gray-500">Add, edit, or remove nodes</div>
                                    </div>
                                </button>
                            </div>

                            {/* Root branches quick view */}
                            {tree?.children?.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Root Branches</h3>
                                    <div className="space-y-2">
                                        {tree.children.map((child, i) => (
                                            <div key={child.id}
                                                className="flex items-center justify-between px-6 py-4 bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/[0.06] rounded-xl group cursor-pointer fx-pop"
                                                onClick={() => { setActiveTab('tree'); selectNode(child.id); expandToNode(child.id); }}>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xs text-gray-600 w-5 text-right font-mono">{i + 1}</span>
                                                    <span className="text-sm text-gray-300 group-hover:text-white transition-colors font-medium">{child.label}</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    {child.children?.length > 0 && (
                                                        <span className="text-[10px] text-gray-500 bg-white/5 px-2 py-1 rounded-full">
                                                            {child.children.length} children
                                                        </span>
                                                    )}
                                                    <ChevronRight size={14} className="text-gray-600 group-hover:text-gray-400" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </main>
                )}

                {/* ─── DEMANDS TAB ─── */}
                {activeTab === 'demands' && (
                    <main className="flex-1 overflow-y-auto pw-page-bg p-8">
                        <div className="mx-auto max-w-5xl">
                            <div className="mb-6 flex items-center justify-between gap-3">
                                <div>
                                    <p className="pw-kicker mb-1">Interview Demand Signals</p>
                                    <h2 className="text-2xl font-bold text-white">Demand Analytics</h2>
                                    <p className="mt-2 text-sm text-gray-300">Nodes with missing videos requested by users.</p>
                                </div>
                                <button
                                    onClick={fetchDemandStats}
                                    disabled={demandLoading}
                                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-gray-200 fx-pop hover:-translate-y-1 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {demandLoading ? 'Refreshing...' : 'Refresh'}
                                </button>
                            </div>

                            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                                <div className="glass-card rounded-2xl p-4">
                                    <p className="text-xs uppercase tracking-wider text-gray-400">Total Requests</p>
                                    <p className="mt-2 text-2xl font-bold text-amber-200">{demandStats.totalRequests}</p>
                                </div>
                                <div className="glass-card rounded-2xl p-4">
                                    <p className="text-xs uppercase tracking-wider text-gray-400">Unique Nodes</p>
                                    <p className="mt-2 text-2xl font-bold text-emerald-200">{demandStats.uniqueNodes}</p>
                                </div>
                                <div className="glass-card rounded-2xl p-4">
                                    <p className="text-xs uppercase tracking-wider text-gray-400">Highest Demand</p>
                                    <p className="mt-2 truncate text-base font-semibold text-sky-200">
                                        {demandStats.topNodes[0]?.nodeLabel || 'No data yet'}
                                    </p>
                                </div>
                            </div>

                            <div className="glass-card rounded-2xl p-4">
                                <div className="mb-3 text-sm font-semibold text-white/90">Top Requested Nodes</div>
                                {demandStats.topNodes.length === 0 ? (
                                    <p className="text-sm text-gray-400">No requests yet.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {demandStats.topNodes.map((row, idx) => (
                                            <div
                                                key={`${row.nodeId}-${idx}`}
                                                className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-black/20 px-3 py-3"
                                            >
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-medium text-white">{row.nodeLabel || row.nodeId}</p>
                                                    <p className="text-xs text-gray-500">{row.nodeId}</p>
                                                </div>
                                                <div className="ml-4 text-right">
                                                    <p className="text-lg font-bold text-amber-200">{row.requests}</p>
                                                    <p className="text-[11px] uppercase tracking-wide text-gray-500">requests</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </main>
                )}

                {/* ─── NOTIFICATIONS TAB ─── */}
                {activeTab === 'notifications' && (
                    <main className="flex-1 overflow-y-auto pw-page-bg p-8">
                        <div className="mx-auto max-w-5xl">
                            <div className="mb-6 flex items-center justify-between gap-3">
                                <div>
                                    <p className="pw-kicker mb-1">Scouting Mode Signups</p>
                                    <h2 className="text-2xl font-bold text-white">Notification Queue</h2>
                                    <p className="mt-2 text-sm text-gray-300">Visitors who subscribed for alerts when a matching professional is added.</p>
                                </div>
                                <button onClick={() => fetchNotifications(notifFilter)} disabled={notifLoading}
                                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-gray-200 fx-pop hover:-translate-y-1 hover:bg-white/[0.08] disabled:opacity-60">
                                    {notifLoading ? 'Refreshing…' : 'Refresh'}
                                </button>
                            </div>
                            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                                <div className="glass-card rounded-2xl p-4">
                                    <p className="text-xs uppercase tracking-wider text-gray-400">Total Signups</p>
                                    <p className="mt-2 text-2xl font-bold text-teal-300">{notifData.total}</p>
                                </div>
                                <div className="glass-card rounded-2xl p-4">
                                    <p className="text-xs uppercase tracking-wider text-gray-400">Queued (active)</p>
                                    <p className="mt-2 text-2xl font-bold text-amber-200">{notifData.queued}</p>
                                </div>
                                <div className="glass-card rounded-2xl p-4">
                                    <p className="text-xs uppercase tracking-wider text-gray-400">Unsubscribed</p>
                                    <p className="mt-2 text-2xl font-bold text-gray-400">{notifData.unsubscribed}</p>
                                </div>
                            </div>
                            <div className="mb-4 flex gap-2">
                                {[{ v: '', label: 'All' }, { v: 'queued', label: 'Queued' }, { v: 'unsubscribed', label: 'Unsubscribed' }].map(f => (
                                    <button key={f.v}
                                        onClick={() => { setNotifFilter(f.v); fetchNotifications(f.v); }}
                                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                                            notifFilter === f.v
                                                ? 'bg-teal-500/30 text-teal-300 border border-teal-500/40'
                                                : 'bg-white/5 text-gray-400 border border-white/10 hover:text-gray-200'
                                        }`}>{f.label}
                                    </button>
                                ))}
                            </div>
                            <div className="glass-card rounded-2xl overflow-hidden">
                                {notifData.results.length === 0 ? (
                                    <p className="p-6 text-sm text-gray-400">No entries yet.</p>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b border-white/[0.08] text-xs uppercase tracking-wider text-gray-500">
                                                    <th className="px-4 py-3 text-left">Email</th>
                                                    <th className="px-4 py-3 text-left">DNA</th>
                                                    <th className="px-4 py-3 text-left">Node</th>
                                                    <th className="px-4 py-3 text-left">Date</th>
                                                    <th className="px-4 py-3 text-left">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/[0.04]">
                                                {notifData.results.map((row) => (
                                                    <tr key={row.id} className="hover:bg-white/[0.03] transition-colors">
                                                        <td className="px-4 py-3 font-mono text-xs text-teal-300">{row.email}</td>
                                                        <td className="px-4 py-3">
                                                            <span className="font-mono text-xs bg-black/30 px-2 py-0.5 rounded text-amber-200">{row.visitorDna || '—'}</span>
                                                        </td>
                                                        <td className="px-4 py-3 text-gray-300 text-xs max-w-[160px] truncate" title={row.nodeLabel}>{row.nodeLabel || row.nodeId}</td>
                                                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                                                            {row.createdAt ? new Date(row.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            {row.status === 'unsubscribed'
                                                                ? <span className="flex items-center gap-1 text-xs text-gray-500"><MailX size={11}/> Unsubscribed</span>
                                                                : <span className="flex items-center gap-1 text-xs text-teal-400"><Bell size={11}/> Queued</span>}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    </main>
                )}

                {/* ─── SITE SETTINGS TAB ─── */}
                {activeTab === 'settings' && (
                    <SiteSettings token={token} showToast={showToast} />
                )}

                {/* ─── NODE SHAPES TAB ─── */}
                {activeTab === 'shapes' && (
                    <NodeShapesPanel
                        layoutConfig={layoutConfig}
                        token={token}
                        onLayoutSaved={(saved) => {
                            setLayoutConfig(saved);
                            try { localStorage.setItem('cr_layout_config_cache', JSON.stringify(saved)); } catch (e) { console.debug("[AdminPanel] non-fatal:", e?.message); }
                        }}
                        showToast={showToast}
                    />
                )}

                {/* ─── VIDEOS TAB ─── */}
                {activeTab === 'videos' && (
                    <VideoManager token={token} showToast={showToast} />
                )}

                {/* ─── VIDEO MAPPER TAB ─── */}
                {activeTab === 'video-mapper' && (
                    <VideoMapper token={token} tree={tree} showToast={showToast} />
                )}

                {/* ─── CAREER TREE TAB ─── */}
                {activeTab === 'tree' && <>
                {/* ─── LEFT: Persona options (frontend-like) ─── */}
                <aside className="w-80 border-r border-white/[0.06] flex flex-col flex-shrink-0 bg-[#0a0a14]">
                    <div className="p-4 border-b border-white/[0.06]">
                        <h3 className="text-xs text-gray-400 uppercase tracking-wider mb-3">Choose Entry Option</h3>
                        <div className="space-y-2">
                            {personaRootOptions.map((p) => (
                                <button
                                    key={p.id}
                                    onClick={() => {
                                        setSelectedPersonaId(p.id);
                                        setSelectedId(p.id);
                                        setAddMode(null);
                                        setEditMode(false);
                                    }}
                                    className={`w-full text-left px-3 py-2 rounded-xl border fx-pop ${selectedPersonaId === p.id ? 'border-amber-400/40 bg-amber-500/10 text-amber-200' : 'border-white/10 bg-white/[0.02] text-gray-200 hover:bg-white/[0.06]'}`}
                                >
                                    <div className="text-sm font-semibold">{p.emoji} {p.label}</div>
                                    <div className="text-[11px] text-gray-500 mt-1">{p.subtitle}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="p-3 border-b border-white/[0.06]">
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                            <input
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/[0.06] rounded-lg text-sm text-white placeholder-gray-600 focus:border-amber-500/30 focus:outline-none"
                                placeholder="Search nodes…"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto py-2 px-1 scrollbar-thin">
                        {!selectedPersonaNode && (
                            <div className="text-xs text-gray-600 px-3 py-2">Select Student or Earning Livelihood to load editable preview.</div>
                        )}
                        {selectedPersonaNode && (
                            <TreeItem
                                node={selectedPersonaNode}
                                depth={0}
                                selectedId={selectedId}
                                expandedNodes={expandedNodes}
                                onSelect={selectNode}
                                onToggle={toggleExpand}
                                onAddChild={(id) => { setAddMode(id); setNewLabel(''); setNewId(''); setSelectedId(null); setEditMode(false); }}
                                matchesSearch={matchesSearch}
                                searchQuery={searchQuery}
                            />
                        )}
                    </div>
                </aside>

                {/* ─── RIGHT: Editable Preview + Editor ─── */}
                <main className="flex-1 overflow-y-auto pw-page-bg">
                    <div className="p-4">
                        <div className="mb-3 flex items-center justify-between gap-2 flex-wrap">
                            {layoutHealth && (
                                <div className="flex items-center gap-2 flex-wrap text-[11px]">
                                    <span className={`px-2 py-1 rounded-md border ${layoutHealth.missingIds.length ? 'border-amber-400/40 text-amber-200 bg-amber-500/10' : 'border-emerald-400/35 text-emerald-200 bg-emerald-500/10'}`}
                                        title={layoutHealth.missingIds.slice(0, 24).join(', ')}>
                                        Missing: {layoutHealth.missingIds.length}
                                    </span>
                                    <span className={`px-2 py-1 rounded-md border ${layoutHealth.incompleteIds.length ? 'border-amber-400/40 text-amber-200 bg-amber-500/10' : 'border-emerald-400/35 text-emerald-200 bg-emerald-500/10'}`}
                                        title={layoutHealth.incompleteIds.slice(0, 24).join(', ')}>
                                        Incomplete: {layoutHealth.incompleteIds.length}
                                    </span>
                                    <span className={`px-2 py-1 rounded-md border ${layoutHealth.mismatchIds.length ? 'border-amber-400/40 text-amber-200 bg-amber-500/10' : 'border-emerald-400/35 text-emerald-200 bg-emerald-500/10'}`}
                                        title={layoutHealth.mismatchIds.slice(0, 24).join(', ')}>
                                        Mobile Diff: {layoutHealth.mismatchIds.length}
                                    </span>
                                    <span className={`px-2 py-1 rounded-md border ${layoutHealth.staleIds.length ? 'border-rose-400/45 text-rose-200 bg-rose-500/10' : 'border-emerald-400/35 text-emerald-200 bg-emerald-500/10'}`}
                                        title={layoutHealth.staleIds.slice(0, 24).join(', ')}>
                                        Stale IDs: {layoutHealth.staleIds.length}
                                    </span>
                                    <button
                                        onClick={autoFillMissingLayoutIds}
                                        disabled={layoutSaving || layoutLoading || layoutHealth.missingIds.length === 0}
                                        className="px-2 py-1 rounded-md border border-amber-400/40 text-amber-100 bg-amber-500/10 hover:bg-amber-500/20 disabled:border-white/10 disabled:text-gray-500 disabled:bg-white/[0.03]"
                                    >
                                        Fill Missing
                                    </button>
                                    <button
                                        onClick={cleanupStaleLayoutIds}
                                        disabled={layoutSaving || layoutLoading || layoutHealth.staleIds.length === 0}
                                        className="px-2 py-1 rounded-md border border-rose-400/40 text-rose-200 bg-rose-500/10 hover:bg-rose-500/20 disabled:border-white/10 disabled:text-gray-500 disabled:bg-white/[0.03]"
                                    >
                                        Clean Stale
                                    </button>
                                    <button
                                        onClick={toggleLinkedShapesForSelectedPage}
                                        disabled={layoutSaving || layoutLoading || !selectedPersonaId}
                                        className={`px-2 py-1 rounded-md border ${selectedPageLinkedEnabled ? 'border-emerald-400/45 text-emerald-200 bg-emerald-500/10 hover:bg-emerald-500/20' : 'border-amber-400/40 text-amber-100 bg-amber-500/10 hover:bg-amber-500/20'} disabled:border-white/10 disabled:text-gray-500 disabled:bg-white/[0.03]`}
                                        title={selectedPersonaId ? `Link template shapes only for ${selectedPersonaId}` : 'Select a page first'}
                                    >
                                        {selectedPageLinkedEnabled ? 'Page Link: On' : 'Page Link: Off'}
                                    </button>
                                </div>
                            )}
                            <div className="flex items-center gap-2 flex-wrap">
                            <button
                                onClick={() => setPreviewEngine('mirror')}
                                className={`px-3 py-2 text-xs rounded-lg border ${previewEngine === 'mirror' ? 'border-emerald-400/60 text-emerald-200 bg-emerald-500/15' : 'border-white/15 text-gray-200 hover:bg-white/5'}`}
                            >Mirror UI</button>
                            <button
                                onClick={() => { setPreviewEngine('mirror'); setMirrorPreviewMode('mobile'); }}
                                className={`px-3 py-2 text-xs rounded-lg border ${previewEngine === 'mirror' && mirrorPreviewMode === 'mobile' ? 'border-rose-400/60 text-rose-200 bg-rose-500/15' : 'border-white/15 text-gray-200 hover:bg-white/5'}`}
                            >Mirror UI + Mobile + Draggable</button>
                            <button
                                onClick={() => { setPreviewEngine('mirror'); setMirrorPreviewMode('desktop'); }}
                                className={`px-3 py-2 text-xs rounded-lg border ${previewEngine === 'mirror' && mirrorPreviewMode === 'desktop' ? 'border-rose-400/60 text-rose-200 bg-rose-500/15' : 'border-white/15 text-gray-200 hover:bg-white/5'}`}
                            >Mirror UI + Desktop + Draggable</button>
                            <button
                                onClick={() => setShowLayoutStudio(v => !v)}
                                className={`px-3 py-2 text-xs rounded-lg border ${showLayoutStudio ? 'border-purple-400/60 text-purple-200 bg-purple-500/15' : 'border-white/15 text-gray-200 hover:bg-white/5'}`}
                            ><Settings size={12} className="inline mr-1" />{showLayoutStudio ? 'Hide Layout' : 'Layout'}</button>
                            {dragUndoStack.length > 0 && (
                                <button
                                    onClick={handleUndoDrag}
                                    className="px-3 py-2 text-xs rounded-lg border border-amber-400/60 text-amber-200 bg-amber-500/15 hover:bg-amber-500/25 transition-colors"
                                ><Undo2 size={12} className="inline mr-1" />Undo ({dragUndoStack.length})</button>
                            )}
                            </div>
                        </div>

                        {!selectedPersonaNode ? (
                            <div className="rounded-2xl border border-white/[0.08] bg-black/30 min-h-[420px] flex items-center justify-center text-center px-6">
                                <div>
                                    <FolderTree size={36} className="text-gray-700 mx-auto mb-3" />
                                    <p className="text-sm text-gray-300">Preview stays empty until you click one of the 2 options.</p>
                                    <p className="text-xs text-gray-600 mt-1">Select Student or Earning Livelihood from the left panel.</p>
                                </div>
                            </div>
                        ) : previewEngine === 'mirror' ? (
                            <div
                                className="rounded-2xl border border-white/[0.08] bg-black/30 overflow-hidden relative"
                                style={{
                                    background: 'radial-gradient(ellipse 80% 50% at 50% 20%, #0c0c18 0%, #060609 50%, #020203 100%)',
                                    height: mirrorPreviewMode === 'mobile' ? '700px' : '620px',
                                }}
                            >
                                {mirrorPreviewMode === 'mobile' ? (
                                    <div className="max-w-[390px] mx-auto w-full h-full overflow-hidden relative" style={{ paddingLeft: '44px', paddingRight: '44px' }}>
                                        <div className="tree-stage-shell" style={{ padding: '14px', width: '100%', height: '100%' }}>
                                        <div className="tree-stage-surface">
                                            <DecisionNode
                                                key={`mirror-mobile-${selectedPersonaId || 'none'}`}
                                                isAdmin={true}
                                                forceMobile={true}
                                                framed={true}
                                                adminDragEnabled={true}
                                                onAdminNodeLayoutUpdate={updateNodeLayoutField}
                                                onAdminNodeLayoutCommit={handleAutoSaveDrag}
                                                onAdminLayoutConfigUpdate={updateFullLayoutConfig}
                                                onNodeSelect={(node) => {
                                                    if (!node?.id) return;
                                                    selectNode(node.id);
                                                    expandToNode(node.id);
                                                }}
                                                onPathChange={() => {}}
                                                onActiveNodePosition={() => {}}
                                                onRecenterStart={() => {}}
                                                onRecenterComplete={() => {}}
                                                onBack={() => {}}
                                                activeFilters={{}}
                                                searchQuery={searchQuery}
                                                searchMatches={[]}
                                                initialZoomStack={selectedPersonaId ? [selectedPersonaId] : []}
                                                initialActivePath={selectedPersonaId ? ['start', selectedPersonaId] : []}
                                            />
                                        </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="relative h-full overflow-hidden tree-stage-shell" style={{ paddingLeft: 'clamp(50px, 10vw, 130px)', paddingRight: 'clamp(50px, 10vw, 130px)' }}>
                                        <div className="tree-stage-surface">
                                            <DecisionNode
                                                key={`mirror-desktop-${selectedPersonaId || 'none'}`}
                                                isAdmin={true}
                                                forceMobile={false}
                                                framed={true}
                                                adminDragEnabled={true}
                                                onAdminNodeLayoutUpdate={updateNodeLayoutField}
                                                onAdminNodeLayoutCommit={handleAutoSaveDrag}
                                                onAdminLayoutConfigUpdate={updateFullLayoutConfig}
                                                onNodeSelect={(node) => {
                                                    if (!node?.id) return;
                                                    selectNode(node.id);
                                                    expandToNode(node.id);
                                                }}
                                                onPathChange={() => {}}
                                                onActiveNodePosition={() => {}}
                                                onRecenterStart={() => {}}
                                                onRecenterComplete={() => {}}
                                                onBack={() => {}}
                                                activeFilters={{}}
                                                searchQuery={searchQuery}
                                                searchMatches={[]}
                                                initialZoomStack={selectedPersonaId ? [selectedPersonaId] : []}
                                                initialActivePath={selectedPersonaId ? ['start', selectedPersonaId] : []}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <NodePreview
                                tree={tree}
                                layoutConfig={layoutConfig}
                                onUpdateNode={updateNodeLayoutField}
                                onSave={saveLayoutConfig}
                                saving={layoutSaving}
                                initialPath={nodeParam}
                                selectedId={selectedId}
                                previewMode={mirrorPreviewMode}
                                onAutoSaveDrag={handleAutoSaveDrag}
                                forcedViewRootId={selectedPersonaId}
                                onSelectNode={(id) => {
                                    selectNode(id);
                                    expandToNode(id);
                                }}
                            />
                        )}

                        {showLayoutStudio && (
                            <TreeLayoutStudio
                                loading={layoutLoading}
                                layoutConfig={layoutConfig}
                                selectedNode={selectedNode}
                                tree={tree}
                                onUpdateGlobal={updateLayoutField}
                                onUpdateNode={updateNodeLayoutField}
                                onResetNode={resetNodeLayout}
                                onSave={saveLayoutConfig}
                                saving={layoutSaving}
                                nodeParam={nodeParam}
                                selectedId={selectedId}
                                previewMode={mirrorPreviewMode}
                                onAutoSaveDrag={handleAutoSaveDrag}
                            />
                        )}
                    </div>
                </main>
                </>}
            </div>

            {/* ═══ TOAST ═══ */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }}
                        className={`fixed bottom-6 right-6 px-5 py-3 rounded-xl text-sm font-medium shadow-lg z-[300] flex items-center gap-2 ${
                            toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-black'
                        }`}>
                        {toast.type === 'error' ? <AlertTriangle size={16} /> : <Check size={16} />}
                        {toast.msg}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ═══ CHANGE PASSWORD MODAL ═══ */}
            <AnimatePresence>
                {changePassOpen && <ChangePasswordModal onClose={() => setChangePassOpen(false)} token={token} showToast={showToast} />}
            </AnimatePresence>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════
   NODE PREVIEW — Draggable SVG preview matching frontend visuals
   ═══════════════════════════════════════════════════════════ */
const ADMIN_PLANETS = [
    { id: 'earth',   r: 7,   c1: '#4FC3F7' },
    { id: 'mars',    r: 6,   c1: '#EF7C5A' },
    { id: 'jupiter', r: 9.5, c1: '#D4A968' },
    { id: 'saturn',  r: 7.5, c1: '#E8D090' },
    { id: 'neptune', r: 6.5, c1: '#6496DC' },
    { id: 'uranus',  r: 7,   c1: '#7ADFE8' },
];

function AdminSvgDefs() {
    return (
        <defs>
            <filter id="a-glow-sun" x="-80%" y="-80%" width="360%" height="360%">
                <feGaussianBlur stdDeviation="2.5" result="b" />
                <feFlood floodColor="#FFB830" floodOpacity="0.45" />
                <feComposite in2="b" operator="in" result="glow" />
                <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="a-glow-planet" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="0.6" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="a-glow-thread" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="0.3" result="b" />
                <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <radialGradient id="a-grad-sun" cx="38%" cy="32%" r="60%">
                <stop offset="0%" stopColor="#FFFDE8" /><stop offset="18%" stopColor="#FFE866" />
                <stop offset="42%" stopColor="#FFA500" /><stop offset="70%" stopColor="#FF6200" />
                <stop offset="88%" stopColor="#E03800" /><stop offset="100%" stopColor="#8C1A00" stopOpacity="0.9" />
            </radialGradient>
            <radialGradient id="a-grad-earth" cx="36%" cy="30%" r="62%">
                <stop offset="0%" stopColor="#C8EEFF" /><stop offset="18%" stopColor="#58C0F0" />
                <stop offset="42%" stopColor="#1A72B8" /><stop offset="70%" stopColor="#0A3E6E" />
                <stop offset="100%" stopColor="#041828" />
            </radialGradient>
            <radialGradient id="a-grad-mars" cx="36%" cy="30%" r="62%">
                <stop offset="0%" stopColor="#FFBF9E" /><stop offset="20%" stopColor="#D85830" />
                <stop offset="48%" stopColor="#9C3518" /><stop offset="75%" stopColor="#5A1E08" />
                <stop offset="100%" stopColor="#200800" />
            </radialGradient>
            <radialGradient id="a-grad-jupiter" cx="36%" cy="30%" r="62%">
                <stop offset="0%" stopColor="#F8EED8" /><stop offset="18%" stopColor="#E8CF9E" />
                <stop offset="42%" stopColor="#C49558" /><stop offset="70%" stopColor="#8E6028" />
                <stop offset="100%" stopColor="#382208" />
            </radialGradient>
            <radialGradient id="a-grad-saturn" cx="36%" cy="30%" r="62%">
                <stop offset="0%" stopColor="#FFF8DC" /><stop offset="18%" stopColor="#F2E4A0" />
                <stop offset="42%" stopColor="#D8B858" /><stop offset="70%" stopColor="#A47C30" />
                <stop offset="100%" stopColor="#403010" />
            </radialGradient>
            <radialGradient id="a-grad-neptune" cx="36%" cy="30%" r="62%">
                <stop offset="0%" stopColor="#A8CCFF" /><stop offset="20%" stopColor="#4080E0" />
                <stop offset="45%" stopColor="#1C3CA8" /><stop offset="72%" stopColor="#0C1E68" />
                <stop offset="100%" stopColor="#040A28" />
            </radialGradient>
            <radialGradient id="a-grad-uranus" cx="36%" cy="30%" r="62%">
                <stop offset="0%" stopColor="#D8F8FC" /><stop offset="20%" stopColor="#72DCE8" />
                <stop offset="45%" stopColor="#3AB0BC" /><stop offset="72%" stopColor="#1A7888" />
                <stop offset="100%" stopColor="#062E38" />
            </radialGradient>
            <radialGradient id="a-shadow-sphere" cx="68%" cy="65%" r="58%" gradientUnits="objectBoundingBox">
                <stop offset="0%" stopColor="#000010" stopOpacity="0.75" />
                <stop offset="45%" stopColor="#000008" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#000000" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="a-threadGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#D4B876" stopOpacity="0.95" />
                <stop offset="50%" stopColor="#A89060" stopOpacity="0.7" />
                <stop offset="100%" stopColor="#A8893E" stopOpacity="0.5" />
            </linearGradient>
        </defs>
    );
}

function NodePreview({ tree, layoutConfig, onUpdateNode, onSave, saving, initialPath, selectedId, previewMode = 'desktop', onAutoSaveDrag, forcedViewRootId = null, onSelectNode }) {
    const svgRef = useRef(null);
    const [viewRoot, setViewRoot] = useState(null);
    const dragRef = useRef(null);
    const [dragId, setDragId] = useState(null);
    const [history, setHistory] = useState([]);
    const didInitRef = useRef(false);

    // Auto-drill to initialPath on mount (from ?node= param or sessionStorage)
    useEffect(() => {
        if (didInitRef.current || !tree) return;
        // Resolve path: prop first, then sessionStorage
        let ids = initialPath ? initialPath.split(',').map(s => s.trim()).filter(Boolean) : [];
        if (ids.length === 0) {
            try {
                const stored = sessionStorage.getItem('pw_ss_zoom');
                if (stored) {
                    const parsed = JSON.parse(stored);
                    if (Array.isArray(parsed) && parsed.length > 0) ids = parsed;
                }
            } catch (e) { console.debug("[AdminPanel] non-fatal:", e?.message); }
        }
        if (ids.length === 0) return;
        // Verify each id exists in the tree before drilling
        const findN = (id, n = tree) => {
            if (!n) return null;
            if (n.id === id) return n;
            if (n.children) for (const c of n.children) { const f = findN(id, c); if (f) return f; }
            return null;
        };
        // Build history: [null, id0, id1, ...], viewRoot = last id
        const validIds = ids.filter(id => findN(id));
        if (validIds.length === 0) return;
        didInitRef.current = true;
        const hist = [null, ...validIds.slice(0, -1)];
        setHistory(hist);
        setViewRoot(validIds[validIds.length - 1]);
    }, [initialPath, tree]);

    const findNode = (id, n = tree) => {
        if (!n) return null;
        if (n.id === id) return n;
        if (n.children) for (const c of n.children) { const f = findNode(id, c); if (f) return f; }
        return null;
    };

    // Force preview to open a specific branch root (Student / Professional).
    useEffect(() => {
        if (!tree) return;
        if (!forcedViewRootId || forcedViewRootId === tree.id || forcedViewRootId === 'start') {
            setViewRoot(null);
            setHistory([]);
            return;
        }
        const target = findNode(forcedViewRootId);
        if (!target) return;
        setViewRoot(target.id);
        setHistory([null]);
    }, [forcedViewRootId, tree]);

    // Sync with sidebar selection: drill preview to show selected node's context
    useEffect(() => {
        if (forcedViewRootId) return;
        if (!selectedId || !tree) return;
        const pathTo = (id, n = tree, trail = []) => {
            if (n.id === id) return [...trail, n.id];
            if (n.children) for (const c of n.children) { const f = pathTo(id, c, [...trail, n.id]); if (f) return f; }
            return null;
        };
        const node = findNode(selectedId);
        if (!node) return;
        const path = pathTo(selectedId);
        if (!path) return;
        // Show the parent of the selected node so the selected node appears as a planet
        if (path.length <= 2) {
            // Root-level child (e.g. 'student') — show root view
            setViewRoot(null);
            setHistory([]);
        } else {
            const parentId = path[path.length - 2];
            const parent = parentId === tree.id ? null : parentId;
            const histIds = path.slice(1, -2);
            setHistory([null, ...histIds]);
            setViewRoot(parent);
        }
    }, [selectedId, forcedViewRootId]);

    const currentRoot = viewRoot ? findNode(viewRoot) : tree;
    const children = currentRoot?.children || [];
    const nodes = layoutConfig?.nodes || {};
    const isAtTreeRoot = !viewRoot || viewRoot === tree?.id;
    const isMobilePreview = previewMode === 'mobile';
    const layoutGlobal = layoutConfig?.global || DEFAULT_TREE_LAYOUT.global;
    const layoutDefaults = layoutGlobal?.layout || DEFAULT_TREE_LAYOUT.global.layout;

    // ── Coordinate system matching frontend viewBox ──
    const VB_W = isMobilePreview ? 140 : 178; // mobile: matches frontend min-clamp; desktop: 178
    const VB_H = isMobilePreview ? Math.round(140 * (780 / 390)) : 100; // mobile: phone aspect ~251; desktop: 100
    const Y_SCALE = VB_H / 100; // convert stored 0-100 coords → viewBox coords
    const MARGIN_X = VB_W * 0.035;
    const USABLE_W = VB_W - 2 * MARGIN_X;
    const ROOT_Y = (isAtTreeRoot
        ? Number(layoutDefaults.rootY || 20)
        : Number(layoutDefaults.zoomedRootY || 14)) * Y_SCALE;
    const CHILDREN_Y_START = (isAtTreeRoot
        ? Number(layoutDefaults.childrenYStart || 28)
        : Number(layoutDefaults.zoomedChildrenYStart || 22)) * Y_SCALE;
    const CHILDREN_Y_END = (isMobilePreview
        ? Number(layoutDefaults.childrenYEndMobile || 88)
        : Number(layoutDefaults.childrenYEndDesktop || 86)) * Y_SCALE;
    const USABLE_H = CHILDREN_Y_END - CHILDREN_Y_START;
    // Sun position: use pinned config if dragged, else default center
    const sunNodeId = currentRoot?.id || 'start';
    const sunCfg = nodes[sunNodeId];
    const sunPinnedX = isMobilePreview ? sunCfg?.mobileX ?? sunCfg?.x : sunCfg?.x;
    const sunPinnedY = isMobilePreview ? sunCfg?.mobileY ?? sunCfg?.y : sunCfg?.y;
    const sunPos = (Number.isFinite(sunPinnedX) && Number.isFinite(sunPinnedY))
        ? { x: (sunPinnedX / 100) * VB_W, y: sunPinnedY * Y_SCALE }
        : { x: VB_W / 2, y: ROOT_Y };

    const getNodePos = (node, idx, total) => {
        // Admin always checks pinned positions (for drag to work at all levels)
        const cfg = nodes[node.id];
        const pinnedX = isMobilePreview ? cfg?.mobileX ?? cfg?.x : cfg?.x;
        const pinnedY = isMobilePreview ? cfg?.mobileY ?? cfg?.y : cfg?.y;
        if (Number.isFinite(pinnedX) && Number.isFinite(pinnedY)) {
            return { x: (pinnedX / 100) * VB_W, y: pinnedY * Y_SCALE };
        }
        if (isAtTreeRoot) {
            const p = node.pos;
            if (p && Number.isFinite(p.x) && Number.isFinite(p.y)) {
                return { x: (p.x / 100) * VB_W, y: p.y * Y_SCALE };
            }
        }
        // Arc-distribution matching the frontend (smile pattern)
        const arcPatterns = {
            3: [0.72, 0.42, 0.72],
            4: [0.72, 0.48, 0.42, 0.72],
            5: [0.72, 0.52, 0.38, 0.52, 0.72]
        };
        const n = total;
        const minSpacing = Number(layoutDefaults.minNodeSpacingX || 22);
        const preferredCols = n <= 5 ? n : Math.ceil(n / 2);
        const maxCols = Math.max(1, Math.min(Math.floor(USABLE_W / minSpacing), n, preferredCols));
        const nRows = Math.ceil(n / maxCols);
        const rows = [];
        for (let r = 0; r < nRows; r++) rows.push({ start: r * maxCols, count: Math.min(maxCols, n - r * maxCols) });
        const row = Math.floor(idx / maxCols);
        const col = idx - row * maxCols;
        const k = rows[row].count;
        // Spread ratio matching frontend
        const spreadRatio = k <= 2 ? 0.42 : k === 3 ? 0.54 : k === 4 ? 0.64 : k === 5 ? 0.74 : 1;
        const innerW = nRows === 1 ? Math.min(USABLE_W, Math.max(USABLE_W * 0.45, USABLE_W * spreadRatio)) : USABLE_W;
        const innerMargin = MARGIN_X + (USABLE_W - innerW) / 2;
        const segW = innerW / (k + 1);
        const x = innerMargin + (col + 1) * segW;
        // Arc pattern for single-row 3-5 children
        const rowSpacing = nRows > 1 ? USABLE_H / (nRows - 1) : 0;
        const arc = nRows === 1 && arcPatterns[k];
        const y = arc
            ? CHILDREN_Y_START + arc[idx] * USABLE_H
            : (nRows === 1 ? CHILDREN_Y_START + USABLE_H * 0.5 : CHILDREN_Y_START + row * rowSpacing);
        return { x, y };
    };

    // ── Drag via document-level listeners ──
    const svgPoint = (clientX, clientY) => {
        const svg = svgRef.current;
        if (!svg) return { x: 50, y: 50 };
        const rect = svg.getBoundingClientRect();
        // Convert to 0-100 percentage for storage (matches frontend's pos format)
        return {
            x: Math.max(2, Math.min(98, ((clientX - rect.left) / rect.width) * 100)),
            y: Math.max(2, Math.min(98, ((clientY - rect.top) / rect.height) * 100)),
        };
    };

    useEffect(() => {
        const handleMove = (e) => {
            if (!dragRef.current) return;
            const { x, y } = svgPoint(e.clientX, e.clientY);
            const keyX = isMobilePreview ? 'mobileX' : 'x';
            const keyY = isMobilePreview ? 'mobileY' : 'y';
            onUpdateNode(dragRef.current, keyX, Math.round(x));
            onUpdateNode(dragRef.current, keyY, Math.round(y));
        };
        const handleUp = () => {
            const draggedId = dragRef.current;
            dragRef.current = null;
            setDragId(null);
            if (draggedId && onAutoSaveDrag) onAutoSaveDrag(draggedId);
        };
        document.addEventListener('pointermove', handleMove);
        document.addEventListener('pointerup', handleUp);
        return () => {
            document.removeEventListener('pointermove', handleMove);
            document.removeEventListener('pointerup', handleUp);
        };
    }, [onUpdateNode, isMobilePreview]);

    const onPointerDown = (e, nodeId) => {
        e.preventDefault();
        e.stopPropagation();
        dragRef.current = nodeId;
        setDragId(nodeId);
    };

    const drillInto = (node) => {
        if (node.children?.length > 0) {
            setHistory(prev => [...prev, viewRoot]);
            setViewRoot(node.id);
        }
    };
    const goBack = () => {
        if (history.length > 0) {
            setHistory(h => { const prev = h[h.length - 1]; setViewRoot(prev); return h.slice(0, -1); });
        }
    };
    const getBreadcrumb = () => {
        if (!viewRoot) return [{ id: tree?.id, label: tree?.label || 'Root' }];
        const trail = [{ id: tree?.id, label: tree?.label || 'Root' }];
        for (const hId of history) { if (hId) { const n = findNode(hId); if (n) trail.push({ id: n.id, label: n.label }); } }
        if (currentRoot) trail.push({ id: currentRoot.id, label: currentRoot.label });
        return trail;
    };
    const breadcrumb = getBreadcrumb();

    // Planet scaling by child count (matches frontend)
    const planetScale = children.length >= 8 ? 0.62 : children.length >= 6 ? 0.68 : children.length >= 4 ? 0.78 : children.length >= 3 ? 0.92 : 1;

    const compactLabel = (label) => {
        if (!label || typeof label !== 'string') return '';
        if (!isMobilePreview) return label;
        return label.length > 18 ? `${label.slice(0, 17)}...` : label;
    };

    return (
        <div className="mb-4 p-3 bg-black/40 border border-white/[0.08] rounded-xl">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <h3 className="text-[11px] font-semibold text-white">Node Preview</h3>
                    <span className="text-[9px] text-gray-600">{isMobilePreview ? 'Mobile edit mode · saves mobileX/mobileY' : 'Desktop edit mode · saves x/y'} · Double-click to drill in</span>
                </div>
                <div className="flex items-center gap-2">
                    {history.length > 0 && (
                        <button onClick={goBack}
                            className="px-2 py-1 text-[9px] text-amber-300 border border-amber-500/30 rounded hover:bg-amber-500/10">
                            ← Back
                        </button>
                    )}
                    <button onClick={onSave} disabled={saving}
                        className="px-2 py-1 bg-blue-500/20 hover:bg-blue-500/30 disabled:bg-gray-700 text-blue-200 text-[10px] rounded">
                        {saving ? 'Saving…' : 'Save'}
                    </button>
                </div>
            </div>

            {/* Breadcrumb */}
            <div className="flex items-center gap-1 mb-2 text-[9px] text-gray-500 flex-wrap">
                {breadcrumb.map((b, i) => (
                    <span key={b.id || i} className="flex items-center gap-2">
                        {i > 0 && <span className="text-gray-700">›</span>}
                        <span className={i === breadcrumb.length - 1 ? 'text-amber-400' : 'text-gray-500'}>
                            {b.label}
                        </span>
                    </span>
                ))}
            </div>

            {/* SVG Preview — matches frontend coordinate system (wide viewBox) */}
            <div className="relative rounded-lg overflow-hidden border border-white/[0.06]"
                style={{ background: 'radial-gradient(ellipse 80% 50% at 50% 20%, #0c0c18 0%, #060609 50%, #020203 100%)' }}>
                <svg
                    ref={svgRef}
                    viewBox={`0 0 ${VB_W} ${VB_H}`}
                    className="w-full"
                    style={{ cursor: dragId ? 'grabbing' : 'default' }}
                    preserveAspectRatio="xMidYMid meet"
                >
                    <AdminSvgDefs />

                    {/* ── Threads (3-layer like frontend) ── */}
                    {children.map((child, i) => {
                        const pos = getNodePos(child, i, children.length);
                        const midY = sunPos.y + (pos.y - sunPos.y) * 0.25;
                        const d = `M ${sunPos.x} ${sunPos.y} C ${sunPos.x} ${midY}, ${pos.x} ${midY}, ${pos.x} ${pos.y}`;
                        return (
                            <g key={`t-${child.id}`}>
                                <path d={d} fill="none" stroke="rgba(168,144,96,0.10)" strokeWidth="1.2" strokeLinecap="round" filter="url(#a-glow-thread)" />
                                <path d={d} fill="none" stroke="url(#a-threadGrad)" strokeWidth="0.4" strokeLinecap="round" />
                                <path d={d} fill="none" stroke="rgba(230,210,150,0.35)" strokeWidth="0.15" strokeLinecap="round" />
                            </g>
                        );
                    })}

                    {/* ── Sun node (same as frontend) — draggable ── */}
                    <g transform={`translate(${sunPos.x} ${sunPos.y})`}
                        style={{ cursor: dragId === (currentRoot?.id || 'start') ? 'grabbing' : 'grab' }}
                        onPointerDown={(e) => onPointerDown(e, currentRoot?.id || 'start')}
                        onClick={() => onSelectNode?.(currentRoot?.id || 'start')}
                        onDoubleClick={goBack}>
                        {/* Corona halo */}
                        <circle r="11" fill="none" stroke="#FFA500" strokeWidth="0.10" opacity="0.12" />
                        {/* Corona spikes */}
                        {Array.from({ length: 8 }, (_, t) => {
                            const angle = t / 8 * 2 * Math.PI;
                            return (
                                <line key={t}
                                    x1={Math.cos(angle) * 8.4} y1={Math.sin(angle) * 8.4}
                                    x2={Math.cos(angle) * (9.8 + t % 2 * 0.7)} y2={Math.sin(angle) * (9.8 + t % 2 * 0.7)}
                                    stroke="#FFD040" strokeWidth="0.07" opacity="0.13" strokeLinecap="round" />
                            );
                        })}
                        {/* Main sun sphere */}
                        <circle r="8" fill="url(#a-grad-sun)" filter="url(#a-glow-sun)" />
                        {/* Surface spots */}
                        <ellipse cx="3" cy="1.8" rx="1.4" ry="1" fill="#883300" fillOpacity="0.7" />
                        <ellipse cx="3" cy="1.8" rx="0.8" ry="0.56" fill="#330000" fillOpacity="0.8" />
                        <ellipse cx="-3.4" cy="-2.8" rx="1.1" ry="0.7" fill="#773200" fillOpacity="0.65" />
                        {/* Shadow overlay */}
                        <circle r="8" fill="url(#a-shadow-sphere)" opacity="0.5" />
                        {/* Rim */}
                        <circle r="8.2" fill="none" stroke="rgba(160,50,0,0.3)" strokeWidth="0.5" />
                        {/* Invisible hit area for drag */}
                        <circle r="12" fill="transparent" style={{ pointerEvents: 'auto' }} />
                        {/* Drag indicator ring */}
                        {dragId === sunNodeId && (
                            <circle r="10" fill="none" stroke="#fff" strokeWidth="0.3" opacity="0.5"
                                strokeDasharray="1.2 0.8" style={{ pointerEvents: 'none' }} />
                        )}
                    </g>

                    {/* ── Child planets — draggable ── */}
                    {children.map((child, i) => {
                        const pos = getNodePos(child, i, children.length);
                        const planet = ADMIN_PLANETS[i % ADMIN_PLANETS.length];
                        const r = planet.r * planetScale;
                        const hasKids = child.children?.length > 0;
                        const isDragging = dragId === child.id;
                        return (
                            <g key={child.id} transform={`translate(${pos.x} ${pos.y})`}>
                                {/* Invisible hit area for drag */}
                                <circle r={r + 4} fill="transparent"
                                    style={{ cursor: isDragging ? 'grabbing' : 'grab', pointerEvents: 'auto' }}
                                    onPointerDown={(e) => onPointerDown(e, child.id)}
                                    onClick={() => onSelectNode?.(child.id)}
                                    onDoubleClick={() => drillInto(child)}
                                />

                                {/* Planet sphere with gradient */}
                                <g filter="url(#a-glow-planet)" style={{ pointerEvents: 'none' }}>
                                    <circle r={r} fill={`url(#a-grad-${planet.id})`} />
                                    <circle r={r} fill="url(#a-shadow-sphere)" />
                                </g>

                                {/* Saturn rings */}
                                {planet.id === 'saturn' && (
                                    <g style={{ pointerEvents: 'none' }}>
                                        <ellipse rx={r * 1.75} ry={r * 0.35} fill="none" stroke="#E8D09066" strokeWidth="0.8" />
                                        <ellipse rx={r * 1.55} ry={r * 0.3} fill="none" stroke="#D8C08044" strokeWidth="0.5" />
                                    </g>
                                )}
                                {/* Uranus rings */}
                                {planet.id === 'uranus' && (
                                    <g style={{ pointerEvents: 'none' }}>
                                        <ellipse rx={r * 1.5} ry={r * 0.55} fill="none" stroke="#7ADFE844" strokeWidth="0.4" transform="rotate(80)" />
                                    </g>
                                )}

                                {/* Rim stroke */}
                                <circle r={r + 0.26} fill="none" stroke={`${planet.c1}77`} strokeWidth="0.5" style={{ pointerEvents: 'none' }} />
                                <circle r={r + 0.55} fill="none" stroke={`${planet.c1}33`} strokeWidth="0.2" style={{ pointerEvents: 'none' }} />

                                {/* Has-children orbit pulse */}
                                {hasKids && (
                                    <circle r={r + 1.5} fill="none" stroke={planet.c1} strokeWidth="0.18" opacity="0.15" style={{ pointerEvents: 'none' }} />
                                )}

                                {/* Drag indicator ring */}
                                {isDragging && (
                                    <circle r={r + 2} fill="none" stroke="#fff" strokeWidth="0.3" opacity="0.5"
                                        strokeDasharray="1.2 0.8" style={{ pointerEvents: 'none' }} />
                                )}
                            </g>
                        );
                    })}

                    {/* ── Sun label ── */}
                    <text x={sunPos.x} y={sunPos.y - 10 * Y_SCALE} textAnchor="middle"
                        fill="#FFD060" fontSize={3.5 * Y_SCALE} fontWeight="700" fontFamily="system-ui, sans-serif"
                        style={{ textShadow: '0 1px 3px rgba(0,0,0,0.9)', letterSpacing: '0.5px' }}>
                        {currentRoot?.emoji} {currentRoot?.label}
                    </text>

                    {/* ── Planet labels ── */}
                    {children.map((child, i) => {
                        const pos = getNodePos(child, i, children.length);
                        const planet = ADMIN_PLANETS[i % ADMIN_PLANETS.length];
                        const r = planet.r * planetScale;
                        const hasKids = child.children?.length > 0;
                        return (
                            <g key={`lbl-${child.id}`}>
                                <text x={pos.x} y={pos.y + (r + 3.5) * Y_SCALE} textAnchor="middle"
                                    fill={hasKids ? planet.c1 : '#ccc'} fontSize={(isMobilePreview ? 2.6 : 3) * Y_SCALE} fontWeight="700"
                                    fontFamily="system-ui, sans-serif" style={{ pointerEvents: 'none' }}>
                                    {child.emoji} {compactLabel(child.label)}
                                </text>
                                {child.subtitle && !isMobilePreview && (
                                    <text x={pos.x} y={pos.y + (r + 6) * Y_SCALE} textAnchor="middle"
                                        fill="#888" fontSize={2 * Y_SCALE} fontStyle="italic"
                                        fontFamily="system-ui, sans-serif" style={{ pointerEvents: 'none' }}>
                                        {child.subtitle}
                                    </text>
                                )}
                                <text x={pos.x} y={pos.y + ((child.subtitle && !isMobilePreview) ? (r + 8) : (r + 6)) * Y_SCALE} textAnchor="middle"
                                    fill="#555" fontSize={1.8 * Y_SCALE} fontFamily="monospace"
                                    style={{ pointerEvents: hasKids ? 'auto' : 'none', cursor: hasKids ? 'pointer' : 'default' }}
                                    onClick={hasKids ? () => drillInto(child) : undefined}>
                                    {Math.round(pos.x / VB_W * 100)},{Math.round(pos.y / Y_SCALE)}{hasKids ? ` · ${child.children.length}▸` : ''}
                                </text>
                            </g>
                        );
                    })}

                    {/* Has-children indicator dots */}
                    {children.map((child, i) => {
                        if (!child.children?.length) return null;
                        const pos = getNodePos(child, i, children.length);
                        const planet = ADMIN_PLANETS[i % ADMIN_PLANETS.length];
                        const r = planet.r * planetScale;
                        return (
                            <g key={`dots-${child.id}`}>
                                {[-1.3, 0, 1.3].map((dx, di) => (
                                    <circle key={di} cx={pos.x + dx} cy={pos.y - (r + 2.5)} r="0.48" fill="#4ade80" opacity="0.6" />
                                ))}
                            </g>
                        );
                    })}
                </svg>

                {/* No children message */}
                {children.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-[10px] text-gray-600">No children — leaf node</span>
                    </div>
                )}
            </div>
        </div>
    );
}

function TreeLayoutStudio({
    loading,
    layoutConfig,
    selectedNode,
    tree,
    onUpdateGlobal,
    onUpdateNode,
    onResetNode,
    onSave,
    saving,
    nodeParam,
    selectedId,
    previewMode = 'desktop',
    onAutoSaveDrag,
}) {
    if (loading) {
        return (
            <div className="mb-6 p-4 bg-white/[0.03] border border-white/[0.06] rounded-2xl text-sm text-gray-400">
                Loading layout controls…
            </div>
        );
    }

    const cfg = layoutConfig && typeof layoutConfig === 'object' ? layoutConfig : DEFAULT_TREE_LAYOUT;
    const global = cfg.global && typeof cfg.global === 'object' ? cfg.global : DEFAULT_TREE_LAYOUT.global;
    const layout = global.layout || DEFAULT_TREE_LAYOUT.global.layout;
    const node = global.node || DEFAULT_TREE_LAYOUT.global.node;
    const scaling = global.scaling || DEFAULT_TREE_LAYOUT.global.scaling;
    const labels = global.labels || DEFAULT_TREE_LAYOUT.global.labels;
    const planets = global.planets || DEFAULT_TREE_LAYOUT.global.planets;
    const connector = global.connector || DEFAULT_TREE_LAYOUT.global.connector;

    const nodeCfg = selectedNode ? getNodeVisualConfig(cfg, selectedNode.id) : {};
    const tiers = Array.isArray(scaling.tiers) ? scaling.tiers : [];
    const planetIds = ['earth', 'mars', 'jupiter', 'saturn', 'neptune', 'uranus'];

    const setBool = (path, checked) => onUpdateGlobal(path, !!checked);
    const setNum = (path, value) => onUpdateGlobal(path, Number(value));

    const updateTier = (idx, key, value) => {
        const next = tiers.map((t, i) => i === idx ? { ...t, [key]: Number(value) } : t);
        onUpdateGlobal(['global', 'scaling', 'tiers'], next);
    };

    return (
        <div className="mb-6 p-5 bg-white/[0.03] border border-white/[0.06] rounded-2xl">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="text-sm font-semibold text-white">Tree Layout Studio</h3>
                    <p className="text-xs text-gray-500">All controls are click-based. No manual JSON needed.</p>
                </div>
                <button onClick={onSave} disabled={saving}
                    className="px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 disabled:bg-gray-700 text-blue-200 text-xs rounded-lg">
                    {saving ? 'Saving…' : 'Save Layout'}
                </button>
            </div>

            {/* Visual drag preview — collapsible */}
            {tree && (
                <details className="mb-4 group">
                    <summary className="cursor-pointer text-xs text-gray-400 hover:text-gray-200 select-none py-2 px-1 flex items-center gap-2 [&::-webkit-details-marker]:hidden list-none">
                        <ChevronRight size={12} className="inline transition-transform group-open:rotate-90" />
                        Node Drag Preview <span className="text-gray-600">(drag to reposition nodes)</span>
                    </summary>
                    <NodePreview
                        tree={tree}
                        layoutConfig={cfg}
                        onUpdateNode={onUpdateNode}
                        onSave={onSave}
                        saving={saving}
                        initialPath={nodeParam}
                        selectedId={selectedId}
                        previewMode={previewMode}
                        onAutoSaveDrag={onAutoSaveDrag}
                    />
                </details>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 text-xs">
                <section className="p-3 bg-black/20 rounded-xl border border-white/[0.06] space-y-3">
                    <p className="text-gray-300 font-medium">Global Toggles</p>
                    <label className="flex items-center justify-between text-gray-300">
                        Prefer node position
                        <input type="checkbox" checked={global.preferNodePosition !== false}
                            onChange={(e) => setBool(['global', 'preferNodePosition'], e.target.checked)} />
                    </label>
                    <label className="flex items-center justify-between text-gray-300">
                        Auto distribute fallback
                        <input type="checkbox" checked={global.autoDistributeFallback !== false}
                            onChange={(e) => setBool(['global', 'autoDistributeFallback'], e.target.checked)} />
                    </label>
                </section>

                <section className="p-3 bg-black/20 rounded-xl border border-white/[0.06] space-y-3">
                    <p className="text-gray-300 font-medium">Node Default</p>
                    <div>
                        <label className="block text-gray-500 mb-1">Default Size Scale</label>
                        <input type="range" min="0.4" max="3.5" step="0.01" value={Number(node.sizeScale || 1)}
                            onChange={(e) => setNum(['global', 'node', 'sizeScale'], e.target.value)} className="w-full" />
                    </div>
                    <div>
                        <label className="block text-gray-500 mb-1">Default Shape</label>
                        <select value={node.shape || 'planet'}
                            onChange={(e) => onUpdateGlobal(['global', 'node', 'shape'], e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-white">
                            <option value="planet">planet</option>
                            <option value="ring">ring</option>
                            <option value="diamond">diamond</option>
                            <option value="square">square</option>
                        </select>
                    </div>
                </section>

                <section className="p-3 bg-black/20 rounded-xl border border-white/[0.06] space-y-3 xl:col-span-2">
                    <p className="text-gray-300 font-medium">Arrangement / Spacing</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        <Field label="Margin X" value={layout.marginXRatio} min={0} max={0.35} step={0.005}
                            onChange={(v) => setNum(['global', 'layout', 'marginXRatio'], v)} />
                        <Field label="Min Spacing X" value={layout.minNodeSpacingX} min={6} max={48} step={1}
                            onChange={(v) => setNum(['global', 'layout', 'minNodeSpacingX'], v)} />
                        <Field label="Root Y" value={layout.rootY} min={0} max={100} step={1}
                            onChange={(v) => setNum(['global', 'layout', 'rootY'], v)} />
                        <Field label="Zoomed Root Y" value={layout.zoomedRootY} min={0} max={100} step={1}
                            onChange={(v) => setNum(['global', 'layout', 'zoomedRootY'], v)} />
                        <Field label="Children Start Y" value={layout.childrenYStart} min={0} max={100} step={1}
                            onChange={(v) => setNum(['global', 'layout', 'childrenYStart'], v)} />
                        <Field label="Zoomed Start Y" value={layout.zoomedChildrenYStart} min={0} max={100} step={1}
                            onChange={(v) => setNum(['global', 'layout', 'zoomedChildrenYStart'], v)} />
                        <Field label="Children End Desktop" value={layout.childrenYEndDesktop} min={0} max={100} step={1}
                            onChange={(v) => setNum(['global', 'layout', 'childrenYEndDesktop'], v)} />
                        <Field label="Children End Mobile" value={layout.childrenYEndMobile} min={0} max={100} step={1}
                            onChange={(v) => setNum(['global', 'layout', 'childrenYEndMobile'], v)} />
                        <Field label="Target Rows" value={layout.targetRows} min={1} max={8} step={1}
                            onChange={(v) => setNum(['global', 'layout', 'targetRows'], v)} />
                        <Field label="Max Cols (0 auto)" value={layout.maxCols} min={0} max={20} step={1}
                            onChange={(v) => setNum(['global', 'layout', 'maxCols'], v)} />
                    </div>
                </section>

                <section className="p-3 bg-blue-500/5 rounded-xl border border-blue-500/20 space-y-3 xl:col-span-2">
                    <div>
                        <p className="text-blue-200 font-medium">Mobile Tree Tune-Up</p>
                        <p className="text-[11px] text-blue-100/60 mt-1">Use these first when mobile labels wrap or planets collide. For exact node placement, select a node in the preview and change its X/Y below.</p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        <Field label="Children End Mobile" value={layout.childrenYEndMobile} min={0} max={100} step={1}
                            onChange={(v) => setNum(['global', 'layout', 'childrenYEndMobile'], v)} />
                        <Field label="Mobile Min Width" value={labels.mobileMinWidth} min={40} max={240} step={1}
                            onChange={(v) => setNum(['global', 'labels', 'mobileMinWidth'], v)} />
                        <Field label="Mobile Gutter" value={labels.mobileSidebarGutter} min={0} max={180} step={1}
                            onChange={(v) => setNum(['global', 'labels', 'mobileSidebarGutter'], v)} />
                        <Field label="Mobile Gap" value={labels.mobileGap} min={0} max={40} step={1}
                            onChange={(v) => setNum(['global', 'labels', 'mobileGap'], v)} />
                        <Field label="Node Label Y" value={labels.nonRootOffsetY} min={0} max={80} step={1}
                            onChange={(v) => setNum(['global', 'labels', 'nonRootOffsetY'], v)} />
                        <Field label="Root Label Y" value={labels.rootOffsetY} min={0} max={120} step={1}
                            onChange={(v) => setNum(['global', 'labels', 'rootOffsetY'], v)} />
                        <Field label="Default Planet Scale" value={node.sizeScale} min={0.4} max={3.5} step={0.01}
                            onChange={(v) => setNum(['global', 'node', 'sizeScale'], v)} />
                        <Field label="Min Spacing X" value={layout.minNodeSpacingX} min={6} max={48} step={1}
                            onChange={(v) => setNum(['global', 'layout', 'minNodeSpacingX'], v)} />
                    </div>
                </section>

                <section className="p-3 bg-black/20 rounded-xl border border-white/[0.06] space-y-3 xl:col-span-2">
                    <p className="text-gray-300 font-medium">Connector</p>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                        <Field label="Curve" value={connector.curve} min={0.05} max={0.85} step={0.01}
                            onChange={(v) => setNum(['global', 'connector', 'curve'], v)} />
                        <Field label="Base" value={connector.baseThickness} min={0.2} max={4} step={0.01}
                            onChange={(v) => setNum(['global', 'connector', 'baseThickness'], v)} />
                        <Field label="Mid" value={connector.midThickness} min={0.05} max={3} step={0.01}
                            onChange={(v) => setNum(['global', 'connector', 'midThickness'], v)} />
                        <Field label="Thin" value={connector.thinThickness} min={0.02} max={2} step={0.01}
                            onChange={(v) => setNum(['global', 'connector', 'thinThickness'], v)} />
                        <Field label="Active" value={connector.activeThickness} min={0.1} max={4} step={0.01}
                            onChange={(v) => setNum(['global', 'connector', 'activeThickness'], v)} />
                    </div>
                </section>

                <section className="p-3 bg-black/20 rounded-xl border border-white/[0.06] space-y-3 xl:col-span-2">
                    <p className="text-gray-300 font-medium">Scale by Visible Nodes</p>
                    <Field label="Fallback Scale" value={scaling.fallbackScale} min={0.2} max={2} step={0.01}
                        onChange={(v) => setNum(['global', 'scaling', 'fallbackScale'], v)} />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {tiers.map((tier, idx) => (
                            <div key={idx} className="p-2 border border-white/10 rounded-lg">
                                <p className="text-gray-500 mb-1">Tier {idx + 1}</p>
                                <Field label="Min Count" value={tier.minCount} min={0} max={20} step={1}
                                    onChange={(v) => updateTier(idx, 'minCount', v)} />
                                <Field label="Scale" value={tier.scale} min={0.2} max={2} step={0.01}
                                    onChange={(v) => updateTier(idx, 'scale', v)} />
                            </div>
                        ))}
                    </div>
                </section>

                <section className="p-3 bg-black/20 rounded-xl border border-white/[0.06] space-y-3 xl:col-span-2">
                    <p className="text-gray-300 font-medium">Labels</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        <Field label="Root Width" value={labels.rootWidth} min={80} max={340} step={1}
                            onChange={(v) => setNum(['global', 'labels', 'rootWidth'], v)} />
                        <Field label="Min Width" value={labels.minWidth} min={40} max={240} step={1}
                            onChange={(v) => setNum(['global', 'labels', 'minWidth'], v)} />
                        <Field label="Mobile Min" value={labels.mobileMinWidth} min={40} max={240} step={1}
                            onChange={(v) => setNum(['global', 'labels', 'mobileMinWidth'], v)} />
                        <Field label="Max Width" value={labels.maxWidth} min={40} max={360} step={1}
                            onChange={(v) => setNum(['global', 'labels', 'maxWidth'], v)} />
                        <Field label="Mobile Gutter" value={labels.mobileSidebarGutter} min={0} max={180} step={1}
                            onChange={(v) => setNum(['global', 'labels', 'mobileSidebarGutter'], v)} />
                        <Field label="Mobile Gap" value={labels.mobileGap} min={0} max={40} step={1}
                            onChange={(v) => setNum(['global', 'labels', 'mobileGap'], v)} />
                        <Field label="Dense Width" value={labels.desktopDenseWidth} min={40} max={240} step={1}
                            onChange={(v) => setNum(['global', 'labels', 'desktopDenseWidth'], v)} />
                        <Field label="Mid Width" value={labels.desktopMidWidth} min={40} max={280} step={1}
                            onChange={(v) => setNum(['global', 'labels', 'desktopMidWidth'], v)} />
                        <Field label="Sparse Width" value={labels.desktopSparseWidth} min={40} max={340} step={1}
                            onChange={(v) => setNum(['global', 'labels', 'desktopSparseWidth'], v)} />
                        <Field label="Dense Ratio" value={labels.desktopDenseRatio} min={0.02} max={0.4} step={0.001}
                            onChange={(v) => setNum(['global', 'labels', 'desktopDenseRatio'], v)} />
                        <Field label="Mid Ratio" value={labels.desktopMidRatio} min={0.02} max={0.4} step={0.001}
                            onChange={(v) => setNum(['global', 'labels', 'desktopMidRatio'], v)} />
                        <Field label="Sparse Ratio" value={labels.desktopSparseRatio} min={0.02} max={0.5} step={0.001}
                            onChange={(v) => setNum(['global', 'labels', 'desktopSparseRatio'], v)} />
                        <Field label="Node Label Y" value={labels.nonRootOffsetY} min={0} max={80} step={1}
                            onChange={(v) => setNum(['global', 'labels', 'nonRootOffsetY'], v)} />
                        <Field label="Root Label Y" value={labels.rootOffsetY} min={0} max={120} step={1}
                            onChange={(v) => setNum(['global', 'labels', 'rootOffsetY'], v)} />
                    </div>
                </section>

                <section className="p-3 bg-black/20 rounded-xl border border-white/[0.06] space-y-3 xl:col-span-2">
                    <p className="text-gray-300 font-medium">Planet Style</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                        {planetIds.map((id) => (
                            <div key={id} className="p-2 border border-white/10 rounded-lg space-y-2">
                                <p className="text-gray-400 uppercase tracking-wider">{id}</p>
                                <Field label="Radius" value={planets[id]?.r} min={3} max={20} step={0.1}
                                    onChange={(v) => setNum(['global', 'planets', id, 'r'], v)} />
                                <div>
                                    <label className="block text-gray-500 mb-1">Color</label>
                                    <input type="color" value={planets[id]?.c1 || '#ffffff'}
                                        onChange={(e) => onUpdateGlobal(['global', 'planets', id, 'c1'], e.target.value)}
                                        className="w-full h-8 bg-transparent border border-white/10 rounded" />
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {selectedNode && (
                    <section className="p-3 bg-amber-500/5 rounded-xl border border-amber-500/20 space-y-3 xl:col-span-2">
                        <div className="flex items-center justify-between">
                            <p className="text-amber-300 font-medium">Selected Node Controls: {selectedNode.label}</p>
                            <button onClick={() => onResetNode(selectedNode.id)}
                                className="px-2 py-1 text-[11px] text-red-300 border border-red-500/30 rounded hover:bg-red-500/10">
                                Reset Node Override
                            </button>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            <Field label="X %" value={nodeCfg.x ?? 50} min={0} max={100} step={1}
                                onChange={(v) => onUpdateNode(selectedNode.id, 'x', Number(v))} />
                            <Field label="Y %" value={nodeCfg.y ?? 50} min={0} max={100} step={1}
                                onChange={(v) => onUpdateNode(selectedNode.id, 'y', Number(v))} />
                            <Field label="Mobile X %" value={nodeCfg.mobileX ?? nodeCfg.x ?? 50} min={0} max={100} step={1}
                                onChange={(v) => onUpdateNode(selectedNode.id, 'mobileX', Number(v))} />
                            <Field label="Mobile Y %" value={nodeCfg.mobileY ?? nodeCfg.y ?? 50} min={0} max={100} step={1}
                                onChange={(v) => onUpdateNode(selectedNode.id, 'mobileY', Number(v))} />
                            <Field label="Size Scale" value={nodeCfg.sizeScale ?? 1} min={0.4} max={3.5} step={0.01}
                                onChange={(v) => onUpdateNode(selectedNode.id, 'sizeScale', Number(v))} />
                            <Field label="Planet Index" value={nodeCfg.planetIdx ?? 0} min={0} max={20} step={1}
                                onChange={(v) => onUpdateNode(selectedNode.id, 'planetIdx', Number(v))} />
                            <Field label="Connector Thickness" value={nodeCfg.connectorThickness ?? 1} min={0.2} max={5} step={0.01}
                                onChange={(v) => onUpdateNode(selectedNode.id, 'connectorThickness', Number(v))} />
                            <Field label="Connector Curve" value={nodeCfg.connectorCurve ?? 0.25} min={0.05} max={0.85} step={0.01}
                                onChange={(v) => onUpdateNode(selectedNode.id, 'connectorCurve', Number(v))} />
                            <div className="col-span-2 md:col-span-2">
                                <label className="block text-gray-500 mb-1">Shape</label>
                                <select value={nodeCfg.shape || 'planet'}
                                    onChange={(e) => onUpdateNode(selectedNode.id, 'shape', e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-white">
                                    <option value="planet">planet</option>
                                    <option value="ring">ring</option>
                                    <option value="diamond">diamond</option>
                                    <option value="square">square</option>
                                </select>
                            </div>
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
}

function Field({ label, value, min, max, step, onChange }) {
    const safeValue = Number.isFinite(Number(value)) ? Number(value) : Number(min || 0);
    return (
        <div>
            <label className="block text-gray-500 mb-1">{label}</label>
            <div className="flex items-center gap-2">
                <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={safeValue}
                    onChange={(e) => onChange(e.target.value)}
                    className="flex-1"
                />
                <input
                    type="number"
                    min={min}
                    max={max}
                    step={step}
                    value={safeValue}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-16 bg-white/5 border border-white/10 rounded px-2 py-1 text-white"
                />
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════
   TREE ITEM (recursive)
   ═══════════════════════════════════════════════════════════ */
function TreeItem({ node, depth, selectedId, expandedNodes, onSelect, onToggle, onAddChild, matchesSearch, searchQuery }) {
    if (searchQuery && !matchesSearch(node)) return null;

    const isExpanded = expandedNodes.has(node.id);
    const isSelected = selectedId === node.id;
    const hasChildren = node.children && node.children.length > 0;

    return (
        <div>
            <div
                className={`flex items-center gap-1 py-2 pr-2 rounded-lg cursor-pointer transition-colors group ${
                    isSelected
                        ? 'bg-amber-500/15 text-amber-300'
                        : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.04]'
                }`}
                style={{ paddingLeft: depth * 16 + 8 }}
                onClick={() => onSelect(node.id)}
            >
                {/* Expand/collapse */}
                {hasChildren ? (
                    <button onClick={e => { e.stopPropagation(); onToggle(node.id); }}
                        className="p-1 hover:bg-white/10 rounded transition-colors flex-shrink-0">
                        {isExpanded
                            ? <ChevronDown size={14} className="text-gray-500" />
                            : <ChevronRight size={14} className="text-gray-600" />}
                    </button>
                ) : (
                    <span className="w-[18px] flex-shrink-0" />
                )}

                {/* Label */}
                <span className="text-xs truncate flex-1 font-medium">{node.label}</span>

                {/* Child count badge */}
                {hasChildren && (
                    <span className="text-[10px] text-gray-600 flex-shrink-0">{node.children.length}</span>
                )}

                {/* Add child button */}
                <button onClick={e => { e.stopPropagation(); onAddChild(node.id); }}
                    className="p-1 opacity-0 group-hover:opacity-100 text-gray-600 hover:text-emerald-400 fx-pop flex-shrink-0" title="Add child">
                    <Plus size={13} />
                </button>
            </div>

            {/* Children */}
            {isExpanded && hasChildren && (
                <div>
                    {node.children.map(child => (
                        <TreeItem
                            key={child.id} node={child} depth={depth + 1}
                            selectedId={selectedId} expandedNodes={expandedNodes}
                            onSelect={onSelect} onToggle={onToggle} onAddChild={onAddChild}
                            matchesSearch={matchesSearch} searchQuery={searchQuery}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════
   CHANGE PASSWORD MODAL
   ═══════════════════════════════════════════════════════════ */
function ChangePasswordModal({ onClose, token, showToast }) {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) { setError('Passwords do not match'); return; }
        if (newPassword.length < 6) { setError('Min 6 characters'); return; }
        setError(''); setLoading(true);
        try {
            const res = await fetch(`${API}/api/auth/change-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ currentPassword, newPassword, email: email || undefined })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            if (data.token) localStorage.setItem('cr_admin_token', data.token);
            showToast('Password updated');
            onClose();
        } catch (err) {
            setError(err.message);
        } finally { setLoading(false); }
    };

    return (
        <motion.div className="fixed inset-0 z-[250] flex items-center justify-center"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/72 backdrop-blur-sm" onClick={onClose} />
            <motion.div className="relative w-full max-w-md mx-3 sm:mx-4 pw-panel p-6 sm:p-8"
                initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}>
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white"><X size={18} /></button>
                <div className="flex items-center gap-3 mb-6">
                    <KeyRound size={20} className="text-amber-400" />
                    <h2 className="text-lg font-semibold">Change Password</h2>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4 world-form">
                    <div>
                        <label htmlFor="admin-current-password" className="pw-label mb-2 block">Current Password</label>
                        <input id="admin-current-password" type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)}
                            className="pw-input text-sm" autoFocus />
                    </div>
                    <div>
                        <label htmlFor="admin-new-password" className="pw-label mb-2 block">New Password</label>
                        <input id="admin-new-password" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                            className="pw-input text-sm" />
                    </div>
                    <div>
                        <label htmlFor="admin-confirm-password" className="pw-label mb-2 block">Confirm Password</label>
                        <input id="admin-confirm-password" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                            className="pw-input text-sm" />
                    </div>
                    <div>
                        <label htmlFor="admin-recovery-email" className="pw-label mb-2 block">Recovery Email <span className="text-gray-600">(update)</span></label>
                        <input id="admin-recovery-email" type="email" value={email} onChange={e => setEmail(e.target.value)}
                            className="pw-input text-sm"
                            placeholder="Optional" />
                    </div>
                    {error && <p className="text-red-400 text-xs bg-red-500/10 px-3 py-2 rounded-lg">{error}</p>}
                    <button type="submit" disabled={loading || !currentPassword || !newPassword}
                        className="w-full py-4 pw-btn-primary text-sm disabled:opacity-45 disabled:cursor-not-allowed">
                        {loading ? 'Updating…' : 'Update Password'}
                    </button>
                </form>
            </motion.div>
        </motion.div>
    );
}

/* ═══════════════════════════════════════════════════════════
   RESET PASSWORD (from email link)
   ═══════════════════════════════════════════════════════════ */
function ResetPasswordView({ token }) {
    const navigate = useNavigate();
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleReset = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) { setError('Passwords do not match'); return; }
        if (newPassword.length < 6) { setError('Min 6 characters'); return; }
        setError(''); setLoading(true);
        try {
            const res = await fetch(`${API}/api/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, newPassword })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setSuccess(true);
            setTimeout(() => navigate('/'), 3000);
        } catch (err) {
            setError(err.message);
        } finally { setLoading(false); }
    };

    return (
        <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col items-center justify-center pw-page-bg">
            <div className="w-full max-w-md mx-3 sm:mx-4 pw-panel p-6 sm:p-8">
                {success ? (
                    <div className="text-center">
                        <Check size={40} className="text-emerald-400 mx-auto mb-4" />
                        <h2 className="text-white font-semibold text-lg mb-2">Password Reset!</h2>
                        <p className="text-gray-400 text-sm">Redirecting to login…</p>
                    </div>
                ) : (
                    <>
                        <div className="flex items-center gap-3 mb-6">
                            <Lock size={20} className="text-amber-400" />
                            <h2 className="text-lg font-semibold text-white">Reset Password</h2>
                        </div>
                        <form onSubmit={handleReset} className="space-y-4 world-form">
                            <div>
                                <label htmlFor="reset-new-password" className="pw-label mb-2 block">New Password</label>
                                <input id="reset-new-password" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                                    className="pw-input text-sm"
                                    placeholder="Min 6 characters" autoFocus />
                            </div>
                            <div>
                                <label htmlFor="reset-confirm-password" className="pw-label mb-2 block">Confirm Password</label>
                                <input id="reset-confirm-password" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                                    className="pw-input text-sm" />
                            </div>
                            {error && <p role="alert" aria-live="assertive" className="text-red-400 text-xs bg-red-500/10 px-3 py-2 rounded-lg">{error}</p>}
                            <button type="submit" disabled={loading || !newPassword || !confirmPassword}
                                className="w-full py-4 pw-btn-primary text-sm disabled:opacity-45 disabled:cursor-not-allowed">
                                {loading ? 'Resetting…' : 'Reset Password'}
                            </button>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
}
