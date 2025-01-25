import { Player, RawText, system, world } from "@minecraft/server";
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import defaultConfig from "./data/config";
import { fastText, rawtext, rawtextTranslate } from "./util/rawtext";
import { Punishment, strengthenKick } from "./program/system/moderation";
import { write } from "./assets/logSystem";
import program from "./program/import";
// The class that store the tick event that is handled by the Module class
export class IntegratedSystemEvent {
    private func: Function;
    // For state wether include admin or not.
    public booleanData?: boolean;
    public constructor(func: Function) {
        this.func = func;
    }
    public removeFromList(list: IntegratedSystemEvent[]) {
        const index = list.indexOf(this);
        if (index == -1) return list;
        list.splice(index, 1);
        return list;
    }
    public pushToList(list: IntegratedSystemEvent[]) {
        const index = list.indexOf(this);
        if (index != -1) return list;
        list.push(this);
        return list;
    }
    public get moduleFunction() {
        return this.func;
    }
}
/**
 * @author jasonlaubb
 * @description The core system of Matrix AntiCheat.
 * @license AGPL-3.0
 * @link https://github.com/jasonlaubb/Matrix-AntiCheat/
 * @warn You are not allowed to copy or modify this system unless you have declared yours as a fork from us.
 */
class Module {
    public static readonly version: [number, number, number] = [6, 0, 31];
    public static readonly discordInviteLink = "CqZGXeRKPJ";
    public static isInitialized: boolean = false;
    // The var of index runtime
    public static moduleList: Module[] = [];
    public static playerLoopRunTime: IntegratedSystemEvent[] = [];
    public static tickLoopRunTime: IntegratedSystemEvent[] = [];
    // Types
    public static readonly Config = typeof defaultConfig;
    // Properties of module
    public toggleId!: string;
    public name: RawText = rawtext({ text: "§cUnknown§r" });
    public description!: RawText;
    public category: string = "§cUnknown§r";
    public locked: boolean = false;
    public onEnable!: () => void;
    public onDisable!: () => void;
    public playerSpawn?: (playerId: string, player: Player) => void;
    public playerLeave?: (playerId: string) => void;
    public enabled: boolean = false;
    public punishment?: Punishment;
    // This is the constructor of antiCheat
    public constructor() {}
    // For other uses
    public getCategory() {
        return this.category;
    }
    public getToggleId() {
        return this.locked ? null : this.toggleId;
    }
    public getName() {
        return this.name;
    }
    public getDescription() {
        return this.description;
    }
    // Builder
    public setToggleId(id: string) {
        this.toggleId = id;
        return this;
    }
    public setName(name: RawText) {
        this.name = name;
        return this;
    }
    public setDescription(description: RawText) {
        this.description = description;
        return this;
    }
    public setPunishment(punishment: Punishment) {
        this.punishment = punishment;
        return this;
    }
    public addCategory(category: string) {
        this.category = category;
        return this;
    }
    public onModuleEnable(func: () => void) {
        this.onEnable = func;
        return this;
    }
    public initPlayer(func: (playerId: string, player: Player) => void) {
        this.playerSpawn = func;
        return this;
    }
    public initClear(func: (playerId: string) => void) {
        this.playerLeave = func;
        return this;
    }
    public onModuleDisable(func: () => void) {
        this.onDisable = func;
        return this;
    }
    public lockModule() {
        this.locked = true;
        return this;
    }
    public register() {
        Module.moduleList.push(this);
    }
    public enableModule() {
        if (this.enabled || this.locked) return;
        this.enabled = true;
        if (this.playerSpawn) {
            for (const player of Module.allWorldPlayers) {
                this.playerSpawn(player.id, player);
            }
        }
        this.onEnable();
    }
    public disableModule() {
        if (!this.enabled || this.locked) return;
        this.enabled = false;
        this.onDisable();
    }
    public get modulePunishment() {
        return this.punishment;
    }
    public static subscribePlayerTickEvent(func: (player: Player) => void, includeAdmin: boolean = true) {
        const event = new IntegratedSystemEvent(func);
        event.booleanData = includeAdmin;
        Module.playerLoopRunTime = event.pushToList(Module.playerLoopRunTime);
        return event;
    }
    public static clearPlayerTickEvent(func: IntegratedSystemEvent) {
        Module.playerLoopRunTime = func.removeFromList(Module.playerLoopRunTime);
    }
    public static subscribeTickEvent(func: () => void) {
        const event = new IntegratedSystemEvent(func);
        Module.tickLoopRunTime = event.pushToList(Module.tickLoopRunTime);
        return event;
    }
    public static clearTickEvent(func: IntegratedSystemEvent) {
        Module.tickLoopRunTime = func.removeFromList(Module.tickLoopRunTime);
    }
    public static ignite() {
        setupFlagFunction();
        // Disable Watchdog Timing Warnings
        system.beforeEvents.watchdogTerminate.subscribe((event) => {
            try {
                event.cancel = true;
            } catch {
                system.run(() => Module.sendError(new Error("index.js :: Failed to load @minecraft/debug-utilities")));
            }
        });
        // Run when the world fires
        world.afterEvents.worldInitialize.subscribe(async () => {
            const currentTime = Date.now();
            system.runJob(loadModuleRegistry());
            new Promise<void>((resolve) => {
                const id = system.runInterval(() => {
                    if (!Module.isInitialized) return;
                    system.clearRun(id);
                    resolve();
                }, 1);
            }).then(() => {
                logRestart();
                console.log(`Matrix+ AntiCheat has been initialized in ${Date.now() - currentTime}ms | Author: jasonlaubb`);
            });
        });
    }
    public static currentPlayers: Player[] = [];
    public static get allWorldPlayers() {
        return Module.currentPlayers;
    }
    public static get allNonAdminPlayers() {
        return Module.currentPlayers.filter((player) => !player.isAdmin());
    }
    // Dynamic config system
    public static get config() {
        return Config.modifiedConfig;
    }
    public static get registeredModule() {
        return Module.moduleList.filter((module) => !module.locked);
    }
    public static findRegisteredModule(id: string) {
        return Module.registeredModule.find((module) => module.toggleId == id);
    }
    public static sendError(error: Error) {
        console.warn(`[Error] ${error.name}: ${error.message} : ${error?.stack ?? "Unknown"}`);
    }
}
/**
 * @author jasonlaubb
 * @description The command handler of Matrix AntiCheat.
 * @license AGPL-3.0
 * @link https://github.com/jasonlaubb/Matrix-AntiCheat/
 * @warn You are not allowed to copy or modify this system unless you have declared yours as a fork from us.
 */
