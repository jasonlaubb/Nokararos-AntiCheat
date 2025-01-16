import * as log from "../../assets/logSystem";
import { Command } from "../../matrixAPI";
import { rawtextTranslate, fastText } from "../../util/rawtext";
new Command()
	.setName("fastlog")
	.setMinPermissionLevel(1)
	.setDescription(rawtextTranslate("command.fastlog.description"))
	.addOption(rawtextTranslate("command.log.day"), rawtextTranslate("command.log.day.description"), "choice", {
		arrayRange: [
			"today",
			"yesterday",
			"thedaybefore",
		],
	}, false)
	.onExecute(async (player, day) => {
		const selectedDay = day as "today" | "yesterday" | "thedaybefore";
		// Unfinished
	})
	.register();