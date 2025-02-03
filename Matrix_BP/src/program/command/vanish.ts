import { MinecraftEffectTypes } from "../../node_modules/@minecraft/vanilla-data/lib/index";
import { Command } from "../../matrixAPI";
import { fastText, rawtextTranslate } from "../../util/rawtext";
import { system } from "@minecraft/server";

new Command()
    .setName("vanish")
    .setMinPermissionLevel(1)
    .setDescription(rawtextTranslate("command.vanish.description"))
    .onExecute(async (player) => {
        try {
            if (player.hasTag("matrix:vanished")) {
                player.removeTag("matrix:vanished");
                if (!player.removeEffect(MinecraftEffectTypes.Invisibility)) {
                    system.run(() => player.runChatCommand("vanish"));
                    return;
                };
                player.sendMessage(fastText().addText("§bMatrix§a+ §7> §g").addTran("command.vanish.deleted").build());
            } else {
                player.addEffect(MinecraftEffectTypes.Invisibility, 20000000, { showParticles: false });
                player.addTag("matrix:vanished");
                player.sendMessage(fastText().addText("§bMatrix§a+ §7> §g").addTran("command.vanish.success").build());
            }
        } catch {
            player.sendMessage(fastText().addText("§bMatrix§a+ §7> §c").addTran("command.vanish.failed").build());
        }
    })
    .register();
