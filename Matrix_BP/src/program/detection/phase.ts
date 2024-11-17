import { Player, Vector3 } from "@minecraft/server";
import { IntegratedSystemEvent, Module } from "../../matrixAPI";
import { rawtextTranslate } from "../../util/rawtext";

const MIN_SPEED = 0.25;
const MAX_SPEED = 0.7;

let eventId: IntegratedSystemEvent;

interface PhaseDataMap {
    lastLocationList: Vector3[];
    lastSpeedList: number[];
}

const phaseDataMap = new Map<string, PhaseDataMap>();

const antiPhase = new Module()
    .addCategory("detection")
    .setName(rawtextTranslate("module.phase.name"))
    .setDescription(rawtextTranslate("module.phase.description"))
    .setToggleId("antiPhase")
    .setPunishment("ban")
    .initPlayer((playerId, player) => {
        phaseDataMap.set(playerId, {
            lastLocationList: [
                player.location,
                player.location,
                player.location
            ],
            lastSpeedList: [0, 0, 0]
        });
    })
    .initClear((playerId) => {
        phaseDataMap.delete(playerId);
    })
    .onModuleEnable(() => {
        eventId = Module.subscribePlayerTickEvent(tickEvent, false);
    })
    .onModuleDisable(() => {
        Module.clearPlayerTickEvent(eventId);
        phaseDataMap.clear();
    });

antiPhase.register();

/**
 * @author jasonlaubb
 * @description The horizontal phase detection system, used the property of bds prediction to have the accurate flag.
 */
function tickEvent(player: Player) {
    const data = phaseDataMap.get(player.id)!;
    const { x, y, z } = player.getVelocity();
    const currentSpeed = Math.hypot(x, z);
    
    const clipStartLocation = calculateClipStartLocation(data, currentSpeed);

    if (clipStartLocation && Math.abs(y) < MAX_SPEED) {
        const blockLocations = straightLocations(clipStartLocation, player.location);
        if (blockLocations.some((block) => {
            try {
                return player.dimension.getBlock(block)?.isSolid;
            } catch {
                return false;
            }
        })) {
            player.teleport(clipStartLocation);
            player.flag(antiPhase);
        }
    }

    // Update data value.
    data.lastLocationList = [player.location, ...data.lastLocationList.slice(0, 2)];
    data.lastSpeedList = [currentSpeed, ...data.lastSpeedList.slice(0, 2)];
    phaseDataMap.set(player.id, data);
}

function calculateClipStartLocation(data: PhaseDataMap, currentSpeed: number): Vector3 | undefined {
    if (data.lastSpeedList[1] < MIN_SPEED && data.lastSpeedList[0] > MAX_SPEED && currentSpeed < MIN_SPEED && data.lastSpeedList[1] == currentSpeed) {
        return data.lastLocationList[1];
    } else if (data.lastSpeedList[2] < MIN_SPEED && data.lastSpeedList[1] > MAX_SPEED && data.lastSpeedList[0] == data.lastSpeedList[1] && currentSpeed < MIN_SPEED) {
        return data.lastLocationList[2];
    }
    return undefined;
}

function straightLocations(start: Vector3, end: Vector3): Vector3[] {
    const blockLocations: Vector3[] = [];
    const { x: startX, z: startZ } = start;
    const { x: endX, y, z: endZ } = end;

    const dx = endX - startX;
    const dz = endZ - startZ;

    const stepsX = Math.abs(dx);
    const stepsZ = Math.abs(dz);

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
