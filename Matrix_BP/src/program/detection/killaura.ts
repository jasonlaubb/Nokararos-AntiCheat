import { EntityHitEntityAfterEvent, InputMode, Player, Vector2, world } from "@minecraft/server";
import { IntegratedSystemEvent, Module } from "../../matrixAPI";
import { rawtextTranslate } from "../../util/rawtext";
import { calculateAngleFromView, calculateDistance, fastAbs, fastRound, pythag } from "../../util/fastmath";
import { getAngleLimit } from "../../util/util";
import { getTotalAbsMovementVector } from "../../util/assets";
import { TickData } from "../import";
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
        world.afterEvents.entityHitEntity.unsubscribe(entityHitEntity);
        Module.clearPlayerTickEvent(eventId);
    })
    .initPlayer((tickData, _playerId, player) => {
        tickData.killaura = {
            roundFlagAmount: 0,
            lastAttackRot: player.getRotation(),
            lastRoundTimestamp: 0,
            lastIntegerTimestamp: 0,
            integerFlagAmount: 0,
        };
        return tickData;
    });

killaura.register();
/**
 * @author jasonlaubb
 * @description The basic killaura detection module.
 */
function entityHitEntity({ damagingEntity: player, hitEntity: target }: EntityHitEntityAfterEvent) {
    if (!(player instanceof Player) || player.isAdmin() || !target?.isValid()) return;
    if (target.id === player.id) {
        player.flag(killaura, { t: "1", playerId: player.id });
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
    const tickData = Module.tickData.get(player.id)!;
    const data = tickData.killaura!;
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
    if (!player.killAuraIdList.includes(target.id)) player.killAuraIdList.push(target.id);
    if (player.killAuraIdList.length >= 3) {
        player.flag(killaura, { t: "4" });
    }
    if (pitch % 1 === 0 && fastAbs(yaw - data.lastAttackRot.y) > 0) {
        const now = Date.now();
        if (now - data.lastIntegerTimestamp > 7000) {
            data.integerFlagAmount = 0;
        }
        data.integerFlagAmount++;
        if (data.integerFlagAmount > 3) {
            player.flag(killaura, { t: "5", yaw, pitch });
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
    tickData.killaura = data;
    Module.tickData.set(player.id, tickData);
}

function tickEvent(tickData: TickData, player: Player) {
    player.killAuraIdList = [];
    return tickData;
}
