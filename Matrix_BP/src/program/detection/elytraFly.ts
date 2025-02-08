import { EquipmentSlot, ItemUseAfterEvent, Player, world } from "@minecraft/server";
import { IntegratedSystemEvent, Module } from "../../matrixAPI";
import { rawtextTranslate } from "../../util/rawtext";
import { MinecraftItemTypes } from "../../node_modules/@minecraft/vanilla-data/lib/index";
import { TickData } from "../import";
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
        world.afterEvents.itemUse.unsubscribe(onItemUse);
    })
    .initPlayer((tickData) => {
        tickData.elytaFly = {
            startGlideTime: 0,
            startGlideSpeed: 0,
            isSpeedDecreasing: false,
            highestGlidingSpeed: 0,
            isLastTickGliding: false,
            usedRocket: false,
            lastSpeedDeviation: 0,
            triggeredType2: false,
        };
        return tickData;
    });
elytraFly.register();
function tickEvent(tickData: TickData, player: Player) {
    const data = tickData.elytaFly!;
    const now = Date.now();
    if (!data.isLastTickGliding && player.isGliding) {
        data.startGlideTime = now;
    }
    const glidingSpeed = tickData.instant.speedXZ;
    const speedDeviation = tickData.global.lastSpeedXZ / glidingSpeed;
    if (player.isGliding && !data.usedRocket && now - data.startGlideTime > 1000) {
        if (glidingSpeed > data.highestGlidingSpeed) {
            data.highestGlidingSpeed = glidingSpeed;
        } else if (glidingSpeed > 0) {
            if (speedDeviation > Module.config.sensitivity.elytraFly.maxSpeedDeviation) {
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
    data.isLastTickGliding = player.isGliding;
    tickData.elytaFly = data;
    return tickData;
}
function onItemUse({ itemStack, source }: ItemUseAfterEvent) {
    if (source.isGliding && itemStack.typeId === MinecraftItemTypes.FireworkRocket) {
        const data = Module.tickData.get(source.id)!;
        data.elytaFly.usedRocket = true;
        Module.tickData.set(source.id, data);
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
