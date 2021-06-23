import * as language from "../utils/language"
import { Plugins, Capacitor } from "@capacitor/core"
import { modalController } from "@ionic/core"
import * as Ionicons from 'ionicons/icons'
import { isPlatform, getPlatforms } from "@ionic/react"

const utils = require("../utils/utils")

export async function showLogin(){
    let appLang = this.state.lang
    let appDarkMode = this.state.darkMode
    let modalId = "login-modal-" + utils.generateRandomClassName()

    customElements.define(modalId, class ModalContent extends HTMLElement {
        connectedCallback(){
            this.innerHTML = `
                <ion-header class="ion-header-no-shadow" style="--background: transparent;">
                    <ion-toolbar style="--background: transparent;">
                        <!--<ion-select slot="start" id="settings-lang-select" value="` + appLang + `" cancel-text="` + language.get(appLang, "cancel") + `" ok-text="` + language.get(appLang, "alertOkButton") + `" interface="alert">
                            ` + utils.getLanguageSelection() + `
                        </ion-select>-->
                        <ion-button onClick="window.customFunctions.openLanguageModal(); return false" fill="none">
                            ` + language.name(appLang) + `
                        </ion-button>
                        <ion-buttons slot="end">
                            <ion-button onClick="window.customFunctions.loginToggleDarkMode()">
                                <ion-icon slot="icon-only" icon="` + (appDarkMode ? Ionicons.sunny : Ionicons.moon) + `"></ion-icon>
                            </ion-button>
                        </ion-buttons>
                    </ion-toolbar>
                </ion-header>
                <ion-content fullscreen>
                    <div style="position: absolute; left: 50%; top: 50%; -webkit-transform: translate(-50%, -50%); transform: translate(-50%, -50%); width: 100%;">
                        <center>
                            <ion-avatar>
                                <img src="assets/img/icon.png">
                            </ion-avatar>
                            <ion-item style="width: 90%; margin-top: 30px;">
                                <ion-input type="text" id="login-email" placeholder="` + language.get(appLang, "emailPlaceholder") + `"></ion-input>
                            </ion-item>
                            <ion-item style="width: 90%;">
                                <ion-input type="password" id="login-password" placeholder="` + language.get(appLang, "passwordPlaceholder") + `"></ion-input>
                            </ion-item>
                            <ion-item style="width: 90%; display: none;" id="login-2fa-container">
                                <ion-input type="number" id="login-2fa" placeholder="` + language.get(appLang, "2faPlaceholder") + `"></ion-input>
                            </ion-item>
                            <ion-button expand="block" style="width: 90%; margin-top: 50px;" onClick="window.customFunctions.doLogin()">` + language.get(appLang, "loginButton") + `</ion-button>
                            <br>
                            ` + language.get(appLang, "or").toUpperCase() + `
                            <br>
                            <br>
                            <a onClick="window.customFunctions.openRegisterModal()">` + (isPlatform("ios") ? language.get(appLang, "registerLink").replace(/ *\([^)]*\) */g, "") : language.get(appLang, "registerLink")) + `</a>
                        </center>
                    </div>
                </ion-content>
            `;
        }
    })

    let modal = await modalController.create({
        component: modalId,
        swipeToClose: false,
        showBackdrop: false,
        backdropDismiss: false,
        cssClass: "modal-fullscreen"
    })

    await modal.present()

    this.setupStatusbar("login/register")

	modal.onDidDismiss().then(() => {
        this.setupStatusbar()
    })

    if(Capacitor.isNative && window.customVariables.isDocumentReady){
        Plugins.SplashScreen.hide()
    }
}