class Command {
    public constructor() {}
    private static registeredCommands: Command[] = [];
    // The regular expression for the command.
    private static readonly optionMatchRegExp = /(@{0,1}".+")|(\S+)/g;
    public static readonly OptionInputType: OptionTypes;
    public availableId: string[] = [];
    public minLevel = 0;
    public requiredOption: InputOption[] = [];
    public optionalOption: InputOption[] = [];
    public executeFunc?: (player: Player, ...args: (string | number | Player | boolean | undefined)[]) => Promise<void>;
    public subCommands?: Command[];
    public description: RawText = rawtext({ text: "§cUnknown§r" });
    public shortDescription: RawText | null = null;
    public setName(name: string) {
        this.availableId.push(name);
        return this;
    }
    public setDescription(description: RawText) {
        this.description = description;
        return this;
    }
    public setAliases(...aliases: string[]) {
        this.availableId.push(...aliases);
        return this;
    }
    public setMinPermissionLevel(level: number) {
        this.minLevel = level;
        return this;
    }
    public addShortDescription(sd: RawText) {
        this.shortDescription = sd;
        return this;
    }
    public addOption(name: RawText, description: RawText, type: OptionTypes, typeInfo?: undefined | TypeInfo, optional = false) {
        // Error prevention
        switch (type) {
            case "code":
            case "purecode": {
                if (typeInfo?.lowerLimit) break;
                throw new Error("Command :: pure code and code required lower limit");
            }
            case "string":
            case "number":
            case "integer": {
                if (!typeInfo || typeInfo?.upperLimit || typeInfo?.lowerLimit) break;
                throw new Error("Command :: number and integer required upper limit or lower limit if exists");
            }
            case "player":
            case "target":
            case "boolean": {
                if (!typeInfo) break;
                throw new Error("Command :: unexpected typeInfo property");
            }
            case "choice": {
                if (typeInfo?.arrayRange) break;
                throw new Error("Command :: choice required arrayRange");
            }
        }
        if (optional) {
            this.optionalOption.push({ name, description, type, typeInfo });
        } else {
            this.requiredOption.push({ name, description, type, typeInfo });
        }
        return this;
    }
    public addSubCommand(command: Command) {
        this.subCommands?.push(command);
        return this;
    }
    public onExecute(executeFunc: (player: Player, ...args: (string | number | Player | boolean | undefined)[]) => Promise<void>) {
        this.executeFunc = executeFunc;
        return this;
    }
    public register() {
        Command.registeredCommands.push(this);
    }
    public static initialize() {
        Player.prototype.runChatCommand = function (commandString: string) {
            const args = commandString
                .trim()
                .match(Command.optionMatchRegExp)
                ?.map((arg) => {
                    if (arg.startsWith('"') && arg.endsWith('"')) return arg.slice(1, -1);
                    return arg;
                });
            if (!args) {
                this.sendMessage(rawtext({ text: "§bMatrix§a+ §7> §c" }, { translate: "commandsynax.empty", with: [] }));
                return;
            }
            const command = Command.searchCommand(args[0]);
            if (!command) {
                this.sendMessage(rawtext({ text: "§bMatrix§a+ §7> §c" }, { translate: "commandsynax.unknown", with: [args[0]] }));
                return;
            }
            if (Module.config.command[command.availableId[0]] === false) {
                this.sendMessage(rawtext({ text: "§bMatrix§a+ §7> §c" }, { translate: "commandsynax.disabled", with: [command.availableId[0]] }));
                return;
            }
            if (this.getPermissionLevel() < command.minLevel) {
                this.sendMessage(rawtext({ text: "§bMatrix§a+ §7> §c" }, { translate: "commandsynax.permission", with: [command.minLevel.toString()] }));
                return;
            }
            if (command?.subCommands) {
                if (args.length < 2) {
                    this.sendMessage(rawtext({ text: "§bMatrix§a+ §7> §c" }, { translate: "commandsynax.missing.subcommand", with: [] }));
                } else {
                    const targetSubCommand = command.subCommands.find((subCommand) => subCommand.availableId.includes(args[1]));
                    if (targetSubCommand) {
                        const argValues = Command.getArgValue(args, targetSubCommand, this);
                        if (argValues === null) return;
                        if (Module.config.logSettings.logCommandUsage) {
                            write(false, `§1${command.availableId[0]} §7(ChatCMD)`, this.name, {
                                executedCommand: commandString,
                            });
                        }
                        if (targetSubCommand?.executeFunc) {
                            targetSubCommand.executeFunc(this, ...args.slice(2)).catch((error) => Module.sendError(error as Error));
                        }
                    } else {
                        this.sendMessage(rawtext({ text: "§bMatrix§a+ §7> §c" }, { translate: "commandsynax.unknownsubcommand", with: [args[1]] }));
                    }
                }
            } else {
                const argValues = Command.getArgValue(args, command, this);
                if (argValues === null) return;
                if (Module.config.logSettings.logCommandUsage) {
                    if (["op", "setpassword"].includes(command.availableId[0])) {
                        commandString = `${args[0]} ****`;
                    }
                    write(false, `§1${command.availableId[0]} §8(ChatCMD)`, this.name, {
                        executedCommand: commandString,
                    });
                }
                if (command?.executeFunc) {
                    command.executeFunc(this, ...argValues).catch((error) => Command.sendErrorToPlayer(this, error as Error));
                }
            }
        };
        world.beforeEvents.chatSend.subscribe((event) => {
            // Checks if player is trying to use a command.
            const isCommand = Command.isCommandArg(event.message);
            if (isCommand) {
                event.cancel = true;
                system.run(() => event.sender.runChatCommand(event.message.slice(1)));
                return;
            } else if (!event.sender.isAdmin() && Module.config.extraBlockOnSpammer) {
                if (event.message.match(/(\n)|(\r)/)) {
                    event.cancel = true;
                } else {
                    const player = event.sender;
                    system.run(() => {
                        if (!player?.isValid()) return;
                        // This isMoving is better than animationController isMoving, no false positive on that .u.
                        if (player.isMoving()) {
                            strengthenKick(player, "Spammer is not allowed");
                        }
                    });
                }
            }
        });
    }
    public static isCommandArg(message: string): boolean {
        return !!message?.match(/^(\-|\!|\#|\$|\.|\=|\+|\?)[a-zA-Z]+(\s{1,2}\S+)*\s*$/g);
    }
    public static sendErrorToPlayer(player: Player, error: Error) {
        player.sendMessage(
            fastText()
                .addTran("error.happened")
                .endline()
                .addTran("error.name", error.name)
                .endline()
                .addTran("error.description", error.message)
                .endline()
                .addTran("error.stack", error?.stack ?? "§cUnknown§r")
                .build()
        );
    }
    private static getArgValue(args: string[], command: Command, player: Player): (string | number | Player | boolean | undefined)[] | null {
        if (args.length == 0) return [];
        const values = [];
        let currentIndex = 0;
        for (const option of command.requiredOption) {
            currentIndex++;
            const arg = args[currentIndex];
            if (!arg || arg.length === 0) {
                player.sendMessage(rawtext({ text: "§bMatrix§a+ §7> §c" }, { translate: "commandsynax.missing", with: { rawtext: [option.name] } }));
                player.sendMessage(rawtextTranslate("commandsynax.tips"));
                return null;
            }
            const beforeArgs = args.slice(0, currentIndex).join(" ");
            const afterArgs = args.slice(currentIndex + 1).join(" ");
            const value = Command.parseOption(player, option, arg, beforeArgs, afterArgs);
            if (value === null) return null;
            values.push(value);
        }
        for (const option of command.optionalOption) {
            currentIndex++;
            const arg = args[currentIndex];
            if (!arg) {
                values.push(undefined);
                break;
            }
            const beforeArgs = args.slice(0, currentIndex).join(" ");
            const afterArgs = args.slice(currentIndex + 1).join(" ");
            const value = Command.parseOption(player, option, arg, beforeArgs, afterArgs);
            if (value === null) return null;
            values.push(value);
        }
        return values;
    }
    private static parseOption(player: Player, option: InputOption, arg: string, beforeArgs: string, afterArgs: string) {
        switch (option.type) {
            case "string": {
                if (option?.typeInfo) {
                    if (option.typeInfo.lowerLimit && arg.length < option.typeInfo.lowerLimit) {
                        Command.sendSyntaxErrorMessage(player, "commandsynax.syntax.string.low", option.name, beforeArgs, arg, afterArgs, option.typeInfo.lowerLimit.toString());
                        return null;
                    }
                    if (option.typeInfo.upperLimit && arg.length > option.typeInfo.upperLimit) {
                        Command.sendSyntaxErrorMessage(player, "commandsynax.syntax.string.high", option.name, beforeArgs, arg, afterArgs, option.typeInfo.upperLimit.toString());
                        return null;
                    }
                }
                return arg;
            }
            case "boolean": {
                switch (arg) {
                    case "true":
                    case "enable":
                    case "yes":
                    case "1": {
                        return true;
                    }
                    case "false":
                    case "disable":
                    case "no":
                    case "0": {
                        return false;
                    }
                    default: {
                        player.sendMessage("arg not okay: " + arg + " and also" + arg);
                        Command.sendSyntaxErrorMessage(player, "commandsynax.syntax.boolean", option.name, beforeArgs, arg, afterArgs);
                        return null;
                    }
                }
            }
            case "number":
            case "integer": {
                const number = Number(arg);
                const notNumber = Number.isNaN(number);
                if (option.type == "integer" && (notNumber || !Number.isInteger(number))) {
                    Command.sendSyntaxErrorMessage(player, "commandsynax.syntax.integer.nan", option.name, beforeArgs, arg, afterArgs);
                    return null;
                }
                if (notNumber) {
                    Command.sendSyntaxErrorMessage(player, "commandsynax.syntax.number.nan", option.name, beforeArgs, arg, afterArgs);
                    return null;
                }
                if (option?.typeInfo) {
                    if (option.typeInfo?.lowerLimit && number < option.typeInfo.lowerLimit) {
                        Command.sendSyntaxErrorMessage(player, "commandsynax.syntax.number.low", option.name, beforeArgs, arg, afterArgs, option.typeInfo.lowerLimit.toString());
                        return null;
                    }
                    if (option.typeInfo?.upperLimit && number > option.typeInfo.upperLimit) {
                        Command.sendSyntaxErrorMessage(player, "commandsynax.syntax.number.high", option.name, beforeArgs, arg, afterArgs, option.typeInfo.upperLimit.toString());
                        return null;
                    }
                }
                return number;
            }
            case "purecode":
            case "code": {
                if (arg.length != option.typeInfo?.lowerLimit) {
                    Command.sendSyntaxErrorMessage(player, "commandsynax.syntax.code", option.name, beforeArgs, arg, afterArgs, option.typeInfo!.lowerLimit!.toString());
                    return null;
                }
                if (option.type == "purecode" && !/$[a-zA-Z0-9]+^/g.test(arg)) {
                    Command.sendSyntaxErrorMessage(player, "commandsynax.syntax.purecode", option.name, beforeArgs, arg, afterArgs);
                    return null;
                }
                return arg;
            }
            case "choice": {
                if (option.typeInfo?.arrayRange && !option.typeInfo.arrayRange.includes(arg)) {
                    Command.sendSyntaxErrorMessage(player, "commandsynax.syntax.choice", option.name, beforeArgs, arg, afterArgs, option.typeInfo.arrayRange.join(", "));
                    return null;
                }
                return arg;
            }
            case "target":
            case "player": {
                const targetName = arg.startsWith("@") ? arg.substring(1) : arg;
                const worldPlayers = world.getPlayers({ name: targetName });
                if (worldPlayers.length == 0 || (option.type == "target" && (worldPlayers[0].isAdmin() || player.id === worldPlayers[0].id))) {
                    Command.sendSyntaxErrorMessage(player, "commandsynax.syntax.player", option.name, beforeArgs, arg, afterArgs);
                    return null;
                }
                return worldPlayers[0];
            }
        }
    }
    private static sendSyntaxErrorMessage(player: Player, key: string, optionName: RawText, beforeArgs: string, arg: string, afterArgs: string, extraInfo?: string) {
        const stringInput = [optionName, { text: beforeArgs }, { text: arg }, { text: afterArgs }];
        if (extraInfo) stringInput.push({ text: extraInfo });
        player.sendMessage(rawtext({ text: "§bMatrix§a+ §7> §c" }, { translate: key, with: { rawtext: stringInput } }));
        player.sendMessage(rawtextTranslate("commandsynax.tips"));
    }
    public static searchCommand(command: string) {
        command = command.toLowerCase();
        return Command.registeredCommands.find((commandClass) => commandClass.availableId.includes(command));
    }
    public static get allCommands() {
        return this.registeredCommands;
    }
    public static typeTransferKey(type: OptionTypes) {
        return "command.help.option." + type;
    }
}
export class DirectPanel {
    private constructor() {}
    public static async open(player: Player) {
        const ui = new ActionFormData().title(rawtextTranslate("directpanel.title")).body(rawtextTranslate("directpanel.body"));
        const allCommands = Command.allCommands;
        for (const command of allCommands) {
            const theAction = command.shortDescription ?? command.description;
            const commandId = command.availableId[0];
            ui.button(fastText().addText("§1").addRawText(theAction).addText("§j").endline().addTran("directpanel.button", commandId).build());
        }
        // Close the chat and continue... Easy right?
        const result = await waitShowActionForm(ui, player);
        if (!result || result.canceled) return;
        const commandSelected = allCommands[result.selection!];
        let currentString = commandSelected.availableId[0];
        for (const requiredOption of commandSelected.requiredOption) {
            const body = fastText()
                .addTranRawText("command.help.target.type", rawtextTranslate(Command.typeTransferKey(requiredOption.type)))
                .endline()
                .addTranRawText("command.help.target.description", requiredOption.description)
                .endline()
                .addText("§bMatrix§a+ §7> §g")
                .addTran("directpanel.enter")
                .build();
            const ui = new ModalFormData().title(rawtextTranslate("directpanel.build"));
            const playerNameArray = world.getAllPlayers().map(({ name }) => name);
            const notPlayerTarget = requiredOption.type !== "player" && requiredOption.type !== "target";
            if (notPlayerTarget) {
                ui.textField(body, "Type here...");
            } else {
                ui.dropdown(body, playerNameArray, 0);
            }
            //@ts-expect-error
            const result = await ui.show(player);
            if (result.canceled || (result.formValues![0] as string).length == 0) return;
            currentString += " " + notPlayerTarget ? result.formValues![0] : '"' + playerNameArray[result.formValues![0] as number] + '"';
        }
        for (const optionalOption of commandSelected.optionalOption) {
            const body = fastText()
                .addTranRawText("command.help.target.type", rawtextTranslate(Command.typeTransferKey(optionalOption.type)))
                .endline()
                .addTranRawText("command.help.target.description", optionalOption.description)
                .endline()
                .addText("§bMatrix§a+ §7> §g")
                .addTran("directpanel.enter")
                .build();
            const ui = new ModalFormData().title(rawtextTranslate("directpanel.build"));
            const playerNameArray = world.getAllPlayers().map(({ name }) => name);
            const notPlayerTarget = optionalOption.type !== "player" && optionalOption.type !== "target";
            if (notPlayerTarget) {
                ui.textField(body, "Keep this empty to skip (optional)");
            } else {
                ui.dropdown(body, playerNameArray, 0);
            }
            //@ts-expect-error
            const result = await ui.show(player);
            if (result.canceled) return;
            if ((result.formValues![0] as string).length == 0) {
                break;
            }
            currentString += " " + notPlayerTarget ? result.formValues![0] : '"' + playerNameArray[result.formValues![0] as number] + '"';
        }
        // Run the command for it.
        player.runChatCommand(currentString);
    }
}
class Config {
    private constructor() {}
    private static configData?: typeof defaultConfig = undefined;
    public static get modifiedConfig() {
        if (this.configData === undefined) throw new Error("Config is not loaded");
        return this.configData;
    }
    public static loadData() {
        const allProperties = world.getDynamicPropertyIds();
        const changedProperties = allProperties
            .filter((property) => property.startsWith("config::"))
            .map((property) => {
                const key = property.replace("config::", "").split("/");
                const value = world.getDynamicProperty(property);
                return { id: property, key, value };
            });
        this.configData = defaultConfig;
        for (const { key, value, id } of changedProperties) {
            const isInvalid = getValueFromObject(defaultConfig, key) === undefined;
            if (isInvalid) {
                world.setDynamicProperty(id);
                continue;
            }
            const newValue = changeValueOfObject(this.configData, key, value);
            this.configData = newValue;
        }
    }
    /**
     * Sets a value in the config
     * @throws This object can throw errors
     */
    public static set(key: string[], value: number | boolean | string) {
        const configProperty = getValueFromObject(defaultConfig, key);
        if (configProperty === undefined) return undefined;
        if (typeof value != typeof configProperty) return false;
        if (typeof value == "object") throw new Error("Cannot set object to config");
        world.setDynamicProperty("config::" + key.join("/"), value);
        const newValue = changeValueOfObject(this.configData, key, value);
        this.configData = newValue;
        return true;
    }
    public static isValid(key: string[]) {
        const configProperty = getValueFromObject(defaultConfig, key);
        return configProperty !== undefined;
    }
    public static get(key: string[]) {
        const configProperty = getValueFromObject(this.configData, key);
        if (configProperty === undefined) return undefined;
        return configProperty;
    }
}
// Interfaces and types for Module
interface TypeInfo {
    upperLimit?: number;
    lowerLimit?: number;
    arrayRange?: string[];
}
interface InputOption {
    name: RawText;
    description: RawText;
    type: OptionTypes;
    typeInfo?: TypeInfo;
}
type OptionTypes = "string" | "number" | "integer" | "boolean" | "player" | "choice" | "code" | "purecode" | "target";
// Safe isOP function
Player.prototype.safeIsOp = function () {
    try {
        return this.isOp();
    } catch {
        return false;
    }
};
Player.prototype.isAdmin = function () {
    try {
        const isAdminState = ((this.getDynamicProperty("uniqueLevel") as number) ?? 0) >= 1;
        return isAdminState;
    } catch {
        return false;
    }
};
Player.prototype.getPermissionLevel = function () {
    try {
        return (this.getDynamicProperty("uniqueLevel") as number) ?? 0;
    } catch {
        return 0;
    }
};
Player.prototype.setPermissionLevel = function (level: number) {
    if (!Number.isInteger(level)) {
        throw new Error("Player :: setPermissionLevel :: Level must be an integer.");
    }
    if (level == 0) {
        this.setDynamicProperty("uniqueLevel");
    } else {
        this.setDynamicProperty("uniqueLevel", level);
    }
};
Player.prototype.isRiding = function () {
    return !!this.getComponent("riding")?.entityRidingOn;
};
Player.prototype.isAlive = function () {
    return this.getComponent("health")!.currentValue <= 0;
};
Player.prototype.isMoving = function () {
    const { x: iX, y: iY } = this.inputInfo.getMovementVector();
    const { x: vX, z: vZ } = this.getVelocity();
    return (iX !== 0 && vX !== 0) || (iY !== 0 && vZ !== 0);
};
function* loadModuleRegistry(): Generator<void, void, void> {
    try {
        const items = program;
        for (const item of items) {
            import(item).catch((error) => console.warn(`loadModuleRegistry :: ${item} :: (${error.name}) ${error.message}`));
            yield;
        }
        yield Config.loadData();
        // Initialize the command system
        yield Command.initialize();
        world.afterEvents.playerSpawn.subscribe(({ player, initialSpawn }) => {
            if (!initialSpawn) return;
            Module.currentPlayers.push(player);
            if (Module.config.logSettings.logPlayerJoinLeave) {
                write(false, "§aJoin §8(Connection)", player.name, {
                    playerId: player.id,
                    joinLocation: Object.values(player.location)
                        .map((x) => Math.floor(x).toFixed(0))
                        .join(" "),
                });
            }
            for (const module of Module.moduleList) {
                if (!module.enabled || !module.playerSpawn) continue;
                try {
                    module.playerSpawn(player.id, player);
                } catch (error) {
                    Module.sendError(error as Error);
                }
            }
            system.runTimeout(() => {
                if (player?.isValid() && Module.config.userRecruitmentFunction) player.sendMessage(rawtextTranslate("ad.running", Module.discordInviteLink));
                let obj = world.scoreboard.getObjective("matrix:script-online");
                if (!obj) {
                    obj = world.scoreboard.addObjective("matrix:script-online", "Made by jasonlaubb");
                    obj.setScore("is_enabled", -1);
                }
            }, 200);
        });
        for (const module of Module.moduleList) {
            if (module.locked || Module.config.modules[module.toggleId]?.state === true) {
                module.onEnable();
                module.enabled = true;
                yield;
            }
        }
        if (world.getAllPlayers().length > 0) {
            for (const player of world.getAllPlayers()) {
                Module.currentPlayers.push(player);
                for (const module of Module.moduleList) {
                    if (!module.enabled || !module.playerSpawn) continue;
                    try {
                        module.playerSpawn(player.id, player);
                    } catch (error) {
                        Module.sendError(error as Error);
                    }
                }
                yield;
            }
        }
        world.beforeEvents.playerLeave.subscribe(({ player: { location, id: playerId, name: playerName } }) => {
            if (Module.config.logSettings.logPlayerJoinLeave) {
                write(false, "§cLeave §8(Connection)", playerName, {
                    playerId: playerId,
                    leaveLocation: Object.values(location)
                        .map((x) => Math.floor(x).toFixed(0))
                        .join(" "),
                });
            }
            Module.currentPlayers = Module.currentPlayers.filter(({ id }) => id !== playerId);
            for (const module of Module.moduleList) {
                if (!module.enabled || !module?.playerLeave) continue;
                try {
                    system.run(() => {
                        if (!module?.playerLeave) return;
                        module?.playerLeave(playerId);
                    });
                } catch (error) {
                    Module.sendError(error as Error);
                }
            }
        });
        system.runInterval(() => {
            const allPlayers = Module.allWorldPlayers;
            for (const player of allPlayers) {
                if (!player?.isValid()) continue;
                Module.playerLoopRunTime.forEach((event) => {
                    if (!(!event.booleanData && player.isAdmin())) {
                        try {
                            event.moduleFunction(player);
                        } catch (error) {
                            Module.sendError(error as Error);
                        }
                    }
                });
            }
            Module.tickLoopRunTime.forEach((event) => {
                try {
                    event.moduleFunction();
                } catch (error) {
                    Module.sendError(error as Error);
                }
            });
        });
    } catch (error) {
        Module.sendError(error as Error);
    } finally {
        Module.isInitialized = true;
    }
}
export { Module, Command, Config };
import { registerModeration } from "./program/system/moderation";
registerModeration();
import { registerTimeStampModule } from "./program/system/playerProperty";
registerTimeStampModule();
// Start the AntiCheat
Module.ignite();
import { setupFlagFunction } from "./util/flag";
import { changeValueOfObject, getValueFromObject, waitShowActionForm } from "./util/util";
import { logRestart } from "./assets/logSystem";
