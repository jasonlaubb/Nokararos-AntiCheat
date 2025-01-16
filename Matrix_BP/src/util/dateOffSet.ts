interface MiniTime {
    day: number;
    month: number;
    year: number;
    hour: number;
    minute: number;
    second: number;
}
export function currentTimezoneOffset(): string {
    const date = -(new Date().getTimezoneOffset() / 60);
    if (date === 0) {
        return "UTC";
    } else {
        return date > 0 ? `UTC+${date}` : `UTC-${date}`;
    }
}
export function getUTCTime(now: number): MiniTime {
    const date = new Date(now);
    return {
        day: date.getUTCDate(),
        month: date.getUTCMonth() + 1,
        year: date.getUTCFullYear(),
        hour: date.getUTCHours(),
        minute: date.getUTCMinutes(),
        second: date.getUTCSeconds(),
    };
}
