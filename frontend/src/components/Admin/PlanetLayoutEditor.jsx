import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';

const PLANET_COLORS = {
  earth: '#4FC3F7',
  mars: '#EF7C5A',
  jupiter: '#D4A968',
  saturn: '#E8D090',
  neptune: '#6496DC',
  uranus: '#7ADFE8',
  sun: '#FFB830'
};

const PLANET_SIZES = {
  earth: 13,
  mars: 11,
  jupiter: 16.5,
  saturn: 13.5,
  neptune: 12,
  uranus: 13,
  sun: 17.5
};

const getPlanetType = (idx) => {
  const types = ['earth', 'mars', 'jupiter', 'saturn', 'neptune', 'uranus'];
  return types[idx % types.length];
};

export function PlanetLayoutEditor() {
  const svgRef = useRef(null);
  const [treeData, setTreeData] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [draggingNode, setDraggingNode] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [saved, setSaved] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [error, setError] = useState(null);

  // Load tree data
  useEffect(() => {
    const loadTree = async () => {
      try {
        setError(null);
        
        // Try the dedicated endpoint first
        let response = await fetch('/api/careers/tree');
        
        if (!response.ok) {
          console.warn(`/api/careers/tree returned ${response.status}, trying /api/careers/public...`);
          // Fallback to public endpoint
          response = await fetch('/api/careers/public');
        }
        
        if (!response.ok) {
          const text = await response.text();
          console.error('Response text:', text);
          throw new Error(`Failed to load tree: ${response.status} ${response.statusText}. Try manually refreshing the page or check if backend server is running on port 5000.`);
        }
        
        const data = await response.json();
        setTreeData(data);
        setSelectedNode(data);
      } catch (err) {
        console.error('Error loading tree:', err);
        setError(err.message);
      }
    };

    loadTree();
  }, []);

  // Flatten tree for easier access
  const getAllNodes = useCallback((node, acc = []) => {
    acc.push(node);
    if (node.children) {
      node.children.forEach((child, idx) => getAllNodes(child, acc));
    }
    return acc;
  }, []);

  const handleNodeMouseDown = useCallback((e, node) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingNode(node);
    setIsDragging(true);
    setSelectedNode(node);
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging || !draggingNode || !svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100 / zoom;
    const y = ((e.clientY - rect.top) / rect.height) * 100 / zoom;

    setDraggingNode(prev => ({
      ...prev,
      pos: { 
        x: Math.max(2, Math.min(98, x)), 
        y: Math.max(2, Math.min(98, y)) 
      }
    }));
  }, [isDragging, draggingNode, zoom]);

  const handleMouseUp = useCallback(() => {
    if (draggingNode && selectedNode) {
      // Update tree data with new position
      const updateNode = (node) => {
        if (node.id === draggingNode.id) {
          return { ...node, pos: draggingNode.pos };
        }
        if (node.children) {
          return {
            ...node,
            children: node.children.map(updateNode)
          };
        }
        return node;
      };
      setTreeData(prev => updateNode(prev));
    }
    setIsDragging(false);
    setDraggingNode(null);
  }, [draggingNode, selectedNode]);

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/careers/layout/save', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(treeData)
      });
      if (response.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } else {
        alert('Failed to save layout');
      }
    } catch (err) {
      console.error('Failed to save:', err);
      alert('Error saving layout: ' + err.message);
    }
  };

  if (!treeData) {
    return (
      <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col items-center justify-center bg-black">
        <div className="text-center space-y-4">
          {error ? (
            <>
              <div className="text-red-400 text-lg font-bold">❌ Error Loading Tree</div>
              <div className="text-red-300 text-sm max-w-md">{error}</div>
              <div className="text-gray-400 text-xs mt-4 space-y-1">
                <p>✓ Make sure backend server is running:</p>
                <p className="font-mono bg-gray-900 p-2 rounded">npm run dev:backend</p>
                <p>✓ Check browser console for more details</p>
              </div>
              <button 
                onClick={() => window.location.reload()}
                className="mt-4 px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-black font-bold rounded text-sm"
              >
                🔄 Retry
              </button>
            </>
          ) : (
            <>
              <div className="text-gray-400 text-lg">⏳ Loading tree...</div>
              <div className="text-gray-500 text-xs">Connecting to backend...</div>
            </>
          )}
        </div>
      </div>
    );
  }

  const allNodes = getAllNodes(treeData);

  return (
    <div 
      className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col bg-black"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Header */}
      <div className="bg-gray-900 border-b border-yellow-600 p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-yellow-400">🪐 Planet Layout Editor</h1>
        <div className="flex gap-4">
          {selectedNode && (
            <div className="text-gray-300 text-sm">
              <span>Selected: <strong className="text-yellow-400">{selectedNode.label}</strong></span>
              <span className="ml-4">X: <strong>{selectedNode.pos?.x?.toFixed(1) || 0}%</strong></span>
              <span className="ml-2">Y: <strong>{selectedNode.pos?.y?.toFixed(1) || 0}%</strong></span>
            </div>
          )}
          <div className="flex gap-2 items-center">
            <label className="text-gray-300 text-xs">Zoom:</label>
            <input 
              type="range" 
              min="0.5" 
              max="3" 
              step="0.1" 
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="w-20"
            />
            <span className="text-gray-300 text-xs w-8">{zoom.toFixed(1)}x</span>
          </div>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-yellow-600 hover:bg-yellow-500 text-black font-bold rounded fx-pop"
          >
            💾 Save Layout
          </button>
        </div>
      </div>

      {/* SVG Canvas */}
      <svg
        ref={svgRef}
        className="flex-1 bg-gradient-to-b from-gray-950 to-black cursor-grab active:cursor-grabbing"
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* SVG Defs for Gradients */}
        <defs>
          <radialGradient id="grad-sun" cx="38%" cy="32%" r="60%">
            <stop offset="0%" stopColor="#FFFDE8" />
            <stop offset="18%" stopColor="#FFE866" />
            <stop offset="42%" stopColor="#FFA500" />
            <stop offset="70%" stopColor="#FF6200" />
            <stop offset="88%" stopColor="#E03800" />
            <stop offset="100%" stopColor="#8C1A00" stopOpacity="0.9" />
          </radialGradient>
          <radialGradient id="grad-earth" cx="36%" cy="30%" r="62%">
            <stop offset="0%" stopColor="#C8EEFF" />
            <stop offset="18%" stopColor="#58C0F0" />
            <stop offset="42%" stopColor="#1A72B8" />
            <stop offset="70%" stopColor="#0A3E6E" />
            <stop offset="100%" stopColor="#041828" />
          </radialGradient>
          <radialGradient id="grad-mars" cx="36%" cy="30%" r="62%">
            <stop offset="0%" stopColor="#FFBF9E" />
            <stop offset="20%" stopColor="#D85830" />
            <stop offset="48%" stopColor="#9C3518" />
            <stop offset="75%" stopColor="#5A1E08" />
            <stop offset="100%" stopColor="#200800" />
          </radialGradient>
          <radialGradient id="grad-jupiter" cx="36%" cy="30%" r="62%">
            <stop offset="0%" stopColor="#F8EED8" />
            <stop offset="18%" stopColor="#E8CF9E" />
            <stop offset="42%" stopColor="#C49558" />
            <stop offset="70%" stopColor="#8E6028" />
            <stop offset="100%" stopColor="#382208" />
          </radialGradient>
          <radialGradient id="grad-saturn" cx="36%" cy="30%" r="62%">
            <stop offset="0%" stopColor="#FFF8DC" />
            <stop offset="18%" stopColor="#F0E5C4" />
            <stop offset="42%" stopColor="#E8D090" />
            <stop offset="70%" stopColor="#C0A860" />
            <stop offset="100%" stopColor="#6E5C3E" />
          </radialGradient>
          <radialGradient id="grad-neptune" cx="36%" cy="30%" r="62%">
            <stop offset="0%" stopColor="#C8EAFF" />
            <stop offset="18%" stopColor="#7ACACF" />
            <stop offset="42%" stopColor="#4890C8" />
            <stop offset="70%" stopColor="#2866B0" />
            <stop offset="100%" stopColor="#0E1A4A" />
          </radialGradient>
          <radialGradient id="grad-uranus" cx="36%" cy="30%" r="62%">
            <stop offset="0%" stopColor="#E0F8FF" />
            <stop offset="18%" stopColor="#96E8F8" />
            <stop offset="42%" stopColor="#4FD8E8" />
            <stop offset="70%" stopColor="#2FA8C8" />
            <stop offset="100%" stopColor="#0D4A6E" />
          </radialGradient>
        </defs>

        {/* Connecting threads */}
        {allNodes.map(node =>
          node.children?.map(child => {
            const x1 = node.pos?.x || 50;
            const y1 = node.pos?.y || 50;
            const x2 = child.pos?.x || 50;
            const y2 = child.pos?.y || 50;
            return (
              <line
                key={`thread-${node.id}-${child.id}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#FFB830"
                strokeWidth="0.4"
                opacity="0.6"
              />
            );
          })
        )}

        {/* Planets */}
        {allNodes.map((node, nodeIdx) => {
          const planetType = node.id === 'start' ? 'sun' : getPlanetType(nodeIdx);
          const planetSize = PLANET_SIZES[planetType] || 8.5;
          const color = PLANET_COLORS[planetType] || '#FFB830';
          const x = node.pos?.x || 50;
          const y = node.pos?.y || 50;
          const isSelected = selectedNode?.id === node.id;

          return (
            <g
              key={node.id}
              onMouseDown={e => handleNodeMouseDown(e, node)}
              className="cursor-grab active:cursor-grabbing hover:opacity-100"
              opacity={isSelected ? 1 : 0.85}
            >
              {/* Planet circle */}
              <circle
                cx={x}
                cy={y}
                r={planetSize / 12}
                fill={`url(#grad-${planetType})`}
                opacity="0.95"
                className="fx-pop"
              />

              {/* Highlight ring when selected */}
              {isSelected && (
                <>
                  <circle
                    cx={x}
                    cy={y}
                    r={planetSize / 12 + 1.5}
                    fill="none"
                    stroke="#FFB830"
                    strokeWidth="0.3"
                    opacity="0.8"
                  />
                  <circle
                    cx={x}
                    cy={y}
                    r={planetSize / 12 + 3}
                    fill="none"
                    stroke="#FFB830"
                    strokeWidth="0.15"
                    opacity="0.4"
                  />
                </>
              )}

              {/* Label background */}
              <rect
                x={x - 6}
                y={y + planetSize / 10 + 1}
                width="12"
                height="2.5"
                rx="0.5"
                fill="rgba(0,0,0,0.6)"
                opacity="0.8"
              />

              {/* Label text */}
              <text
                x={x}
                y={y + planetSize / 10 + 2.5}
                textAnchor="middle"
                fontSize="0.9"
                fill="#C4B080"
                pointerEvents="none"
                className="font-bold select-none"
              >
                {node.label.substring(0, 10)}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Info Panel */}
      <div className="bg-gray-900 border-t border-yellow-600 p-4 max-h-48 overflow-y-auto">
        <div className="text-gray-300 text-sm space-y-2">
          <p className="text-yellow-400 font-bold">📋 Instructions:</p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li><strong className="text-yellow-400">Click</strong> on any planet to select it (shows in yellow ring)</li>
            <li><strong className="text-yellow-400">Drag</strong> planets to reposition them (0-100% area)</li>
            <li>Yellow threads connect parent-child nodes automatically</li>
            <li><strong className="text-yellow-400">Use Zoom slider</strong> to zoom in/out for precision</li>
            <li><strong className="text-yellow-400">Click Save</strong> to persist changes to careers.json</li>
            <li>Position values are in percentages of viewport</li>
            <li>✅ Changes are immediately reflected in the frontend after save</li>
          </ul>
        </div>

        {/* Tree Structure */}
        <div className="mt-4 pt-4 border-t border-gray-700">
          <p className="text-yellow-400 font-bold text-sm mb-2">📊 Tree Structure:</p>
          <div className="text-xs text-gray-400 space-y-1 max-h-24 overflow-y-auto">
            {allNodes.map(node => (
              <div key={node.id} style={{ paddingLeft: `${(node.level || 0) * 12}px` }}>
                <span className="text-yellow-300">{node.emoji || '🌍'}</span>
                <span className="ml-1">{node.label}</span>
                <span className="ml-2 text-gray-600">({node.pos?.x?.toFixed(0)}%, {node.pos?.y?.toFixed(0)}%)</span>
              </div>
            ))}
          </div>
        </div>

        {/* Save feedback */}
        {saved && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-4 p-3 bg-green-900/50 border border-green-600 text-green-300 rounded text-sm"
          >
            ✅ Layout saved successfully! Refresh the frontend to see changes.
          </motion.div>
        )}
      </div>
    </div>
  );
}
