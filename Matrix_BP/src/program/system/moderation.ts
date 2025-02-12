import { Player, system, world } from "@minecraft/server";
import { rawtextTranslate } from "../../util/rawtext";
import { MinecraftDimensionTypes } from "../../node_modules/@minecraft/vanilla-data/lib/index";
import { Module } from "../../matrixAPI";
import { generateShortTimeStr, getTimeFromTimeString } from "../../util/util";
export function registerModeration() {
    new Module()
        .lockModule()
        .addCategory("system")
        .initPlayer((tickData, _playerId, player) => {
            onPlayerSpawn(player);
            return tickData;
        })
        .register();
}
export { Punishment, crashPlayer, banHandler, muteHandler, matrixKick };
type Punishment = "none" | "crash" | "kick" | "ban" | "mute";
function meaninglessCode() {
    const includeString = "qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM1234567890";
    let str = "";
    for (let i = 0; i < 32; i++) {
        str += includeString.charAt(Math.floor(Math.random() * includeString.length));
    }
    return `title @s title §m§l§o§k${new Array(32).fill(includeString).join("\n")}`;
}
function crashPlayer(player: Player, spam = meaninglessCode()) {
    if (!player?.isValid() || player.isAdmin()) return;
    if (!spam) {
        if (Module.config.debug.pauseAllPunishment) {
            world.sendMessage(rawtextTranslate("debug.pause", "crash", player.name));
            return;
        }
    }
    // Punish player
    try {
        for (let i = 0; i < 1000; i++) {
            player.runCommand(spam);
        }
    } catch {
    } finally {
        system.run(() => crashPlayer(player, spam));
    }
}
interface BanInfo {
    reason: string;
    dateEnd: number;
    indefinitely: boolean;
    time: number;
    responser: string;
}
function matrixKick(player: Player, reason: string = "No reason provided", responser: string = "Unknown") {
    if (Module.config.debug.pauseAllPunishment) {
        world.sendMessage(rawtextTranslate("debug.pause", "kick", player.name));
        return;
    }
    try {
        const { successCount } = world.getDimension(MinecraftDimensionTypes.Overworld).runCommand(`kick "${player.name}" §cYou have been kicked. §7[§bMatrix§7]\n§bReason: §e${reason}§r\n§bResponser: §e${responser}§r`);
        if (successCount !== 1) throw new Error("Failed to kick player");
    } catch {
        try {
            if (player.isOp()) return;
            return;
        } catch {}
        crashPlayer(player);
    }
}
const banHandler = {
    isBanned: (player: Player) => {
        const token = world.getDynamicProperty(
            player
                .getTags()
                .find((tag) => tag.startsWith("matrix:isBanned::"))
                ?.slice(7) ?? `isBanned::${player.name}`
        );
        return token ? (JSON.parse(token as string) as BanInfo) : false;
    },
    ban: (player: Player, responser: string, indefinitely: boolean = true, time: number = 0, reason: string = "No reason provided") => {
        if (Module.config.debug.pauseAllPunishment) {
            world.sendMessage(rawtextTranslate("debug.pause", "ban", player.name));
            return;
        }
        world.setDynamicProperty(`isBanned::${player.name}`, JSON.stringify({ responser, reason, dateEnd: Date.now() + time, indefinitely: indefinitely, time }));
        player.addTag(`matrix:isBanned::${player.name}`);
        system.run(() => banHandler.kickAction(player));
    },
    kickAction: (player: Player) => {
        const banInfo = banHandler.isBanned(player);
        if (!banInfo) return;
        if (!banInfo.indefinitely && Date.now() > banInfo.dateEnd) {
            player.sendMessage(rawtextTranslate("command.moderation.ban.expired"));
            if (!banHandler.unban(player.name)) {
                world.setDynamicProperty(player.getTags().find((tag) => tag.startsWith("matrix:isBanned::"))!);
                console.log(`banHandler :: kickAction :: ${player.name} has changed the name after being banned`);
            }
            player
                .getTags()
                .filter((tag) => tag.startsWith("matrix:isBanned::"))
                .forEach((tag) => player.removeTag(tag));
            return;
        }
        const timerString = banInfo.indefinitely ? "Indefinitely" : getTimeFromTimeString(banInfo.time - Date.now());
        const detailInfo = `§bReason: §e${banInfo.reason}§r\n§bResponser: §e${banInfo.responser}§r\n§bDuration: §e${timerString}§r\n§bExpires: §e${banInfo.indefinitely ? "Indefinitely" : generateShortTimeStr(banInfo.dateEnd)}§r`;
        const message = `§cYou have been banned. §7[§bMatrix§7]\n${detailInfo}`;
        try {
            const { successCount } = world.getDimension(MinecraftDimensionTypes.Overworld).runCommand(`kick "${player.name}" ${message}`);
            if (successCount !== 1) throw new Error("Failed to kick player");
        } catch {
            try {
                if (player.isOp()) {
                    system.run(() => player.sendMessage("<debug> We §ccannot kick§f you as you're the §ghost§f of the world"));
                    return;
                }
            } catch {}
            crashPlayer(player);
        }
    },
    unban: (playerName: string) => {
        const state = world.getDynamicProperty(`isBanned::${playerName}`);
        world.setDynamicProperty(`isBanned::${playerName}`);
        return state;
    },
    bannedList: () => {
        return world
            .getDynamicPropertyIds()
            .filter((x) => x.startsWith("isBanned::"))
            .map((x) => x.slice(10));
    },
};
const muteHandler = {
    isMuted: (player: Player) => {
        return (world.getDynamicProperty(`isMuted::${player.id}`) as number) ?? false;
    },
    mute: (player: Player, time: number) => {
        if (Module.config.debug.pauseAllPunishment) {
            world.sendMessage(rawtextTranslate("debug.pause", "mute", player.name));
            return;
        }
        world.setDynamicProperty(`isMuted::${player.id}`, Date.now() + time);
        system.run(() => muteHandler.muteAction(player));
    },
    muteAction: (player: Player) => {
        const muteTime = muteHandler.isMuted(player);
        if (!muteTime) return;
        if (muteTime > Date.now()) {
            player.sendMessage(rawtextTranslate("command.moderation.mute.expired"));
            try {
                player.runCommand(`ability @s mute true`);
            } catch {
            } finally {
                player.addTag("matrix:cancelChatMessage");
            }
            world.setDynamicProperty(`isMuted::${player.id}`);
        } else {
            const id = system.runTimeout(() => muteHandler.muteAction(player), Math.ceil((Date.now() - muteTime) / 50));
            const eventId = world.afterEvents.playerLeave.subscribe((event) => {
                if (event.playerId !== player.id) return;
                system.clearRun(id);
                world.afterEvents.playerLeave.unsubscribe(eventId);
            });
        }
        try {
            player.runCommand(`ability @s mute true`);
        } catch {
            player.addTag("matrix:cancelChatMessage");
        }
    },
    unmute: (player: Player) => {
        try {
            player.runCommand(`ability @s mute false`);
        } catch {
        } finally {
            player.addTag("matrix:cancelChatMessage");
        }
        world.setDynamicProperty(`isMuted::${player.id}`);
    },
};
function onPlayerSpawn(player: Player) {
    if (player.isAdmin()) return;
    // Check if player is banned
    banHandler.kickAction(player);
}
