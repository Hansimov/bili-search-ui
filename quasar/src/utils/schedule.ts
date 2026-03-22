type IdleCallbackHandle = number;

interface IdleDeadlineLike {
    didTimeout: boolean;
    timeRemaining: () => number;
}

interface IdleWindowLike {
    requestIdleCallback?: (
        callback: (deadline: IdleDeadlineLike) => void,
        options?: { timeout?: number }
    ) => IdleCallbackHandle;
}

/**
 * 在首屏绘制完成后再调度低优先级任务，避免阻塞启动渲染。
 */
export function scheduleAfterInitialRender(
    task: () => void,
    timeout = 1200
): void {
    if (typeof window === 'undefined') {
        task();
        return;
    }

    const idleWindow = window as Window & IdleWindowLike;

    const queueTask = () => {
        if (typeof idleWindow.requestIdleCallback === 'function') {
            idleWindow.requestIdleCallback(() => {
                task();
            }, { timeout });
            return;
        }

        window.setTimeout(task, 32);
    };

    window.requestAnimationFrame(() => {
        window.requestAnimationFrame(queueTask);
    });
}