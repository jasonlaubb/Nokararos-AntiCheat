import { Dimension, EntityHitEntityAfterEvent, EquipmentSlot, GameMode, Player, ScriptEventCommandMessageAfterEvent, system, Vector3, world } from "@minecraft/server";
import { IntegratedSystemEvent, Module } from "../../matrixAPI";
import { pythag } from "../../util/fastmath";
import { MinecraftEffectTypes, MinecraftEnchantmentTypes } from "../../node_modules/@minecraft/vanilla-data/lib/index";
import { rawtextTranslate } from "../../util/rawtext";
import { TickData } from "../import";
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
    })
    .initPlayer((tickData, _playerId, player) => {
        tickData.speed = {
            lastAttackTimestamp: 0,
            lastRidingEndTimestamp: 0,
            flagAmount: 0,
            lastFlagTimestamp: 0,
            lastStopLocation: player.location,
            lastSleep: 0,
            previousSpeed: new Array(20).fill(0),
            timerFlagAmount: 0,
            lastTriggerLocation: player.location,
            lastTimerFlagTimestamp: 0,
            timerMainFlagAmount: 0,
        };
        return tickData;
    });
speed.register();
const VELOCITY_DELTA_THRESHOLD = 0.7;
const FLAG_TIMESTAMP_THRESHOLD = 8000;
const SMALL_MAX_FLAG = 15;
/**
 * @author jasonlaubb, RamiGamerDev
 * @description A very simple but strong system against all speed hacks.
 */
function tickEvent(tickData: TickData, player: Player) {
    const data = tickData.speed;
    const now = Date.now();
    const velocity = tickData.instant.velocity;
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
    const distance = pythag(player.location.x - tickData.global.lastLocation.x, player.location.z - tickData.global.lastLocation.z);
    if (!bypass) {
        const velocityDelta = pythag(velocityX - tickData.global.lastVelocity.x, velocityZ - tickData.global.lastVelocity.z);
        const debugTag = player.hasTag("matrix:speed-debug");
        if (velocityDelta > VELOCITY_DELTA_THRESHOLD) {
            if (now - data.lastFlagTimestamp > FLAG_TIMESTAMP_THRESHOLD) {
                data.flagAmount = 0;
            }
            data.lastFlagTimestamp = now;
            data.flagAmount++;
            if (data.flagAmount > Module.config.sensitivity.antiSpeed.type1MaxFlag) {
                player.flag(speed, { t: "1", velocityDelta });
                data.flagAmount = 0;
            }
            if (velocityDelta >= 3 && Module.config.sensitivity.antiSpeed.correctSpikeDelta) {
                player.teleport(data.lastStopLocation);
            }
        } else if (distance > 0.2 && !player.isInWater && !player.isSwimming && !data.previousSpeed.includes(distance)) {
            const velocitySpeed = tickData.global.lastSpeedXZ;
            const normalDistance = distance * Module.config.sensitivity.antiSpeed.maxVelocityExaggeration;
            if (distance > VELOCITY_DELTA_THRESHOLD && !isSwiftSneak(player) && player.isSprinting ? normalDistance * 0.7 : normalDistance > velocitySpeed * 1.2 ** speedLevel) {
                if (data.timerFlagAmount < 1) {
                    data.lastTriggerLocation = player.location;
                }
                data.timerFlagAmount += 1;
                if (debugTag) player.sendMessage(`<speedDebug> §a(+) increased to ${data.timerFlagAmount}, distance: ${normalDistance.toFixed(6)}, velocitySpeed: ${velocitySpeed.toFixed(6)}`);
                if (data.timerFlagAmount > SMALL_MAX_FLAG) {
                    player.teleport(data.lastTriggerLocation);
                    data.timerFlagAmount = 0;
                    if (now - data.lastTimerFlagTimestamp > 12000) {
                        data.timerMainFlagAmount = 0;
                    }
                    data.lastTimerFlagTimestamp = now;
                    if (data.timerMainFlagAmount > Module.config.sensitivity.antiSpeed.type2MaxFlag) {
                        player.flag(speed, { t: "2", normalDistance, velocitySpeed });
                    }
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
    // Update data value.
    tickData.speed = data;
    return tickData;
}
function onPlayerAttack({ damagingEntity: player }: EntityHitEntityAfterEvent) {
    if (!(player instanceof Player)) return;
    const data = Module.tickData.get(player.id)!;
    data.speed.lastAttackTimestamp = Date.now();
    Module.tickData.set(player.id, data);
}
function onRidingEnded({ id, sourceEntity: player }: ScriptEventCommandMessageAfterEvent) {
    if (id != "matrix:ridingEnded" || !player || !(player instanceof Player)) return;
    const data = Module.tickData.get(player.id)!;
    data.speed.lastRidingEndTimestamp = Date.now();
    Module.tickData.set(player.id, data);
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
function isSwiftSneak(player: Player) {
    if (!player.isSneaking) return false;
    const leg = player.getComponent("equippable")!.getEquipmentSlot(EquipmentSlot.Legs).getItem();
    if (!leg) return false;
    if (leg.typeId.endsWith("leggings") && leg.typeId.startsWith("minecraft:")) {
        const enchantment = leg.getComponent("enchantable");
        if (enchantment) {
            return enchantment.hasEnchantment(MinecraftEnchantmentTypes.SwiftSneak);
        }
    }
    return false;
}
