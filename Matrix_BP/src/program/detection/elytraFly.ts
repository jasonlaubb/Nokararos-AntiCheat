import { EquipmentSlot, ItemUseAfterEvent, Player, world } from "@minecraft/server";
import { IntegratedSystemEvent, Module } from "../../matrixAPI";
import { rawtextTranslate } from "../../util/rawtext";
import { MinecraftItemTypes } from "../../node_modules/@minecraft/vanilla-data/lib/index";
import { pythag } from "../../util/fastmath";
let runId: IntegratedSystemEvent;
const elytraFly = new Module()
	.setName(rawtextTranslate("module.elytraFly.name"))
	.setDescription(rawtextTranslate("module.elytraFly.description"))
	.setToggleId("antiElytraFly")
	.setPunishment("kick")
	.addCategory("detection")
	.onModuleEnable(() => {
		runId = Module.subscribePlayerTickEvent(tickEvent, false);
		world.afterEvents.itemUse.subscribe(onItemUse);
	})
	.onModuleDisable(() => {
		Module.clearPlayerTickEvent(runId);
		elytraFlyData.clear();
		world.afterEvents.itemUse.unsubscribe(onItemUse);
	})
	.initPlayer((playerId) => {
		elytraFlyData.set(playerId, {
			lastGlidingSpeed: 0,
			startGlideTime: 0,
			startGlideSpeed: 0,
			isSpeedDecreasing: false,
			highestGlidingSpeed: 0,
			isLastTickGliding: false,
			usedRocket: false,
		});
	})
	.initClear((playerId) => {
		elytraFlyData.delete(playerId);
	});
elytraFly.register();
interface ElytraFlyData {
	lastGlidingSpeed: number;
	startGlideTime: number;
	startGlideSpeed: number;
	isSpeedDecreasing: boolean;
	highestGlidingSpeed: number;
	isLastTickGliding: boolean;
	usedRocket: boolean;
}
const elytraFlyData = new Map<string, ElytraFlyData>();
function tickEvent (player: Player) {
	const data = elytraFlyData.get(player.id)!;
	const now = Date.now();
	if (!data.isLastTickGliding && player.isGliding) {
		data.startGlideTime = now;
	}
	const { x, z } = player.getVelocity();
	const glidingSpeed = pythag(x, z);
	if (player.isGliding && !data.usedRocket && now - data.startGlideTime > 1500) {
		if (glidingSpeed > data.highestGlidingSpeed) {
			data.highestGlidingSpeed = glidingSpeed;
		} else if (data.highestGlidingSpeed > 0.5) {
			const speedDeviation = data.highestGlidingSpeed / glidingSpeed;
			if (speedDeviation > 5) {
				const slot = player.getComponent("equippable")?.getEquipmentSlot(EquipmentSlot.Chest);
				const item = slot?.getItem();
				if (item) {
					// Good bye elytra >w<
					player.dimension.spawnItem(item, player.location);
					slot!.setItem();
				}
				player.flag(elytraFly, { t: "1", speedDeviation });
			}
		}
		player.onScreenDisplay.setActionBar(`${glidingSpeed.toFixed(2)} of ${data.highestGlidingSpeed.toFixed(2)}`);
	}
	if (!player.isGliding && data.usedRocket) data.usedRocket = false;
	data.lastGlidingSpeed = glidingSpeed;
	data.isLastTickGliding = player.isGliding;
	elytraFlyData.set(player.id, data);
}
function onItemUse ({ itemStack, source }: ItemUseAfterEvent) {
	if (source.isGliding && itemStack.typeId === MinecraftItemTypes.FireworkRocket) {
		const data = elytraFlyData.get(source.id)!;
		data.usedRocket = true;
		elytraFlyData.set(source.id, data);
	}
}