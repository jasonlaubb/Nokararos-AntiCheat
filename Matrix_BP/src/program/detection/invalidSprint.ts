import { Player, system } from "@minecraft/server";
import { MinecraftEffectTypes } from "../../node_modules/@minecraft/vanilla-data/lib/index";
import { IntegratedSystemEvent, Module } from "../../matrixAPI";
import { rawtextTranslate } from "../../util/rawtext";
let runId: IntegratedSystemEvent;
interface SprintData {
    lastFlag: number;
    flagCount: number;
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
    .initPlayer((playerId) => {
        sprintData.set(playerId, {
            lastFlag: 0,
            flagCount: 0,
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
    if (!player.isSprinting) return;
    const data = sprintData.get(player.id)!;
    if (player.isSneaking || !isMovementKeyPressed(player)) {
        const now = Date.now();
        if (now - data.lastFlag > 1000) {
            data.flagCount = 0;
        }
        data.lastFlag = now;
        data.flagCount++;
        if (data.flagCount > 10) {
            player.flag(invalidSprint);
        }
    } else if (player.getEffect(MinecraftEffectTypes.Blindness)) {
        system.run(() => {
            const stillEffect = player.getEffect(MinecraftEffectTypes.Blindness);
            if (stillEffect && player.isSprinting) {
                player.flag(invalidSprint);
            }
        });
    }
}
