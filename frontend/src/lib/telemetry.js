export function track(event, payload = {}) {
    try {
        const entry = { event, payload, ts: Date.now() }
        const raw = localStorage.getItem('cr_events')
        const arr = raw ? JSON.parse(raw) : []
        arr.push(entry)
        localStorage.setItem('cr_events', JSON.stringify(arr))
    } catch (e) {
        // noop - fail silently to avoid blocking UI
    }
}

export function flush() {
    try {
        const raw = localStorage.getItem('cr_events')
        const arr = raw ? JSON.parse(raw) : [] // eslint-disable-line no-unused-vars
        localStorage.removeItem('cr_events')
    } catch (e) {
        // noop
    }
}
