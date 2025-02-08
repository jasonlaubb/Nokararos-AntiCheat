import { Player } from "@minecraft/server";
import { IntegratedSystemEvent, Module } from "../../matrixAPI";
import { rawtextTranslate } from "../../util/rawtext";
import { fastAbs } from "../../util/fastmath";
import { arrayToList, getAverageDifference, fastAverage, getStandardDeviation } from "../../util/assets";
import { TickData } from "../import";
const EMPTY_ARRAY = new Array(100).fill(0);
const SMALL_EMPTY_ARRAY = new Array(20).fill(0);
interface AimData {
    buffer: number[];
    initialize: {
        i: number;
        state: boolean;
    };
    previousYaw: number[];
    previousPitch: number[];
    previousDeltaYaw: number[];
    previousDeltaPitch: number[];
    yawAccelData: number[];
    pitchAccelData: number[];
    lastFlagTimestamp: number;
}
let eventId: IntegratedSystemEvent;
const aim = new Module()
    .addCategory("detection")
    .setName(rawtextTranslate("module.aim.name"))
    .setDescription(rawtextTranslate("module.aim.description"))
    .setToggleId("aimCheck")
    .setPunishment("kick")
    .onModuleEnable(() => {
        eventId = Module.subscribePlayerTickEvent(tickEvent, false);
    })
    .onModuleDisable(() => {
        Module.clearPlayerTickEvent(eventId);
    })
    .initPlayer((data) => {
        data.aim = {
            buffer: EMPTY_BUFFER,
            initialize: {
                i: 0,
                state: false,
            },
            previousYaw: EMPTY_ARRAY,
            previousPitch: EMPTY_ARRAY,
            previousDeltaYaw: EMPTY_ARRAY,
            previousDeltaPitch: EMPTY_ARRAY,
            yawAccelData: SMALL_EMPTY_ARRAY,
            pitchAccelData: SMALL_EMPTY_ARRAY,
            lastFlagTimestamp: 0,
        };
        return data;
    });
aim.register();
function tickEvent(tickData: TickData, player: Player) {
    let data = tickData.aim!;
    const { x: yaw, y: pitch } = tickData.instant.rotation;
    const deltaYaw = fastAbs(yaw - data.previousYaw[0]);
    const deltaPitch = fastAbs(pitch - data.previousPitch[0]);
    const yawAccel = fastAbs(deltaYaw - data.previousDeltaYaw[0]);
    const pitchAccel = fastAbs(deltaPitch - data.previousDeltaPitch[0]);
    if (data.initialize.state) {
        data = aimModule(player, data, deltaYaw, deltaPitch);
    } else {
        data.initialize.i++;
        if (data.initialize.i > 100) {
            data.initialize.state = true;
            data.initialize.i = 0;
        }
    }
    // Update the data :skull:
    data.yawAccelData.unshift(yawAccel);
    data.pitchAccelData.unshift(pitchAccel);
    data.previousDeltaPitch.unshift(deltaPitch);
    data.previousDeltaYaw.unshift(deltaYaw);
    data.previousPitch.unshift(yaw);
    data.previousYaw.unshift(pitch);
    // Delete old data
    data.yawAccelData.pop();
    data.pitchAccelData.pop();
    data.previousPitch.pop();
    data.previousYaw.pop();
    data.previousDeltaPitch.pop();
    data.previousDeltaYaw.pop();
    tickData.aim = data;
    return tickData;
}
const FLAG_VALID_TIMESTAMP = 7000;
const EXTREME_YAW_ACCELERATION = 0.01;
const EXTREME_DELTA_BUFFER = 10;
const DELTA_CHECK_BUFFER = 5;
const AMOUNT_CHECK_BUFFER = 18;
const INVALID_CHECK_BUFFER = 15;
const EMPTY_BUFFER = [0, 0, 0, 0];
/**
 * @author 4urxa
 * @link https://github.com/Dream23322
 * @license GPLv3
 * @description The aim checks from Isolate Anticheat that are made by 4urxa.
 * @link https://github.com/Dream23322/Isolate-Anticheat/tree/2b01e79241f03fbaec9f2e36ec82fbf739fd1434/scripts/checks/combat/aim
 * @credit A big credit to 4urxa, he allowed me to use his code.
 * @recode jasonlaubb
 */
