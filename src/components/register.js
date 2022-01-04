import * as language from "../utils/language"
import { modalController } from "@ionic/core"
import * as Ionicons from "ionicons/icons"

const utils = require("../utils/utils")

export async function showRegister(){
    let appLang = this.state.lang
    let appDarkMode = this.state.darkMode
    let modalId = "register-modal-" + utils.generateRandomClassName()

    let tosPrivacy = language.get(appLang, "registerTOSInfo")

    customElements.define(modalId, class ModalContent extends HTMLElement {
        connectedCallback(){
            this.innerHTML = `
                <ion-header class="ion-header-no-shadow" style="--background: transparent;">
                    <ion-toolbar style="--background: transparent;">
                        <ion-buttons>
                            <ion-button onClick="window.customFunctions.dismissModal()">
                                <ion-icon slot="icon-only" icon="` + Ionicons.arrowBack + `"></ion-icon>
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
                                <ion-input type="email" autocapitalize="off" autocomplete="off" id="register-email" placeholder="` + language.get(appLang, "emailPlaceholder") + `"></ion-input>
                            </ion-item>
                            <ion-item style="width: 90%;">
                                <ion-input type="password" autocapitalize="off" autocomplete="new-password" id="register-password" placeholder="` + language.get(appLang, "passwordPlaceholder") + `" maxlength="1024"></ion-input>
                            </ion-item>
                            <ion-item style="width: 90%;">
                                <ion-input type="password" autocapitalize="off" autocomplete="new-password" id="register-password-repeat" placeholder="` + language.get(appLang, "passwordRepeatPlaceholder") + `" maxlength="1024"></ion-input>
                            </ion-item>
                            <div style="width: 90%; margin-top: 25px;">
                                <small>` + tosPrivacy + `</small>
                            </div>
                            <ion-button expand="block" style="width: 90%; margin-top: 50px;" onClick="window.customFunctions.doRegister()">` + language.get(appLang, "registerButton") + `</ion-button>
                            <br>
                            OR
                            <br>
                            <br>
                            <a onClick="window.customFunctions.dismissModal()">` + language.get(appLang, "loginLink") + `</a>
                            <br>
                            <br>
                            <a onClick="window.customFunctions.openResendConfirmationModal()">` + language.get(appLang, "resendConfirmationLink") + `</a>
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

    return modal.present()
}