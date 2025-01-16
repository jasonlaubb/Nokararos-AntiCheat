import { Player, PlayerSpawnAfterEvent, system, world } from "@minecraft/server";
import { rawtext, rawtextTranslate, rawtextTranslateRawText } from "../../util/rawtext";
import { MinecraftDimensionTypes, MinecraftEffectTypes } from "../../node_modules/@minecraft/vanilla-data/lib/index";
import { Module } from "../../matrixAPI";
export function registerModeration() {
    new Module()
        .lockModule()
        .addCategory("system")
        .onModuleEnable(() => {
            world.afterEvents.playerSpawn.subscribe(onPlayerSpawn);
        })
        .initPlayer((_playerId, player) => {
            onPlayerSpawn({ player: player, initialSpawn: true });
        })
        .register();
}
export type Punishment = "tempKick" | "kick" | "softBan" | "ban" | "freeze" | "mute";
export function tempKick(player: Player) {
    // Punish player
    player.triggerEvent("matrix:tempkick");
}
export function ban(player: Player, duration: number, responser?: string, reason?: string) {
    // Punish player
    const obj = world.scoreboard.getObjective(`matrix:banRecord`);
    if (!obj) {
        world.scoreboard.addObjective(`matrix:banRecord`, "Matrix AntiCheat");
        return ban(player, duration, reason);
    }
    obj.setScore("::" + player.name, 0);
    player.getTags().forEach((tag) => {
        if (tag.startsWith("matrix:ban")) {
            player.removeTag(tag);
        }
    });
    if (reason) player.addTag("matrix:banReason::" + reason);
    if (responser) player.addTag("matrix:banResponser::" + responser);
    player.setDynamicProperty("isBanned", duration == -1 ? -1 : Date.now() + duration);
    kickForBan(player, Date.now() + duration);
}
export function isBanned(playerName: string) {
    try {
        const obj = world.scoreboard.getObjective(`matrix:banRecord`);
        if (!obj) {
            world.scoreboard.addObjective(`matrix:banRecord`, "Matrix AntiCheat");
            return false;
        }
        return !!obj.getScore("::" + playerName);
    } catch {
        return false;
    }
}
export function unBan(playerName: string) {
    const obj = world.scoreboard.getObjective(`matrix:unBanRequest`);
    if (!obj) {
        world.scoreboard.addObjective(`matrix:unBanRequest`, "Matrix AntiCheat");
        return unBan(playerName);
    }
    if (!obj!.getParticipants().every((id) => id.displayName.slice(2) !== playerName)) return null;
    if (
        world.scoreboard
            .getObjective(`matrix:banRecord`)!
            .getParticipants()
            .every((id) => id.displayName.slice(2) !== playerName)
    )
        return null;
    obj.setScore("::" + playerName, 0);
    return true;
}
export function bannedList(): string[] | undefined {
    const obj = world.scoreboard.getObjective(`matrix:banRecord`);
    if (!obj) {
        return undefined;
    }
    return obj.getParticipants().map((participant) => participant.displayName.slice(2));
}
export function isUnBanned(playerName: string) {
    try {
        const obj = world.scoreboard.getObjective(`matrix:unBanRequest`);
        if (!obj) {
            world.scoreboard.addObjective(`matrix:unBanRequest`, "Matrix AntiCheat");
            return false;
        }
        return !!obj.getScore("::" + playerName);
    } catch {
        return false;
    }
}
/**
 * @description Prevent anti kick from stopping the kick.
 */
export function strengthenKick(player: Player, reason: string = "§cNo reason provided") {
    // Punish player
    player
        .runCommandAsync(`kick "${player.name}" §aKick handled by Matrix AntiCheat\n§gReason: §e${reason}`)
        .then((commandResult) => {
            if (commandResult.successCount != 1) {
                tempKick(player);
            }
        })
        .catch(() => {
            tempKick(player);
        });
}
/**
 * @param player
 * @param duration Accept ms, 1000ms = 1 second, Input -1 to set softban to permanent
 */
