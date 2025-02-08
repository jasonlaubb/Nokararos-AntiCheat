import { EntityHitEntityAfterEvent, Player, system, world } from "@minecraft/server";
import { Module } from "../../matrixAPI";
import { rawtextTranslate } from "../../util/rawtext";
import { MinecraftEffectTypes } from "../../node_modules/@minecraft/vanilla-data/lib/index";
let playerCPS: { [key: string]: number[] } = {};
const CLICK_DURATION = 1500;
let runId: number;
const autoClicker = new Module()
    .setName(rawtextTranslate("module.autoclicker.name"))
    .setDescription(rawtextTranslate("module.autoclicker.description"))
    .setToggleId("antiAutoClicker")
    .setPunishment("kick")
    .onModuleEnable(() => {
        runId = system.runInterval(tickEvent, 20);
        world.afterEvents.entityHitEntity.subscribe(entityHit);
    })
    .onModuleDisable(() => {
        system.clearRun(runId);
        world.afterEvents.entityHitEntity.unsubscribe(entityHit);
    })
    .initPlayer((tickData, playerId) => {
        playerCPS[playerId] = [];
        tickData.autoClicker = {
            amount: 0,
            lastFlagTimestamp: 0,
        };
        return tickData;
    })
    .initClear((playerId) => {
        delete playerCPS[playerId];
    });
autoClicker.register();
function tickEvent() {
    const allPlayers = Module.allNonAdminPlayers;
    const config = Module.config;
    const maxCps = config.sensitivity.antiAutoClicker.maxCps;
    for (const player of allPlayers) {
        const data = Module.tickData.get(player.id)!;
        playerCPS[player.id] = playerCPS[player.id].filter((arr) => Date.now() - arr < CLICK_DURATION);
        const cps = playerCPS[player.id].length;
        const hasWeaknessEffect = player.getEffect(MinecraftEffectTypes.Weakness);
        if (!hasWeaknessEffect) {
            if (cps > maxCps) {
                player.sendMessage(rawtextTranslate("module.autoclicker.reach", maxCps.toString(), cps.toString()));
                player.addEffect(MinecraftEffectTypes.Weakness, 1000, { showParticles: false });
                const now = Date.now();
                if (now - data.autoClicker!.lastFlagTimestamp > config.sensitivity.antiAutoClicker.minFlagIntervalMs) player.autoClickFlag.amount = 0;
                data.autoClicker!.lastFlagTimestamp = now;
                data.autoClicker!.amount++;
                if (data.autoClicker!.amount > config.sensitivity.antiAutoClicker.maxFlag) {
                    player.flag(autoClicker, { cps, maxCps });
                }
            }
            Module.tickData.set(player.id, data);
        } else if (cps <= maxCps) {
            player.removeEffect(MinecraftEffectTypes.Weakness);
        }
    }
}
function entityHit({ damagingEntity: player }: EntityHitEntityAfterEvent) {
    if (!(player instanceof Player) || player.isAdmin()) return;
    playerCPS[player.id].push(Date.now());
}
