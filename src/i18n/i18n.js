import { en } from "./lang/en"
import { ja } from "./lang/ja"
import { de } from "./lang/de"
import { fr } from "./lang/fr"
import { it } from "./lang/it"
import { ru } from "./lang/ru"
import { uk } from "./lang/uk"
import { nl } from "./lang/nl"
import { pl } from "./lang/pl"
import { zh } from "./lang/zh"
import { tr } from "./lang/tr"
import { de } from "./lang/de"

const translations = {
    en,
    ja,
    de,
    fr,
    it,
    ru,
    uk,
    nl,
    pl,
    zh,
    tr,
    de
}

export const i18n = (lang = "en", text, firstUpperCase = true, replaceFrom = [], replaceTo = []) => {
    if(typeof lang !== "string"){
        lang = "en"
    }

    if(typeof translations[lang] == "undefined"){
        lang = "en"
    }
    
    let gotText = translations[lang][text]

    if(!gotText){
        if(translations['en'][text]){
            gotText = translations['en'][text]
        }
        else{
            return "NO_TRANSLATION_FOUND_" + text
        }
    }

    if(firstUpperCase){
        gotText = gotText.charAt(0).toUpperCase() + gotText.slice(1)
    }
    else{
        gotText = gotText.charAt(0).toLowerCase() + gotText.slice(1)
    }

    if(replaceFrom.length > 0 && replaceTo.length > 0){
        for(let i = 0; i < replaceFrom.length; i++){
            gotText = gotText.split(replaceFrom[i]).join(replaceTo[i])
        }
    }

    return gotText
}

export const isLanguageAvailable = (lang = "en") => {
    return typeof translations[lang] == "undefined" ? false : true
}
