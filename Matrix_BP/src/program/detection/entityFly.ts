import { Player, Vector3 } from "@minecraft/server";
import { IntegratedSystemEvent, Module } from "../../matrixAPI";
import { rawtextTranslate } from "../../util/rawtext";
import { fastAbs } from "../../util/fastmath";
import { isSurroundedByAir } from "../../util/util";
let runId: IntegratedSystemEvent;
const entityFly = new Module()
	.addCategory("detection")
	.setName(rawtextTranslate("module.entityFly.name"))
	.setDescription(rawtextTranslate("module.entityFly.description"))
	.setToggleId("antiEntityFly")
	.setPunishment("ban")
	.onModuleEnable(() => {
		runId = Module.subscribePlayerTickEvent(tickEvent, false);
	})
	.onModuleDisable(() => {
		Module.clearPlayerTickEvent(runId);
	})
	.initPlayer((playerId, player) => {
		entityFlyData.set(playerId, {
			pastVelocityY: new Array(10).fill(0),
			lastNotRidingLocation: player.location,
			prefectCombo: 0,
		});
	});
entityFly.register();
interface EntityFlyData {
	pastVelocityY: number[];
	lastNotRidingLocation: Vector3;
	prefectCombo: number;
}
const entityFlyData = new Map<string, EntityFlyData>();
const SPEED_THRESHOLD = 0.35;
const LOWEST_Y_THRESHOLD = 0.4;
const MIN_COMBO_BEFORE_FLAG = 10;
function tickEvent (player: Player) {
	player.onScreenDisplay.setActionBar(`xz Vel: ${Math.sqrt(player.getVelocity().x **2 + player.getVelocity().z ** 2).toFixed(3)} |\n y Vel: ${player.getVelocity().y.toFixed(3)} | isOnGround: ${player.isOnGround} | yLoc: ${player.location.y.toFixed(3)}`);
	const isRiding = player.getComponent("riding")?.entityRidingOn;
	const data = entityFlyData.get(player.id)!;
	const { x, y: velocityY, z } = player.getVelocity();
	data.pastVelocityY.push(velocityY);
	data.pastVelocityY.shift();
	if (!isRiding) {
		data.lastNotRidingLocation = player.location;
		data.prefectCombo = 0;
	} else if (isRiding.typeId.startsWith("minecraft:")) {
		if (fastAbs(velocityY) > LOWEST_Y_THRESHOLD && player.isOnGround) {
			for (let i = 1; i < data.pastVelocityY.length; i++) {
				if (data.pastVelocityY[i] !== data.pastVelocityY[i - 1]) {
					player.teleport(data.lastNotRidingLocation);
					player.flag(entityFly, { t: "1", velocityY });
					break;
				}
			}
		}
		const horizontalSpeed = Math.sqrt(x ** 2 + z ** 2);
		if (velocityY === 0 && horizontalSpeed > SPEED_THRESHOLD && isSurroundedByAir(player.location, player.dimension) && player.isOnGround) {
			data.prefectCombo++;
			if (data.prefectCombo >= MIN_COMBO_BEFORE_FLAG) {
				player.teleport(data.lastNotRidingLocation);
				player.flag(entityFly, { t: "2", horizontalSpeed });
				data.prefectCombo = 0;
			}
		} else data.prefectCombo = 0;
	}
	entityFlyData.set(player.id, data);
}