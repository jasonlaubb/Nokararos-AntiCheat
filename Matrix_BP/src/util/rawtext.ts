import { RawMessage, RawText } from "@minecraft/server";
class FastText {
    currentRawText: RawMessage[] = [];
    public constructor() {}
    public addText(rawMessage: string) {
        this.currentRawText.push({ text: rawMessage } as RawMessage);
        return this;
    }
    public addTran(key: string, ...withString: string[]) {
        this.currentRawText.push({ translate: key, with: withString } as RawMessage);
        return this;
    }
    public addTranRaw(key: string, withString: RawMessage) {
        this.currentRawText.push({ translate: key, with: withString });
        return this;
    }
    public addTranRawText(key: string, withString: RawText) {
        this.currentRawText.push({ translate: key, with: withString });
        return this;
    }
    public addRawText(rawtext: RawText) {
        this.currentRawText.push(...rawtext.rawtext!);
        return this;
    }
    public addRaw(rawMessage: RawMessage) {
        this.currentRawText.push(rawMessage);
        return this;
    }
    public endline() {
        this.currentRawText.push({ text: "\n" } as RawMessage);
        return this;
    }
    public newline() {
        this.currentRawText.push({ text: "\n§r" } as RawMessage);
        return this;
    }
    public space() {
        this.currentRawText.push({ text: " " } as RawMessage);
        return this;
    }

    public build() {
        return rawtext(...this.currentRawText);
    }
    public clone() {
        return new FastText().addRawText(this.build());
    }
}
export function rawtext(...args: RawMessage[]) {
    return { rawtext: args } as RawText;
}
export function tTm(rawText: RawText): RawMessage[] {
    return [...rawText.rawtext!];
}
export function fastText() {
    return new FastText();
}
export function rawtextTranslate(key: string, ...withString: string[]) {
    return rawtext({ translate: key, with: withString });
}
export function rawtextTranslateRawText(key: string, withString: RawMessage) {
    return rawtext({ translate: key, with: withString });
}
export function combineRawText(multipleRawtext: RawText[]) {
    const rawMessages = multipleRawtext.flatMap((rawtext) => rawtext.rawtext)!;
    return { rawtext: rawMessages } as RawText;
}
