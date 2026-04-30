import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Check, ChevronDown } from 'lucide-react';

/**
 * Editorial <Select> — replaces the native HTML <select> for a consistent dark
 * editorial shell across iOS/Android/Desktop. Keyboard accessible, click-outside,
 * focus trap, gold focus ring. ~80 LOC behavior, full design alignment.
 *
 * Usage:
 *   <EditorialSelect
 *     id="stream"
 *     value={value}
 *     onChange={setValue}
 *     placeholder="Select stream"
 *     options={[{ value: 'pcm', label: 'PCM (Science with Maths)' }, ...]}
 *   />
 */
export default function EditorialSelect({
    id,
    value = '',
    onChange,
    options = [],
    placeholder = 'Select…',
    disabled = false,
    'aria-label': ariaLabel,
    className = '',
}) {
    const [open, setOpen] = useState(false);
    const [activeIdx, setActiveIdx] = useState(-1);
    const wrapRef = useRef(null);
    const listRef = useRef(null);
    const buttonRef = useRef(null);
    const reduce = useReducedMotion();

    const selected = options.find(o => o.value === value);

    /* Click outside */
    useEffect(() => {
        if (!open) return;
        const handler = (e) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
        };
        window.addEventListener('pointerdown', handler, true);
        return () => window.removeEventListener('pointerdown', handler, true);
    }, [open]);

    /* Sync activeIdx when opening */
    useEffect(() => {
        if (!open) return;
        const idx = options.findIndex(o => o.value === value);
        setActiveIdx(idx >= 0 ? idx : 0);
    }, [open, options, value]);

    const commitChoice = useCallback((idx) => {
        const opt = options[idx];
        if (!opt) return;
        onChange?.(opt.value);
        setOpen(false);
        // Return focus to button for keyboard flow
        setTimeout(() => buttonRef.current?.focus(), 0);
    }, [onChange, options]);

    const onKeyDown = useCallback((e) => {
        if (disabled) return;
        if (!open) {
            if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(e.key)) {
                e.preventDefault();
                setOpen(true);
            }
            return;
        }
        if (e.key === 'Escape') { e.preventDefault(); setOpen(false); buttonRef.current?.focus(); return; }
        if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(options.length - 1, i + 1)); return; }
        if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx(i => Math.max(0, i - 1)); return; }
        if (e.key === 'Home')      { e.preventDefault(); setActiveIdx(0); return; }
        if (e.key === 'End')       { e.preventDefault(); setActiveIdx(options.length - 1); return; }
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); commitChoice(activeIdx); return; }
    }, [open, options.length, activeIdx, commitChoice, disabled]);

    return (
        <div ref={wrapRef} className={`relative w-full ${className}`}>
            <button
                ref={buttonRef}
                id={id}
                type="button"
                onClick={() => !disabled && setOpen(o => !o)}
                onKeyDown={onKeyDown}
                disabled={disabled}
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-label={ariaLabel}
                className="pw-input flex items-center justify-between text-left disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <span className={selected ? 'text-white/92' : 'text-white/42'}>
                    {selected ? selected.label : placeholder}
                </span>
                <ChevronDown
                    size={15}
                    className={`text-white/45 ml-2 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                    aria-hidden="true"
                />
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        ref={listRef}
                        role="listbox"
                        aria-labelledby={id}
                        initial={reduce ? { opacity: 1 } : { opacity: 0, y: -6, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.98 }}
                        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                        className="pw-panel absolute left-0 right-0 top-full mt-2 z-[80] overflow-hidden"
                        style={{ maxHeight: 280, overflowY: 'auto' }}
                    >
                        <ul className="py-1.5">
                            {options.map((opt, idx) => {
                                const isActive = idx === activeIdx;
                                const isSelected = opt.value === value;
                                return (
                                    <li
                                        key={opt.value || `opt-${idx}`}
                                        role="option"
                                        aria-selected={isSelected}
                                        onMouseEnter={() => setActiveIdx(idx)}
                                        onClick={() => commitChoice(idx)}
                                        className={`flex items-center justify-between px-4 py-2.5 text-[13.5px] cursor-pointer fx-soft ${
                                            isActive ? 'bg-[var(--gold-500)]/10 text-white' : 'text-white/72 hover:text-white'
                                        }`}
                                    >
                                        <span>{opt.label}</span>
                                        {isSelected && <Check size={13} className="text-[var(--gold-300)]" strokeWidth={2} />}
                                    </li>
                                );
                            })}
                        </ul>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
