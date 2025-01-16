import { Command } from "../../matrixAPI";
import { rawtext } from "../../util/rawtext";

new Command()
    .setName("unblink")
    .setMinPermissionLevel(0)
    .setDescription(rawtext({ text: "(Debug command) Use this command will remove you from unexpected blink (cannot interact with anything) instantly." }))
    .onExecute(async (player) => {
        player.runCommand("tp @s @s");
        player.sendMessage("§7(Debug command) §aUnblink command has been executed. Make sure you have disabled your blink client.");
    })
    .register();
