import { Player } from "@minecraft/server";
import { MinecraftEffectTypes } from "../../node_modules/@minecraft/vanilla-data/lib/index";
import { IntegratedSystemEvent, Module } from "../../matrixAPI";
import { rawtextTranslate } from "../../util/rawtext";
let runId: IntegratedSystemEvent;
interface SprintData {
    flagCount: number;
    nonBlindnessSprintState: boolean;
}
const sprintData = new Map<string, SprintData>();
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
        sprintData.clear();
        Module.clearPlayerTickEvent(runId);
    })
    .initPlayer((playerId, player) => {
        sprintData.set(playerId, {
            flagCount: 0,
            nonBlindnessSprintState: player.isSprinting,
        });
    })
    .initClear((playerId) => {
        sprintData.delete(playerId);
    });
invalidSprint.register();
function isMovementKeyPressed(player: Player) {
    const { x, y } = player.inputInfo.getMovementVector();
    return x !== 0 || y !== 0;
}
function tickEvent(player: Player) {
    const data = sprintData.get(player.id)!;
    if (!player.isSprinting) {
        if (data.flagCount > 0) {
            data.flagCount--;
            sprintData.set(player.id, data);
        }
        return;
    };
    const hasEffect = player.getEffect(MinecraftEffectTypes.Blindness);
    if (player.isSneaking || !isMovementKeyPressed(player)) {
        data.flagCount++;
        if (data.flagCount > Module.config.sensitivity.antiInvalidSprint.maxFlag) {
            player.flag(invalidSprint, { t: "1" });
        }
    } else if (data.flagCount > 0) data.flagCount--;
    if (hasEffect && player.isSprinting && !data.nonBlindnessSprintState) {
        player.flag(invalidSprint, { t: "2" });
    }
    if (!hasEffect || !player.isSprinting) {
        data.nonBlindnessSprintState = player.isSprinting;
    }
    sprintData.set(player.id, data);
}
