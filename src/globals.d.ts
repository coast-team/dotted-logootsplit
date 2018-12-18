
/**
 * @see https://developer.mozilla.org/en-US/docs/Web/API/console
 */
interface Console {
    assert: (test: boolean, message?: string, ...objs: any[]) => void

// profiling
    time: (label?: string) => void

    timeEnd: (label?: string) => void

// Debugging
    log: (message?: string, ...objs: any[]) => void

    table: (obj: object) => void

    trace: () => void

    count: (label?: string) => u32

// Logging
    info: (message?: string, ...objs: any[]) => void

    warn: (message?: string, ...objs: any[]) => void

    error: (message?: string, ...objs: any[]) => void

    group: (label?: string) => void

    groupCollapsed: (label?: string) => void

    groupEnd: () => void

// Other
    clear: () => void
}

declare const console: Console
