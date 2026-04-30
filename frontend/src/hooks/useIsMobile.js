import { useState, useEffect } from 'react';

const MOBILE_BREAKPOINT = 768;
/** Match KineticSidebar.SIDEBAR_MIN_WIDTH = 320 — sidebars show on all phones */
export const SIDEBAR_BREAKPOINT = 320;

export function useIsMobile() {
    const [isMobile, setIsMobile] = useState(
        typeof window !== 'undefined' ? window.innerWidth < MOBILE_BREAKPOINT : false
    );

    useEffect(() => {
        const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
        const update = () => setIsMobile(mq.matches);
        update();
        mq.addEventListener('change', update);
        return () => mq.removeEventListener('change', update);
    }, []);

    return isMobile;
}

/** True when viewport is wide enough to show video sidebars (tree padding applied). */
export function useHasSidebars() {
    const [hasSidebars, setHasSidebars] = useState(
        typeof window !== 'undefined' ? window.innerWidth >= SIDEBAR_BREAKPOINT : false
    );

    useEffect(() => {
        const mq = window.matchMedia(`(min-width: ${SIDEBAR_BREAKPOINT}px)`);
        const update = () => setHasSidebars(mq.matches);
        update();
        mq.addEventListener('change', update);
        return () => mq.removeEventListener('change', update);
    }, []);

    return hasSidebars;
}
