import { Dimension, EntityHitEntityAfterEvent, GameMode, Player, ScriptEventCommandMessageAfterEvent, system, Vector3, world } from "@minecraft/server";
import { IntegratedSystemEvent, Module } from "../../matrixAPI";
import { pythag } from "../../util/fastmath";
import { MinecraftEffectTypes } from "../../node_modules/@minecraft/vanilla-data/lib/index";
import { rawtextTranslate } from "../../util/rawtext";
interface SpeedData {
    lastAttackTimestamp: number;
    lastRidingEndTimestamp: number;
    flagAmount: number;
    lastFlagTimestamp: number;
    lastStopLocation: Vector3;
    lastSleep: number;
    lastVelocity: Vector3;
    previousSpeed: number[];
    lastLocation: Vector3;
    timerFlagAmount: number;
}
let eventId: IntegratedSystemEvent;
const speed = new Module()
    .setName(rawtextTranslate("module.speed.name"))
    .setDescription(rawtextTranslate("module.speed.description"))
    .setToggleId("antiSpeed")
    .setPunishment("ban")
    .onModuleEnable(() => {
        world.afterEvents.entityHitEntity.subscribe(onPlayerAttack);
        system.afterEvents.scriptEventReceive.subscribe(onRidingEnded);
        eventId = Module.subscribePlayerTickEvent(tickEvent, false);
    })
    .onModuleDisable(() => {
        world.afterEvents.entityHitEntity.unsubscribe(onPlayerAttack);
        system.afterEvents.scriptEventReceive.unsubscribe(onRidingEnded);
        Module.clearPlayerTickEvent(eventId);
        speedData.clear();
    })
    .initPlayer((playerId, player) => {
        speedData.set(playerId, {
            lastAttackTimestamp: 0,
            lastRidingEndTimestamp: 0,
            flagAmount: 0,
            lastFlagTimestamp: 0,
            lastStopLocation: player.location,
            lastSleep: 0,
            lastVelocity: player.getVelocity(),
            previousSpeed: new Array(20).fill(0),
            lastLocation: player.location,
            timerFlagAmount: 0,
        });
    })
    .initClear((playerId) => {
        speedData.delete(playerId);
    });
speed.register();
const speedData = new Map<string, SpeedData>();
const VELOCITY_DELTA_THRESHOLD = 0.7;
const FLAG_TIMESTAMP_THRESHOLD = 8000;
/**
 * @author jasonlaubb, RamiGamerDev
 * @description A very simple but strong system against all speed hacks.
 */
function tickEvent(player: Player) {
    const data = speedData.get(player.id)!;
    const now = Date.now();
    const velocity = player.getVelocity();
    const { x: velocityX, y: velocityY, z: velocityZ } = velocity;
    if (velocityX === 0 && velocityY === 0 && velocityZ === 0) {
        data.lastStopLocation = player.location;
    }
    if (player.isSleeping || player.isFlying || player.isGliding || player.isRiding()) {
        data.lastSleep = now;
    }
    const speedLevel = (player.getEffect(MinecraftEffectTypes.Speed)?.amplifier ?? -1) + 1;
    const bypass =
        player.isFlying ||
        now - data.lastFlagTimestamp < 250 ||
        now - player.timeStamp.knockBack < 1500 ||
        now - player.timeStamp.riptide < 5000 ||
        now - data.lastAttackTimestamp < 1000 ||
        now - data.lastRidingEndTimestamp < 500 ||
        now - data.lastFlagTimestamp < 250 ||
        player.getGameMode() === GameMode.creative ||
        player.isSleeping ||
        now - data.lastSleep < 1000 ||
        player.isRiding() ||
        speedLevel > 3 ||
        isPlayerInSolid(player.location, player.getHeadLocation(), player.dimension);
    const distance = pythag(player.location.x - data.lastLocation.x, player.location.z - data.lastLocation.z);
    if (!bypass) {
        const velocityDelta = pythag(velocityX - data.lastVelocity.x, velocityZ - data.lastVelocity.z);
        const debugTag = player.hasTag("matrix:speed-debug");
        if (velocityDelta > VELOCITY_DELTA_THRESHOLD) {
            if (now - data.lastFlagTimestamp > FLAG_TIMESTAMP_THRESHOLD) {
                data.flagAmount = 0;
            }
            data.lastFlagTimestamp = now;
            data.flagAmount++;
            if (data.flagAmount >= 12) {
                player.flag(speed, { t: "1", velocityDelta });
                data.flagAmount = 0;
            }
            if (velocityDelta >= 3 || Module.config.sensitivity.strengthenAntiSpeed) {
                if (velocityDelta < 3) player.sendMessage(`§7(Strengthen Anti Speed) §cAuto corrected your location. To disable (staff only): "-set sensitivity.strengthenAntiSpeed false"`);
                player.teleport(data.lastStopLocation);
            }
        } else if (distance > 0.2 && !player.isInWater && !player.isSwimming && !data.previousSpeed.includes(distance)) {
            const velocitySpeed = pythag(data.lastVelocity.x, data.lastVelocity.z);
            const normalDistance = distance * Module.config.sensitivity.maxVelocityExaggeration;
            if (distance > VELOCITY_DELTA_THRESHOLD && player.isSprinting ? normalDistance * 0.7 : normalDistance > velocitySpeed * 1.2 ** speedLevel) {
                data.timerFlagAmount += 1;
                if (debugTag) player.sendMessage(`<speedDebug> §a(+) increased to ${data.timerFlagAmount}, distance: ${normalDistance.toFixed(6)}, velocitySpeed: ${velocitySpeed.toFixed(6)}`);
                if (data.timerFlagAmount >= 16) {
                    player.flag(speed, { t: "2", normalDistance, velocitySpeed });
                    data.timerFlagAmount = 0;
                }
            } else if (data.timerFlagAmount >= 0.15) {
                if (debugTag) player.sendMessage(`<speedDebug> §c(-) decreased to ${data.timerFlagAmount}`);
                data.timerFlagAmount -= 0.15;
            }
        } else if (data.timerFlagAmount >= 0.1) {
            if (debugTag) player.sendMessage(`<speedDebug> §c(-) decreased to ${data.timerFlagAmount}`);
            data.timerFlagAmount -= 0.1;
        }
    }
    data.previousSpeed.push(distance);
    data.previousSpeed.shift();
    data.lastLocation = player.location;
    data.lastVelocity = velocity;
    // Update data value.
    speedData.set(player.id, data);
}
function onPlayerAttack({ damagingEntity: player }: EntityHitEntityAfterEvent) {
    if (!(player instanceof Player)) return;
    const data = speedData.get(player.id)!;
    data.lastAttackTimestamp = Date.now();
    speedData.set(player.id, data);
}
function onRidingEnded({ id, sourceEntity: player }: ScriptEventCommandMessageAfterEvent) {
    if (id != "matrix:ridingEnded" || !player || !(player instanceof Player)) return;
    const data = speedData.get(player.id)!;
    data.lastRidingEndTimestamp = Date.now();
    speedData.set(player.id, data);
}
function isPlayerInSolid(location: Vector3, headLocation: Vector3, dimension: Dimension) {
    try {
        const isBodyInSolid = dimension.getBlock(location)?.isSolid;
        const isHeadInSolid = dimension.getBlock(headLocation)?.isSolid;
        return isBodyInSolid || isHeadInSolid;
    } catch {
        return false;
    }
}
