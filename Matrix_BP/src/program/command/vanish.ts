import { MinecraftEffectTypes } from "../../node_modules/@minecraft/vanilla-data/lib/index";
import { Command } from "../../matrixAPI";
import { fastText, rawtextTranslate } from "../../util/rawtext";

new Command()
    .setName("vanish")
    .setMinPermissionLevel(1)
    .setDescription(rawtextTranslate("command.vanish.description"))
    .onExecute(async (player) => {
        try {
            if (player.hasTag("matrix:vanished")) {
                player.removeEffect(MinecraftEffectTypes.Invisibility);
                player.removeTag("matrix:vanished");
                player.sendMessage(fastText().addText("§bMatrix§a+ §7> §g").addTran("command.vanish.deleted").build());
            } else {
                player.runCommand("effect give @s invisibility infinite 1 true");
                player.addTag("matrix:vanished");
                player.sendMessage(fastText().addText("§bMatrix§a+ §7> §g").addTran("command.vanish.success").build());
            }
        } catch {
            player.sendMessage(fastText().addText("§bMatrix§a+ §7> §c").addTran("command.vanish.failed").build());
        }
    })
    .register();