function aimModule(player: Player, tickData: AimData, deltaYaw: number, deltaPitch: number) {
    const data = tickData;
    const deltaYaw2 = data.previousDeltaYaw[0];
    const yawAccel = fastAbs(deltaYaw - deltaYaw2);
    const isAttacking = player.hasTag("attackTime");
    const now = Date.now();
    if (deltaYaw > 35 && yawAccel < EXTREME_YAW_ACCELERATION && isAttacking) {
        data.buffer[0]++;
        data.lastFlagTimestamp = now;
        if (data.buffer[0] > EXTREME_DELTA_BUFFER) {
            player.flag(aim, { t: "1", yawAccel, deltaYaw });
        }
    }
    if ((deltaPitch % 1 == 0 || (deltaYaw % 360) % 1 == 0) && deltaPitch != 0 && deltaYaw != 0) {
        data.buffer[1]++;
        data.lastFlagTimestamp = now;
        if (data.buffer[1] > DELTA_CHECK_BUFFER) {
            player.flag(aim, { t: "2", deltaPitch, deltaYaw });
        }
    }
    const deltaPitchAmount = amountDeltaPitch(5, data.previousDeltaPitch);
    const deltaYawAmount = amountDeltaPitch(5, data.previousDeltaYaw);
    if (deltaPitchAmount && deltaYawAmount) {
        const pitchMagnitude = fastAbs(getAverageDifference(data.previousDeltaPitch));
        const yawMagnitude = fastAbs(getAverageDifference(data.previousDeltaYaw));
        if (pitchMagnitude < 0.3 && yawMagnitude > 5) {
            data.buffer[2]++;
            data.lastFlagTimestamp = now;
            if (data.buffer[2] > AMOUNT_CHECK_BUFFER) {
                player.flag(aim, { t: "3", pitchMagnitude, yawMagnitude });
            }
        }
    }
    const deltaDifferent = fastAbs(deltaYaw - deltaPitch);
    if (deltaDifferent < 0.1 && deltaYaw > 1 && isAttacking) {
        data.buffer[3]++;
        data.lastFlagTimestamp = now;
        if (data.buffer[3] > EXTREME_DELTA_BUFFER) {
            player.flag(aim, { t: "3", deltaDifferent, deltaYaw });
        }
    }
    if (isAttacking && deltaYaw >= 1.5) {
        const yawAccelList = arrayToList(data.yawAccelData);
        const pitchAccelList = arrayToList(data.pitchAccelData);
        const yawAccelAverage = fastAverage(yawAccelList);
        const pitchAccelAverage = fastAverage(pitchAccelList);
        const yawAccelDeviation = getStandardDeviation(yawAccelList);
        const pitchAccelDeviation = getStandardDeviation(pitchAccelList);
        const averageInvalid = yawAccelAverage < 1 || pitchAccelAverage < 1;
        const deviationInvalid = yawAccelDeviation < 5 && pitchAccelDeviation > 5;
        if (averageInvalid && deviationInvalid) {
            data.buffer[4]++;
            data.lastFlagTimestamp = now;
            if (data.buffer[4] > INVALID_CHECK_BUFFER) {
                player.flag(aim), { t: "4", yawAccelDeviation, pitchAccelDeviation };
            }
        }
    }
    if (now - data.lastFlagTimestamp > FLAG_VALID_TIMESTAMP) {
        data.buffer = EMPTY_BUFFER;
    }
    return data;
}

function amountDeltaPitch(amt: number, previousDeltaList: number[]) {
    const pitchList = arrayToList(previousDeltaList);
    const amount = amt + 1;
    let counter = 0;
    const returnList = [];
    for (const value of pitchList) {
        if (counter < amount) {
            returnList.push(value);
            counter++;
        } else {
            return returnList;
        }
    }
    return undefined;
}
