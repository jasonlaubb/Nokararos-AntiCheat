import { Module } from "../../matrixAPI";
import { EntityDamageCause, EntityDieAfterEvent, EntityHurtAfterEvent, Player, PlayerLeaveAfterEvent, system, world } from "@minecraft/server";
import { fastText, rawtextTranslate } from "../../util/rawtext";

new Module()
    .addCategory("utility")
    .setName(rawtextTranslate("module.clog.name"))
    .setDescription(rawtextTranslate("module.clog.description"))
    .setToggleId("antiCombatLog")
    .onModuleEnable(() => {
        world.afterEvents.entityHurt.subscribe(entityHurt, {
            entityTypes: ["player"],
        });
        world.afterEvents.entityDie.subscribe(entityDie, {
            entityTypes: ["player"],
        });
        world.afterEvents.playerLeave.subscribe(playerLeave);
    })
    .onModuleDisable(() => {
        world.afterEvents.entityHurt.unsubscribe(entityHurt);
        world.afterEvents.entityDie.unsubscribe(entityDie);
        world.afterEvents.playerLeave.unsubscribe(playerLeave);
    })
    .initPlayer((tickData, _playerId, player) => {
        player.removeTag("matrix:inCombat");
        player
            .getTags()
            .filter((tag) => tag.startsWith("matrix:combatInfo::"))
            .forEach((tag) => player.removeTag(tag));
        return tickData;
    });
function entityDie({ deadEntity: player }: EntityDieAfterEvent) {
    if (player.hasTag("matrix:inCombat") && player instanceof Player) {
        const allPlayers = Module.allWorldPlayers.filter((player) => player.hasTag("matrix:inCombat") && getInfo(player)?.target === player.id);
        allPlayers.forEach((combatPlayer) => {
            clearInfo(combatPlayer);
            combatPlayer.sendMessage(fastText().addText("§bMatrix§a+ §7> §c").addTran("module.clog.leave.combat", player.name).build());
        });
        player.removeTag("matrix:inCombat");
    }
}
function playerLeave({ playerName, playerId }: PlayerLeaveAfterEvent) {
    const combatPlayers = Module.allWorldPlayers.filter((player) => player.hasTag("matrix:inCombat") && getInfo(player)?.target === playerId);
    combatPlayers.forEach((combatPlayer) => {
        clearInfo(combatPlayer);
    });
    if (combatPlayers.length > 0) {
        world.sendMessage(fastText().addText("§bMatrix§a+ §7> §c").addTran("module.clog.killed", playerName, combatPlayers.join(", ")).build());
    }
}
function entityHurt({ hurtEntity, damageSource: { cause, damagingEntity: attacker } }: EntityHurtAfterEvent) {
    if (!attacker || !(attacker instanceof Player) || cause === EntityDamageCause.blockExplosion) return;
    const player = hurtEntity as Player;
    updateInfo(player, Date.now(), attacker);
    updateInfo(attacker, Date.now(), player);
    if (!player.hasTag("matrix:inCombat")) {
        player.sendMessage(fastText().addText("§bMatrix§a+ §7> §c").addTran("module.clog.face.combat", attacker.name).build());
        const id = system.runInterval(() => {
            if (!player?.isValid()) return system.clearRun(id);
            const info = getInfo(player)!;
            if (!player.hasTag("matrix:inCombat")) return system.clearRun(id);
            const { lastUpdate } = info;
            player.onScreenDisplay.setActionBar(rawtextTranslate("module.clog.in.combat", ((Date.now() - lastUpdate) / 1000).toFixed(1)));
        });
    }
    if (!attacker.hasTag("matrix:inCombat")) {
        attacker.sendMessage(fastText().addText("§bMatrix§a+ §7> §c").addTran("module.clog.face.combat", player.name).build());
        const id = system.runInterval(() => {
            if (!attacker?.isValid()) return system.clearRun(id);
            const info = getInfo(attacker)!;
            if (!attacker.hasTag("matrix:inCombat")) return system.clearRun(id);
            const { lastUpdate } = info;
            attacker.onScreenDisplay.setActionBar(rawtextTranslate("module.clog.in.combat", ((Date.now() - lastUpdate) / 1000).toFixed(1)));
        });
    }
}
function updateInfo(player: Player, lastUpdate: number, target: Player) {
    player.getTags().forEach((tag) => {
        if (tag.startsWith("matrix:combatLog::")) {
            player.removeTag(tag);
        }
    });
    player.addTag("matrix:inCombat");
    player.addTag(`matrix:combatLog::${lastUpdate}::${target.id}`);
}
function getInfo(player: Player) {
    const info = player?.getTags()?.find((tag) => tag.startsWith("matrix:combatLog::"));
    if (!info) return null;
    const [lastUpdate, target] = info.split("::").slice(1);
    return { lastUpdate: parseInt(lastUpdate), target };
}
function clearInfo(player: Player) {
    player.getTags().forEach((tag) => {
        if (tag.startsWith("matrix:combatLog::")) {
            player.removeTag(tag);
        }
    });
    player.removeTag("matrix:inCombat");
}
