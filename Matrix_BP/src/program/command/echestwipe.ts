import { Player, system } from "@minecraft/server";
import { Command } from "../../matrixAPI";
import { fastText, rawtextTranslate } from "../../util/rawtext";

new Command()
	.setName("echestwipe")
	.setAliases("ecw", "enderchestwipe", "wipeenderchest", "clearenderchest", "clearechest", "wipeechest")
	.setMinPermissionLevel(1)
	.setDescription(rawtextTranslate("command.echestwipe.description"))
	.addOption(rawtextTranslate("command.moderation.target"), rawtextTranslate("command.moderation.target.description"), "target", undefined, false)
	.onExecute(async (player, target) => {
		const targetPlayer = target as Player;
		system.runJob(clearPlayerEnderchest(targetPlayer));
		player.sendMessage(fastText().addText("§bMatrix§a+ §7> §g").addTran("command.echestwipe.success", targetPlayer.name).build());
	})

function* clearPlayerEnderchest (player: Player): Generator<void, void, void> {
	for (let i = 0; i < 27; i++) {
		player.runCommand("replaceitem entity @s slot.enderchest " + i + " air");
		yield;
	}
}