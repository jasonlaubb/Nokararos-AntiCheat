import { Player, Vector3 } from "@minecraft/server";
import { IntegratedSystemEvent, Module } from "../../matrixAPI";
import { rawtextTranslate } from "../../util/rawtext";
import { pythag, fastTotalDelta } from "../../util/fastmath";
const MAX_DEVIATION = 1.5;
const SPIKE_LIKE_LIMIT = 3;
const MAX_FLAG_AMOUNT = 7;
const MAX_FLAG_INTERVAL = 2000;
interface HopData {
    pastLocations: Vector3[];
    flagAmount: number;
    lastFlagTimestamp: number;
}
const hopData = new Map<string, HopData>();
let eventId: IntegratedSystemEvent;
const hop = new Module()
    .addCategory("detection")
    .setName(rawtextTranslate("module.hop.name"))
    .setDescription(rawtextTranslate("module.hop.description"))
    .setToggleId("antiHop")
    .setPunishment("tempKick")
    .onModuleEnable(() => {
        eventId = Module.subscribePlayerTickEvent(tickEvent, false);
    })
    .onModuleDisable(() => {
        Module.clearPlayerTickEvent(eventId);
        hopData.clear();
    })
    .initPlayer((playerId, player) => {
        hopData.set(playerId, {
            pastLocations: new Array(5).fill(player.location),
            flagAmount: 0,
            lastFlagTimestamp: 0,
        });
    })
    .initClear((playerId) => {
        hopData.delete(playerId);
    });
hop.register();
/**
 * @author jasonlaubb
 * @description Checks if the player is keep changing the velocity direction (within a very short period) which is impossible.
 * Works by taking the average of the last 5 locations and comparing it to the current location.
 */
function tickEvent(player: Player) {
    const data = hopData.get(player.id)!;
    data.pastLocations.push(player.location);
    data.pastLocations.shift();
    const pastLocations = data.pastLocations;
    // Calculate the smooth and actual speed by block per tick.
    const smoothDeltaX = fastTotalDelta(...pastLocations.map((location) => location.x)) / 5;
    const smoothDeltaZ = fastTotalDelta(...pastLocations.map((location) => location.z)) / 5;
    // Straight line speed
    const actualDeltaX = player.location.x - pastLocations[0].x;
    const actualDeltaZ = player.location.z - pastLocations[0].z;
    const deviation = pythag(actualDeltaX - smoothDeltaX, actualDeltaZ - smoothDeltaZ);
    const now = Date.now();
    if (deviation > MAX_DEVIATION && deviation < SPIKE_LIKE_LIMIT && !player.isFlying && !player.isGliding && now - player.timeStamp.knockBack > 1500 && now - player.timeStamp.riptide > 5000) {
        if (now - data.lastFlagTimestamp > MAX_FLAG_INTERVAL) {
            data.flagAmount = 0;
        }
        data.lastFlagTimestamp = now;
        data.flagAmount++;
        if (data.flagAmount >= MAX_FLAG_AMOUNT) {
            player.teleport(pastLocations[0]);
            player.flag(hop, { deviation });
        }
    }
    hopData.set(player.id, data);
}