export function softBan(player: Player, duration: number) {
    // Punish player
    if (duration == -1) {
        player.setDynamicProperty("isSoftBanned", -1);
    } else {
        player.setDynamicProperty("isSoftBanned", Date.now() + duration);
    }
}
export function unSoftBan(player: Player) {
    player.setDynamicProperty("isSoftBanned");
    tempKick(player);
}
export function isSoftBanned(player: Player) {
    return !!player.getDynamicProperty("isSoftBanned");
}
/**
 * @param player
 * @param duration Accept ms, 1000ms = 1 second, Input -1 to set mute to permanent
 */
export function mute(player: Player, duration: number) {
    // Punish player
    try {
        player.runCommand(`ability @s mute true`);
        player.setDynamicProperty("isMuted", duration == -1 ? -1 : Date.now() + duration);
        return true;
    } catch {
        return false;
    }
}
export function unMute(player: Player) {
    player.setDynamicProperty("isMuted");
    player.runCommand(`ability @s mute false`);
}
export function isMuted(player: Player) {
    return !!player.getDynamicProperty("isMuted");
}
export function freeze(player: Player, duration: number) {
    // Punish player
    player.setDynamicProperty("isFrozen", duration == -1 ? -1 : Date.now() + duration);
    player.inputPermissions.movementEnabled = false;
    player.inputPermissions.cameraEnabled = false;
}
export function unFreeze(player: Player) {
    player.setDynamicProperty("isFrozen");
    player.inputPermissions.movementEnabled = true;
    player.inputPermissions.cameraEnabled = true;
}
export function isFrozen(player: Player) {
    return !!player.getDynamicProperty("isFrozen");
}
function onPlayerSpawn({ player, initialSpawn }: PlayerSpawnAfterEvent) {
    if (!initialSpawn) return;
    const softBanStatus = player.getDynamicProperty("isSoftBanned") as number;
    if (softBanStatus) {
        if ((softBanStatus != -1 && Date.now() > softBanStatus) || player.hasTag("matrix-debug:force-unsoftban")) {
            player.setDynamicProperty("isSoftBanned");
            player.removeTag("matrix-debug:force-unsoftban");
            player.teleport(player.getSpawnPoint() ?? world.getDefaultSpawnLocation(), { dimension: world.getDimension(MinecraftDimensionTypes.Overworld) });
        } else {
            const id = system.runInterval(() => {
                player.inputPermissions.movementEnabled = false;
                player.inputPermissions.cameraEnabled = false;
                if (player.location.y != 350) {
                    player.teleport({ x: player.location.x, y: 350, z: player.location.z });
                }
                if (player.getEffect(MinecraftEffectTypes.Blindness)?.duration ?? 0 < 160) {
                    player.addEffect(MinecraftEffectTypes.Blindness, 300, { showParticles: false });
                }
                const untilTime = softBanStatus == -1 ? rawtextTranslate("moderation.permanent") : rawtext({ text: new Date(softBanStatus).toUTCString() });
                player.onScreenDisplay.updateSubtitle(rawtextTranslateRawText("moderation.softban.until", untilTime));
                player.onScreenDisplay.setTitle(rawtextTranslate("moderation.softban.banned"), { stayDuration: 10, fadeInDuration: 0, fadeOutDuration: 0 });
            }, 5);
            const leaveEvent = world.afterEvents.playerLeave.subscribe(({ playerId }) => {
                if (player.id != playerId) return;
                system.clearRun(id);
                world.afterEvents.playerLeave.unsubscribe(leaveEvent);
            });
        }
    }
    const banStatus = player.getDynamicProperty("isBanned") as number;
    if (banStatus) {
        const unBanRequest = world.scoreboard.getObjective("matrix:unBanRequest");
        const isUnBanned = unBanRequest!.getParticipants().some((id) => id.displayName.slice(2) === player.name);
        if (isUnBanned || (banStatus != -1 && Date.now() > banStatus)) {
            player.setDynamicProperty("isBanned");
            if (isUnBanned) {
                unBanRequest!.removeParticipant("::" + player.name);
            }
            const banRecord = world.scoreboard.getObjective(`matrix:banRecord`);
            let hasBanRecord;
            try {
                hasBanRecord = banRecord?.getScore("::" + player.name);
            } catch {}
            if (banRecord && hasBanRecord) {
                banRecord.removeParticipant("::" + player.name);
            }
        } else {
            kickForBan(player, banStatus);
        }
    } else {
        const unBanRequest = world.scoreboard.getObjective("matrix:unBanRequest");
        const isUnBanned = unBanRequest!.getParticipants().some((id) => id.displayName.slice(2) == player.name);
        if (isUnBanned) {
            unBanRequest!.removeParticipant("::" + player.name);
        }
        const banRecord = world.scoreboard.getObjective(`matrix:banRecord`);
        let hasBanRecord;
        try {
            hasBanRecord = banRecord?.getScore("::" + player.name);
        } catch {}
        if (banRecord && hasBanRecord) {
            banRecord.removeParticipant("::" + player.name);
        }
    }
    const muteStatus = player.getDynamicProperty("isMuted") as number;
    if (muteStatus) {
        if (muteStatus != -1 && Date.now() > muteStatus) {
            player.setDynamicProperty("isMuted");
            player.runCommand(`ability @s mute false`);
        } else {
            player.runCommand(`ability @s mute true`);
        }
    }
    const freezeStatus = player.getDynamicProperty("isFrozen") as number;
    if (freezeStatus) {
        if (freezeStatus != -1 && Date.now() > freezeStatus) {
            player.setDynamicProperty("isFrozen");
            player.inputPermissions.movementEnabled = true;
            player.inputPermissions.cameraEnabled = true;
        } else {
            player.inputPermissions.movementEnabled = false;
            player.inputPermissions.cameraEnabled = false;
        }
    }
}

