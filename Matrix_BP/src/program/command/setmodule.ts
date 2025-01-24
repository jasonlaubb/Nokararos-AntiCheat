import { Command, Module, Config } from "../../matrixAPI";
import { fastText, rawtextTranslate } from "../../util/rawtext";

new Command()
    .setName("setmodule")
    .setAliases("module", "toggle", "settoggle", "togglemodule", "switch")
    .setMinPermissionLevel(2)
    .setDescription(rawtextTranslate("command.setmodule.description"))
    .addOption(rawtextTranslate("command.setmodule.module"), rawtextTranslate("command.setmodule.module.description"), "string")
    .addOption(rawtextTranslate("command.setmodule.state"), rawtextTranslate("command.setmodule.state.description"), "boolean")
    .onExecute(async (player, moduleName, state) => {
        const searchModule = Module.findRegisteredModule(moduleName! as string);
        if (!searchModule) {
            player.sendMessage(fastText().addText("§bMatrix§a+ §7> §c").addTran("command.setmodule.notfound").build());
            return;
        }
        const toggleId = searchModule.getToggleId()!;
        const isEnabled = Module.config.modules[toggleId]?.state;
        if (isEnabled === (state as boolean)) {
            if (isEnabled) {
                player.sendMessage(fastText().addText("§bMatrix§a+ §7> §c").addTran("command.setmodule.already").build());
            } else {
                player.sendMessage(fastText().addText("§bMatrix§a+ §7> §c").addTran("command.setmodule.disabled").build());
            }
            return;
        }
        if (isEnabled) {
            // Disable the module
            Config.set(["modules", toggleId], false);
            player.sendMessage(fastText().addText("§bMatrix§a+ §7> §g").addTran("command.setmodule.success.disabled").build());
            searchModule.disableModule();
        } else {
            Config.set(["modules", toggleId], true);
            player.sendMessage(fastText().addText("§bMatrix§a+ §7> §g").addTran("command.setmodule.success.enabled").build());
            searchModule.enableModule();
        }
    })
    .register();
