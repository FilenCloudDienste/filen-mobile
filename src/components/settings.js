import * as language from "../utils/language"
import { loadingController, modalController, popoverController, alertController, actionSheetController } from "@ionic/core"
import * as Ionicons from 'ionicons/icons'
import { Capacitor, Plugins } from "@capacitor/core"
import { isPlatform, getPlatforms } from "@ionic/react"

const utils = require("../utils/utils")
const safeAreaInsets = require('safe-area-insets')

export async function openSettingsModal(){
    let appLang = this.state.lang
    let appDarkMode = this.state.darkMode
    let appSettings = this.state.settings
    let appState = this.state
    let deviceInfo = await Plugins.Device.getInfo()
    let modalId = "settings-modal-" + utils.generateRandomClassName()

    var loading = await loadingController.create({
        message: ""
    })

    loading.present()

    try{
        var res = await utils.apiRequest("POST", "/v1/user/get/settings", {
            apiKey: this.state.userAPIKey
        })
    }
    catch(e){
        console.log(e)

        loading.dismiss()

        return this.spawnToast(language.get(this.state.lang, "apiRequestError"))
    }

    if(!res.status){
        loading.dismiss()

        console.log(res.message)

        return this.spawnToast(res.message)
    }

    loading.dismiss()

    let gotUserSettings = res.data

    window.customVariables.lastSettingsRes = gotUserSettings

    customElements.define(modalId, class ModalContent extends HTMLElement {
        connectedCallback() {
            this.innerHTML = `
                <ion-header class="ion-no-border" style="margin-top: ` + (isPlatform("ipad") ? safeAreaInsets.top : 0) + `px;">
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
                        <ion-item-divider style="--background: ` + (appDarkMode ? "#1E1E1E" : "white") + `">
                            <ion-label>
                                ` + language.get(appLang, "settingsAccountHeader") + `
                            </ion-label>
                        </ion-item-divider>
                        <ion-item lines="none">
                            <ion-label>
                                ` + appState.userEmail + `
                            </ion-label>
                            ` + (isPlatform("ios") ? `` : `
                                <ion-buttons slot="end">
                                    <ion-button color="` + (appDarkMode ? `dark` : `light`) + `" fill="solid" onClick="window.open('https://filen.io/my-account/file-manager/settings', '_system'); return false;">
                                        ` + language.get(appLang, "accountSettings") + `
                                    </ion-button>
                                </ion-buttons>
                            `) + `
                        </ion-item>
                        ` + (isPlatform("ios") ? `` : `
                            <ion-item lines="none">
                                <ion-label>
                                    ` + language.get(appLang, "settingsAccountPro") + `
                                </ion-label>
                                <ion-buttons slot="end">
                                    ` + (appState.userIsPro ? `
                                        <ion-button fill="none">
                                            <ion-icon slot="icon-only" icon="` + Ionicons.checkbox + `"></ion-icon>
                                        </ion-button>
                                    ` : `
                                        <ion-button fill="solid" color="` + (appDarkMode ? `dark` : `light`) + `" onClick="window.open('https://filen.io/pro', '_system'); return false;">
                                            ` + language.get(appLang, "settingsAccountGoPro") + `
                                        </ion-button>
                                    `) + `
                                </ion-buttons>
                            </ion-item>
                        `) + `
                        <ion-item lines="none">
                            <ion-label>
                                ` + language.get(appLang, "settingsAccountUsage") + `
                            </ion-label>
                            <ion-buttons slot="end">
                                <ion-button fill="none">
                                    ` + appState.userStorageUsageMenuText + `
                                </ion-button>
                            </ion-buttons>
                        </ion-item>
                        <ion-item lines="none">
                            <ion-label>
                                ` + language.get(appLang, "settingsUserFiles") + `
                            </ion-label>
                            <ion-buttons slot="end">
                                <ion-button fill="none">
                                    ` + appState.userFiles + `
                                </ion-button>
                            </ion-buttons>
                        </ion-item>
                        <ion-item lines="none">
                            <ion-label>
                                ` + language.get(appLang, "settingsUserFolders") + `
                            </ion-label>
                            <ion-buttons slot="end">
                                <ion-button fill="none">
                                    ` + appState.userFolders + `
                                </ion-button>
                            </ion-buttons>
                        </ion-item>
                        <ion-item lines="none">
                            <ion-label>
                                ` + language.get(appLang, "settingsUserVersionedFiles") + `
                            </ion-label>
                            <ion-buttons slot="end">
                                <ion-button fill="none">
                                    ` + gotUserSettings.versionedFiles + ` (` + utils.formatBytes(gotUserSettings.versionedStorage) + `)
                                </ion-button>
                            </ion-buttons>
                        </ion-item>
                        <ion-item lines="none" button onClick="window.customFunctions.open2FAModal()">
                            <ion-label>
                                ` + language.get(appLang, "settings2FA") + `
                            </ion-label>
                        </ion-item>
                        <ion-item lines="none" button onClick="window.customFunctions.openEmailPasswordModal()">
                            <ion-label>
                                ` + language.get(appLang, "settingsChangeEmailPassword") + `
                            </ion-label>
                        </ion-item>
                        <ion-item lines="none" button onClick="window.customFunctions.redeemCode()">
                            <ion-label>
                                ` + language.get(appLang, "settingsRedeemCode") + `
                            </ion-label>
                        </ion-item>
                        <ion-item lines="none" button onClick="window.customFunctions.openInviteModal()">
                            <ion-label>
                                ` + language.get(appLang, "settingsInvite") + `
                            </ion-label>
                        </ion-item>
                        <ion-item lines="none" button onClick="window.customFunctions.showGDPR()">
                            <ion-label>
                                ` + language.get(appLang, "settingsShowGDPR") + `
                            </ion-label>
                        </ion-item>
                        <ion-item lines="none">
                            <ion-label>
                                ` + language.get(appLang, "settingsDeleteAccount") + `
                            </ion-label>
                            <ion-buttons slot="end">
                                <ion-button fill="solid" color="danger" onClick="window.customFunctions.deleteAccount()">
                                    ` + language.get(appLang, "settingsDeleteButton") + `
                                </ion-button>
                            </ion-buttons>
                        </ion-item>
                        <ion-item-divider style="--background: ` + (appDarkMode ? "#1E1E1E" : "white") + `">
                            <ion-label>
                                ` + language.get(appLang, "settingsFileManagementHeader") + `
                            </ion-label>
                        </ion-item-divider>
                        <ion-item lines="none">
                            <ion-label>
                                ` + language.get(appLang, "settingsDeleteVersioned") + `
                            </ion-label>
                            <ion-buttons slot="end">
                                <ion-button fill="solid" color="danger" onClick="window.customFunctions.deleteVersioned()">
                                    ` + language.get(appLang, "settingsDeleteAllButton") + `
                                </ion-button>
                            </ion-buttons>
                        </ion-item>
                        <ion-item lines="none">
                            <ion-label>
                                ` + language.get(appLang, "settingsDeleteAll") + `
                            </ion-label>
                            <ion-buttons slot="end">
                                <ion-button fill="solid" color="danger" onClick="window.customFunctions.deleteEverything()">
                                    ` + language.get(appLang, "settingsDeleteAllButton") + `
                                </ion-button>
                            </ion-buttons>
                        </ion-item>
                        <ion-item-divider style="--background: ` + (appDarkMode ? "#1E1E1E" : "white") + `">
                            <ion-label>
                                ` + language.get(appLang, "settingsGeneralHeader") + `
                            </ion-label>
                        </ion-item-divider>
                        <ion-item lines="none">
                            <ion-label>
                                ` + language.get(appLang, "darkMode") + `
                            </ion-label>
                            <ion-toggle slot="end" id="settings-dark-mode-toggle" onClick="window.customFunctions.settingsToggleDarkMode()" ` + (appDarkMode && "checked") + `></ion-toggle>
                        </ion-item>
                        <ion-item lines="none">
                            <ion-label>
                                ` + language.get(appLang, "onlyUseWifiForDownloads") + `
                            </ion-label>
                            <ion-toggle slot="end" id="settings-only-wifi-toggle" onClick="window.customFunctions.toggleOnlyWifi()" ` + (appSettings.onlyWifi && "checked") + `></ion-toggle>
                        </ion-item>
                        <ion-item lines="none">
                            <ion-label>
                                ` + language.get(appLang, "settingsShowThumbnails") + `
                            </ion-label>
                            <ion-toggle slot="end" id="settings-show-thumbnails-toggle" onClick="window.customFunctions.toggleShowThumbnails()" ` + (appSettings.showThumbnails && "checked") + `></ion-toggle>
                        </ion-item>
                        <ion-item lines="none" button>
                            <ion-label onClick="window.customFunctions.openLanguageModal()">` + language.get(appLang, "settingsLanguage") + `</ion-label>
                            <!--<ion-select id="settings-lang-select" value="` + appLang + `" cancel-text="` + language.get(appLang, "cancel") + `" ok-text="` + language.get(appLang, "alertOkButton") + `" interface="alert">
                                ` + utils.getLanguageSelection() + `
                            </ion-select>-->
                        </ion-item>
                        <ion-item-divider style="--background: ` + (appDarkMode ? "#1E1E1E" : "white") + `">
                            <ion-label>
                                ` + language.get(appLang, "settingsAppHeader") + `
                            </ion-label>
                        </ion-item-divider>
                        <ion-item lines="none">
                            <a onClick="window.customFunctions.doLogout()">` + language.get(appLang, "settingsLogoutBtn", true, ["__EMAIL__"], [appState.userEmail]) + `</a>
                        </ion-item>
                        <ion-item lines="none">
                            <ion-label>
                                ` + language.get(appLang, "settingsVersion") + `
                            </ion-label>
                            <ion-buttons slot="end">
                                <ion-button fill="none">
                                    ` + deviceInfo.appVersion + `
                                </ion-button>
                            </ion-buttons>
                        </ion-item>
                        <ion-item lines="none">
                            <ion-label>
                                ` + language.get(appLang, "settingsClearThumbnailCache") + `
                            </ion-label>
                            <ion-buttons slot="end">
                                <ion-button fill="solid" color="` + (appDarkMode ? `dark` : `light`) + `" onClick="window.customFunctions.clearThumbnailCache()">
                                    ` + language.get(appLang, "settingsClearThumbnailCacheBtn") + `
                                </ion-button>
                            </ion-buttons>
                        </ion-item>
                        ` + (isPlatform("ios") ? `
                            <ion-item-divider style="--background: ` + (appDarkMode ? "#1E1E1E" : "white") + `">
                                <ion-label>
                                    ` + language.get(appLang, "iosDeviceSettingsMoreLink") + `
                                </ion-label>
                            </ion-item-divider>
                        ` : ``) + `
                    </ion-list>
                </ion-content>
                <br><br><br><br><br><br><br>
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

    await modal.present()

    clearInterval(window.customVariables.selectLangInterval)

    window.customVariables.selectLangInterval = setInterval(async () => {
        if(typeof document.getElementById("settings-lang-select") == "undefined"){
            return clearInterval(window.customVariables.selectLangInterval)
        }

        if(document.getElementById("settings-lang-select") == null){
            return clearInterval(window.customVariables.selectLangInterval)
        }

        if(typeof document.getElementById("settings-lang-select").value == "undefined"){
            return clearInterval(window.customVariables.selectLangInterval)
        }

        let selectedLang = document.getElementById("settings-lang-select").value

        if(selectedLang !== appLang){
            if(language.isAvailable(selectedLang)){
                clearInterval(window.customVariables.selectLangInterval)

                await Plugins.Storage.set({ key: "lang", value: selectedLang })

                return document.location.href = "index.html"
            }
        }
    }, 100)

    return true
}