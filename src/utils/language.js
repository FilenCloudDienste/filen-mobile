const en = require("../lang/en")
const nl = require("../lang/nl")
const hi = require("../lang/hi")
const de = require("../lang/de")
const fr = require("../lang/fr")
const da = require("../lang/da")
const es = require("../lang/es")
const it = require("../lang/it")
const fi = require("../lang/fi")
const ru = require("../lang/ru")

let translations = {}

translations['en'] = en.translations['en']
translations['nl'] = nl.translations['nl']
translations['hi'] = hi.translations['hi']
translations['de'] = de.translations['de']
translations['fr'] = fr.translations['fr']
translations['da'] = da.translations['da']
translations['es'] = es.translations['es']
translations['it'] = it.translations['it']
translations['fi'] = fi.translations['fi']
translations['ru'] = ru.translations['ru']

module.exports = {
    get: (lang = "en", text, firstUpperCase = true, replaceFrom = [], replaceTo = []) => {
        let gotText = translations[lang][text]

        if(!gotText){
            if(translations['en'][text]){
                gotText = translations['en'][text]
            }
            else{
                return "NO_TRANSLATION_FOUND"
            }
        }

        if(firstUpperCase){
            gotText = gotText.charAt(0).toUpperCase() + gotText.slice(1)
        }

        if(replaceFrom.length > 0 && replaceTo.length > 0){
            for(let i = 0; i < replaceFrom.length; i++){
                gotText = gotText.split(replaceFrom[i]).join(replaceTo[i])
            }
        }

        return gotText
    },
    isAvailable: (lang) => {
        if(typeof translations[lang] !== "undefined"){
            return true
        }

        return false
    },
    list: () => {
        return translations
    },
    name: (lang = "en") => {
        switch(lang){
            case "en":
                return "English"
            break
            case "de":
                return "Deutsch"
            break
            case "nl":
                return "Nederlands"
            break
            case "hi":
                return "हिन्दी, हिंदी"
            break
            case "fr":
                return "Français"
            break
            case "da":
                return "Dansk"
            break
            case "es":
                return "Español"
            break
            case "it":
                return "Italiano"
            break
            case "fi":
                return "Suomi"
            break
            case "ru":
                return "Pусский"
            break
            default:
                return "Language name not found"
            break
        }
    }
}
