import { world } from "@minecraft/server";
export interface Log {
	autoMod: boolean;
	object: string;
	action: string;
	data: { [key: string]: string | number | boolean | (string | number | boolean)[] };
	now: number;
}
export function write (auto: boolean, action: string, object: string, data: { [key: string]: string | number | boolean | (string | number | boolean)[] }) {
	const now = Date.now();
	while (true) {
		let dataKey = `log:${now}:${Math.random()}`
		if (!world.getDynamicProperty(dataKey)) {
			world.setDynamicProperty(dataKey, JSON.stringify({
				auto,
				object,
				action,
				data,
				now,
			}));
			break;
		}
	}
}
interface RestartLog {
	now: number;
	amount: string;
}
export function logRestart () {
	const restartString = world.getDynamicProperty("restartLogs");
	const restartLog = restartString ? JSON.parse(restartString as string) as RestartLog[] : [] as RestartLog[];
	restartLog.unshift({
		now: Date.now(),
		amount: (restartLog.length + 1).toString(),
	} as RestartLog);
	world.setDynamicProperty("restartLogs", JSON.stringify(restartLog));
}
export function getRestartLogs () {
	const restartString = world.getDynamicProperty("restartLogs");
	const restartLog = restartString ? JSON.parse(restartString as string) as RestartLog[] : [] as RestartLog[];
	return restartLog;
}
export function getAllLogs () {
	return world.getDynamicPropertyIds()
		.filter((id) => id.startsWith("log:"))
		.map((id) => {
			return JSON.parse(world.getDynamicProperty(id) as string) as Log;
		})
		.sort((a, b) => b.now - a.now);
}
export function getLog (minTime?: number, maxTime?: number) {
	return getAllLogs().filter((log) => !(minTime && log.now < minTime) && !(maxTime && log.now > maxTime));
}
export function clearLogs () {
	world.getDynamicPropertyIds()
		.filter((id) => id.startsWith("log:"))
		.forEach((id) => {
			world.setDynamicProperty(id);
		});
	world.setDynamicProperty("restartLogs");
}