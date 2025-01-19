import { Command, Module } from "../../matrixAPI";
import { fastText, rawtextTranslate } from "../../util/rawtext";
import { SHA256 } from "../../node_modules/crypto-es/lib/sha256";
import { Player, PlayerLeaveBeforeEvent, ScriptEventCommandMessageAfterEvent, system, world } from "@minecraft/server";

new Command()
    .setName("op")
    .setAliases("getop", "getadmin", "gainop", "gainadmin")
    .setMinPermissionLevel(0)
    .setDescription(rawtextTranslate("command.op.description"))
    .addShortDescription(rawtextTranslate("command.op.sd"))
    .addOption(rawtextTranslate("command.op.password"), rawtextTranslate("command.op.password.description"), "string", undefined, true)
    .onExecute(async (player, password) => {
        const config = Module.config;
        if (!!password != config.security.containsPassword) {
            if (password) {
                player.sendMessage(fastText().addText("§bMatrix§a+ §7> §c").addTran("command.op.statement.mismatch").build());
            } else {
                player.sendMessage(fastText().addText("§bMatrix§a+ §7> §c").addTran("command.op.statement.missing").build());
            }
            return;
        }
        if (player.isAdmin()) {
            player.sendMessage(fastText().addText("§bMatrix§a+ §7> §c").addTran("command.op.statement.already").build());
            return;
        }
        const timeStamp = player?.opCommandUsageTimestamp ?? 0;
        const now = Date.now();
        if (config.security.containsPassword) {
            if (now - timeStamp < 5000) {
                player.sendMessage(fastText().addText("§bMatrix§a+ §7> §c").addTran("command.op.overheat.password").build());
                return;
            }
            player.opCommandUsageTimestamp = now;
            const passwordCheck = isPasswordCorrect(password as string, config.security.passwordHash);
            if (passwordCheck) {
                player.setPermissionLevel(4);
                player.sendMessage(fastText().addText("§bMatrix§a+ §7> §g").addTran("command.op.success").build());
            } else {
                player.sendMessage(fastText().addText("§bMatrix§a+ §7> §c").addTran("command.op.incorrect").build());
            }
        } else {
            if (player?.opCommandIsVerifying) {
                player.sendMessage(fastText().addText("§bMatrix§a+ §7> §c").addTran("command.op.overheat.normal").build());
                return;
            }
            player.opCommandIsVerifying = true;
            const code = randomCode();
            const command = "/scriptevent matrix:verify " + code;
            const cancel = "/scriptevent matrix:verify_cancel";
            player.sendMessage(fastText().addText("§bMatrix§a+ §7> §g").addTran("command.op.start").build());
            await system.waitTicks(40);
            player.sendMessage(fastText().addText("§bMatrix§a+ §7> §g").addTran("command.op.require", command).build());
            player.sendMessage(fastText().addText("§7>> §g").addTran("command.op.require.cancel", cancel).build());
            let scriptCommandEvent: (arg: ScriptEventCommandMessageAfterEvent) => void;
            let playerLeaveBeforeEvent: (arg: PlayerLeaveBeforeEvent) => void;
            let timeoutEvent: number;
            scriptCommandEvent = system.afterEvents.scriptEventReceive.subscribe((event) => {
                if (!(event.sourceEntity as Player)?.opCommandIsVerifying) return;
                if (event.id == "matrix:verify") {
                    if (event.message == code) {
                        player.opCommandIsVerifying = false;
                        player.setPermissionLevel(4);
                        player.sendMessage(fastText().addText("§bMatrix§a+ §7> §g").addTran("command.op.verify.success").build());
                        world.beforeEvents.playerLeave.unsubscribe(playerLeaveBeforeEvent);
                        system.afterEvents.scriptEventReceive.unsubscribe(scriptCommandEvent);
                        system.clearRun(timeoutEvent);
                    } else {
                        player.sendMessage(fastText().addText("§bMatrix§a+ §7> §c").addTran("command.op.verify.failed").build());
                    }
                } else if (event.id == "matrix:verify_cancel") {
                    player.opCommandIsVerifying = false;
                    player.sendMessage(fastText().addText("§bMatrix§a+ §7> §g").addTran("command.op.verify.cancel").build());
                    world.beforeEvents.playerLeave.unsubscribe(playerLeaveBeforeEvent);
                    system.afterEvents.scriptEventReceive.unsubscribe(scriptCommandEvent);
                    system.clearRun(timeoutEvent);
                }
            });
            playerLeaveBeforeEvent = world.beforeEvents.playerLeave.subscribe((event) => {
                if (event.player.id == player.id) {
                    event.player.opCommandIsVerifying = false;
                    system.run(() => {
                        world.beforeEvents.playerLeave.unsubscribe(playerLeaveBeforeEvent);
                        system.afterEvents.scriptEventReceive.unsubscribe(scriptCommandEvent);
                        system.clearRun(timeoutEvent);
                    });
                }
            });
            timeoutEvent = system.runTimeout(() => {
                player.opCommandIsVerifying = false;
                world.beforeEvents.playerLeave.unsubscribe(playerLeaveBeforeEvent);
                system.afterEvents.scriptEventReceive.unsubscribe(scriptCommandEvent);
            }, 2400);
        }
    })
    .register();
function isPasswordCorrect(password: string, hash: string) {
    const passwordHash = SHA256(password).toString();
    return passwordHash == hash;
}

function randomCode() {
    const chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_";
    let code = "";
    for (let i = 0; i < 4; i++) {
        const randomIndex = Math.floor(Math.random() * chars.length);
        code += chars.charAt(randomIndex);
    }
    return code;
}
