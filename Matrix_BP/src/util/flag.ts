import { Player, RawText, world } from "@minecraft/server";
import { Module } from "../matrixAPI";
import { fastText, rawtext, rawtextTranslate } from "./rawtext";
import { banHandler, matrixKick, crashPlayer } from "../program/system/moderation";
import { write } from "../assets/logSystem";
export function setupFlagFunction() {
    Player.prototype.flag = function (detected: Module, data?: { [key: string]: string | number | (string | number)[] }) {
        if (this.isAdmin()) return;
        const config = Module.config;
        const configPunishment = config.modules[detected.getToggleId()!]?.punishment;
        const punishment = configPunishment === "default" ? detected?.punishment ?? "kick" : configPunishment;
        const flagMessage = fastText()
            .addTran("flag.detected.title")
            .endline()
            .addTran("flag.detected.player", this.name)
            .endline()
            .addTranRawText("flag.detected.module", detected.getName())
            .endline()
            .addTran("flag.detected.object", (data?.t as string) ?? "§eCLASSIC")
            .endline()
            .addRawText(extractData(data, config.customize.dataValueToPrecision))
            .endline()
            .addTran("flag.detected.punishment", punishment);
        if (config.customize.askWetherFalseFlag) flagMessage.endline().addTran("flag.detected.false");
        const bypass = this.hasTag("matrix-debug:punishmentResistance");
        if (config.logSettings.logAutoMod) {
            write(true, `§4${punishment} §8(Flag)`, this.name, {
                moduleId: detected.getToggleId() ?? `Unknown`,
                bypassed: bypass,
                ...data,
            });
        }
        if (bypass || punishment !== "crash") {
            world.sendMessage(flagMessage.build());
        } else {
            const build = flagMessage.build();
            world.getPlayers({ excludeNames: [this.name] }).forEach((p) => {
                p.sendMessage(build);
            });
        }
        if (bypass) return this.sendMessage("<debug> You are §aimmune§f to punishments, because you have §ematrix-debug:punishmentResistance§f tag.");
        try {
            switch (punishment) {
                case "kick": {
                    matrixKick(this, `Unfair advantage, moduleId: ${detected.getToggleId()}`, "[Auto Moderation]");
                    break;
                }
                case "crash": {
                    crashPlayer(this);
                    break;
                }
                case "ban": {
                    banHandler.ban(this, `Unfair advantage, moduleId: ${detected.getToggleId()}`, Module.config.customize.permanent, Module.config.customize.banMinute * 60000);
                    break;
                }
            }
        } catch (error) {
            Module.sendError(error as Error);
            crashPlayer(this);
        }
    };
}
const nonePreset = rawtextTranslate("flag.detected.none");
function extractData(data: { [key: string]: string | number | (string | number)[] } | undefined, precision: number): RawText {
    if (!data) return nonePreset;
    const dataExtract = Object.entries(data);
    const typeIndex = dataExtract.findIndex((data) => data[0] === "type" || data[0] === "t");
    if (typeIndex !== -1) dataExtract.splice(typeIndex, 1);
    if (dataExtract.length === 0) return nonePreset;
    const dataString = dataExtract
        .map(([key, value]) => {
            if (typeof value === "object") {
                value = value.map((v) => {
                    if (typeof v === "number" && !Number.isInteger(v)) {
                        return v.toPrecision(precision);
                    }
                    return '"' + v + '"';
                });
                value = "[" + value.join(", ") + "]";
            }
            if (typeof value === "number" && !Number.isInteger(value)) {
                value = value.toPrecision(precision);
            }
            return `      §f${key} §j§l|  §r§f${value}`;
        })
        .join("\n");
    return rawtext({ text: dataString });
}
