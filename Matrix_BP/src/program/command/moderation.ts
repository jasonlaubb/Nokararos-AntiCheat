import { Player, world } from "@minecraft/server";
import { Command } from "../../matrixAPI";
import { fastText, rawtextTranslate } from "../../util/rawtext";
// Import all moderation functions (Quite a lot lol)
import { ban, mute, softBan, strengthenKick, freeze, warn, unBan, unMute, unSoftBan, unFreeze, clearWarn, isBanned, isSoftBanned, isMuted, isFrozen, isWarned, getWarns, bannedList, crashPlayer } from "../system/moderation";
function minuteToMilliseconds(minute: number): number {
    return minute * 60000;
}
new Command()
    .setName("kick")
    .setDescription(rawtextTranslate("command.kick.description"))
    .setMinPermissionLevel(2)
    .addOption(rawtextTranslate("command.moderation.target"), rawtextTranslate("command.moderation.target.description"), "target", undefined, false)
    .onExecute(async (player, target) => {
        const targetPlayer = target as Player;
        // Finish the action
        strengthenKick(targetPlayer);
        world.sendMessage(fastText().addText("§bMatrix§a+ §7> §g").addTran("command.moderation.success", targetPlayer.name, player.name).endline().addTranRawText("command.moderation.action", rawtextTranslate("command.moderation.kick")).build());
    })
    .register();
new Command()
    .setName("ban")
    .setDescription(rawtextTranslate("command.ban.description"))
    .setMinPermissionLevel(2)
    .addOption(rawtextTranslate("command.moderation.target"), rawtextTranslate("command.moderation.target.description"), "target", undefined, false)
    .addOption(
        rawtextTranslate("command.moderation.duration"),
        rawtextTranslate("command.moderation.duration.description"),
        "integer",
        {
            lowerLimit: 0,
            upperLimit: 525600,
        },
        true
    )
    .addOption(rawtextTranslate("command.moderation.reason"), rawtextTranslate("command.moderation.reason.description"), "string", undefined, true)
    .onExecute(async (player, target, duration, reason) => {
        const targetPlayer = target as Player;
        // Finish the action
        const msDuration = minuteToMilliseconds((duration as number) ?? -1);
        if (isBanned(targetPlayer.name)) return player.sendMessage(fastText().addText("§bMatrix§a+ §7> §c").addTran("command.moderation.removal.failed").build());
        ban(targetPlayer, msDuration, player.name, reason as string);
        world.sendMessage(fastText().addText("§bMatrix§a+ §7> §g").addTran("command.moderation.success", targetPlayer.name, player.name).endline().addTranRawText("command.moderation.action", rawtextTranslate("command.moderation.ban")).build());
    })
    .register();
new Command()
    .setName("softban")
    .setDescription(rawtextTranslate("command.softban.description"))
    .setMinPermissionLevel(2)
    .addOption(rawtextTranslate("command.moderation.target"), rawtextTranslate("command.moderation.target.description"), "target", undefined, false)
    .addOption(
        rawtextTranslate("command.moderation.duration"),
        rawtextTranslate("command.moderation.duration.description"),
        "integer",
        {
            lowerLimit: 0,
            upperLimit: 525600,
        },
        true
    )
    .onExecute(async (player, target, duration) => {
        const targetPlayer = target as Player;
        // Finish the action
        const msDuration = minuteToMilliseconds((duration as number) ?? -1);
        if (isSoftBanned(targetPlayer)) return player.sendMessage(fastText().addText("§bMatrix§a+ §7> §c").addTran("command.moderation.removal.failed").build());
        softBan(targetPlayer, msDuration);
        world.sendMessage(fastText().addText("§bMatrix§a+ §7> §g").addTran("command.moderation.success", targetPlayer.name, player.name).endline().addTranRawText("command.moderation.action", rawtextTranslate("command.moderation.softban")).build());
    })
    .register();
