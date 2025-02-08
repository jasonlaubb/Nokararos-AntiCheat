import { EquipmentSlot, GameMode, Player, system } from "@minecraft/server";
import { IntegratedSystemEvent, Module } from "../../matrixAPI";
import { rawtextTranslate } from "../../util/rawtext";
import { isSurroundedByAir } from "../../util/util";
import { MinecraftEffectTypes, MinecraftItemTypes } from "../../node_modules/@minecraft/vanilla-data/lib/index";
import { fastAbs } from "../../util/fastmath";
import { TickData } from "../import";
const MAX_VELOCITY_Y = 0.7;
const MIN_REQUIRED_REPEAT_AMOUNT = 6;
const HIGH_VELOCITY_Y = 22;
const MAX_BDS_PREDICTION = 20;
const START_SKIP_CHECK = 6000;
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
    })
    .initPlayer((tickData, _playerId, player) => {
        tickData.fly = {
            lastOnGroundLocation: player.location,
            velocityYList: new Array(60).fill(0),
            lastFlaggedLocation: player.location,
            flagAmount: 0,
            lastFlagTimestamp: 0,
            hasStarted: Date.now(),
        };
        return tickData;
    });
fly.register();
/**
 * @author jasonlaubb
 * @description Anti Fly.
 */
function tickEvent(tickData: TickData, player: Player) {
    const hasFlyDebugTag = player.hasTag("matrix:flyDebug");
    const now = Date.now();
    const data = tickData.fly;
    const { y: velocityY } = tickData.instant.velocity;
    const surroundAir = !player.isOnGround && isSurroundedByAir(player.location, player.dimension);
    const playerStarted = now - data.hasStarted > START_SKIP_CHECK;
    const isPlayerNotCreative = player.getGameMode() !== GameMode.creative;
    const pistonNotPushed = now - player.timeStamp.pistonPush > 4000;
    const previousVelY = data.velocityYList[1];
    if (player.isOnGround && velocityY === 0) {
        data.lastOnGroundLocation = player.location;
    } else if (
        playerStarted &&
        pistonNotPushed &&
        now - player.timeStamp.knockBack > 2000 &&
        now - player.timeStamp.riptide > 5000 &&
        (previousVelY < 0 || (previousVelY < 0 && velocityY === 0) || (velocityY > 0 && previousVelY / velocityY > 4 && previousVelY > 2.5 && fastAbs(tickData.global.lastVelocity.y - velocityY) < 0.5)) &&
        !player.isRiding() &&
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
            if (hasFlyDebugTag) player.sendMessage(`<flyDebug> §a(+) increased to ${data.flagAmount}`);
            data.lastFlagTimestamp = now;
            if (data.flagAmount >= Module.config.sensitivity.antiFly.type1MaxFlag) {
                data.flagAmount = 0;
                player.teleport(data.lastOnGroundLocation);
                player.flag(fly, { t: "1", lastVelocityY: tickData.global.lastVelocity.y, velocityY });
            }
        }
    }
    if (data.flagAmount >= 0.05 && ((now - data.lastFlagTimestamp > 6000 && player.isOnGround) || (surroundAir && fastAbs(velocityY) < MAX_VELOCITY_Y && now - data.lastFlagTimestamp > 1200))) {
        data.flagAmount -= 0.05;
        if (hasFlyDebugTag) player.sendMessage(`<flyDebug> §c(-) decreased to ${data.flagAmount}`);
    }
    if (pistonNotPushed && playerStarted && velocityY > HIGH_VELOCITY_Y && now - player.timeStamp.knockBack > 2000 && !player.isGliding) {
        player.teleport(data.lastOnGroundLocation);
        player.flag(fly, { t: "2", velocityY });
    }
    if (player.isFlying) {
        data.velocityYList.unshift(HIGH_VELOCITY_Y);
    } else {
        data.velocityYList.unshift(velocityY);
    }
    data.velocityYList.pop();
    const minAmount = Math.min(...data.velocityYList);
    const maxAmount = Math.max(...data.velocityYList);
    const bdsPrediction = calculateBdsPrediction(data.velocityYList);
    if (pistonNotPushed && !player.isRiding() && playerStarted && isPlayerNotCreative && !player.isOnGround && data.velocityYList.length >= 60 && !player.getEffect(MinecraftEffectTypes.JumpBoost) && bdsPrediction >= MAX_BDS_PREDICTION) {
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
    tickData.fly = data;
    return tickData;
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
