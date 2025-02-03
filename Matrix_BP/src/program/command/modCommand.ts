import { Command } from "../../matrixAPI";
import { fastText, rawtextTranslate } from "../../util/rawtext";
import { banHandler, matrixKick, crashPlayer, muteHandler } from "../system/moderation";
import { Player, world } from "@minecraft/server";
new Command()
	.setName("ban")
	.setMinPermissionLevel(2)
	.setDescription(rawtextTranslate("command.ban.description"))
	.addOption(rawtextTranslate("command.moderation.target"), rawtextTranslate("command.moderation.target.description"), "target", undefined, false)
	.addOption(rawtextTranslate("command.moderation.reason"), rawtextTranslate("command.moderation.reason.description"), "string", undefined, true)
	.addOption(rawtextTranslate("command.moderation.duration"), rawtextTranslate("command.moderation.duration.description"), "integer", {
		lowerLimit: 15,
	}, true)
	.onExecute(async (player, target, reason, time) => {
		const targetPlayer = target as Player;
		banHandler.ban(targetPlayer, player.name, !time, time ? (time as number) * 60000 : undefined, reason as string);
		world.sendMessage(rawtextTranslate("command.ban.finish", targetPlayer.name, player.name));
	})
	.register();
new Command()
	.setName("unban")
	.setMinPermissionLevel(2)
	.setDescription(rawtextTranslate("command.unban.description"))
	.addOption(rawtextTranslate("command.moderation.target"), rawtextTranslate("command.moderation.target.description"), "string", undefined, false)
	.onExecute(async (player, target) => {
		const targetPlayer = target as string;
		if (!banHandler.unban(targetPlayer)) {
			player.sendMessage(rawtextTranslate("command.unban.notfound", targetPlayer));
			return;
		};
		world.sendMessage(rawtextTranslate("command.unban.finish", targetPlayer, player.name));
	})
	.register();
new Command()
	.setName("banlist")
	.setMinPermissionLevel(1)
	.setDescription(rawtextTranslate("command.banlist.description"))
	.onExecute(async (player) => {
		const bannedPlayer = banHandler.bannedList();
		if (bannedPlayer.length === 0) {
			player.sendMessage(fastText().addText("§bMatrix§a+ §7> §g").addTran("command.banlist.empty").build());
			return;
		};
		player.sendMessage(fastText().addText("§bMatrix§a+ §7> §g").addTran("command.banlist.banned", bannedPlayer.length.toString(), bannedPlayer.join(", ")).build());
	})
	.register();
new Command()
	.setName("kick")
	.setMinPermissionLevel(2)
	.setDescription(rawtextTranslate("command.kick.description"))
	.addOption(rawtextTranslate("command.moderation.target"), rawtextTranslate("command.moderation.target.description"), "target", undefined, false)
	.addOption(rawtextTranslate("command.moderation.reason"), rawtextTranslate("command.moderation.reason.descriotion"), "string", undefined, true)
	.onExecute(async (player, target, reason) => {
		const targetPlayer = target as Player;
		matrixKick(targetPlayer, reason as string, player.name);
		world.sendMessage(rawtextTranslate("command.kick.finish", targetPlayer.name, player.name));
	})
	.register();
new Command()
	.setName("crash")
	.setMinPermissionLevel(2)
	.setDescription(rawtextTranslate("command.crash.description"))
	.addOption(rawtextTranslate("command.moderation.target"), rawtextTranslate("command.moderation.target.description"), "target", undefined, false)
	.onExecute(async (player, target) => {
		const targetPlayer = target as Player;
		crashPlayer(targetPlayer);
		world.sendMessage(rawtextTranslate("command.crash.finish", targetPlayer.name, player.name));
	})
	.register();
new Command()
	.setName("mute")
	.setMinPermissionLevel(2)
	.setDescription(rawtextTranslate("command.mute.description"))
	.addOption(rawtextTranslate("command.moderation.target"), rawtextTranslate("command.moderation.target.description"), "target", undefined, false)
	.addOption(rawtextTranslate("command.moderation.duration"), rawtextTranslate("command.moderation.duration.description"), "integer", {
		lowerLimit: 1,
	}, false)
	.onExecute(async (player, target, time) => {
		const targetPlayer = target as Player;
		muteHandler.mute(targetPlayer, (time as number) * 60000);
		world.sendMessage(rawtextTranslate("command.mute.finish", targetPlayer.name, player.name));
	})
	.register();
new Command()
	.setName("unmute")
	.setMinPermissionLevel(2)
	.setDescription(rawtextTranslate("command.unmute.description"))
	.addOption(rawtextTranslate("command.moderation.target"), rawtextTranslate("command.moderation.target.description"), "target", undefined, false)
	.onExecute(async (player, target) => {
		const targetPlayer = target as Player;
		if (!muteHandler.isMuted(targetPlayer)) {
			player.sendMessage(rawtextTranslate("command.unmute.notfound", targetPlayer.name));
			return;
		};
		muteHandler.unmute(targetPlayer);
		world.sendMessage(rawtextTranslate("command.unmute.finish", targetPlayer.name, player.name));
	})
	.register();