import { ChatSendBeforeEvent, Player, system, world } from "@minecraft/server";
import { Module, Command } from "../../matrixAPI";
import { fastText, rawtextTranslate } from "../../util/rawtext";
import { normalize } from "../../assets/latinNormalize";
import latinVocabarySet from "../../data/filter/latinVocabarySet";
import wordKeySet from "../../data/filter/wordKeySet";
new Module()
    .addCategory("utility")
    .setName(rawtextTranslate("module.chatrank.name"))
    .setDescription(rawtextTranslate("module.chatrank.description"))
    .setToggleId("chatRank")
    .onModuleEnable(() => {
        world.beforeEvents.chatSend.subscribe(onPlayerSendMessage);
    })
    .onModuleDisable(() => {
        spamData.clear();
        world.beforeEvents.chatSend.unsubscribe(onPlayerSendMessage);
    })
    .initPlayer((tickData, playerId) => {
        spamData.set(playerId, {
            lastMessages: {},
            lastMessageTime: 0,
        });
        return tickData;
    })
    .initClear((playerId) => {
        spamData.delete(playerId);
    })
    .register();
const MIN_SEND_INTERVAL = 5000;
const MAX_REPEAT_AMOUNT = 3;
const MAX_MESSAGE_LENGTH = 256;
function onPlayerSendMessage(event: ChatSendBeforeEvent) {
    const isCommandUsage = Command.isCommandArg(event.message);
    if (isCommandUsage) return;
    const { sender: player, message } = event;
    const messageNormalized = normalize(message);
    const isSpamming = chatSpamming(player, messageNormalized);
    if (isSpamming) {
        event.cancel = true;
        return;
    }
    const rankTag = player.getTags().find((tag) => tag.startsWith("matrix:rankTag::"));
    const ranks = rankTag ? rankTag.split("::")[1].split("//") : [Module.config.chatRank.defaultRank];
    const chatRankMessage = Module.config.chatRank.pattern.replace("%rank%", ranks.join(", ")).replace("%name%", player.name).replace("%message%", messageNormalized);
    system.run(() => {
        world.sendMessage(chatRankMessage);
    });
    event.cancel = true;
}
interface SpamData {
    lastMessages: Record<string, number>;
    lastMessageTime: number;
}
const spamData = new Map<string, SpamData>();
function chatSpamming(player: Player, message: string) {
    if (includeWordKeySet(message)) {
        sendBadWordMessage(player);
        return true;
    }
    const words = message.match(/^[a-zA-Z0-9]+$/g);
    if (words?.some((word) => includeLatinVocabarySet(word))) {
        sendBadWordMessage(player);
        return true;
    }

    const data = spamData.get(player.id)!;
    if (data.lastMessages.length <= 3) {
        data.lastMessages = {
            [message]: Date.now(),
        };
        spamData.set(player.id, data);
        return false;
    }
    const list = Object.entries(data.lastMessages).sort((a, b) => b[1] - a[1]);
    const previousMessages = getPrevious4Messages(list);
    if (previousMessages.some(([msg]) => msg === message)) return "1";
    const sendInterval = Date.now() - data.lastMessageTime;
    if (sendInterval < MIN_SEND_INTERVAL) {
        system.run(() => {
            player.sendMessage(
                fastText()
                    .addText("§bMatrix§a+ §7> §c")
                    .addTran("module.chatrank.slow", ((MIN_SEND_INTERVAL - sendInterval) * 0.001).toFixed(3))
                    .build()
            );
        });
        return true;
    }
    const repeatedAmount = repeatedPattern(message);
    if (repeatedAmount > MAX_REPEAT_AMOUNT || message.length > MAX_MESSAGE_LENGTH) {
        system.run(() => {
            player.sendMessage(fastText().addText("§bMatrix§a+ §7> §c").addTran("module.chatrank.repeated").build());
        });
        return true;
    }
    // Update the data
    data.lastMessages[message] = Date.now();
    data.lastMessageTime = Date.now();
    spamData.set(player.id, data);
    return false;
}
function repeatedPattern(message: string) {
    let count = 0;
    for (let i = 1; i < message.length; i++) {
        if (message[i] === message[i - 1]) count++;
    }
    return count;
}
function sendBadWordMessage(player: Player) {
    system.run(() => {
        player.sendMessage(fastText().addText("§bMatrix§a+ §7> §c").addTran("module.chatrank.bad").build());
    });
}
function getPrevious4Messages(lastMessages: [string, number][]) {
    return lastMessages.slice(0, 4);
}
function includeWordKeySet(message: string) {
    for (const key of wordKeySet) {
        if (message.includes(key)) return true;
    }
    return false;
}

function includeLatinVocabarySet(word: string) {
    return latinVocabarySet.has(word);
}
