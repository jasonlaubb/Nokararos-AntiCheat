import { Player } from "@minecraft/server";
import { MinecraftEffectTypes } from "../../node_modules/@minecraft/vanilla-data/lib/index";
import { IntegratedSystemEvent, Module } from "../../matrixAPI";
import { rawtextTranslate } from "../../util/rawtext";
import { TickData } from "../import";
import { compareLoc } from "../../util/util";
let runId: IntegratedSystemEvent;
const invalidSprint = new Module()
    .setName(rawtextTranslate("module.invalidSprint.name"))
    .setDescription(rawtextTranslate("module.invalidSprint.description"))
    .setToggleId("antiInvalidSprint")
    .setPunishment("ban")
    .addCategory("detection")
    .onModuleEnable(() => {
        runId = Module.subscribePlayerTickEvent(tickEvent, false);
    })
    .onModuleDisable(() => {
        Module.clearPlayerTickEvent(runId);
    })
    .initPlayer((tickData, _playerId, player) => {
        tickData.invalidSprint ={
            flagCount: 0,
            nonBlindnessSprintState: player.isSprinting,
        };
        return tickData;
    });
invalidSprint.register();
function isMovementKeyPressed(player: Player) {
    const { x, y } = player.inputInfo.getMovementVector();
    return x !== 0 || y !== 0;
}
function tickEvent(tickData: TickData, player: Player) {
    if (!player.isSprinting) {
        if (tickData.invalidSprint.flagCount > 0) {
            tickData.invalidSprint.flagCount--;
            return tickData;
        }
        return tickData;
    };
    const hasEffect = player.getEffect(MinecraftEffectTypes.Blindness);
    if ((player.isSneaking || !isMovementKeyPressed(player)) && !player.isSwimming && !compareLoc(player.location, tickData.global.lastLocation)) {
        tickData.invalidSprint.flagCount++;
        if (tickData.invalidSprint.flagCount > Module.config.sensitivity.antiInvalidSprint.maxFlag) {
            player.flag(invalidSprint, { t: "1" });
        }
    } else if (tickData.invalidSprint.flagCount > 0) tickData.invalidSprint.flagCount = 0;
    if (hasEffect && player.isSprinting && !tickData.invalidSprint.nonBlindnessSprintState) {
        player.flag(invalidSprint, { t: "2" });
    }
    if (!hasEffect || !player.isSprinting) {
        tickData.invalidSprint.nonBlindnessSprintState = player.isSprinting;
    }
    return tickData;
}
