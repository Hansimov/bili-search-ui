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

export function intToIso(num: number, local = true): string {
    try {
        if (local) {
            return new Date(num * 1000).toLocaleString(localeArgs, localeOptions);
        } else {
            return new Date(num * 1000).toISOString();
        }
    } catch (e) {
        return '1970-01-01 00:00:00';
    }
}

export function secondsToDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    const hh = hours.toString().padStart(2, '0');
    const mm = minutes.toString().padStart(2, '0');
    const ss = secs.toString().padStart(2, '0');
    if (hours > 0) {
        return `${hh}:${mm}:${ss}`;
    } else {
        return `${mm}:${ss}`;
    }
}

export function tsToYmd(ts: number): string {
    return intToIso(ts).slice(0, 10);
}

/**
 * 将 Unix 时间戳转换为 yyyy-mm-dd hh:mm:ss 格式（Asia/Shanghai 时区）
 *
 * @param ts Unix 时间戳（秒）
 * @returns 格式化字符串，如 "2024-01-15 13:45:30"
 */
export function tsToDatetime(ts: number): string {
    return intToIso(ts).replace(/\//g, '-');
}
