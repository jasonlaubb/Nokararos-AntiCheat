import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import { Command, Module } from "../../matrixAPI";
import { fastText, rawtextTranslate } from "../../util/rawtext";
import { waitShowActionForm, waitShowModalForm } from "../../util/util";

new Command()
    .setName("listmodule")
    .setAliases("modules", "toggles", "showmodules", "showtoggles", "togglelist")
    .setMinPermissionLevel(2)
    .setDescription(rawtextTranslate("command.listmodule.description"))
    .onExecute(async (player) => {
        const listModule = new ActionFormData().title(fastText().addTran("command.listmodule.title").addText(" | Matrix Anticheat").build()).body(rawtextTranslate("command.listmodule.body")).button(rawtextTranslate("ui.exit"));
        const allModules = Module.registeredModule;
        allModules.forEach((module) => {
            const toggleId = module.getToggleId()!;
            const isEnabled = Module.config.modules[toggleId]?.state;
            const buttonColour = isEnabled ? "§l§2" : "§l§c";
            listModule.button(fastText().addText(buttonColour).addRawText(module.getName()).endline().addText("§r§8").addTran(module.getToggleId()!).build());
        });
        player.sendMessage(rawtextTranslate("ui.closechat"));
        const result = await waitShowActionForm(listModule, player);
        if (!result || result.canceled || result.selection! == 0) return;
        const selectedModule = allModules[result.selection! - 1]!;
        const ui = new ModalFormData()
            .title(rawtextTranslate("command.listmodule.toggle.title"))
            .dropdown(
                fastText().addTran("command.listmodule.toggle.body").endline().addRawText(selectedModule.getName()).addText(": ").addRawText(selectedModule.getDescription()).endline().addTran("command.listmodule.toggle.state").build(),
                [rawtextTranslate("command.listmodule.toggle.disable"), rawtextTranslate("command.listmodule.toggle.enable")],
                0
            )
            .submitButton(rawtextTranslate("ui.runcommand"));
        waitShowModalForm(ui, player).then((result) => {
            if (!result || result.canceled) return;
            const state = result.formValues![0]!;
            const toggleId = selectedModule.getToggleId()!;
            // For the command handler, 0 & 1 can be used as false & true
            player.runChatCommand(`setmodule ${toggleId} ${state}`);
        });
    })
    .register();
