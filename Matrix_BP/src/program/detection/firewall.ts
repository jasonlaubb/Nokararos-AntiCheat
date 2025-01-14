import { PlatformType, PlayerSpawnAfterEvent, world } from "@minecraft/server";
import { Module } from "../../matrixAPI";
import { rawtextTranslate } from "../../util/rawtext";
import { returnTierNumber } from "../../util/util";

const FIREWALL_LIMIT_THRESHOLD = 96;
const FIREWALL_MIN_THRESHOLD = 6;

const firewall = new Module()
    .addCategory("detection")
    .setName(rawtextTranslate("module.firewall.name"))
    .setDescription(rawtextTranslate("module.firewall.description"))
    .setToggleId("firewall")
    .setPunishment("ban")
    .onModuleEnable(() => {
        world.afterEvents.playerSpawn.subscribe(playerSpawnAfterEvent);
    })
    .onModuleDisable(() => {
        world.afterEvents.playerSpawn.unsubscribe(playerSpawnAfterEvent);
    });

firewall.register();

/**
 * @author jasonlaubb
 * @description Checks for the render distance.
 * @link Render distances of different console devices - https://www.reddit.com/r/NintendoSwitch/comments/67blwn/render_distance_in_minecraft_switch_changes/
 * @link Common max and min render distance - https://minecraftbedrock-archive.fandom.com/wiki/Render_Distance
 */
function playerSpawnAfterEvent(event: PlayerSpawnAfterEvent) {
    const player = event.player;
    if (!event.initialSpawn || player.isAdmin()) return;
    const systemInfo = player.clientSystemInfo;
    const renderDistanceLimit = systemInfo.maxRenderDistance;
    const memoryTier = systemInfo.memoryTier;
    const platformType = systemInfo.platformType;

    const tierNumber = returnTierNumber(memoryTier);
    const [limitThreshold, minThreshold] = getThresholds(platformType, tierNumber);

    if (renderDistanceLimit > limitThreshold || renderDistanceLimit < minThreshold) {
        player.flag(firewall, { renderDistanceLimit, limitThreshold, minThreshold });
    }
}

function getThresholds(platformType: PlatformType, tierNumber: number): [number, number] {
    switch (platformType) {
        case PlatformType.Mobile:
            return getMobileThresholds(tierNumber);
        case PlatformType.Desktop:
            return getDesktopThresholds(tierNumber);
        case PlatformType.Console:
            return getConsoleThresholds(tierNumber);
        default:
            return [FIREWALL_LIMIT_THRESHOLD, FIREWALL_MIN_THRESHOLD];
    }
}

function getMobileThresholds(tierNumber: number): [number, number] {
    if (tierNumber <= 3) {
        return [22, 6];
    } else if (tierNumber == 4) {
        return [32, 6];
    }
    return [FIREWALL_LIMIT_THRESHOLD, FIREWALL_MIN_THRESHOLD];
}

function getDesktopThresholds(tierNumber: number): [number, number] {
    if (tierNumber <= 3) {
        return [50, 6];
    }
    return [FIREWALL_LIMIT_THRESHOLD, FIREWALL_MIN_THRESHOLD];
}

function getConsoleThresholds(tierNumber: number): [number, number] {
    if (tierNumber <= 2) {
        return [12, 7];
    } else if (tierNumber <= 3) {
        return [18, 12];
    } else {
        return [32, 18];
    }
}
