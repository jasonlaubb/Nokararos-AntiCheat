import { EquipmentSlot, GameMode, Player, system, Vector3 } from "@minecraft/server";
import { IntegratedSystemEvent, Module } from "../../matrixAPI";
import { rawtextTranslate } from "../../util/rawtext";
import { isSurroundedByAir } from "../../util/util";
import { MinecraftEffectTypes, MinecraftItemTypes } from "../../node_modules/@minecraft/vanilla-data/lib/index";
const MAX_VELOCITY_Y = 0.7;
const MIN_REQUIRED_REPEAT_AMOUNT = 6;
const HIGH_VELOCITY_Y = 22;
const MAX_BDS_PREDICTION = 20;
const START_SKIP_CHECK = 15000;
interface FlyData {
    previousVelocityY: number;
    lastVelocityY: number;
    lastOnGroundLocation: Vector3;
    lastFlaggedLocation: Vector3;
    velocityYList: number[];
    flagAmount: number;
    lastFlagTimestamp: number;
    hasStarted: number;
}
const flyData = new Map<string, FlyData>();
let eventId: IntegratedSystemEvent;
const fly = new Module()
    .addCategory("detection")
    .setName(rawtextTranslate("module.fly.name"))
    .setDescription(rawtextTranslate("module.fly.description"))
    .setToggleId("antiFly")
    .setPunishment("ban")
    .onModuleEnable(() => {
        eventId = Module.subscribePlayerTickEvent(tickEvent, false);
    })
    .onModuleDisable(() => {
        Module.clearPlayerTickEvent(eventId);
        flyData.clear();
    })
    .initPlayer((playerId, player) => {
        flyData.set(playerId, {
            lastVelocityY: 0,
            lastOnGroundLocation: player.location,
            velocityYList: [],
            lastFlaggedLocation: player.location,
            flagAmount: 0,
            lastFlagTimestamp: 0,
            hasStarted: Date.now(),
            previousVelocityY: 0,
        });
    })
    .initClear((playerId) => {
        flyData.delete(playerId);
    });
fly.register();
/**
 * @author jasonlaubb
 * @description Anti Fly.
 */
function tickEvent(player: Player) {
    const now = Date.now();
    const data = flyData.get(player.id)!;
    const { y: velocityY } = player.getVelocity();
    const surroundAir = !player.isOnGround && isSurroundedByAir(player.location, player.dimension);
    const playerStarted = now - data.hasStarted > START_SKIP_CHECK;
    const isPlayerNotCreative = player.getGameMode() !== GameMode.creative;
    const pistonNotPushed = now - player.timeStamp.pistonPush > 4000;
    if (player.isOnGround && velocityY === 0) {
        data.lastOnGroundLocation = player.location;
    } else if (
        playerStarted &&
        pistonNotPushed &&
        now - player.timeStamp.knockBack > 2000 &&
        now - player.timeStamp.riptide > 5000 &&
        (data.lastVelocityY < 0 || (data.previousVelocityY < 0 && velocityY === 0)) &&
        !player.hasTag("riding") &&
        !player.isFlying &&
        !player.isGliding &&
        !player.isInWater &&
        isPlayerNotCreative &&
        !data.velocityYList.some((yV) => yV == HIGH_VELOCITY_Y)
    ) {
        if (velocityY > MAX_VELOCITY_Y) {
            if (surroundAir) {
                data.flagAmount++;
            } else {
                data.flagAmount += 0.5;
            }
            player.sendMessage(`(+) increased to ${data.flagAmount + 1}`);
            data.lastFlagTimestamp = now;
            if (data.flagAmount >= 3) {
                data.flagAmount = 0;
                player.teleport(data.lastOnGroundLocation);
                player.flag(fly, { t: "1", lastVelocityY: data.lastVelocityY, velocityY });
            }
        }
    }
    if (data.flagAmount > 0 && now - data.lastFlagTimestamp > 1200) {
        data.flagAmount -= 0.1;
        player.sendMessage(`decrease to ${data.flagAmount}`);
    };;
    player.onScreenDisplay.setActionBar(`${velocityY.toFixed(4)} | ${data.flagAmount.toFixed(1)}`);
    if (pistonNotPushed && playerStarted && velocityY > HIGH_VELOCITY_Y && now - player.timeStamp.knockBack > 2000 && !player.isGliding) {
        player.teleport(data.lastOnGroundLocation);
        player.flag(fly, { t: "2", velocityY });
    }
    if (pistonNotPushed && playerStarted && velocityY > 0.7) {
    }
    if (player.isFlying) {
        data.velocityYList.push(HIGH_VELOCITY_Y);
    } else {
        data.velocityYList.push(velocityY);
    }
    if (data.velocityYList.length > 60) data.velocityYList.shift();
    const minAmount = Math.min(...data.velocityYList);
    const maxAmount = Math.max(...data.velocityYList);
    const bdsPrediction = calculateBdsPrediction(data.velocityYList);
    if (pistonNotPushed && !player.hasTag("riding") && playerStarted && isPlayerNotCreative && !player.isOnGround && data.velocityYList.length >= 60 && !player.getEffect(MinecraftEffectTypes.JumpBoost) && bdsPrediction >= MAX_BDS_PREDICTION) {
        const { highestRepeatedVelocity, highestRepeatedAmount } = repeatChecks(data.velocityYList);
        if (highestRepeatedAmount >= MIN_REQUIRED_REPEAT_AMOUNT && highestRepeatedVelocity > MAX_VELOCITY_Y && minAmount <= -MAX_VELOCITY_Y && maxAmount < HIGH_VELOCITY_Y) {
            player.teleport(data.lastOnGroundLocation);
            player.flag(fly, { t: "3", bdsPrediction, highestRepeatedVelocity, highestRepeatedAmount, minAmount, maxAmount });
        }
    }
    if (playerStarted && player.isGliding && !isEquippedWithElytra(player) && !player.hasTag("matrix:checkingGlideTag") && JSON.stringify(player.location) != JSON.stringify(data.lastFlaggedLocation)) {
        player.addTag("matrix:checkingGlideTag");
        system.run(() => {
            player.removeTag("matrix:checkingGlideTag");
            if (!player.isGliding || isEquippedWithElytra(player)) return;
            player.teleport(data.lastFlaggedLocation);
            player.flag(fly, { t: "4" });
        });
        data.lastFlaggedLocation = player.location;
    }
    data.previousVelocityY = data.lastVelocityY;
    data.lastVelocityY = velocityY;
    flyData.set(player.id, data);
}

function repeatChecks(list: number[]) {
    const map = new Map<number, number>();
    let highestRepeatedVelocity = 0;
    let highestRepeatedAmount = 0;
    for (const velocityY of list) {
        if (velocityY == 0) continue;
        map.set(velocityY, (map.get(velocityY) ?? 0) + 1);
        if (map.get(velocityY)! > highestRepeatedAmount) {
            highestRepeatedVelocity = velocityY;
            highestRepeatedAmount = map.get(velocityY)!;
        }
    }
    return { highestRepeatedVelocity, highestRepeatedAmount };
}
function calculateBdsPrediction(list: number[]) {
    return list.reduce((yV) => {
        return yV < -MAX_VELOCITY_Y ? 1 : yV > MAX_VELOCITY_Y ? 1 : -1;
    });
}
function isEquippedWithElytra(player: Player) {
    return !!player.getComponent("equippable")?.getEquipmentSlot(EquipmentSlot.Chest)?.getItem()?.matches(MinecraftItemTypes.Elytra);
}