new Command()
    .setName("mute")
    .setDescription(rawtextTranslate("command.mute.description"))
    .setMinPermissionLevel(2)
    .addOption(rawtextTranslate("command.moderation.target"), rawtextTranslate("command.moderation.target.description"), "target", undefined, false)
    .addOption(
        rawtextTranslate("command.moderation.duration"),
        rawtextTranslate("command.moderation.duration.description"),
        "integer",
        {
            lowerLimit: 0,
            upperLimit: 525600,
        },
        true
    )
    .onExecute(async (player, target, duration) => {
        const targetPlayer = target as Player;
        // Finish the action
        const msDuration = minuteToMilliseconds(duration as number);
        if (isMuted(targetPlayer)) return player.sendMessage(fastText().addText("§bMatrix§a+ §7> §c").addTran("command.moderation.removal.failed").build());
        mute(targetPlayer, msDuration);
        world.sendMessage(fastText().addText("§bMatrix§a+ §7> §g").addTran("command.moderation.success", targetPlayer.name, player.name).endline().addTranRawText("command.moderation.action", rawtextTranslate("command.moderation.mute")).build());
    })
    .register();
new Command()
    .setName("freeze")
    .setDescription(rawtextTranslate("command.freeze.description"))
    .setMinPermissionLevel(2)
    .addOption(rawtextTranslate("command.moderation.target"), rawtextTranslate("command.moderation.target.description"), "target", undefined, false)
    .addOption(
        rawtextTranslate("command.moderation.duration"),
        rawtextTranslate("command.moderation.duration.description"),
        "integer",
        {
            lowerLimit: 0,
            upperLimit: 525600,
        },
        true
    )
    .onExecute(async (player, target, duration) => {
        const targetPlayer = target as Player;
        // Finish the action
        const msDuration = minuteToMilliseconds((duration as number) ?? -1);
        if (isFrozen(targetPlayer)) return player.sendMessage(fastText().addText("§bMatrix§a+ §7> §c").addTran("command.moderation.removal.failed").build());
        freeze(targetPlayer, msDuration);
        world.sendMessage(fastText().addText("§bMatrix§a+ §7> §g").addTran("command.moderation.success", targetPlayer.name, player.name).endline().addTranRawText("command.moderation.action", rawtextTranslate("command.moderation.freeze")).build());
    })
    .register();
new Command()
    .setName("banlist")
    .setDescription(rawtextTranslate("command.banlist.description"))
    .setMinPermissionLevel(2)
    .onExecute(async (player) => {
        const banList = bannedList();
        if (!banList) {
            player.sendMessage(fastText().addText("§bMatrix§a+ §7> §c").addTran("command.banlist.empty").build());
        } else {
            player.sendMessage(fastText().addText("§bMatrix§a+ §7> §g").addTran("command.banlist.banned", banList.join("§7, §e"), banList.length.toString()).build());
        }
    })
    .register();
new Command()
    .setName("unban")
    .setDescription(rawtextTranslate("command.unban.description"))
    .setMinPermissionLevel(2)
    .addOption(rawtextTranslate("command.moderation.target"), rawtextTranslate("command.moderation.target.description"), "string", undefined, false)
    .onExecute(async (player, target) => {
        const targetPlayer = target as string;
        const unBanResult = unBan(targetPlayer);
        if (unBanResult) {
            world.sendMessage(fastText().addText("§bMatrix§a+ §7> §g").addTran("command.moderation.success", targetPlayer, player.name).endline().addTranRawText("command.moderation.action", rawtextTranslate("command.moderation.unban")).build());
        } else {
            player.sendMessage(fastText().addText("§bMatrix§a+ §7> §c").addTran("command.moderation.removal.failed").build());
        }
    })
    .register();
new Command()
    .setName("unmute")
    .setDescription(rawtextTranslate("command.unmute.description"))
    .setMinPermissionLevel(2)
    .addOption(rawtextTranslate("command.moderation.target"), rawtextTranslate("command.moderation.target.description"), "target", undefined, false)
    .onExecute(async (player, target) => {
        const targetPlayer = target as Player;
        if (!isMuted(targetPlayer)) return player.sendMessage(fastText().addText("§bMatrix§a+ §7> §c").addTran("command.moderation.removal.failed").build());
        unMute(targetPlayer);
        world.sendMessage(fastText().addText("§bMatrix§a+ §7> §g").addTran("command.moderation.success", targetPlayer.name, player.name).endline().addTranRawText("command.moderation.action", rawtextTranslate("command.moderation.unmute")).build());
    })
    .register();
