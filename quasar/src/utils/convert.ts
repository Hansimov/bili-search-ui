export function humanReadableNumber(num: number): string {
    if (num >= 10000) {
        return `${(num / 10000).toFixed(1)}万`;
    } else {
        return `${num}`;
    }
}

export function intToIso(num: number): string {
    return new Date(num * 1000).toISOString();
}

export function secondsToDuration(seconds: number): string {
    // https://stackoverflow.com/questions/1322732/convert-seconds-to-hh-mm-ss-with-javascript
    const start_idx = seconds < 3600 ? 14 : 11;
    return intToIso(seconds).substring(start_idx, 19);
}

export function tsToYmd(ts: number): string {
    return intToIso(ts).slice(0, 10);
}
