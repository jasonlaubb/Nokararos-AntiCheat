tellraw @s {"rawtext":[{"translate":"function.help","with":["CqZGXeRKPJ", "V6.0.20"]},{"text":"\n§7>> §c(Not translated) If you cannot see any messages, install the RESOURCE PACK correctly, Matrix anticheat required RP to show you the translated message.\n"},{"translate":"function.help.typeA","with":[]},{"text":"\n"},{"translate":"function.help.typeB","with":[]}]}
scoreboard objectives add matrix:zero_mark dummy
scoreboard players set is_enabled matrix:zero_mark -1
execute if score is_enabled matrix:script-online = is_enabled matrix:zero_mark run tellraw @s {"rawtext":[{"translate":"function.script.online"}]}
execute unless score is_enabled matrix:script-online = is_enabled matrix:zero_mark run tellraw @s {"rawtext":[{"translate":"function.script.offline"}]}
scoreboard objectives remove matrix:zero_mark