import { Player, world } from "@minecraft/server";
import { IntegratedSystemEvent, Module } from "../../matrixAPI";
import { fastText, rawtextTranslate } from "../../util/rawtext";
import { strengthenKick } from "../system/moderation";
const afkData = new Map<string, number>();
let eventId: IntegratedSystemEvent;
new Module()
    .addCategory("utility")
    .setName(rawtextTranslate("module.afk.name"))
    .setDescription(rawtextTranslate("module.afk.description"))
    .setToggleId("antiAfk")
    .onModuleEnable(() => {
        eventId = Module.subscribePlayerTickEvent(tickEvent, false);
    })
    .onModuleDisable(() => {
        afkData.clear();
        Module.clearPlayerTickEvent(eventId);
    })
    .initPlayer((playerId) => {
        afkData.set(playerId, 0);
    })
    .initClear((playerId) => {
        afkData.delete(playerId);
    })
    .register();
const MAX_AFK_TIME_ALLOWED = 480000;
function tickEvent(player: Player) {
    const data = afkData.get(player.id)!;
    const now = Date.now();
    if (player.isMoving()) {
        afkData.set(player.id, now);
    } else if (now - data > MAX_AFK_TIME_ALLOWED) {
        strengthenKick(player, "Afk is not allowed");
        world.sendMessage(fastText().addText("§bMatrix§a+ §7> §g").addTran("module.afk.kicked", player.name).build());
    }
}
