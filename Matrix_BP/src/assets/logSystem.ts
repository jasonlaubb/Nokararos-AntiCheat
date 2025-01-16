import { world } from "@minecraft/server";

export function writeSingle (action: string, data: { [key: string]: string | number | boolean | (string | number | boolean)[] }) {
	while (true) {
		let dataKey = `matrix:log::${Math.random()}:${Date.now()}`
		if (!world.getDynamicProperty(dataKey)) {
			world.setDynamicProperty(dataKey, JSON.stringify({
				action,
				data,
			}));
			break;
		}
	}
}