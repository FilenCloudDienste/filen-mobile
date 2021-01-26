const en = require("../lang/en")
const nl = require("../lang/nl")
const hi = require("../lang/hi")
const de = require("../lang/de")
const fr = require("../lang/fr")
const da = require("../lang/da")

let translations = {}

translations['en'] = en.translations['en']
translations['nl'] = nl.translations['nl']
translations['hi'] = hi.translations['hi']
translations['de'] = de.translations['de']
translations['fr'] = de.translations['fr']
translations['da'] = de.translations['da']

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
    }
}
