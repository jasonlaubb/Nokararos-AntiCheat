import { Player, Vector3 } from "@minecraft/server";
import { IntegratedSystemEvent, Module } from "../../matrixAPI";
import { rawtextTranslate } from "../../util/rawtext";
import { fastAbs } from "../../util/fastmath";
import { TickData } from "../import";
const MIN_SPEED = 0.25;
const MAX_SPEED = 0.7;
let eventId: IntegratedSystemEvent;
const antiPhase = new Module()
    .addCategory("detection")
    .setName(rawtextTranslate("module.phase.name"))
    .setDescription(rawtextTranslate("module.phase.description"))
    .setToggleId("antiPhase")
    .setPunishment("ban")
    .initPlayer((tickData, _playerId, player) => {
        tickData.phase = {
            lastLocationList: [player.location, player.location, player.location],
            lastSpeedList: [0, 0, 0],
        };
        return tickData;
    })
    .onModuleEnable(() => {
        eventId = Module.subscribePlayerTickEvent(tickEvent, false);
    })
    .onModuleDisable(() => {
        Module.clearPlayerTickEvent(eventId);
    });

antiPhase.register();

/**
 * @author jasonlaubb
 * @description The horizontal phase detection system, used the property of bds prediction to have the accurate flag.
 */
function tickEvent(tickData: TickData, player: Player) {
    const data = tickData.phase;
    const { y } = tickData.instant.velocity;
    const currentSpeed = tickData.instant.speedXZ;

    const clipStartLocation = calculateClipStartLocation(data.lastSpeedList, data.lastLocationList, currentSpeed);

    if (clipStartLocation && Date.now() - player.timeStamp.knockBack > 3500 && !player.isFlying && Math.abs(y) < MAX_SPEED) {
        const blockLocations = straightLocations(clipStartLocation, player.location);
        let containsSolid = undefined;
        try {
            containsSolid = blockLocations.map((block) => player.dimension.getBlock(block)).find((block) => block?.isSolid);
        } catch {}
        if (containsSolid) {
            player.teleport(clipStartLocation);
            player.flag(antiPhase, { passedBlock: containsSolid.typeId });
        }
    }

    // Update data value.
    data.lastLocationList.unshift(player.location);
    data.lastLocationList.pop();
    data.lastSpeedList.unshift(currentSpeed);
    data.lastSpeedList.pop();
    tickData.phase = data;
    return tickData;
}

function calculateClipStartLocation(speed: number[], loc: Vector3[], currentSpeed: number): Vector3 | undefined {
    if (speed[0] < MIN_SPEED && speed[0] > MAX_SPEED && currentSpeed < MIN_SPEED) {
        return loc[1];
    } else if (speed[2] < MIN_SPEED && speed[1] > MAX_SPEED && speed[0] === speed[1] && currentSpeed < MIN_SPEED) {
        return loc[2];
    }
    return undefined;
}

function straightLocations(start: Vector3, end: Vector3): Vector3[] {
    const blockLocations: Vector3[] = [];
    const { x: startX, z: startZ } = start;
    const { x: endX, y, z: endZ } = end;

    const dx = endX - startX;
    const dz = endZ - startZ;

    const stepsX = fastAbs(dx);
    const stepsZ = fastAbs(dz);

    const steps = Math.max(stepsX, stepsZ);

    const xIncrement = stepsX === 0 ? 0 : dx / steps;
    const zIncrement = stepsZ === 0 ? 0 : dz / steps;

    for (let i = 1; i < steps; i++) {
        blockLocations.push({
            x: Math.floor(startX + xIncrement * i),
            z: Math.floor(startZ + zIncrement * i),
            y: y,
        });
    }

    return blockLocations;
}
