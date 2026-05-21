import { computed, onBeforeUnmount, ref, type Ref } from 'vue';

export interface SmoothStreamingTextOptions {
    frameMs?: number;
    minCharsPerFrame?: number;
    maxCharsPerFrame?: number;
    growthRatio?: number;
}

const DEFAULT_FRAME_MS = 24;
const DEFAULT_MIN_CHARS_PER_FRAME = 2;
const DEFAULT_MAX_CHARS_PER_FRAME = 32;
const DEFAULT_GROWTH_RATIO = 0.22;

function canAnimateText(): boolean {
    return (
        typeof window !== 'undefined' &&
        typeof window.requestAnimationFrame === 'function' &&
        typeof window.cancelAnimationFrame === 'function'
    );
}

function getNextLength(
    currentLength: number,
    targetLength: number,
    options: Required<SmoothStreamingTextOptions>
): number {
    const remaining = targetLength - currentLength;
    if (remaining <= 0) return targetLength;
    const proportionalStep = Math.ceil(remaining * options.growthRatio);
    const step = Math.max(options.minCharsPerFrame, proportionalStep);
    return Math.min(
        targetLength,
        currentLength + Math.min(options.maxCharsPerFrame, step)
    );
}

export function useSmoothStreamingText(
    source: Ref<string>,
    shouldAnimate: () => boolean,
    rawOptions: SmoothStreamingTextOptions = {}
) {
    const options: Required<SmoothStreamingTextOptions> = {
        frameMs: rawOptions.frameMs ?? DEFAULT_FRAME_MS,
        minCharsPerFrame:
            rawOptions.minCharsPerFrame ?? DEFAULT_MIN_CHARS_PER_FRAME,
        maxCharsPerFrame:
            rawOptions.maxCharsPerFrame ?? DEFAULT_MAX_CHARS_PER_FRAME,
        growthRatio: rawOptions.growthRatio ?? DEFAULT_GROWTH_RATIO,
    };

    const displayed = ref(source.value || '');
    let target = source.value || '';
    let frameId: number | null = null;
    let lastFrameTime = 0;

    const stopFrame = () => {
        if (frameId != null && canAnimateText()) {
            window.cancelAnimationFrame(frameId);
        }
        frameId = null;
    };

    const applyImmediately = (value: string) => {
        target = value;
        stopFrame();
        displayed.value = value;
    };

    const tick = (timestamp: number) => {
        frameId = null;
        if (timestamp - lastFrameTime < options.frameMs) {
            schedule();
            return;
        }
        lastFrameTime = timestamp;

        const current = displayed.value || '';
        if (current === target) {
            return;
        }
        if (!target.startsWith(current) || target.length < current.length) {
            displayed.value = target;
            return;
        }

        const nextLength = getNextLength(current.length, target.length, options);
        displayed.value = target.slice(0, nextLength);
        if (displayed.value !== target) {
            schedule();
        }
    };

    const schedule = () => {
        if (frameId != null) return;
        if (!canAnimateText()) {
            displayed.value = target;
            return;
        }
        frameId = window.requestAnimationFrame(tick);
    };

    const sync = (value: string) => {
        const next = value || '';
        if (next === target) return;

        const current = displayed.value || '';
        target = next;

        if (
            !shouldAnimate() ||
            !next ||
            !next.startsWith(current) ||
            next.length <= current.length
        ) {
            applyImmediately(next);
            return;
        }

        schedule();
    };

    onBeforeUnmount(stopFrame);

    return {
        displayed: computed(() => displayed.value),
        sync,
        applyImmediately,
    };
}

export function getSmoothStreamingNextText(
    current: string,
    target: string,
    rawOptions: SmoothStreamingTextOptions = {}
): string {
    if (!target.startsWith(current) || target.length <= current.length) {
        return target;
    }
    const options: Required<SmoothStreamingTextOptions> = {
        frameMs: rawOptions.frameMs ?? DEFAULT_FRAME_MS,
        minCharsPerFrame:
            rawOptions.minCharsPerFrame ?? DEFAULT_MIN_CHARS_PER_FRAME,
        maxCharsPerFrame:
            rawOptions.maxCharsPerFrame ?? DEFAULT_MAX_CHARS_PER_FRAME,
        growthRatio: rawOptions.growthRatio ?? DEFAULT_GROWTH_RATIO,
    };
    return target.slice(
        0,
        getNextLength(current.length, target.length, options)
    );
}
