/* eslint-disable @typescript-eslint/no-explicit-any */
export const debounce = <T extends (...args: any[]) => any>(fn: T, delay: number): ((...args: Parameters<T>) => void) => {
    let timeoutId: NodeJS.Timeout;

    return (...args: Parameters<T>) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn(...args), delay);
    };
};