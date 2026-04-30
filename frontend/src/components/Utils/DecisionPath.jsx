import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function DecisionPath({ onNodeSelect }) {
    const [selectedPath, setSelectedPath] = useState([]);
    const [hoveredNode, setHoveredNode] = useState(null);

    // Career Decision Tree - Indian Context
    const decisionTree = {
        id: 'root',
        label: 'START',
        pos: { x: 50, y: 10 },
        children: [
            {
                id: 'class11',
                label: 'CLASS 11',
                pos: { x: 50, y: 18 },
                children: [
                    {
                        id: 'maths',
                        label: 'PCM',
                        pos: { x: 20, y: 35 },
                        children: [
                            {
                                id: 'btech',
                                label: 'B.TECH',
                                pos: { x: 15, y: 52 },
                                children: [
                                    { id: 'software', label: 'SOFTWARE', pos: { x: 10, y: 69 } },
                                    { id: 'data', label: 'DATA SCI', pos: { x: 20, y: 69 } }
                                ]
                            },
                            {
                                id: 'bca',
                                label: 'BCA',
                                pos: { x: 25, y: 52 },
                                children: [
                                    { id: 'webdev', label: 'WEB DEV', pos: { x: 25, y: 69 } }
                                ]
                            },
                            {
                                id: 'defense',
                                label: 'DEFENSE',
                                pos: { x: 35, y: 52 },
                                children: [
                                    { id: 'nda', label: 'NDA', pos: { x: 35, y: 69 } }
                                ]
                            }
                        ]
                    },
                    {
                        id: 'bio',
                        label: 'PCB',
                        pos: { x: 50, y: 35 },
                        children: [
                            {
                                id: 'mbbs',
                                label: 'MBBS',
                                pos: { x: 45, y: 52 },
                                children: [
                                    { id: 'surgeon', label: 'SURGEON', pos: { x: 42, y: 69 } },
                                    { id: 'md', label: 'MD/MS', pos: { x: 48, y: 69 } }
                                ]
                            },
                            {
                                id: 'dental',
                                label: 'DENTAL',
                                pos: { x: 55, y: 52 },
                                children: [
                                    { id: 'dentist', label: 'DENTIST', pos: { x: 55, y: 69 } }
                                ]
                            }
                        ]
                    },
                    {
                        id: 'commerce',
                        label: 'COMMERCE',
                        pos: { x: 80, y: 35 },
                        children: [
                            {
                                id: 'bcom',
                                label: 'B.COM',
                                pos: { x: 75, y: 52 },
                                children: [
                                    { id: 'ca', label: 'CA', pos: { x: 72, y: 69 } },
                                    { id: 'banking', label: 'BANKING', pos: { x: 78, y: 69 } }
                                ]
                            },
                            {
                                id: 'bba',
                                label: 'BBA',
                                pos: { x: 85, y: 52 },
                                children: [
                                    { id: 'mba', label: 'MBA', pos: { x: 85, y: 69 } }
                                ]
                            }
                        ]
                    }
                ]
            }
        ]
    };

    // Find node by ID
    const findNode = (nodeId, node = decisionTree) => {
        if (node.id === nodeId) return node;
        if (node.children) {
            for (const child of node.children) {
                const found = findNode(nodeId, child);
                if (found) return found;
            }
        }
        return null;
    };

    // Check if node should be visible
    const isVisible = (nodeId) => {
        if (nodeId === 'root') return false; // Never show root
        if (nodeId === 'class11') return true; // Always show start node

        if (selectedPath.length === 0) return false;

        // Show all nodes in selected path
        if (selectedPath.includes(nodeId)) return true;

        // Show children of the last selected node
        const lastSelected = selectedPath[selectedPath.length - 1];
        const lastNode = findNode(lastSelected);
        if (lastNode?.children) {
            return lastNode.children.some(child => child.id === nodeId);
        }

        return false;
    };

    // Get parent node
    const getParent = (nodeId, node = decisionTree, parent = null) => {
        if (node.id === nodeId) return parent;
        if (node.children) {
            for (const child of node.children) {
                const found = getParent(nodeId, child, node);
                if (found) return found;
            }
        }
        return null;
    };

    // Handle node click
    const handleNodeClick = (node) => {
        if (node.id === 'root') return;

        // Add to path or replace from this point
        const existingIndex = selectedPath.indexOf(node.id);
        if (existingIndex >= 0) {
            // Clicked on existing path - truncate from here
            setSelectedPath(selectedPath.slice(0, existingIndex + 1));
        } else {
            // Add to path
            setSelectedPath([...selectedPath, node.id]);
        }

        // Notify parent
        onNodeSelect(node);
    };

    // Generate animated line path
    const generateLine = (start, end) => {
        return `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
    };

    // Get all visible connections
    const connections = useMemo(() => {
        const lines = [];

        const traverse = (node, parent = null) => {
            if (parent && isVisible(parent.id) && isVisible(node.id)) {
                const isActive = selectedPath.includes(node.id);
                lines.push({
                    id: `${parent.id}-${node.id}`,
                    start: parent.pos,
                    end: node.pos,
                    isActive
                });
            }

            if (node.children) {
                node.children.forEach(child => traverse(child, node));
            }
        };

        traverse(decisionTree);
        return lines;
    }, [selectedPath]);

    // Get all visible nodes
    const visibleNodes = useMemo(() => {
        const nodes = [];

        const traverse = (node) => {
            if (isVisible(node.id)) {
                nodes.push(node);
            }
            if (node.children) {
                node.children.forEach(child => traverse(child));
            }
        };

        traverse(decisionTree);
        return nodes;
    }, [selectedPath]);

    // Render a node
    const renderNode = (node) => {
        const isActive = selectedPath.includes(node.id);
        const isHovered = hoveredNode === node.id;
        const isLastSelected = selectedPath[selectedPath.length - 1] === node.id;

        return (
            <g key={node.id}>
                {/* Multi-layer pulsing rings for visual depth */}
                {isActive && (
                    <>
                        {/* Outer ring */}
                        <motion.circle
                            cx={node.pos.x}
                            cy={node.pos.y}
                            r="0"
                            fill="none"
                            stroke={isLastSelected ? '#A89060' : '#ffffff'}
                            strokeWidth="0.4"
                            animate={{
                                r: [0, 8, 0],
                                opacity: [1, 0, 1]
                            }}
                            transition={{
                                duration: 2,
                                repeat: Infinity,
                                ease: 'easeOut'
                            }}
                        />
                        {/* Mid ring */}
                        <motion.circle
                            cx={node.pos.x}
                            cy={node.pos.y}
                            r="0"
                            fill="none"
                            stroke={isLastSelected ? '#A89060' : '#ffffff'}
                            strokeWidth="0.3"
                            animate={{
                                r: [0, 5, 0],
                                opacity: [0.8, 0, 0.8]
                            }}
                            transition={{
                                duration: 2,
                                repeat: Infinity,
                                ease: 'easeOut',
                                delay: 0.3
                            }}
                        />
                    </>
                )}

                {/* Constant pulse for inactive nodes */}
                {!isActive && (
                    <motion.circle
                        cx={node.pos.x}
                        cy={node.pos.y}
                        r="0"
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth="0.2"
                        animate={{
                            r: [0, 4, 0],
                            opacity: [0.6, 0, 0.6]
                        }}
                        transition={{
                            duration: 2.5,
                            repeat: Infinity,
                            ease: 'easeOut'
                        }}
                    />
                )}

                {/* Outer glow halo */}
                <motion.circle
                    cx={node.pos.x}
                    cy={node.pos.y}
                    r={isActive ? 2.5 : 1.8}
                    fill={isActive ? '#A89060' : '#ffffff'}
                    opacity={isActive ? 0.3 : 0.2}
                    filter="blur(8px)"
                    animate={{ opacity: [0.2, 0.4, 0.2] }}
                    transition={{ duration: 2, repeat: Infinity }}
                />

                {/* Node circle - Silver Spark or Gold */}
                <motion.circle
                    cx={node.pos.x}
                    cy={node.pos.y}
                    r={isActive ? 1.8 : 1.2}
                    fill={isActive ? '#A89060' : '#ffffff'}
                    stroke={isActive ? '#A89060' : '#ffffff'}
                    strokeWidth="0.3"
                    filter={isActive ? 'drop-shadow(0 0 12px #A89060) drop-shadow(0 0 6px #A89060)' : 'drop-shadow(0 0 8px #ffffff) drop-shadow(0 0 4px #ffffff)'}
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleNodeClick(node)}
                    onMouseEnter={() => setHoveredNode(node.id)}
                    onMouseLeave={() => setHoveredNode(null)}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{
                        scale: isHovered ? 1.3 : 1,
                        opacity: 1
                    }}
                    exit={{ scale: 0, opacity: 0 }}
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.85 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                />

                {/* Node label - Enhanced */}
                <motion.text
                    x={node.pos.x}
                    y={node.pos.y - 4}
                    textAnchor="middle"
                    fill={isActive ? '#A89060' : '#ffffff'}
                    fontSize="3.5"
                    fontWeight="bold"
                    fontFamily="monospace"
                    letterSpacing="0.1"
                    filter={isActive ? 'drop-shadow(0 0 8px #A89060)' : 'drop-shadow(0 0 4px #ffffff)'}
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                    initial={{ opacity: 0, y: node.pos.y - 2 }}
                    animate={{ opacity: 1, y: node.pos.y - 4 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: 0.2, type: 'spring' }}
                >
                    {node.label}
                </motion.text>
            </g>
        );
    };

    // Render animated line
    const renderLine = (line) => {
        const pathD = generateLine(line.start, line.end);

        return (
            <g key={line.id}>
                {/* Multi-layer glow for active lines */}
                {line.isActive && (
                    <>
                        <motion.path
                            d={pathD}
                            stroke="#A89060"
                            strokeWidth="4"
                            fill="none"
                            opacity="0.15"
                            filter="blur(8px)"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 0.8, ease: 'easeInOut' }}
                        />
                        <motion.path
                            d={pathD}
                            stroke="#A89060"
                            strokeWidth="2"
                            fill="none"
                            opacity="0.4"
                            filter="blur(4px)"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 0.8, ease: 'easeInOut' }}
                        />
                    </>
                )}

                {/* Main line - thicker */}
                <motion.path
                    d={pathD}
                    stroke={line.isActive ? '#A89060' : '#2a2a3a'}
                    strokeWidth={line.isActive ? 1 : 0.5}
                    fill="none"
                    strokeLinecap="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.8, ease: 'easeInOut' }}
                />

                {/* Traveling light particles */}
                {line.isActive && (
                    <>
                        <motion.circle
                            r="1"
                            fill="#ffffff"
                            filter="drop-shadow(0 0 6px #A89060) drop-shadow(0 0 3px #ffffff)"
                        >
                            <animateMotion
                                dur="1.5s"
                                repeatCount="indefinite"
                                path={pathD}
                            />
                        </motion.circle>
                        <motion.circle
                            r="0.5"
                            fill="#A89060"
                            opacity="0.8"
                        >
                            <animateMotion
                                dur="1.5s"
                                repeatCount="indefinite"
                                path={pathD}
                                begin="0.5s"
                            />
                        </motion.circle>
                    </>
                )}
            </g>
        );
    };

    return (
        <div className="relative h-full min-h-0 w-full min-w-0 bg-[#050505] overflow-hidden">
            {/* Premium background effects */}
            <div className="absolute inset-0 bg-gradient-radial from-[#0a0a0a] via-[#050505] to-[#000000]" />

            {/* Subtle dot pattern */}
            <div
                className="absolute inset-0 opacity-[0.08]"
                style={{
                    backgroundImage: `radial-gradient(circle, #A89060 1px, transparent 1px)`,
                    backgroundSize: '30px 30px'
                }}
            />

            {/* Top atmospheric glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#A89060] opacity-[0.05] blur-[100px] rounded-full" />

            {/* SVG Canvas */}
            <svg
                className="absolute inset-0 w-full h-full"
                viewBox="0 0 100 100"
                preserveAspectRatio="xMidYMid meet"
            >
                <defs>
                    <filter id="glow">
                        <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                {/* Render lines first (background) */}
                <AnimatePresence>
                    {connections.map(line => renderLine(line))}
                </AnimatePresence>

                {/* Render nodes on top */}
                <AnimatePresence>
                    {visibleNodes.map(node => renderNode(node))}
                </AnimatePresence>
            </svg>

            {/* Instruction text */}
            {selectedPath.length === 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: 0.5 }}
                    className="absolute top-40 left-1/2 transform -translate-x-1/2 text-center"
                >
                    <p className="text-white/70 text-base font-mono tracking-wide">
                        Click <span className="text-[#A89060] font-bold text-lg drop-shadow-[0_0_8px_rgba(168,144,96,0.8)]">CLASS 11</span> to begin your journey
                    </p>
                </motion.div>
            )}
        </div>
    );
}
