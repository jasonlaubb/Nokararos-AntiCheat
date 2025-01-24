import { Player, world } from "@minecraft/server";
import { Command } from "../../matrixAPI";
import { fastText, rawtextTranslate } from "../../util/rawtext";

new Command()
    .setName("setadmin")
    .setMinPermissionLevel(4)
    .setDescription(rawtextTranslate("command.setadmin.description"))
    .addOption(rawtextTranslate("command.moderation.target"), rawtextTranslate("command.moderation.target.description"), "player", undefined, false)
    .addOption(
        rawtextTranslate("command.setadmin.level"),
        rawtextTranslate("command.setadmin.level.description"),
        "integer",
        {
            lowerLimit: 0,
            upperLimit: 4,
        },
        false
    )
    .onExecute(async (player, player2, levelOption) => {
        const target = player2 as Player;
        const targetLevel = levelOption as number;
        const level = target.getPermissionLevel();
        if (level === targetLevel || level >= targetLevel) {
            player.sendMessage(fastText().addText("§bMatrix§a+ §7> §c").addTran("command.setadmin.failed").build());
        } else {
            target.setPermissionLevel(targetLevel);
            world.sendMessage(
                fastText()
                    .addText("§bMatrix§a+ §7> §g")
                    .addTranRawText(
                        "command.setadmin.success",
                        fastText()
                            .addText(target.name)
                            .addText(player.name)
                            .addTran("command.setadmin.level.display", targetLevel.toString())
                            .build()
                    )
                    .build()
            );
        }
    })
    .register();
