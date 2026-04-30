import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

export default function GlowCursor() {
    const dotRef  = useRef(null);
    const ringRef = useRef(null);
    const pos     = useRef({ x: -200, y: -200 });
    const ring    = useRef({ x: -200, y: -200 });
    const raf     = useRef(null);
    const [hovered, setHovered] = useState(false);
    const [clicking, setClicking] = useState(false);
    const shouldReduceMotion = useReducedMotion();

    useEffect(() => {
        // Don't show on touch devices
        if (window.matchMedia('(hover: none)').matches) return;
        if (shouldReduceMotion) return;

        const dot  = dotRef.current;
        const ringEl = ringRef.current;
        if (!dot || !ringEl) return;

        const onMove = (e) => {
            pos.current = { x: e.clientX, y: e.clientY };
        };

        const onDown  = () => setClicking(true);
        const onUp    = () => setClicking(false);

        const onOver = (e) => {
            const el = e.target;
            const clickable = el.closest('button, a, [role="button"], input, textarea, select, label, [data-abcd-card]');
            setHovered(!!clickable);
        };

        const loop = () => {
            const lerp = (a, b, t) => a + (b - a) * t;
            ring.current.x = lerp(ring.current.x, pos.current.x, 0.12);
            ring.current.y = lerp(ring.current.y, pos.current.y, 0.12);

            if (dot) {
                dot.style.transform = `translate(${pos.current.x}px, ${pos.current.y}px) translate(-50%, -50%)`;
            }
            if (ringEl) {
                ringEl.style.transform = `translate(${ring.current.x}px, ${ring.current.y}px) translate(-50%, -50%)`;
            }
            raf.current = requestAnimationFrame(loop);
        };

        window.addEventListener('mousemove', onMove, { passive: true });
        window.addEventListener('mouseover', onOver, { passive: true });
        window.addEventListener('mousedown', onDown, { passive: true });
        window.addEventListener('mouseup',   onUp,   { passive: true });
        raf.current = requestAnimationFrame(loop);

        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseover', onOver);
            window.removeEventListener('mousedown', onDown);
            window.removeEventListener('mouseup', onUp);
            if (raf.current) cancelAnimationFrame(raf.current);
        };
    }, [shouldReduceMotion]);

    if (typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches) return null;
    if (shouldReduceMotion) return null;

    return (
        <>
            {/* Inner dot */}
            <div
                ref={dotRef}
                aria-hidden="true"
                style={{
                    position: 'fixed',
                    top: 0, left: 0,
                    width:  clicking ? 6 : 7,
                    height: clicking ? 6 : 7,
                    borderRadius: '50%',
                    background: hovered ? '#CDB88A' : '#2DD4BF',
                    boxShadow: hovered
                        ? '0 0 12px 3px rgba(205,184,138,0.75)'
                        : '0 0 10px 2px rgba(45,212,191,0.65)',
                    pointerEvents: 'none',
                    zIndex: 99999,
                    transition: 'width 0.15s, height 0.15s, background 0.22s, box-shadow 0.22s',
                    willChange: 'transform',
                    mixBlendMode: 'difference',
                }}
            />
            {/* Outer ring */}
            <div
                ref={ringRef}
                aria-hidden="true"
                style={{
                    position: 'fixed',
                    top: 0, left: 0,
                    width:  hovered ? 44 : clicking ? 22 : 30,
                    height: hovered ? 44 : clicking ? 22 : 30,
                    borderRadius: '50%',
                    border: `1.5px solid ${hovered ? 'rgba(205,184,138,0.55)' : 'rgba(45,212,191,0.35)'}`,
                    background: hovered ? 'rgba(205,184,138,0.05)' : 'transparent',
                    boxShadow: hovered ? '0 0 20px 4px rgba(205,184,138,0.15)' : 'none',
                    pointerEvents: 'none',
                    zIndex: 99998,
                    transition: 'width 0.28s cubic-bezier(0.16,1,0.3,1), height 0.28s cubic-bezier(0.16,1,0.3,1), border-color 0.22s, background 0.22s, box-shadow 0.22s',
                    willChange: 'transform',
                }}
            />
        </>
    );
}
