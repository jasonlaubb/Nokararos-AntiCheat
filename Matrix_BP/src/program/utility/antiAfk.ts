import { Player, world } from "@minecraft/server";
import { IntegratedSystemEvent, Module } from "../../matrixAPI";
import { fastText, rawtextTranslate } from "../../util/rawtext";
import { matrixKick } from "../system/moderation";
import { TickData } from "../import";
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
    .initPlayer((tickData, playerId) => {
        afkData.set(playerId, 0);
        return tickData;
    })
    .initClear((playerId) => {
        afkData.delete(playerId);
    })
    .register();
const MAX_AFK_TIME_ALLOWED = 480000;
function tickEvent(tickData: TickData, player: Player) {
    const data = afkData.get(player.id)!;
    const now = Date.now();
    if (player.isMoving()) {
        afkData.set(player.id, now);
    } else if (now - data > MAX_AFK_TIME_ALLOWED) {
        matrixKick(player, "Afk is not allowed", "[Auto Moderation]");
        world.sendMessage(fastText().addText("§bMatrix§a+ §7> §g").addTran("module.afk.kicked", player.name).build());
    }
    return tickData;
}
