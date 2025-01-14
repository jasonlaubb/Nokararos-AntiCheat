import { EntityHitEntityAfterEvent, Player, Vector2, world } from "@minecraft/server";
import { IntegratedSystemEvent, Module } from "../../matrixAPI";
import { rawtextTranslate } from "../../util/rawtext";
import { calculateAngleFromView, calculateDistance, fastAbs, fastRound } from "../../util/fastmath";
import { getAngleLimit } from "../../util/util";
const KILLAURA_DISTANCE_THRESHOLD = 3.5;
const KILLAURA_PVP_DISTANCE_THRESHOLD = 4.5;
const KILLAURA_ROTATION_THRESHOLD = 89;
const MIN_ROUND_DIFFERENCE = 0.07;

let eventId: IntegratedSystemEvent;
const killaura = new Module()
    .addCategory("detection")
    .setName(rawtextTranslate("module.killaura.name"))
    .setDescription(rawtextTranslate("module.killaura.description"))
    .setToggleId("antiKillAura")
    .setPunishment("ban")
    .onModuleEnable(() => {
        world.afterEvents.entityHitEntity.subscribe(entityHitEntity);
        eventId = Module.subscribePlayerTickEvent(tickEvent);
    })
    .onModuleDisable(() => {
        killauraData.clear();
        world.afterEvents.entityHitEntity.unsubscribe(entityHitEntity);
        Module.clearPlayerTickEvent(eventId);
    })
    .initPlayer((playerId, player) => {
        killauraData.set(playerId, {
            entityHurtList: [],
            roundFlagAmount: 0,
            lastAttackRot: player.getRotation(),
            lastRoundTimestamp: 0,
            lastIntegerTimestamp: 0,
            integerFlagAmount: 0,
        });
    })
    .initClear((playerId) => {
        killauraData.delete(playerId);
    });

killaura.register();
interface killAuraData {
    entityHurtList: string[];
    roundFlagAmount: number;
    lastAttackRot: Vector2;
    lastRoundTimestamp: number;
    lastIntegerTimestamp: number;
    integerFlagAmount: number;
}
const killauraData = new Map<string, killAuraData>();

/**
 * @author jasonlaubb
 * @description The basic killaura detection module.
 */
function entityHitEntity({ damagingEntity: player, hitEntity: target }: EntityHitEntityAfterEvent) {
    if (!(player instanceof Player) || player.isAdmin()) return;
    if (target.id === player.id) {
        player.flag(killaura, { t: "1" });
        return;
    }

    const distance = calculateDistance(player.location, target.location);
    const isPvp = target instanceof Player;
    const { x: pitch, y: yaw } = player.getRotation();

    if (isPvp && distance > KILLAURA_PVP_DISTANCE_THRESHOLD && fastAbs(yaw) > KILLAURA_ROTATION_THRESHOLD) {
        player.flag(killaura, { t: "2", distance, yaw });
        return;
    }
    const data = killauraData.get(player.id)!;
    if (distance > KILLAURA_DISTANCE_THRESHOLD && isPvp) {
        const angle = calculateAngleFromView(player.location, target.location, yaw);
        const angleLimit = getAngleLimit(player.clientSystemInfo.platformType);
        if (angle > angleLimit) {
            const now = Date.now();
            if (now - data.lastIntegerTimestamp > 5000) {
                data.integerFlagAmount = 0;
            }
            data.integerFlagAmount++;
            if (data.integerFlagAmount >= 5) {
                player.flag(killaura, { t: "3", angle, angleLimit });
            }
        }
    }
    if (!data.entityHurtList.includes(target.id)) data.entityHurtList.push(target.id);
    if (data.entityHurtList.length >= 3) {
        player.flag(killaura, { t: "4" });
    }
    // Checks if the player has integer pitch or yaw.
    const isNotTeleportYaw = yaw != 0;
    const isNotTeleportPitch = pitch != 0;
    if ((Number.isInteger(pitch) && isNotTeleportPitch) || (Number.isInteger(yaw) && isNotTeleportYaw) && (data.lastAttackRot.x != pitch || data.lastAttackRot.y != yaw)) {
        const now = Date.now();
        if (now - data.lastIntegerTimestamp > 3000) {
            data.integerFlagAmount = 0;
        }
        data.integerFlagAmount++;
        data.lastIntegerTimestamp = now;
        if (data.integerFlagAmount >= 3) {
            player.flag(killaura, { t: "5", pitch, yaw });
        }
    } else {
        const intRot = fastRound(yaw);
        const intPitch = fastRound(pitch);
        const yawDifferent = fastAbs(yaw - intRot);
        const pitchDifferent = fastAbs(pitch - intPitch);
        if ((data.lastAttackRot.x != pitch && data.lastAttackRot.y != yaw && yawDifferent < MIN_ROUND_DIFFERENCE && isNotTeleportYaw) || (pitchDifferent < MIN_ROUND_DIFFERENCE && isNotTeleportPitch)) {
            const now = Date.now();
            if (now - data.lastRoundTimestamp > 2000) {
                data.roundFlagAmount = 0;
            }
            data.roundFlagAmount++;
            data.lastRoundTimestamp = now;
            if (data.roundFlagAmount >= 8) {
                player.flag(killaura, { t: "6", yawDifferent, pitchDifferent });
            }
        }
    }
    data.lastAttackRot = { x: pitch, y: yaw } as Vector2;
    killauraData.set(player.id, data);
}

function tickEvent(player: Player) {
    const data = killauraData.get(player.id)!;
    data.entityHurtList = [];
    killauraData.set(player.id, data);
}
