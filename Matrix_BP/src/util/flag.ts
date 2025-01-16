import { Player, RawText, world } from "@minecraft/server";
import { Module } from "../matrixAPI";
import { fastText, rawtext, rawtextTranslate } from "./rawtext";
import { ban, freeze, mute, softBan, strengthenKick, tempKick } from "../program/system/moderation";
import { write } from "../assets/logSystem";
export function setupFlagFunction() {
    Player.prototype.flag = function (detected: Module, data?: { [key: string]: (string | number | (string | number)[]) }) {
        const punishment = detected.modulePunishment;
        if (!punishment || this.isAdmin()) return;
        const config = Module.config;
        const flagMessage = fastText()
            .addTran("flag.detected.title")
            .endline()
            .addTran("flag.detected.player", this.name)
            .endline()
            .addTranRawText("flag.detected.module", detected.getName())
            .endline()
            .addTran("flag.detected.object", data?.t as string ?? "§eCLASSIC")
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
            })
        }
        world.sendMessage(flagMessage.build());
        if (bypass) return this.sendMessage("<debug> You are §aimmune§f to punishments, because you have §ematrix-debug:punishmentResistance§f tag.");
        try {
            switch (punishment) {
                case "kick":
                    strengthenKick(this);
                    break;
                case "tempKick":
                    tempKick(this);
                    break;
                case "freeze":
                    freeze(this, -1);
                    break;
                case "mute":
                    mute(this, -1);
                    break;
                case "softBan":
                    softBan(this, -1);
                    break;
                case "ban":
                    ban(this, Module.config.flag.banDuration, "[Auto Moderation]", "Using hack client, module: " + detected.getToggleId());
                    break;
            }
        } catch (error) {
            Module.sendError(error as Error);
            tempKick(this);
        }
    };
}
const nonePreset = rawtextTranslate("flag.detected.none");
function extractData(data: { [key: string]: (string | number | (string | number)[]) } | undefined, precision: number): RawText {
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
