import { Player, Vector3 } from "@minecraft/server";
import { IntegratedSystemEvent, Module } from "../../matrixAPI";
import { rawtextTranslate } from "../../util/rawtext";
import { fastAbs, fastBelow } from "../../util/fastmath";
import { MinecraftEntityTypes } from "../../node_modules/@minecraft/vanilla-data/lib/index";
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
			pastVelocityY: new Array(5).fill(0),
			lastNotRidingLocation: player.location,
			prefectCombo: 0,
			superCombo: 0,
			illegalFactorAmount: 0,
		});
	})
	.initClear((playerId) => {
		entityFlyData.delete(playerId);
	});
entityFly.register();
interface EntityFlyData {
	pastVelocityY: number[];
	lastNotRidingLocation: Vector3;
	prefectCombo: number;
	superCombo: number;
	illegalFactorAmount: number;
}
const entityFlyData = new Map<string, EntityFlyData>();
const SPEED_THRESHOLD = 0.35;
const LOWEST_Y_THRESHOLD = 0.25;
const MIN_COMBO_BEFORE_FLAG = 10;
const NORMAL_SPEED = 0.25;
const MIN_SUPER_COMBO = 20;
const FACTOR_MIN_FLAG_AMOUNT = 4;
const FACTOR = 100;
function tickEvent (player: Player) {
	const isRiding = player.getComponent("riding")?.entityRidingOn;
	const data = entityFlyData.get(player.id)!;
	const { x, y: velocityY, z } = player.getVelocity();
	data.pastVelocityY.push(velocityY);
	data.pastVelocityY.shift();
	player.onScreenDisplay.setActionBar(`${velocityY}`);
	if (!isRiding) {
		data.lastNotRidingLocation = player.location;
		data.prefectCombo = 0;
	} else if (isRiding.typeId.startsWith("minecraft:") && player.isOnGround) {
		if (fastAbs(velocityY) > LOWEST_Y_THRESHOLD) {
			let isEntityFly = false;
			for (let i = 1; i < data.pastVelocityY.length; i++) {
				if (data.pastVelocityY[i] !== data.pastVelocityY[i - 1]) {
					isEntityFly = false;
					break;
				}
			}
			if (isEntityFly) {
				player.teleport(data.lastNotRidingLocation);
				player.flag(entityFly, { t: "1", velocityY });
			}
		}
		const horizontalSpeed = Math.sqrt(x ** 2 + z ** 2);
		if (velocityY === 0 && horizontalSpeed > SPEED_THRESHOLD && !isRiding.isOnGround && player.isOnGround) {
			data.prefectCombo++;
			if (data.prefectCombo >= MIN_COMBO_BEFORE_FLAG) {
				player.teleport(data.lastNotRidingLocation);
				player.flag(entityFly, { t: "2", horizontalSpeed });
				data.prefectCombo = 0;
			}
		} else data.prefectCombo = 0;
		if (isRiding.typeId.includes("boat") && horizontalSpeed > NORMAL_SPEED) {
			const stringPoint = player.location.y.toFixed(3);
			const isOnGround = stringPoint.endsWith(".225") || stringPoint.endsWith(".725");
			if (isOnGround) {
				const actualLocation = { x: player.location.x, y: player.location.y + 0.225, z: player.location.z };
				const blockBelow = fastBelow(actualLocation, isRiding.dimension);
				const isAllNonIce = blockBelow ? blockBelow.every((block) => block ? !block.typeId?.includes("ice") : true) : false;
				if (isAllNonIce && isOnGround) {
					data.superCombo++;
					if (data.superCombo >= MIN_SUPER_COMBO) {
						player.teleport(data.lastNotRidingLocation);
						player.flag(entityFly, { t: "3", horizontalSpeed });
						data.superCombo = 0;
					}
				} else if (data.superCombo > 0) data.superCombo -= 1;
			} else if (data.superCombo > 0) data.superCombo -= 1;
		} else data.superCombo = 0;
		if (isRiding.typeId !== MinecraftEntityTypes.Minecart && velocityY !== 0 && Number.isInteger(velocityY * FACTOR)) {
			data.illegalFactorAmount++;
			if (data.illegalFactorAmount >= FACTOR_MIN_FLAG_AMOUNT) {
				player.teleport(data.lastNotRidingLocation);
				player.flag(entityFly, { t: "4", velocityY });
				data.illegalFactorAmount = 0;
			}
		} else if (data.illegalFactorAmount) data.illegalFactorAmount -= 0.5;
	}
	entityFlyData.set(player.id, data);
}