new Command()
    .setName("unfreeze")
    .setDescription(rawtextTranslate("command.unfreeze.description"))
    .setMinPermissionLevel(2)
    .addOption(rawtextTranslate("command.moderation.target"), rawtextTranslate("command.moderation.target.description"), "target", undefined, false)
    .onExecute(async (player, target) => {
        const targetPlayer = target as Player;
        if (!isFrozen(targetPlayer)) return player.sendMessage(fastText().addText("§bMatrix§a+ §7> §c").addTran("command.moderation.removal.failed").build());
        unFreeze(targetPlayer);
        world.sendMessage(fastText().addText("§bMatrix§a+ §7> §g").addTran("command.moderation.success", targetPlayer.name, player.name).endline().addTranRawText("command.moderation.action", rawtextTranslate("command.moderation.unfreeze")).build());
    })
    .register();
new Command()
    .setName("unsoftban")
    .setDescription(rawtextTranslate("command.unsoftban.description"))
    .setMinPermissionLevel(2)
    .addOption(rawtextTranslate("command.moderation.target"), rawtextTranslate("command.moderation.target.description"), "target", undefined, false)
    .onExecute(async (player, target) => {
        const targetPlayer = target as Player;
        if (!isSoftBanned(targetPlayer)) return player.sendMessage(fastText().addText("§bMatrix§a+ §7> §c").addTran("command.moderation.removal.failed").build());
        unSoftBan(targetPlayer);
        world.sendMessage(fastText().addText("§bMatrix§a+ §7> §g").addTran("command.moderation.success", targetPlayer.name, player.name).endline().addTranRawText("command.moderation.action", rawtextTranslate("command.moderation.unsoftban")).build());
    })
    .register();
new Command()
    .setName("warn")
    .setDescription(rawtextTranslate("command.warn.description"))
    .setMinPermissionLevel(2)
    .addOption(rawtextTranslate("command.moderation.target"), rawtextTranslate("command.moderation.target.description"), "target", undefined, false)
    .onExecute(async (player, target) => {
        const targetPlayer = target as Player;
        // Finish the action
        warn(targetPlayer);
        world.sendMessage(
            fastText()
                .addText("§bMatrix§a+ §7> §g")
                .addTran("command.moderation.success", targetPlayer.name, player.name)
                .endline()
                .addTranRawText("command.moderation.action", rawtextTranslate("command.moderation.warn"))
                .endline()
                .addTran("command.warn.amount", getWarns(targetPlayer)?.toString() ?? "0")
                .build()
        );
    })
    .register();
new Command()
    .setName("clearwarn")
    .setDescription(rawtextTranslate("command.clearwarn.description"))
    .setMinPermissionLevel(2)
    .addOption(rawtextTranslate("command.moderation.target"), rawtextTranslate("command.moderation.target.description"), "target", undefined, false)
    .onExecute(async (player, target) => {
        const targetPlayer = target as Player;
        // Finish the action
        if (!isWarned(targetPlayer)) return player.sendMessage(fastText().addText("§bMatrix§a+ §7> §c").addTran("command.moderation.clearwarn.failed").build());
        clearWarn(targetPlayer);
        world.sendMessage(fastText().addText("§bMatrix§a+ §7> §g").addTran("command.moderation.success", targetPlayer.name, player.name).endline().addTranRawText("command.moderation.action", rawtextTranslate("command.moderation.clearwarn")).build());
    })
    .register();
new Command()
    .setName("crash")
    .setDescription(rawtextTranslate("command.crash.description"))
    .setMinPermissionLevel(2)
    .addOption(rawtextTranslate("command.moderation.target"), rawtextTranslate("command.moderation.target.description"), "target", undefined, false)
    .onExecute(async (player, target) => {
        const targetPlayer = target as Player;
        crashPlayer(targetPlayer);
        const msg = fastText().addText("§bMatrix§a+ §7> §g").addTran("command.moderation.success", targetPlayer.name, player.name).endline().addTranRawText("command.moderation.action", rawtextTranslate("command.moderation.crash")).build();
        world.getPlayers({ excludeNames: [targetPlayer.name] }).forEach((p) => {
            p.sendMessage(msg);
        });
    })