import { PlayerSpawnAfterEvent, world } from "@minecraft/server";
import { Module } from "../../matrixAPI";
import { rawtextTranslate } from "../../util/rawtext";

const MIN_NAME_LENGTH = 3;
const MAX_NAME_LENGTH = 16;

const namespoof = new Module()
    .addCategory("detection")
    .setName(rawtextTranslate("module.namespoof.name"))
    .setDescription(rawtextTranslate("module.namespoof.description"))
    .setToggleId("antiNamespoof")
    .setPunishment("crash")
    .onModuleEnable(() => {
        world.afterEvents.playerSpawn.subscribe(playerSpawn);
    })
    .onModuleDisable(() => {
        world.afterEvents.playerSpawn.unsubscribe(playerSpawn);
    });

namespoof.register();

/**
 * @author jasonlaubb
 * @description Anti namespoof... just as same as the module name "Anti namespoof".
 */
function playerSpawn({ player, initialSpawn }: PlayerSpawnAfterEvent) {
    if (!initialSpawn || player.isAdmin()) return;

    const name = player.name;
    if (name.length < MIN_NAME_LENGTH || name.length > MAX_NAME_LENGTH) {
        player.flag(namespoof, { t: "1", nameLength: name.length });
        return;
    }

    const isValidXboxName = isValidName(name);

    if (!isValidXboxName) {
        player.flag(namespoof, { t: "2" });
    }
}
/**
 * @description The supported characters.
 * @data
 * Latin-1 Supplement: \u00C0-\u017F
 * Latin Extended-A: \u0180-\u024F
 * Hangul: \uAC00-\uD7A3
 * Katakana: \u3040-\u309F
 * Hiragana: \u30A0-\u30FF
 * Full-width Latin characters: \uFF66-\uFF9D
 * Half-width Katakana: \u31F0-\u31FF
 * CJK Unified Ideographs (Chinese, Japanese, Korean): \u4E00-\u9FFF
 * Bengali: \u0980-\u09FF
 * Devanagari: \u0900-\u097F
 * Cyrillic: \u0400-\u04FF
 * Greek: \u0370-\u03FF
 * Thai: \u0E00-\u0E7F
 */
const validRange = /[\u00C0-\u017F\u0180-\u024F\uAC00-\uD7A3\u3040-\u309F\u30A0-\u30FF\uFF66-\uFF9D\u31F0-\u31FF\u4E00-\u9FFF\u0980-\u09FF\u0900-\u097F\u0400-\u04FF\u0370-\u03FF\u0E00-\u0E7F]/g;
const nonASCIIRegex = /^[^a-zA-Z0-0_\s]+$/g;
function isValidName(name: string): boolean {
    const nonASCII = name.match(nonASCIIRegex);
    if (nonASCII === null) return true;
    return nonASCII.every((char) => {
        return validRange.test(char);
    });
}
