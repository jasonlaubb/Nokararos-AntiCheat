interface MiniTime {
	day: number;
	month: number;
	year: number;
	hour: number;
	minute: number;
	second: number;
}
function currentTimezoneOffset (): string {
	const date = -(new Date().getTimezoneOffset() / 60);
	if (date === 0) {
		return "UTC";
	} else {
		return date > 0 ? `UTC+${date}` : `UTC-${date}`;
	}
}
function getLocalTime (): MiniTime {
	const now = Date.now();
	const date = new Date(now);
	return {
		day: date.getDate(),
		month: date.getMonth() + 1,
		year: date.getFullYear(),
		hour: date.getHours(),
		minute: date.getMinutes(),
		second: date.getSeconds(),
	};
}
function getUTCTime (): MiniTime {
	const now = Date.now();
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