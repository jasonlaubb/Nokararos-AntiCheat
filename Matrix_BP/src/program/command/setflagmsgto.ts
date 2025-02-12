import { Command } from "../../matrixAPI";
import { rawtextTranslate } from "../../util/rawtext";

new Command()
	.setName("setflagmsgto")
	.setMinPermissionLevel(3)
	.setAliases("flagmode", "setflagmesssagetarget", "fm")
	.setDescription(rawtextTranslate("command.setflagmsgto.description"))
	.addOption(rawtextTranslate("command.setflagmsgto.type"), rawtextTranslate("command.setflagmsgto.type.description"), "choice", {
		arrayRange: ["none", "all", "admin", "tag", "hidden"],
	}, false)
	.onExecute(async (player, type) => {
		const flagMode = type as string;
		player.runChatCommand(`set flag/flagMode ${flagMode}`);
	})