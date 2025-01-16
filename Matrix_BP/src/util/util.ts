import { Dimension, MemoryTier, PlatformType, Player, system, Vector3 } from "@minecraft/server";
import { ActionFormData, ActionFormResponse, FormCancelationReason, ModalFormData, ModalFormResponse } from "@minecraft/server-ui";
import { fastBelow, fastSurround } from "./fastmath";
import { MinecraftBlockTypes } from "../node_modules/@minecraft/vanilla-data/lib/index";
/**
 *
 * @param memoryTier
 * @returns 3 = Not higher than 8GB
 */
export function returnTierNumber(memoryTier: MemoryTier) {
    switch (memoryTier) {
        case MemoryTier.SuperLow:
            return 0;
        case MemoryTier.Low:
            return 1;
        case MemoryTier.Mid:
            return 2;
        case MemoryTier.High: // 8 GB phone >:D
            return 3;
        case MemoryTier.SuperHigh:
            return 4;
        default:
            return 0;
    }
}
export function getBlockCenterLocation(blockLocation: Vector3) {
    const { x, y, z } = floorLocation(blockLocation);
    return { x: x + 0.5, y: y + 0.5, z: z + 0.5 };
}
export function floorLocation(location: Vector3) {
    return { x: Math.floor(location.x), y: Math.floor(location.y), z: Math.floor(location.z) };
}
const KILLAURA_MOBILE_ANGLE_LIMIT = 120;
const KILLAURA_DESKTOP_ANGLE_LIMIT = 45;
const KILLAURA_CONSOLE_ANGLE_LIMIT = 40;
export function getAngleLimit(platformType: PlatformType): number {
    switch (platformType) {
        case PlatformType.Mobile:
            return KILLAURA_MOBILE_ANGLE_LIMIT;
        case PlatformType.Desktop:
            return KILLAURA_DESKTOP_ANGLE_LIMIT;
        case PlatformType.Console:
            return KILLAURA_CONSOLE_ANGLE_LIMIT;
    }
}
export function getValueFromObject(object: any, keys: string[]) {
    try {
        for (const key of keys) {
            object = object[key];
        }
    } catch {
        return undefined;
    }
    return object;
}
export function changeValueOfObject(object: any, keys: string[], value: any) {
    switch (keys.length) {
        case 1:
            object[keys[0]] = value;
            return object;
        case 2:
            object[keys[0]][keys[1]] = value;
            return object;
        case 3:
            object[keys[0]][keys[1]][keys[2]] = value;
            return object;
        case 4:
            object[keys[0]][keys[1]][keys[2]][keys[3]] = value;
            return object;
        case 5:
            object[keys[0]][keys[1]][keys[2]][keys[3]][keys[4]] = value;
            return object;
        default:
            throw new Error("Too many keys!!!!");
    }
}

export function waitShowModalForm(ui: ModalFormData, player: Player): Promise<ModalFormResponse | null> {
    return new Promise(async (resolve) => {
        do {
            if (!player?.isValid()) break;
            //@ts-expect-error
            const res = await ui.show(player);
            if (res.canceled) {
                if (res.cancelationReason! === FormCancelationReason.UserBusy) {
                    await system.waitTicks(20);
                } else {
                    break;
                }
            } else {
                resolve(res);
                return;
            }
        } while (true);
        resolve(null);
    });
}

export function waitShowActionForm(ui: ActionFormData, player: Player): Promise<ActionFormResponse | null> {
    return new Promise(async (resolve) => {
        do {
            if (!player?.isValid()) break;
            //@ts-expect-error
            const res = await ui.show(player);
            if (res.canceled) {
                if (res.cancelationReason! === FormCancelationReason.UserBusy) {
                    await system.waitTicks(20);
                } else {
                    break;
                }
            } else {
                resolve(res);
                return;
            }
        } while (true);
        resolve(null);
    });
}
/**
 * @description Check if a block is surrounded by air
 */
export function isSurroundedByAir(centerLocation: Vector3, dimension: Dimension): boolean {
    const surroundedBlocks = fastSurround(centerLocation, dimension);
    if (!surroundedBlocks) return !!surroundedBlocks;
    return surroundedBlocks.every((block) => block?.isAir);
}
export function isSteppingOnIceOrSlime({ location, dimension }: Player): boolean {
    const belowBlocks = fastBelow(location, dimension);
    if (!belowBlocks) return false;
    return belowBlocks.some((block) => block?.typeId?.includes("ice") || block?.typeId === MinecraftBlockTypes.Slime);
}
export function isMovedUp(lastPositions: Vector3[]) {
    for (const [i, position] of lastPositions.entries()) {
        if (i < lastPositions.length - 1) {
            const deltaY = position.y - lastPositions[i + 1].y;
            if (deltaY >= 0) return true;
        }
    }
    return false;
}
export function getDelta(list: number[]) {
    if (list.length < 2) {
        throw new Error("List must have at least two elements");
    }
    return list.slice(0, -1).map((x, i) => x - list[i + 1]);
}
import { Log } from "../assets/logSystem";
import { rawtextTranslate } from "./rawtext";
export async function parseLogUserInterface(logs: Log[], player: Player) {
    const ui = new ActionFormData()
        .title(rawtextTranslate("ui.log.title", currentTimezoneOffset()))
        .body(rawtextTranslate("ui.log.body", logs.length.toString()));
    const timeZoneOffset = new Date().getTimezoneOffset() * 60000;
    for (const log of logs) {
        const { year, month, day, hour, minute, second } = getUTCTime(log.now - timeZoneOffset);
        const shortTimeStr = `§8${year}/${month}/${day} ${hour}:${minute}:${second}`;
        const buttonText = `§g${log.action} §0[${log.object}§0]\n${shortTimeStr}`;
        ui.button(buttonText);
    }
    const result = await waitShowActionForm(ui, player);
    if (result === null) return;
    const selection = result.selection!;
    const selectedLog = logs[selection];
    const detailText = selectedLog.data ? Object.entries(selectedLog.data).map((([key, value]) => {
        switch (typeof value) {
            case "boolean": {
                value = value ? "true" : "false";
                break;
            }
            case "number": {
                value = value.toString();
                break;
            }
            case "string": {
                value = '"' + value + '"';
                break;
            }
            case "object": {
                value = value.map((a) => String(a)).join(",");
            }
        }
        return `§g${key} §7>> §e${value}`;
    })) : [] as string[];
    const { year, month, day, hour, minute, second } = getUTCTime(selectedLog.now - timeZoneOffset);
    const shortTimeStr = `§8${year}/${month}/${day} ${hour}:${minute}:${second}`;
    const message = [
        `§gAuto Mod §7>> §e${selectedLog.autoMod ? "true" : "false"}`,
        `§gAction §7>> §e${selectedLog.action}`,
        `§gObject §7>> §e${selectedLog.object}`,
        `§gTime §7>> §e${shortTimeStr}`,
    ]
    const detailUI = new ActionFormData()
        .title(rawtextTranslate("ui.log.detail"))
        .body([...message, ...detailText].join("\n"))
        .button(rawtextTranslate("ui.exit"), "ui/realms_red_x.png");
    //@ts-expect-error
    detailUI.show(player);
        
}
export const day_ms = 1440000;
export function timeStringCorrectToDay(time: number) {
    const exceeded = time % day_ms;
    const dayStart = time - exceeded;
    const dayEnd = dayStart + 1439999;
    return { dayStart, dayEnd };
}