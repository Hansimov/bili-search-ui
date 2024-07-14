export function humanReadableNumber(num: number): string {
    if (num >= 10000) {
        return `${(num / 10000).toFixed(1)}万`;
    } else {
        return `${num}`;
    }
}

export function secondsToDuration(seconds: number): string {
    // https://stackoverflow.com/questions/1322732/convert-seconds-to-hh-mm-ss-with-javascript
    const start_idx = seconds < 3600 ? 14 : 11;
    console.log(typeof seconds);
    return new Date(seconds * 1000).toISOString().substring(start_idx, 19);
}