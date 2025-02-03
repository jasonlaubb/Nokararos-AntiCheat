import { PlatformType } from "@minecraft/server";
import { Module } from "../../matrixAPI";
import { rawtextTranslate } from "../../util/rawtext";
import { matrixKick } from "../system/moderation";
new Module()
    .setName(rawtextTranslate("module.deviceban.name"))
    .setDescription(rawtextTranslate("module.deviceban.description"))
    .setToggleId("deviceBan")
    .setPunishment("kick")
    .initPlayer((_playerId, player) => {
        if (player.isAdmin() || player.hasTag("matrix-debug:ignoreDeviceBan")) return;
        const playerDeviceType = player.clientSystemInfo.platformType;
        const banConfig = Module.config.sensitivity.deviceBan;
        let kickState: string = "none";
        switch (playerDeviceType) {
            case PlatformType.Console: {
                if (banConfig.banConsoleDevice) kickState = "console";
                break;
            }
            case PlatformType.Desktop: {
                if (banConfig.banDesktop) kickState = "desktop";
                break;
            }
            case PlatformType.Mobile: {
                if (banConfig.banMobile) kickState = "mobile";
                break;
            }
        }
        if (kickState === "none") return;
        matrixKick(player, `Banned device (${kickState})`, `[Device Ban]`);
    })
    .register();
