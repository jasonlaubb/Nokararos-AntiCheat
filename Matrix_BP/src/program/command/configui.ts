import { Player } from "@minecraft/server";
import { Config } from "../../matrixAPI";
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import { fastText, rawtextTranslate } from "../../util/rawtext";
import { Command } from "../../matrixAPI";
import { waitShowActionForm } from "../../util/util";
async function configUI(player: Player, path?: string[]) {
    if (!path) {
        selector(player, []);
        return;
    }
    const pvalue = Config.get(path);
    if (typeof pvalue == "string" || typeof pvalue == "number" || typeof pvalue == "boolean" || pvalue === undefined) {
        editor(player, path);
    } else {
        selector(player, path);
    }
}
function selector(player: Player, path: string[]) {
    const object = Config.get(path)!;
    const lulka = Object.entries(object).map((entries): [string, string] => {
        if (entries[1] === undefined) {
            entries[1] = "§cundefined";
        } else if (typeof entries[1] == "object") {
            entries[1] = "Object";
        } else if (typeof entries[1] == "string") {
            entries[1] = `"${entries[1].replace(/§(.)/g, `\§$1`)}"`;
        } else {
            entries[1] = String(entries[1]);
        }
        return entries as [string, string];
    });

    const selectform = new ActionFormData().title(rawtextTranslate("ui.config.selector")).body(fastText().addTran("ui.config.loc", path.join("/")).build());

    for (const [key, value] of lulka) {
        selectform.button(`§g§l${key}§r\n§8${value}§r`);
    }
    selectform.button(rawtextTranslate("ui.exit"), "textures/ui/redX1.png");
    //@ts-expect-error
    selectform.show(player).then((data) => {
        if (data.canceled) return;
        const selection = lulka[data.selection!];
        if (!selection) return;
        configUI(player, [...path, selection[0]]).catch((e) => Command.sendErrorToPlayer(player, e));
    });
}
async function editor(player: Player, path: string[]) {
    const type = typeof Config.get(path)!;
    const form = new ModalFormData().title(rawtextTranslate("ui.config.editor"));
    switch (type) {
        case "string": {
            form.textField(rawtextTranslate("ui.config.value"), "string");
            break;
        }
        case "number": {
            form.textField(rawtextTranslate("ui.config.value"), "number");
            break;
        }
        case "boolean": {
            form.dropdown(rawtextTranslate("ui.config.value"), ["FALSE (0)", "TRUE (1)"]);
            break;
        }
        default: {
            throw new Error("Type Error: Undefined case");
        }
    }
    //@ts-expect-error
    form.show(player).then((data) => {
        if (data.canceled) return;
        let value = data.formValues![0] as string | number;
        if (typeof value == "number") value = value == 0 ? "false" : "true";
        // Run the config set command.
        if (value?.includes(" ")) {
            player.runChatCommand(`set ${path.join("/")} "${value}"`);
        } else player.runChatCommand(`set ${path.join("/")} ${value}`);
    });
}

new Command()
    .setName("configui")
    .setMinPermissionLevel(1)
    .addShortDescription(rawtextTranslate("command.configui.sd"))
    .setDescription(rawtextTranslate("command.configui.description"))
    .onExecute(async (player) => {
        player.sendMessage(rawtextTranslate("ui.closechat"));
        const form = new ActionFormData().title(rawtextTranslate("ui.config.title")).body(rawtextTranslate("ui.config.body")).button(rawtextTranslate("ui.config.button"));
        const result = await waitShowActionForm(form, player);
        if (!result || result.canceled) return;
        configUI(player).catch((e) => Command.sendErrorToPlayer(player, e));
    })
    .register();
