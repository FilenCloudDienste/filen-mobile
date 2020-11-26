import * as language from "../utils/language"
import { loadingController, modalController, popoverController, alertController, actionSheetController } from "@ionic/core"
import * as Ionicons from 'ionicons/icons'
import { Capacitor, Plugins } from "@capacitor/core"

const utils = require("../utils/utils")

export async function openSettingsModal(){
    let appLang = this.state.lang
    let appDarkMode = this.state.darkMode
    let modalId = "settings-modal-" + utils.generateRandomClassName()

    customElements.define(modalId, class ModalContent extends HTMLElement {
        connectedCallback() {
            this.innerHTML = `
                <ion-header>
                    <ion-toolbar>
                        <ion-buttons slot="start">
                            <ion-button onclick="window.customFunctions.dismissModal()">
                                <ion-icon slot="icon-only" icon="` + Ionicons.arrowBack + `"></ion-icon>
                            </ion-button>
                        </ion-buttons>
                        <ion-title>
                            ` + language.get(appLang, "settingsHeader") + `
                        </ion-title>
                    </ion-toolbar>
                </ion-header>
                <ion-content style="--background: ` + (appDarkMode ? "#1E1E1E" : "white") + `" fullscreen>
                    <ion-list>
                        <ion-item lines="none">
                            <ion-label>
                                ` + language.get(appLang, "darkMode") + `
                            </ion-label>
                            <ion-toggle slot="end" id="settings-dark-mode-toggle" onClick="window.customFunctions.settingsToggleDarkMode()" ` + (appDarkMode && "checked") + `></ion-toggle>
                        </ion-item>
                    </ion-list>
                </ion-content>
            `
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