const fs = require('fs');
const path = require('path');
// Get the language list from languages.json
const languages = require('./Matrix_RP/texts/languages.json');
// Get the source from source.pot
const sourcePot = fs.readFileSync('./textData/source.pot', 'utf8');
// Ensure po files are generated for each language
const translationsDir = './textData/translations';
if (!fs.existsSync(translationsDir)) {
    fs.mkdirSync(translationsDir);
}
languages.forEach((language) => {
    const poFile = path.join(translationsDir, `${language}.po`);
    if (!fs.existsSync(poFile)) {
        // Generate a new po file from the source pot file
        const poContent = generatePoFile(sourcePot);
        fs.writeFileSync(poFile, poContent);
    }
});
// Update po files when pot file changes
const potFile = './textData/source.pot';
console.log(`Matrix > Watching the change of the source file...`);
fs.watchFile(potFile, (curr, prev) => {
    if (curr.mtime > prev.mtime) {
		console.log(`Matrix > Change detected! Updated the po files!`);
        changePoFile();
    }
});
// Change po file on the start
changePoFile();

function changePoFile() {
    // Pot file has changed, update po files
    const newSourcePot = fs.readFileSync(potFile, 'utf8');
    languages.forEach((language) => {
        const poFile = path.join(translationsDir, `${language}.po`);
        const poContent = generatePoFile(newSourcePot, fs.readFileSync(poFile, 'utf8'), language);
        fs.writeFileSync(poFile, poContent);
    });
}
// Generate lang files in Matrix_RP/texts
const textsDir = './Matrix_RP/texts';
languages.forEach((language) => {
    const poFile = path.join(translationsDir, `${language}.po`);
    const langFile = path.join(textsDir, `${language}.lang`);
    const poContent = fs.readFileSync(poFile, 'utf8');
    let langContent = '';
    const keyRegex = /#: (.*)\nmsgid "(.*)"/g;
    const msgstrRegex = /msgstr "(.*)"/g;
    let keyMatch;
    while ((keyMatch = keyRegex.exec(poContent)) !== null) {
        const key = keyMatch[1];
        const msgid = keyMatch[2];
        const msgstrMatch = msgstrRegex.exec(poContent);
        if (msgstrMatch !== null) {
            const msgstr = msgstrMatch[1];
            langContent += `${key}=${msgstr || msgid}\n`;
        }
    }
    fs.writeFileSync(langFile, langContent);
});

function generatePoFile(sourcePot, poFile, lang) {
    const msgidRegex = /msgid "(.*)"/g;
    const msgstrRegex = /msgstr "(.*)"/g;
    let msgidMatch;
    let msgstrMatch;
    let poContent = '';
    const data = poFile?.match(/msgstr "(.*)"/g);
    let i = 0;
    while ((msgidMatch = msgidRegex.exec(sourcePot)) !== null) {
        let dataData;
        try {
            dataData = data[i];
        } catch {
            dataData = '';
        }
        i++;
        const msgid = msgidMatch[1];
        msgstrMatch = msgstrRegex.exec(sourcePot);
        const msgstr = msgstrMatch !== null && msgstrMatch[1] !== '' ? msgstrMatch[1] : '';
        poContent += `#: ${msgid}\nmsgid "${msgstr}"\nmsgstr "${dataData ? dataData.slice(0, -1).slice(8) : ''}"\n\n`;
        if (msgid === "pack.description") {
            fs.writeFileSync(`./Matrix_BP/texts/${lang}.lang`, `pack.description=${dataData?.slice(0, -1)?.slice(8) ? (dataData?.slice(0, -1)?.slice(8) > 0 ? dataData?.slice(0, -1)?.slice(8) : msgstr) : msgstr}`);
        }
    }
    return poContent;
}