import { Module, Command } from "../../matrixAPI";
import { fastText, rawtextTranslate } from "../../util/rawtext";

new Command()
    .setName("about")
    .setAliases("info", "version", "ver", "information", "uwu")
    .setMinPermissionLevel(0)
    .setDescription(rawtextTranslate("command.about.description"))
    .addShortDescription(rawtextTranslate("command.about.sd"))
    .onExecute(async (player) => {
        const aboutMessage = fastText()
            .addTran("command.about.title")
            .endline()
            .addTran("command.about.author")
            .endline()
            .addTran("command.about.github", "https://github.com/jasonlaubb/Matrix-AntiCheat/")
            .endline()
            .addTran("command.about.version", Module.version.join("."))
            .endline()
            .addTran("command.about.joindc", Module.discordInviteLink)
            .build();
        player.sendMessage(aboutMessage);
    })
    .register();
