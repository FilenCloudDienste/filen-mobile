import * as language from "../utils/language"
import { loadingController, modalController } from "@ionic/core"
import * as Ionicons from 'ionicons/icons'
import { isPlatform } from "@ionic/react"
import { App } from "@capacitor/app"

const utils = require("../utils/utils")
const safeAreaInsets = require('safe-area-insets')

export async function openSettingsModal(){
    let isDeviceOnline = window.customFunctions.isDeviceOnline()
    let appLang = this.state.lang
    let appDarkMode = this.state.darkMode
    let appSettings = this.state.settings
    let appState = this.state
    let deviceInfo = await App.getInfo()
    let modalId = "settings-modal-" + utils.generateRandomClassName()

    let biometricAuthEnabled = false

    if(typeof this.state.settings.biometricPINCode !== "undefined"){
        if(this.state.settings.biometricPINCode.length == 4){
            biometricAuthEnabled = true
        }
    }

    if(isDeviceOnline){
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
    
        var gotUserSettings = res.data
    
        window.customVariables.lastSettingsRes = gotUserSettings
    }

    customElements.define(modalId, class ModalContent extends HTMLElement {
        connectedCallback() {
            this.innerHTML = `
                <ion-header class="ion-no-border" style="margin-top: ` + (isPlatform("ipad") ? safeAreaInsets.top : 0) + `px;">
                    <ion-toolbar style="--background: ` + (appDarkMode ? `#1e1e1e` : `white`) + `;">
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
                                <!--<ion-buttons slot="end">
                                    <ion-button color="` + (appDarkMode ? `dark` : `light`) + `" fill="solid" onClick="window.open('https://filen.io/my-account/file-manager/settings', '_system'); return false;">
                                        ` + language.get(appLang, "accountSettings") + `
                                    </ion-button>
                                </ion-buttons>-->
                            `) + `
                        </ion-item>
                        ` + (isDeviceOnline ? `
                            ` + (isPlatform("ios") ? `` : `
                                <!--<ion-item lines="none">
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
                                </ion-item>-->
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
                            <!--<ion-item lines="none" button onClick="window.customFunctions.openEmailPasswordModal()">
                                <ion-label>
                                    ` + language.get(appLang, "settingsChangeEmailPassword") + `
                                </ion-label>
                            </ion-item>-->
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
                            <ion-item lines="none" button onClick="window.customFunctions.openAdvancedModal()">
                                <ion-label>
                                    ` + language.get(appLang, "advanced") + `
                                </ion-label>
                            </ion-item>
                            <ion-item-divider style="--background: ` + (appDarkMode ? "#1E1E1E" : "white") + `">
                                <ion-label>
                                    ` + language.get(appLang, "settingsAutoUploadAndSyncHeader") + `
                                </ion-label>
                            </ion-item-divider>
                            <ion-item lines="none" button onClick="window.customFunctions.openCameraUploadModal()">
                                <ion-label>
                                    ` + language.get(appLang, "cameraUpload") + `
                                </ion-label>
                            </ion-item>
                        ` : ``) + `
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
                                ` + language.get(appLang, "onlyUseWifiForUploads") + `
                            </ion-label>
                            <ion-toggle slot="end" id="settings-only-wifi-uploads-toggle" onClick="window.customFunctions.toggleOnlyWifiUploads()" ` + (appSettings.onlyWifiUploads && "checked") + `></ion-toggle>
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
                        <ion-item lines="none">
                            <ion-label>
                                ` + language.get(appLang, "settingsBiometricAuth") + `
                            </ion-label>
                            <ion-toggle slot="end" id="settings-enable-biometric-toggle" onClick="window.customFunctions.toggleBiometricAuth()" ` + (biometricAuthEnabled && "checked") + `></ion-toggle>
                        </ion-item>
                        ` + (isPlatform("ios") ? `
                            <ion-item lines="none">
                                <ion-label>
                                    ` + language.get(appLang, "convertHEICToJPG") + `
                                </ion-label>
                                <ion-toggle slot="end" id="settings-convert-heic-toggle" onClick="window.customFunctions.settingsToggleConvertHeic()" ` + (appSettings.convertHeic && "checked") + `></ion-toggle>
                            </ion-item>
                        ` : ``) + `
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
                                    ` + deviceInfo.version + `
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
                        <ion-item-divider style="--background: ` + (appDarkMode ? "#1E1E1E" : "white") + `">
                            <ion-label>
                                ` + language.get(appLang, "iosDeviceSettingsMoreLink") + `
                            </ion-label>
                        </ion-item-divider>
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

    this.setupStatusbar("modal")

    try{
        let sModal = await modalController.getTop()

        sModal.onDidDismiss().then(() => {
            this.setupStatusbar()
        })
    }
    catch(e){
        console.log(e)
    }

    return true
}