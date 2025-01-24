import { EntityHitEntityAfterEvent, InputMode, Player, Vector2, world } from "@minecraft/server";
import { IntegratedSystemEvent, Module } from "../../matrixAPI";
import { rawtextTranslate } from "../../util/rawtext";
import { calculateAngleFromView, calculateDistance, fastAbs, fastRound, pythag } from "../../util/fastmath";
import { getAngleLimit } from "../../util/util";
import { getTotalAbsMovementVector } from "../../util/assets";
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
    .setPunishment("crash")
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
    const inputMode = player.inputInfo.lastInputModeUsed;
    if (isPvp && distance > KILLAURA_PVP_DISTANCE_THRESHOLD && fastAbs(pitch) > KILLAURA_ROTATION_THRESHOLD) {
        // No false positive maybe
        player.flag(killaura, { t: "2", distance, pitch });
        return;
    }
    const data = killauraData.get(player.id)!;
    const notKillAuraTag = inputMode === InputMode.Touch && pitch === data.lastAttackRot.x && yaw === data.lastAttackRot.y;
    if (!notKillAuraTag && distance > KILLAURA_DISTANCE_THRESHOLD && isPvp) {
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
    if (pitch % 1 === 0 && fastAbs(yaw - data.lastAttackRot.y) > 0) {
        const now = Date.now();
        if (now - data.lastIntegerTimestamp > 7000) {
            data.integerFlagAmount = 0;
        }
        data.integerFlagAmount++;
        if (data.integerFlagAmount > 3) {
            player.flag(killaura, { t: "5" });
        }
        data.lastIntegerTimestamp = now;
    }
    const { x, z } = target.getVelocity();
    const targetSpeed = pythag(x, z);
    const { x: x2, z: z2 } = player.getVelocity();
    if (targetSpeed > 0.01 || (isPvp && (x2 !== 0 || z2 !== 0) && getTotalAbsMovementVector(player) > 0)) {
        const intRot = fastRound(yaw);
        const intPitch = fastRound(pitch);
        const deltaIntYaw = fastAbs(yaw - intRot);
        const deltaIntPitch = fastAbs(pitch - intPitch);
        if (((data.lastAttackRot.x !== pitch || data.lastAttackRot.y !== yaw) && deltaIntYaw < MIN_ROUND_DIFFERENCE && yaw !== 0) || (deltaIntPitch < MIN_ROUND_DIFFERENCE && pitch !== 0)) {
            const now = Date.now();
            if (now - data.lastRoundTimestamp > 2000) {
                data.roundFlagAmount = 0;
            }
            data.roundFlagAmount++;
            data.lastRoundTimestamp = now;
            if (data.roundFlagAmount >= 8) {
                player.flag(killaura, { t: "6", deltaIntYaw, deltaIntPitch });
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
