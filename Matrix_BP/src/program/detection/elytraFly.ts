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
            lastSpeedDeviation: 0,
            triggeredType2: false,
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
    lastSpeedDeviation: number;
    triggeredType2: boolean;
}
const elytraFlyData = new Map<string, ElytraFlyData>();
function tickEvent(player: Player) {
    const data = elytraFlyData.get(player.id)!;
    const now = Date.now();
    if (!data.isLastTickGliding && player.isGliding) {
        data.startGlideTime = now;
    }
    const { x, z } = player.getVelocity();
    const glidingSpeed = pythag(x, z);
    const speedDeviation = data.lastGlidingSpeed / glidingSpeed;
    if (player.isGliding && !data.usedRocket && now - data.startGlideTime > 1000) {
        if (glidingSpeed > data.highestGlidingSpeed) {
            data.highestGlidingSpeed = glidingSpeed;
        } else if (glidingSpeed > 0) {
            if (speedDeviation > 50) {
                dropElytra(player);
                player.flag(elytraFly, { t: "1", speedDeviation });
            } else if (speedDeviation.toFixed(4) === data.lastSpeedDeviation.toFixed(4)) {
                if (data.triggeredType2) {
                    data.triggeredType2 = false;
                    dropElytra(player);
                    player.flag(elytraFly, { t: "2", fixedSpeedDeviation: speedDeviation.toFixed(4) });
                }
                data.triggeredType2 = true;
            } else data.triggeredType2 = false;
        }
    }
    if (!player.isGliding) {
        data.usedRocket = false;
        data.highestGlidingSpeed = 0;
    }
    data.lastSpeedDeviation = speedDeviation;
    data.lastGlidingSpeed = glidingSpeed;
    data.isLastTickGliding = player.isGliding;
    elytraFlyData.set(player.id, data);
}
function onItemUse({ itemStack, source }: ItemUseAfterEvent) {
    if (source.isGliding && itemStack.typeId === MinecraftItemTypes.FireworkRocket) {
        const data = elytraFlyData.get(source.id)!;
        data.usedRocket = true;
        elytraFlyData.set(source.id, data);
    }
}
function dropElytra(player: Player) {
    const slot = player.getComponent("equippable")?.getEquipmentSlot(EquipmentSlot.Chest);
    const item = slot?.getItem();
    if (item) {
        // Good bye elytra >w<
        player.dimension.spawnItem(item, player.location);
        slot!.setItem();
    }
}
