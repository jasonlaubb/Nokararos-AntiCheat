import { Player, system, world } from "@minecraft/server";
import { IntegratedSystemEvent, Module } from "../../matrixAPI";
import { fastText, rawtextTranslate } from "../../util/rawtext";
import { fastAbs } from "../../util/fastmath";
import { MinecraftEffectTypes } from "../../node_modules/@minecraft/vanilla-data/lib/index";
import { TickData } from "../import";
let eventId: IntegratedSystemEvent;
new Module()
    .addCategory("utility")
    .setName(rawtextTranslate("module.worldborder.name"))
    .setDescription(rawtextTranslate("module.worldborder.description"))
    .setToggleId("worldBorder")
    .initPlayer((tickData, _playerId, player) => {
        player.removeTag("matrix:worldBorderBlocked");
        return tickData;
    })
    .onModuleEnable(() => {
        eventId = Module.subscribePlayerTickEvent(worldBorder, false);
    })
    .onModuleDisable(() => {
        Module.clearPlayerTickEvent(eventId);
    });

function worldBorder(tickData: TickData, player: Player) {
    if (player.hasTag("matrix:worldBorderBlocked")) return tickData;
    const worldBorderConfig = Module.config.worldBorder;
    const maxDifferent = worldBorderConfig.borderLength * 0.5;
    const centerLocation = worldBorderConfig.useWorldSpawn ? world.getDefaultSpawnLocation() : worldBorderConfig.centerLocation;
    const differentX = fastAbs(player.location.x - centerLocation.x);
    const differentZ = fastAbs(player.location.z - centerLocation.z);

    if (differentX > maxDifferent || differentZ > maxDifferent) {
        player.addTag("matrix:worldBorderBlocked");
        player.inputPermissions.cameraEnabled = false;
        player.inputPermissions.movementEnabled = false;
        player.addEffect(MinecraftEffectTypes.Blindness, 600);
        player.sendMessage(fastText().addText("§bMatrix§a+ §7> §c").addTran("module.worldborder.danger").build());
        player.onScreenDisplay.setTitle(rawtextTranslate("module.worldborder.title"), {
            stayDuration: 100,
            fadeInDuration: 0,
            fadeOutDuration: 20,
        });
        player.onScreenDisplay.updateSubtitle(rawtextTranslate("module.worldborder.subtitle"));
        system.runTimeout(() => {
            if (!player?.isValid()) return;
            player.onScreenDisplay.updateSubtitle("");
            player.teleport(centerLocation);
            player.removeEffect(MinecraftEffectTypes.Blindness);
            player.removeTag("matrix:worldBorderBlocked");
            player.inputPermissions.cameraEnabled = true;
            player.inputPermissions.movementEnabled = true;
        }, 100);
    }
    return tickData;
}
