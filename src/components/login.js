import * as language from "../utils/language"
import { Plugins, Capacitor } from "@capacitor/core"
import { modalController } from "@ionic/core"

const utils = require("../utils/utils")

export async function showLogin(){
    let appLang = this.state.lang
    let modalId = "login-modal-" + utils.generateRandomClassName()

    customElements.define(modalId, class ModalContent extends HTMLElement {
        connectedCallback(){
            this.innerHTML = `
                <ion-content fullscreen>
                    <div style="position: absolute; left: 50%; top: 50%; -webkit-transform: translate(-50%, -50%); transform: translate(-50%, -50%); width: 100%;">
                        <center>
                            <h1>Filen</h1>
                            <ion-item style="width: 90%; margin-top: 30px;">
                                <ion-input type="text" id="login-email" placeholder="` + language.get(appLang, "emailPlaceholder") + `"></ion-input>
                            </ion-item>
                            <ion-item style="width: 90%;">
                                <ion-input type="password" id="login-password" placeholder="` + language.get(appLang, "passwordPlaceholder") + `"></ion-input>
                            </ion-item>
                            <ion-item style="width: 90%;">
                                <ion-input type="number" id="login-2fa" placeholder="` + language.get(appLang, "2faPlaceholder") + `"></ion-input>
                            </ion-item>
                            <ion-button expand="block" style="width: 90%; margin-top: 50px;" onClick="window.customFunctions.doLogin()">` + language.get(appLang, "loginButton") + `</ion-button>
                            <br>
                            ` + language.get(appLang, "or").toUpperCase() + `
                            <br>
                            <br>
                            <a onClick="window.customFunctions.openRegisterModal()">` + language.get(appLang, "registerLink") + `</a>
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

    modal.present()

    if(Capacitor.isNative){
        Plugins.SplashScreen.hide()
    }
}