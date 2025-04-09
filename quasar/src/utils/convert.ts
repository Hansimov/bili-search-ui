export function humanReadableNumber(num: number): string {
    if (num >= 10000) {
        return `${(num / 10000).toFixed(1)}万`;
    } else {
        return `${num}`;
    }
}

const localeArgs: Intl.LocalesArgument = 'zh-CN';
const localeOptions: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
}

export function intToIso(num: number): string {
    // return new Date(num * 1000).toISOString();
    try {
        return new Date(num * 1000).toLocaleString(localeArgs, localeOptions);
    } catch (e) {
        return '1970-01-01 00:00:00';
    }
}

export function secondsToDuration(seconds: number): string {
    // https://stackoverflow.com/questions/1322732/convert-seconds-to-hh-mm-ss-with-javascript
    const start_idx = seconds < 3600 ? 14 : 11;
    return intToIso(seconds).substring(start_idx, 19);
}

export function tsToYmd(ts: number): string {
    return intToIso(ts).slice(0, 10);
}
