import { EntityHitEntityAfterEvent, Player, Vector3, system, world } from "@minecraft/server";
import { fastCos, fastHypot, fastAbs } from "../../util/fastmath";
import { Module } from "../../matrixAPI";
import { rawtextTranslate } from "../../util/rawtext";
const reach = new Module()
    .addCategory("detection")
    .setName(rawtextTranslate("module.reach.name"))
    .setDescription(rawtextTranslate("module.reach.description"))
    .setToggleId("antiReach")
    .setPunishment("kick")
    .onModuleEnable(() => {
        world.afterEvents.entityHitEntity.subscribe(onEntityAttack);
    })
    .onModuleDisable(() => {
        locationTrackData = {};
        world.afterEvents.entityHitEntity.unsubscribe(onEntityAttack);
    })
    .initPlayer((tickData, playerId) => {
        locationTrackData[playerId] = {
            locationData: [],
            lastValidTimeStamp: 0,
            buffer: 0,
            lastFlag: 0,
        };
        return tickData;
    })
    .initClear((playerId) => {
        delete locationTrackData[playerId];
    });
reach.register();
const MAX_ROTATION = 79;
const TRACK_DURATION = 5000;
interface TrackData {
    locationData: Vector3[];
    lastValidTimeStamp: number;
    buffer: number;
    lastFlag: number;
}
let locationTrackData: { [key: string]: TrackData } = {};
/**
 * @author jasonlaubb
 * @description The reach detection module.
 */
function onEntityAttack({ damagingEntity: player, hitEntity: target }: EntityHitEntityAfterEvent) {
    if (!(player instanceof Player) || player.isAdmin() || !(target instanceof Player)) return;
    const playerLocationData = locationTrackData[player.id]!;
    const targetLocationData = locationTrackData[target.id]!;
    const now = Date.now();
    const playerTrackInvalid = now - playerLocationData.lastValidTimeStamp > TRACK_DURATION;
    const targetTrackInvalid = now - targetLocationData.lastValidTimeStamp > TRACK_DURATION;
    if (playerTrackInvalid) {
        trackPlayer(player);
        locationTrackData[player.id].buffer = 0;
    }
    if (targetTrackInvalid) {
        trackPlayer(target);
    }
    locationTrackData[player.id].lastValidTimeStamp = now;
    locationTrackData[target.id].lastValidTimeStamp = now;
    if (targetTrackInvalid || playerTrackInvalid) return;
    const { x: pitch } = player.getRotation();
    if (fastAbs(pitch) < MAX_ROTATION && now - locationTrackData[player.id].lastFlag > 600) {
        const limit = calculateDistanceLimit(pitch);
        const distance = findMinimumDistance(playerLocationData.locationData, targetLocationData.locationData);
        if (distance > limit + Module.config.sensitivity.antiReach.reachBuffer && distance > 3.5) {
            const buffer = ++locationTrackData[player.id].buffer;
            if (buffer >= Module.config.sensitivity.antiReach.maxFlag) {
                locationTrackData[player.id].lastValidTimeStamp = 0;
                player.flag(reach, { distance, dynamicLimit: limit + Module.config.sensitivity.antiReach.reachBuffer });
            }
        }
    }
}
function trackPlayer(player: Player) {
    const runId = system.runInterval(() => {
        if (!player?.isValid()) {
            system.clearRun(runId);
            return;
        }
        const location = player.location;
        locationTrackData[player.id].locationData.push(location);
        if (locationTrackData[player.id].locationData.length >= 5) {
            locationTrackData[player.id].locationData.shift();
        }
        if (Date.now() - locationTrackData[player.id].lastValidTimeStamp > TRACK_DURATION) {
            system.clearRun(runId);
        }
    });
}
function findMinimumDistance(playerLoc: Vector3[], targetLoc: Vector3[]) {
    const playerX = playerLoc.map(({ x }) => x);
    const playerZ = playerLoc.map(({ z }) => z);
    const targetX = targetLoc.map(({ x }) => x);
    const targetZ = targetLoc.map(({ z }) => z);
    const xDifferences = playerX.map((x, i) => {
        return fastAbs(x - targetX[i]);
    });
    const zDifferences = playerZ.map((z, i) => {
        return fastAbs(z - targetZ[i]);
    });
    return fastHypot(Math.min(...xDifferences), Math.min(...zDifferences));
}
function calculateDistanceLimit(pitch: number) {
    return fastCos(fastAbs(pitch)) * Module.config.sensitivity.antiReach.maxReach;
}
