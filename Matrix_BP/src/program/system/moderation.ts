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
export type Punishment = "none" | "crash" | "kick" | "softBan" | "ban" | "freeze" | "mute";
function meaninglessCode() {
    const includeString = "qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM1234567890";
    let str = "";
    for (let i = 0; i < 32; i++) {
        str += includeString.charAt(Math.floor(Math.random() * includeString.length));
    }
    return `title @s title §m§l§o§k${new Array(32).fill(includeString).join("\n")}`;
}
export function crashPlayer(player: Player, spam = meaninglessCode()) {
    if (!player?.isValid() || player.isAdmin()) return;
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
    reason?: string;
    dateEnd: number;
    indefinitely: boolean;
    time: number;
}
const banHandler = {
    isBanned: (player: Player) => {
        return world.getDynamicProperty(`isBanned::${player.id}`) ? JSON.parse(world.getDynamicProperty(`isBanned::${player.id}`) as string) as BanInfo : false;
    },
    ban: (player: Player, reason: string, indefinitely: boolean, time: number) => {
        world.setDynamicProperty(`isBanned::${player.id}`, JSON.stringify({ reason: reason, dateEnd: Date.now() + time, indefinitely: indefinitely, time: time }));
        banHandler.kickAction(player);
    },
    kickAction: (player: Player) => {
        const banInfo = banHandler.isBanned(player);
        if (!banInfo) return;
        const detailInfo = `Reason: ${banInfo.reason ?? "No reason provided."}\nDuration: ${banInfo.indefinitely ? "Indefinitely" : `${(banInfo.dateEnd - Date.now()) / 1000} seconds`}`;
        try {
            if (banInfo.indefinitely) {
                world.getDimension(MinecraftDimensionTypes.Overworld).runCommand(`kick "${player.name}" §aBan handled by Matrix AntiCheat\n§gYou have been banned indefinitely and your ban will not be lifted unless you are unbanned by an admin of the server.`);
            }
        } catch {

        }
    }
}