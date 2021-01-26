import React from 'react';
import { IonToast, IonSearchbar, IonAvatar, IonProgressBar, IonBadge, IonBackButton, IonRefresher, IonRefresherContent, IonFab, IonFabButton, IonFabList, IonCheckbox, IonRippleEffect, IonIcon, IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonList, IonItem, IonLabel, IonThumbnail, IonImg, IonApp, IonModal, IonButton, IonMenu, IonMenuButton, IonButtons, IonText } from '@ionic/react'
import { List } from 'react-virtualized';
import { Plugins, StatusBarStyle, Capacitor } from "@capacitor/core"

import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';
import '../theme/variables.css';

import * as Ionicons from 'ionicons/icons';
import * as language from "../utils/language"

import Hammer from "rc-hammerjs"

const utils = require("../utils/utils")
const safeAreaInsets = require('safe-area-insets')

export function render(){
    let rowRenderer = ({ index, style }) => {
        let startContent = this.state.selectedItems > 0 ? (
            <IonThumbnail id={"item-thumbnail-" + this.state.itemList[index].uuid} slot="start" onClick={() => this.selectItem(true, index)}>
                {
                    this.state.itemList[index].type == "folder" ? (
                        <div>
                            <img src="assets/images/folder.svg" style={{
                                display: "none"
                            }}></img>
                            <IonIcon icon={Ionicons.folderSharp} style={{
                                fontSize: "30pt",
                                color: utils.getFolderColorStyle(this.state.itemList[index].color, true),
                                position: "absolute",
                                marginTop: "6px",
                                marginLeft: "9px"
                            }}></IonIcon>
                        </div>
                    ) : (
                        <img src={typeof this.state.itemList[index].thumbnail !== "undefined" ? this.state.itemList[index].thumbnail : utils.getFileIconFromName(this.state.itemList[index].name)} style={{
                            padding: "10px",
                            marginTop: "-1px"
                        }}></img>
                    )
                }
            </IonThumbnail>
        ) : (
            <IonThumbnail id={"item-thumbnail-" + this.state.itemList[index].uuid} slot="start" onClick={() => this.state.itemList[index].type == "file" ? this.previewItem(this.state.itemList[index]) : this.state.currentHref.indexOf("trash") == -1 && this.routeToFolder(this.state.itemList[index], index, window.location.href.split("/").slice(-1)[0])}>
                {
                    this.state.itemList[index].type == "folder" ? (
                        <div>
                            <img src="assets/images/folder.svg" style={{
                                display: "none"
                            }}></img>
                            <IonIcon icon={Ionicons.folderSharp} style={{
                                fontSize: "30pt",
                                color: utils.getFolderColorStyle(this.state.itemList[index].color, true),
                                position: "absolute",
                                marginTop: "6px",
                                marginLeft: "9px"
                            }}></IonIcon>
                        </div>
                    ) : (
                        <img src={typeof this.state.itemList[index].thumbnail !== "undefined" ? this.state.itemList[index].thumbnail : utils.getFileIconFromName(this.state.itemList[index].name)} style={{
                            padding: "10px",
                            marginTop: "-1px"
                        }}></img>
                    )
                }
            </IonThumbnail>
        )

        let itemLabel = this.state.itemList[index].selected ? (
            <IonLabel onClick={() => this.selectItem(false, index) }>
                {
                    this.state.itemList[index].type == "folder" ? (
                        <div>
                            <h2>{this.state.itemList[index].name}</h2>
                            <p style={{
                                color: this.state.darkMode ? "gray" : "black",
                                fontSize: "9pt"
                            }}>
                                {
                                    window.location.href.indexOf("shared-in") !== -1 && (
                                        <div>
                                            {this.state.itemList[index].sharerEmail}, 
                                        </div>
                                    )
                                }
                                {
                                    window.location.href.indexOf("shared-out") !== -1 && (
                                        <div>
                                            {this.state.itemList[index].receiverEmail}, 
                                        </div>
                                    )
                                }
                                {this.state.itemList[index].date}
                            </p>
                        </div>
                    ) : (
                        <div>
                            <h2>{this.state.itemList[index].name}</h2>
                            <p style={{
                                color: this.state.darkMode ? "gray" : "black",
                                fontSize: "9pt"
                            }}>
                                {
                                    this.state.itemList[index].offline && (
                                        <IonIcon icon={Ionicons.checkmark} style={{
                                            color: "darkgreen",
                                            marginRight: "5px",
                                            fontWeight: "bold"
                                        }}></IonIcon>
                                    )
                                }
                                {
                                    window.location.href.indexOf("shared-in") !== -1 && (
                                        <div>
                                            {this.state.itemList[index].sharerEmail}, 
                                        </div>
                                    )
                                }
                                {
                                    window.location.href.indexOf("shared-out") !== -1 && (
                                        <div>
                                            {this.state.itemList[index].receiverEmail}, 
                                        </div>
                                    )
                                }
                                {utils.formatBytes(this.state.itemList[index].size)}, {this.state.itemList[index].date}
                            </p>
                        </div>
                    )
                }
            </IonLabel>
        ) : (
            this.state.selectedItems > 0 ? (
                <IonLabel onClick={() => this.selectItem(true, index) }>
                    {
                        this.state.itemList[index].type == "folder" ? (
                            <div>
                                <h2>{this.state.itemList[index].name}</h2>
                                <p style={{
                                    color: this.state.darkMode ? "gray" : "black",
                                    fontSize: "9pt"
                                }}>
                                    {
                                        window.location.href.indexOf("shared-in") !== -1 && (
                                            <div>
                                                {this.state.itemList[index].sharerEmail}, 
                                            </div>
                                        )
                                    }
                                    {
                                        window.location.href.indexOf("shared-out") !== -1 && (
                                            <div>
                                                {this.state.itemList[index].receiverEmail}, 
                                            </div>
                                        )
                                    }
                                    {this.state.itemList[index].date}
                                </p>
                            </div>
                        ) : (
                            <div>
                                <h2>{this.state.itemList[index].name}</h2>
                                <p style={{
                                    color: this.state.darkMode ? "gray" : "black",
                                    fontSize: "9pt"
                                }}>
                                    {
                                        this.state.itemList[index].offline && (
                                            <IonIcon icon={Ionicons.checkmark} style={{
                                                color: "darkgreen",
                                                marginRight: "5px",
                                                fontWeight: "bold"
                                            }}></IonIcon>
                                        )
                                    }
                                    {
                                        window.location.href.indexOf("shared-in") !== -1 && (
                                            <span>
                                                {this.state.itemList[index].sharerEmail},&nbsp;
                                            </span>
                                        )
                                    }
                                    {
                                        window.location.href.indexOf("shared-out") !== -1 && (
                                            <span>
                                                {this.state.itemList[index].receiverEmail},&nbsp;
                                            </span>
                                        )
                                    }
                                    {utils.formatBytes(this.state.itemList[index].size)}, {this.state.itemList[index].date}
                                </p>
                            </div>
                        )
                    }
                </IonLabel>
            ) : (
                <IonLabel onClick={() => this.state.itemList[index].type == "file" ? this.previewItem(this.state.itemList[index]) : this.state.currentHref.indexOf("trash") == -1 && this.routeToFolder(this.state.itemList[index], index, window.location.href.split("/").slice(-1)[0])}>
                    {
                        this.state.itemList[index].type == "folder" ? (
                            <div>
                                <h2>{this.state.itemList[index].name}</h2>
                                <p style={{
                                    color: this.state.darkMode ? "gray" : "black",
                                    fontSize: "9pt"
                                }}>
                                    {
                                        window.location.href.indexOf("shared-in") !== -1 && (
                                            <span>
                                                {this.state.itemList[index].sharerEmail},&nbsp;
                                            </span>
                                        )
                                    }
                                    {
                                        window.location.href.indexOf("shared-out") !== -1 && (
                                            <span>
                                                {this.state.itemList[index].receiverEmail},&nbsp;
                                            </span>
                                        )
                                    }
                                    {this.state.itemList[index].date}
                                </p>
                            </div>
                        ) : (
                            <div>
                                <h2>{this.state.itemList[index].name}</h2>
                                <p style={{
                                    color: this.state.darkMode ? "gray" : "black",
                                    fontSize: "9pt"
                                }}>
                                    {
                                        this.state.itemList[index].offline && (
                                            <IonIcon icon={Ionicons.checkmarkOutline} style={{
                                                color: "darkgreen",
                                                marginRight: "5px",
                                                fontWeight: "bold"
                                            }}></IonIcon>
                                        )
                                    }
                                    {
                                        window.location.href.indexOf("shared-in") !== -1 && (
                                            <span>
                                                {this.state.itemList[index].sharerEmail},&nbsp;
                                            </span>
                                        )
                                    }
                                    {
                                        window.location.href.indexOf("shared-out") !== -1 && (
                                            <span>
                                                {this.state.itemList[index].receiverEmail},&nbsp;
                                            </span>
                                        )
                                    }
                                    {utils.formatBytes(this.state.itemList[index].size)}, {this.state.itemList[index].date}
                                </p>
                            </div>
                        )
                    }
                </IonLabel>
            )
        )

        let endContent = this.state.itemList[index].selected ? (
            <IonButtons>
                <IonButton slot="end" onClick={() => this.selectItem(false, index)}>
                    <IonIcon slot="icon-only" icon={Ionicons.checkbox} />
                </IonButton>
            </IonButtons>
        ) : (
            <IonButtons>
                <IonButton slot="end" onClick={() => this.spawnItemActionSheet(this.state.itemList[index])} style={{
                    fontSize: "8pt"
                }}>
                    <IonIcon slot="icon-only" icon={Ionicons.ellipsisVertical} />
                </IonButton>
            </IonButtons>
        )

        return (
            <Hammer key={index} onPress={() => this.selectItem(true, index)} options={{
                recognizers: {
                    press: {
                        time: 500,
                        threshold: 500
                    }
                }
            }} style={style}>
                <IonItem type="button" button lines="none" className={this.state.itemList[index].selected ? (this.state.darkMode ? "item-selected-dark-mode" : "item-selected-light-mode") : "not-activated"}>
                    {startContent}
                    {itemLabel}
                    {endContent}
                </IonItem>
            </Hammer>
        )
    }

    let mainToolbar = this.state.selectedItems > 0 ? (
        <IonToolbar>
            <IonButtons slot="start">
                <IonButton onClick={() => this.clearSelectedItems()}>
                    <IonIcon slot="icon-only" icon={Ionicons.arrowBack} />
                </IonButton>
              </IonButtons>
            <IonTitle>{this.state.selectedItems} item{this.state.selectedItems == 1 ? "" : "s"}</IonTitle>
            <IonButtons slot="end">
                {
                    window.location.href.indexOf("base") !== -1 && (
                        <IonButton onClick={() => window.customFunctions.shareSelectedItems()}>
                            <IonIcon slot="icon-only" icon={Ionicons.shareSocial} />
                        </IonButton>
                    )
                }
                {
                    window.location.href.indexOf("base") !== -1 && utils.selectedItemsDoesNotContainFolder(this.state.itemList) && (
                        <IonButton onClick={() => window.customFunctions.downloadSelectedItems()}>
                            <IonIcon slot="icon-only" icon={Ionicons.cloudDownload} />
                        </IonButton>
                    )
                }
                <IonButton onClick={this.selectItemsAction}>
                    <IonIcon slot="icon-only" icon={Ionicons.ellipsisVertical} />
                </IonButton>
              </IonButtons>
        </IonToolbar>
    ) : (
        this.state.searchbarOpen ? (
            <IonToolbar>
                <IonButtons slot="start">
                    <IonButton onClick={this.hideMainSearchbar}>
                        <IonIcon slot="icon-only" icon={Ionicons.arrowBack} />
                    </IonButton>
                </IonButtons>
                <IonSearchbar id="main-searchbar" ref={(el) => el !== null && setTimeout(() => el.setFocus(), 100)} type="search" inputmode="search" value={this.state.mainSearchTerm}></IonSearchbar>
            </IonToolbar>
        ) : (
            <IonToolbar>
                {
                    this.state.showMainToolbarBackButton ? (
                        <IonButtons slot="start">
                            <IonButton onClick={this.goBack}>
                                <IonIcon slot="icon-only" icon={Ionicons.arrowBack} />
                            </IonButton>
                        </IonButtons>
                    ) : (
                        <IonMenuButton menu="sideBarMenu" slot="start">
                            <IonIcon icon={Ionicons.menu}></IonIcon>
                        </IonMenuButton>
                    )
                }
                <IonTitle>{this.state.mainToolbarTitle}</IonTitle>
                <IonButtons slot="secondary">
                    <IonButton onClick={() => this.setState({ searchbarOpen: true })}>
                        <IonIcon slot="icon-only" icon={Ionicons.search} />
                    </IonButton>
                    <IonMenuButton menu="transfersMenu">
                        {
                            (this.state.uploadsCount + this.state.downloadsCount) > 0 && (
                                <IonBadge color="danger" style={{
                                    position: "absolute",
                                    borderRadius: "50%",
                                    marginTop: "-8px",
                                    marginLeft: "10px",
                                    zIndex: "1001",
                                    fontSize: "7pt"
                                }}>
                                    {(this.state.uploadsCount + this.state.downloadsCount)}
                                </IonBadge>
                            )
                        }
                        <IonIcon icon={Ionicons.repeatOutline} />
                    </IonMenuButton>
                    <IonButton onClick={this.mainMenuPopover}>
                        <IonIcon slot="icon-only" icon={Ionicons.ellipsisVertical} />
                    </IonButton>
                </IonButtons>
            </IonToolbar>
        )
    )

    let bottomFab = undefined
    let bottomFabStyle = {
        marginBottom: safeAreaInsets.bottom + "px"
    }

    if(window.location.href.indexOf("trash") !== -1 && this.state.itemList.length > 0){
        bottomFab = <IonFab vertical="bottom" style={bottomFabStyle} horizontal="end" slot="fixed" onClick={() => window.customFunctions.emptyTrash()}>
                        <IonFabButton color="danger">
                            <IonIcon icon={Ionicons.trash} />
                        </IonFabButton>
                    </IonFab>
    }
    else if(window.location.href.indexOf("base") !== -1){
        bottomFab = <IonFab vertical="bottom" style={bottomFabStyle} horizontal="end" slot="fixed" onClick={() => this.mainFabAction()}>
                        <IonFabButton color={this.state.darkMode ? "dark" : "light"}>
                            <IonIcon icon={Ionicons.add} />
                        </IonFabButton>
                    </IonFab>
    }
    else{
        bottomFab = <div></div>
    }

    let transfersUploads = Object.keys(this.state.uploads).map((key) => {
        return (
            <IonItem lines="none" key={key}>
                <IonIcon slot="start" icon={Ionicons.arrowUp}></IonIcon>
                <IonLabel>{this.state.uploads[key].name}</IonLabel>
                <IonBadge color={this.state.darkMode ? "dark" : "light"} slot="end">
                    {
                        this.state.uploads[key].progress >= 100 ? language.get(this.state.lang, "transfersFinishing") : this.state.uploads[key].progress + "%"
                    }
                </IonBadge>
                {
                    this.state.uploads[key].progress < 100 && (
                        <IonBadge color="danger" slot="end" onClick={() => {
                            delete window.customVariables.uploads[this.state.uploads[key].uuid]
        
                            return window.customVariables.stoppedUploads[this.state.uploads[key].uuid] = true
                        }}>
                            {language.get(this.state.lang, "transferStop")}
                        </IonBadge>
                    )
                }
            </IonItem>
        )
    })

    let transfersDownloads = Object.keys(this.state.downloads).map((key) => {
        return (
            <IonItem lines="none" key={key}>
                <IonIcon slot="start" icon={Ionicons.arrowDown}></IonIcon>
                <IonLabel>{this.state.downloads[key].name}</IonLabel>
                <IonBadge color={this.state.darkMode ? "dark" : "light"} slot="end">
                    {
                        this.state.downloads[key].progress >= 100 ? language.get(this.state.lang, "transfersFinishing") : this.state.downloads[key].progress + "%"
                    }
                </IonBadge>
                {
                    this.state.downloads[key].progress < 100 && (
                        <IonBadge color="danger" slot="end" onClick={() => {
                            delete window.customVariables.downloads[this.state.downloads[key].uuid]
        
                            return window.customVariables.stoppedDownloads[this.state.downloads[key].uuid] = true
                        }}>
                            {language.get(this.state.lang, "transferStop")}
                        </IonBadge>
                    )
                }
            </IonItem>
        )
    })

    if(this.state.isLoggedIn){
        return (
            <IonApp>
                <IonPage>
                    <IonMenu side="start" menuId="sideBarMenu" content-id="main-content">
                        <IonHeader style={{
                            padding: "15px",
                            alignItems: "center",
                            textAlign: "center",
                            background: this.state.darkMode ? "#1E1E1E" : "white"
                        }}>
                            <IonAvatar style={{
                                margin: "0px auto",
                                marginTop: safeAreaInsets.top + "px"
                            }} onClick={() => {
                                window.customFunctions.hideSidebarMenu()
                                
                                return window.customFunctions.openSettingsModal()
                            }}>
                                <img src="assets/img/icon.png" />
                            </IonAvatar>
                            <br />
                            <IonText style={{
                                color: this.state.darkMode ? "white" : "black"
                            }}>
                                {this.state.userEmail}
                            </IonText>
                            <br />
                            <br />
                            <IonProgressBar color="primary" value={(this.state.userStorageUsagePercentage / 100)}></IonProgressBar>
                            <div style={{
                                width: "100%",
                                color: this.state.darkMode ? "white" : "black",
                                marginTop: "10px"
                            }}>
                                <div style={{
                                    float: "left",
                                    fontSize: "10pt"
                                }}>
                                    {this.state.userStorageUsageMenuText}
                                </div>
                                <div style={{
                                    float: "right"
                                }}>
                                    {
                                        this.state.userMaxStorage < 107374182400 && (
                                            <div>
                                                <IonBadge button onClick={() => {
                                                    window.open("https://filen.io/pro", "_system")
                                                    
                                                    return false
                                                }} color={this.state.darkMode ? "dark" : "light"} style={{
                                                    fontSize: "7pt"
                                                }}>
                                                    {language.get(this.state.lang, "goProBadge")}
                                                </IonBadge>
                                            </div>
                                        )
                                    }
                                </div>
                            </div>
                        </IonHeader>
                        <IonContent style={{
                            "--background": this.state.darkMode ? "#1E1E1E" : "white"
                        }} fullscreen={true}>
                            <IonList>
                                <IonItem button lines="none" onClick={() => {
                                    window.customFunctions.hideSidebarMenu()
                                    
                                    return this.routeTo("/base")
                                }}>
                                    <IonIcon slot="start" icon={Ionicons.cloud}></IonIcon>
                                    <IonLabel>{language.get(this.state.lang, "myCloud")}</IonLabel>
                                </IonItem>
                                {
                                    (typeof this.state.userPublicKey == "string" && typeof this.state.userPrivateKey == "string" && typeof this.state.userMasterKeys == "object") && (this.state.userPublicKey.length > 16 && this.state.userPrivateKey.length > 16 && this.state.userMasterKeys.length > 0) && (
                                        <div>
                                            <IonItem button lines="none" onClick={() => {
                                                window.customFunctions.hideSidebarMenu()
                                                
                                                return this.routeTo("/shared-in")
                                            }}>
                                                <IonIcon slot="start" icon={Ionicons.folderOpen}></IonIcon>
                                                <IonLabel>{language.get(this.state.lang, "sharedWithMe")}</IonLabel>
                                            </IonItem>
                                            <IonItem button lines="none" onClick={() => {
                                                window.customFunctions.hideSidebarMenu()
                                                
                                                return this.routeTo("/shared-out")
                                            }}>
                                                <IonIcon slot="start" icon={Ionicons.folder}></IonIcon>
                                                <IonLabel>{language.get(this.state.lang, "currentlySharing")}</IonLabel>
                                            </IonItem>
                                        </div>
                                    )
                                }
                                <IonItem button lines="none" onClick={() => {
                                    window.customFunctions.hideSidebarMenu()
                                    
                                    return this.routeTo("/links")
                                }}>
                                    <IonIcon slot="start" icon={Ionicons.link}></IonIcon>
                                    <IonLabel>{language.get(this.state.lang, "links")}</IonLabel>
                                </IonItem>
                                <IonItem button lines="none" onClick={() => {
                                    window.customFunctions.hideSidebarMenu()
                                    
                                    return this.routeTo("/trash")
                                }}>
                                    <IonIcon slot="start" icon={Ionicons.trash}></IonIcon>
                                    <IonLabel>{language.get(this.state.lang, "trash")}</IonLabel>
                                </IonItem>
                                <IonItem button lines="none" onClick={() => {
                                    window.customFunctions.hideSidebarMenu()
                                    
                                    return window.customFunctions.openSettingsModal()
                                }}>
                                    <IonIcon slot="start" icon={Ionicons.settings}></IonIcon>
                                    <IonLabel>{language.get(this.state.lang, "settings")}</IonLabel>
                                </IonItem>
                                <IonItem button lines="none" onClick={() => {
                                    window.customFunctions.hideSidebarMenu()
                                    
                                    return window.customFunctions.openEncryptionModal()
                                }}>
                                    <IonIcon slot="start" icon={Ionicons.lockClosed}></IonIcon>
                                    <IonLabel>{language.get(this.state.lang, "encryption")}</IonLabel>
                                </IonItem>
                                <IonItem button lines="none" onClick={() => {
                                    window.customFunctions.hideSidebarMenu()
                                    
                                    return window.customFunctions.openWebsiteModal()
                                }}>
                                    <IonIcon slot="start" icon={Ionicons.globe}></IonIcon>
                                    <IonLabel>{language.get(this.state.lang, "website")}</IonLabel>
                                </IonItem>
                                <IonItem button lines="none" onClick={() => {
                                    window.customFunctions.hideSidebarMenu()
                                    
                                    return window.customFunctions.openHelpModal()
                                }}>
                                    <IonIcon slot="start" icon={Ionicons.help}></IonIcon>
                                    <IonLabel>{language.get(this.state.lang, "help")}</IonLabel>
                                </IonItem>
                            </IonList>
                        </IonContent>
                    </IonMenu>
                    <IonMenu side="end" menuId="transfersMenu" content-id="main-content">
                        <IonHeader>
                            <IonToolbar>
                                <IonTitle>
                                    {language.get(this.state.lang, "transfersMenuTitle")}
                                </IonTitle>
                            </IonToolbar>
                        </IonHeader>
                        <IonContent style={{
                            "--background": this.state.darkMode ? "#1E1E1E" : "white"
                        }} fullscreen={true}>
                            {
                                (this.state.uploadsCount + this.state.downloadsCount) > 0 ? (
                                    <IonList>
                                        {transfersUploads}
                                        {transfersDownloads}
                                    </IonList>
                                ) : (
                                    <IonList>
                                        <IonItem lines="none">{language.get(this.state.lang, "transfersMenuNoTransfers")}</IonItem>
                                    </IonList>
                                )
                            }
                        </IonContent>
                    </IonMenu>
                    <div id="main-content">
                        <IonHeader>
                            {mainToolbar}
                        </IonHeader>
                        <IonContent style={{
                            width: this.state.windowWidth + "px",
                            height: this.state.windowHeight - 56 + "px",
                            "--background": this.state.darkMode ? "#1E1E1E" : "white",
                            outline: "none",
                            border: "none"
                        }} fullscreen={true}>
                            {bottomFab}
                            {
                                this.state.itemList.length == 0 && this.state.mainSearchTerm.trim().length > 0 ? (
                                    <IonList>
                                        <IonItem lines="none">
                                            <div style={{
                                                margin: "0px auto"
                                            }}>
                                                Nothing found matching "{this.state.mainSearchTerm}"
                                            </div>
                                        </IonItem>
                                    </IonList>
                                ) : (
                                    this.state.itemList.length == 0 && !this.state.searchbarOpen ? (
                                        <div>
                                            {
                                                this.state.currentHref.indexOf("base") !== -1 ? (
                                                    <div style={{
                                                        position: "absolute",
                                                        left: "50%",
                                                        top: "32%",
                                                        transform: "translate(-50%, -50%)",
                                                        width: "100%"
                                                    }}> 
                                                        <center>
                                                            <IonIcon icon={Ionicons.folderOpen} style={{
                                                                fontSize: "65pt",
                                                                color: this.state.darkMode ? "white" : "gray"
                                                            }}></IonIcon>
                                                            <br />
                                                            <br />
                                                            <div style={{
                                                                width: "75%"
                                                            }}>
                                                                {language.get(this.state.lang, "nothingInThisFolderYetPlaceholder")}
                                                            </div>
                                                        </center>
                                                    </div>
                                                ) : this.state.currentHref.indexOf("shared") !== -1 ? (
                                                    <div style={{
                                                        position: "absolute",
                                                        left: "50%",
                                                        top: "32%",
                                                        transform: "translate(-50%, -50%)",
                                                        width: "100%"
                                                    }}> 
                                                        <center>
                                                            <IonIcon icon={Ionicons.folderOpen} style={{
                                                                fontSize: "65pt",
                                                                color: this.state.darkMode ? "white" : "gray"
                                                            }}></IonIcon>
                                                            <br />
                                                            <br />
                                                            <div style={{
                                                                width: "75%"
                                                            }}>
                                                                {language.get(this.state.lang, "folderHasNoContentsPlaceholder")}
                                                            </div>
                                                        </center>
                                                    </div>
                                                ) : this.state.currentHref.indexOf("trash") !== -1 ? (
                                                    <div style={{
                                                        position: "absolute",
                                                        left: "50%",
                                                        top: "32%",
                                                        transform: "translate(-50%, -50%)",
                                                        width: "100%"
                                                    }}> 
                                                        <center>
                                                            <IonIcon icon={Ionicons.trash} style={{
                                                                fontSize: "65pt",
                                                                color: this.state.darkMode ? "white" : "gray"
                                                            }}></IonIcon>
                                                            <br />
                                                            <br />
                                                            <div style={{
                                                                width: "75%"
                                                            }}>
                                                                {language.get(this.state.lang, "trashEmptyPlaceholder")}
                                                            </div>
                                                        </center>
                                                    </div>
                                                ) : (
                                                    this.state.currentHref.indexOf("links") !== -1 ? (
                                                        <div style={{
                                                            position: "absolute",
                                                            left: "50%",
                                                            top: "32%",
                                                            transform: "translate(-50%, -50%)",
                                                            width: "100%"
                                                        }}> 
                                                            <center>
                                                                <IonIcon icon={Ionicons.link} style={{
                                                                    fontSize: "65pt",
                                                                    color: this.state.darkMode ? "white" : "gray"
                                                                }}></IonIcon>
                                                                <br />
                                                                <br />
                                                                <div style={{
                                                                    width: "75%"
                                                                }}>
                                                                    {language.get(this.state.lang, "linksEmptyPlaceholder")}
                                                                </div>
                                                            </center>
                                                        </div>
                                                    ) : (
                                                        <div style={{
                                                            position: "absolute",
                                                            left: "50%",
                                                            top: "32%",
                                                            transform: "translate(-50%, -50%)",
                                                            width: "100%"
                                                        }}> 
                                                            <center>
                                                                <IonIcon icon={Ionicons.folderOpen} style={{
                                                                    fontSize: "65pt",
                                                                    color: this.state.darkMode ? "white" : "gray"
                                                                }}></IonIcon>
                                                                <br />
                                                                <br />
                                                                <div style={{
                                                                    width: "75%"
                                                                }}>
                                                                    {language.get(this.state.lang, "nothingInThisFolderYetPlaceholder")}
                                                                </div>
                                                            </center>
                                                        </div>
                                                    )
                                                )
                                            }
                                        </div>
                                    ) : (
                                        <List 
                                            height={this.state.windowHeight - 56}
                                            width={this.state.windowWidth}
                                            rowCount={this.state.itemList.length}
                                            rowHeight={72}
                                            overscanRowCount={3}
                                            rowRenderer={rowRenderer}
                                            scrollToIndex={this.state.scrollToIndex}
                                            scrollToAlignment="center"
                                            style={{
                                                outline: "none",
                                                border: "none"
                                            }}
                                        ></List>
                                    )
                                )
                            }
                            <input type="file" id="file-input-dummy" style={{
                                display: "none"
                            }} onChange={(e) => {
                                let files = document.getElementById("file-input-dummy").files

                                if(!files){
                                    return false
                                }

                                if(files.length <= 0){
                                    return false
                                }

                                for(let i = 0; i < files.length; i++){
                                    this.queueFileUpload(files[i])
                                }

                                document.getElementById("file-input-dummy").value = ""

                                return true
                            }} multiple />
                        </IonContent>
                    </div>
                </IonPage>
            </IonApp> 
        )
    }
    else{
        return (
            <IonApp>
                <IonPage></IonPage>
            </IonApp>
        )
    }
}