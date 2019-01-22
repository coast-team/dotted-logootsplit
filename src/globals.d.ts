/* eslint-disable no-shadow */

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/API/console
 */
interface Console {
    assert: (test: boolean, message?: string, ...objs: unknown[]) => void

    // profiling
    time: (label?: string) => void

    timeEnd: (label?: string) => void

    // Debugging
    log: (message?: string, ...objs: unknown[]) => void

    table: (obj: object) => void

    trace: () => void

    count: (label?: string) => u32

    // Logging
    info: (message?: string, ...objs: unknown[]) => void

    warn: (message?: string, ...objs: unknown[]) => void

    error: (message?: string, ...objs: unknown[]) => void

    group: (label?: string) => void

    groupCollapsed: (label?: string) => void

    groupEnd: () => void

    // Other
    clear: () => void
}

declare const console: Console
