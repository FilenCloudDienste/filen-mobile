# Contributing translations

If you want to contribute translations, make sure to follow our formatting and code guidelines.
Submitting a translation is fairly simple, just create a new file with the ISO 639-1 code of the language (e.g. "en.js" for english, "de.js" for german etc., you can find a list here: https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes), copy all contents from "en.js" and start translating.
Make sure to also rename the object properties to the corresponding ISO 639-1 codes. Example:

```translations['en']['defaultFolder'] = "Default folder"``` -> ```translations['de']['defaultFolder'] = "Standard Ordner"```

Also make sure to NOT remove any variables within the actual text (and leave any HTML/JS inside of the text as it is). Variables always look like this: ```__VARIABLENAME__```. Due to different grammar in languages you might have to place those variables differently within the text.

### Big thank you to everyone who contributes!
