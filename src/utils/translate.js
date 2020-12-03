const translate = require('@vitalets/google-translate-api');
 
translate('__COUNT__ items moved to the trash', {to: 'de'}).then(res => {
    console.log(res.text);
    //=> I speak English
    console.log(res.from.language.iso);
    //=> nl
}).catch(err => {
    console.error(err);
});