function kickForBan(player: Player, banStatus: number) {
    let message = "§aBan handled by Matrix AntiCheat\n";
    if (banStatus === -1) {
        message += "§gRegretfully, you have been§e banned permanently§g on this server. If you think there is a mistake or you want to appeal, please contact the operator of the current server.";
    } else {
        message += "§gYou have been§e banned§g from the server, this ban will be valid until §e" + new Date(banStatus).toUTCString();
    }
    const tags = player.getTags();
    const responser = tags.find((tag) => tag.startsWith("matrix:banResponser::"));
    const reason = tags.find((tag) => tag.startsWith("matrix:banReason::"));
    if (responser) message += `\n§bResponser: §e${responser.replace("matrix:banResponser::", "")}`;
    if (reason) message += `\n§bReason: §e${reason.replace("matrix:banReason::", "")}`;
    player
        .runCommandAsync(`kick "${player.name}" ${message}`)
        .then((commandResult) => {
            if (commandResult.successCount != 1) {
                tempKick(player);
            }
        })
        .catch(() => {
            tempKick(player);
        });
}
export function warn(player: Player) {
    const obj = world.scoreboard.getObjective(`matrix:warnRecord`);
    if (!obj) {
        world.scoreboard.addObjective(`matrix:warnRecord`, "Matrix AntiCheat");
        return warn(player);
    }
    obj.addScore("::" + player.name, 1);
}

export function clearWarn(player: Player) {
    const obj = world.scoreboard.getObjective(`matrix:warnRecord`);
    if (!obj) return;
    if (obj.getScore("::" + player.name)) {
        obj.removeParticipant("::" + player.name);
    }
}
export function isWarned(player: Player) {
    const obj = world.scoreboard.getObjective(`matrix:warnRecord`);
    if (!obj) {
        world.scoreboard.addObjective(`matrix:warnRecord`, "Matrix AntiCheat");
        return isWarned(player);
    }
    return !!obj.getScore("::" + player.name);
}
export function getWarns(player: Player) {
    const obj = world.scoreboard.getObjective(`matrix:warnRecord`);
    if (!obj) {
        world.scoreboard.addObjective(`matrix:warnRecord`, "Matrix AntiCheat");
        return getWarns(player);
    }
    return obj.getScore("::" + player.name) ?? 0;
}
