import React from "react"
import { IonSkeletonText, IonSearchbar, IonAvatar, IonProgressBar, IonBadge, IonRefresher, IonRefresherContent, IonFab, IonFabButton, IonIcon, IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonList, IonItem, IonLabel, IonThumbnail, IonApp, IonButton, IonMenu, IonMenuButton, IonButtons, IonText } from "@ionic/react"
import { List } from "react-virtualized"
import { isPlatform } from "@ionic/react"
import { loadingController } from "@ionic/core"

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
import { FaHdd } from "react-icons/fa"

import Hammer from "rc-hammerjs"
import { routeTo, routeToFolder, goBack } from './router';
import { genThumbnail } from "./download"
import { queueFileUpload } from "./upload"
import { selectItem, selectItemsAction, clearSelectedItems, previewItem, spawnItemActionSheet } from "./items"
import { setMainSearchTerm, hideMainSearchbar } from "./search"
import { spawnToast, mainFabAction, mainMenuPopover } from "./spawn"

const utils = require("../utils/utils")
const safeAreaInsets = require('safe-area-insets')

export function rowRenderer(self, index, style){
    if(self.state.settings.gridModeEnabled){
        let startFromIndex = 0
        let gridItemsPerRow = 2
        let indexesToLoop = []

        if(self.state.itemList.length == 1){
            indexesToLoop = [0]
        }
        else{
            if(index > 0){
                startFromIndex = (index * gridItemsPerRow)
            }

            for(let i = startFromIndex; i < (gridItemsPerRow + startFromIndex); i++){
                indexesToLoop.push(i)
            }
        }

        indexesToLoop.filter((el) => {
            if(typeof self.state.itemList[el] == "undefined"){
                return false
            }

            return true
        }).map((index) => {
            genThumbnail(self.state.itemList[index], self)
        })

        return (
            <IonItem key={index} style={style} className="background-transparent full-width">
                <div style={{
                    width: "100%",
                    height: self.state.gridItemHeight,
                    display: "flex"
                }}>
                    {
                        indexesToLoop.filter((el) => {
                            if(typeof self.state.itemList[el] == "undefined"){
                                return false
                            }

                            return true
                        }).map((currentIndex) => {
                            return (
                                <Hammer key={currentIndex} onPress={() => selectItem(self, true, currentIndex)} options={{
                                    recognizers: {
                                        press: {
                                            time: 500,
                                            threshold: 500
                                        }
                                    }
                                }} >
                                    <div style={{
                                        width: self.state.gridItemWidth,
                                        marginRight: "10px",
                                        marginBottom: "10px",
                                        background: (self.state.darkMode ? "transparent" : "transparent"),
                                        borderRadius: "5px",
                                        border: "1px solid " + (self.state.darkMode ? "#1e1e1e" : "lightgray")
                                    }}>
                                        <div style={{
                                            width: "100%",
                                            height: self.state.gridItemHeight - 45 + "px",
                                            padding: "0px",
                                            backgroundClip: "content-box",
                                            zIndex: "101"
                                        }} onClick={() => {
                                            if(self.state.itemList[currentIndex].selected){
                                                if(self.state.selectedItems > 0){
                                                    selectItem(self, false, currentIndex)
                                                }
                                                else{
                                                    selectItem(self, true, currentIndex)
                                                }
                                            }
                                            else{
                                                if(self.state.selectedItems > 0){
                                                    selectItem(self, true, currentIndex)
                                                }
                                                else{
                                                    self.state.itemList[currentIndex].type == "file" ? previewItem(self, self.state.itemList[currentIndex]) : self.state.currentHref.indexOf("trash") == -1 && routeToFolder(self, self.state.itemList[currentIndex], currentIndex, window.location.href.split("/").slice(-1)[0])
                                                }
                                            }
                                        } }>
                                            {
                                                self.state.itemList[currentIndex].type == "folder" ? (
                                                    <div style={{
                                                        width: "100%",
                                                        height: "100%",
                                                        backgroundColor: "transparent",
                                                        lineHeight: self.state.gridItemHeight - 45 + "px",
                                                        textAlign: "center",
                                                        border: "none",
                                                        borderRadius: "0px",
                                                        outline: "none",
                                                        zIndex: "101",
                                                        borderBottom: "1px solid " + (self.state.darkMode ? "#1e1e1e" : "lightgray")
                                                    }}>
                                                        <div style={{
                                                            display: "inline-block",
                                                            verticalAlign: "middle",
                                                            lineHeight: "initial",
                                                            textAlign: "left"
                                                        }}>
                                                            {
                                                                self.state.itemList[currentIndex].isBase ? (
                                                                    <FaHdd style={{
                                                                        fontSize: "50pt",
                                                                        color: utils.getFolderColorStyle(self.state.itemList[currentIndex].color, true)
                                                                    }} />
                                                                ) : (
                                                                    <IonIcon icon={Ionicons.folderSharp} style={{
                                                                        fontSize: "50pt",
                                                                        color: utils.getFolderColorStyle(self.state.itemList[currentIndex].color, true),
                                                                    }}></IonIcon>
                                                                )
                                                            }
                                                        </div>
                                                    </div>
                                                )
                                                : typeof self.state.itemList[currentIndex].thumbnail == "string" ? (
                                                    <div style={{
                                                        width: "100%",
                                                        height: "100%",
                                                        backgroundColor: "transparent",
                                                        display: "inline-block",
                                                        backgroundSize: "cover",
                                                        backgroundPosition: "center center",
                                                        backgroundRepeat: "no-repeat",
                                                        border: "none",
                                                        borderTopRightRadius: "5px",
                                                        borderTopLeftRadius: "5px",
                                                        outline: "none",
                                                        zIndex: "101",
                                                        backgroundImage: "url(" + self.state.itemList[currentIndex].thumbnail + ")",
                                                        borderBottom: "1px solid " + (self.state.darkMode ? "#1e1e1e" : "lightgray")
                                                    }} id={"item-thumbnail-" + self.state.itemList[currentIndex].uuid}></div>
                                                ) : (
                                                    <div style={{
                                                        width: "100%",
                                                        height: "100%",
                                                        backgroundColor: "transparent",
                                                        lineHeight: self.state.gridItemHeight - 45 + "px",
                                                        textAlign: "center",
                                                        border: "none",
                                                        borderRadius: "0px",
                                                        outline: "none",
                                                        zIndex: "101",
                                                        borderBottom: "1px solid " + (self.state.darkMode ? "#1e1e1e" : "lightgray")
                                                    }}>
                                                        <div style={{
                                                            display: "inline-block",
                                                            verticalAlign: "middle",
                                                            lineHeight: "initial",
                                                            textAlign: "left",
                                                            overflow: "hidden"
                                                        }}>
                                                            <img src={utils.getFileIconFromName(self.state.itemList[currentIndex].name)} width="55"></img>
                                                        </div>
                                                    </div>
                                                )
                                            }
                                        </div>
                                        <div style={{
                                            width: "100%",
                                            marginTop: "6px"
                                        }} onClick={() => {
                                            self.state.itemList[currentIndex].selected ? selectItem(self, false, currentIndex) : spawnItemActionSheet(self, self.state.itemList[currentIndex])
                                        }}>
                                            <div style={{
                                                width: "81%",
                                                float: "left",
                                                paddingLeft: "10px",
                                                fontSize: "10pt",
                                                paddingTop: "2px"
                                            }} className="overflow-ellipsis">
                                                {self.state.itemList[currentIndex].name}
                                            </div>
                                            <div style={{
                                                width: "14%",
                                                float: "right"
                                            }}>
                                                {
                                                    self.state.itemList[currentIndex].selected ? (
                                                        <IonButtons style={{
                                                            marginTop: "-14px",
                                                            marginLeft: "-16px"
                                                        }}>
                                                            <IonButton slot="end" onClick={() => selectItem(self, false, currentIndex)}>
                                                                <IonIcon slot="icon-only" icon={Ionicons.checkbox} />
                                                            </IonButton>
                                                        </IonButtons>
                                                    ) : (
                                                        <IonButtons style={{
                                                            marginTop: "-14px",
                                                            marginLeft: "-11px"
                                                        }}>
                                                            <IonButton slot="end" style={{
                                                                fontSize: "8pt"
                                                            }}>
                                                                <IonIcon slot="icon-only" icon={Ionicons.ellipsisVertical} />
                                                            </IonButton>
                                                        </IonButtons>
                                                    )
                                                }
                                            </div>
                                        </div>
                                    </div>
                                </Hammer>
                            )
                        })
                    }
                </div>
            </IonItem>
        )
    }

    if(self.state.showMainSkeletonPlaceholder){
        return (
            <IonItem key={index} type="button" button lines="none" style={style}>
                <IonThumbnail className="outer-thumbnail" slot="start">
                    <IonSkeletonText animated />
                </IonThumbnail>
                <IonLabel>
                    <IonSkeletonText animated />
                    <br />
                    <IonSkeletonText animated style={{
                        width: "25%",
                        marginTop: "-10px"
                    }} />
                </IonLabel>
            </IonItem>
        )
    }
    else{
        let startContent = self.state.selectedItems > 0 ? (
            <IonThumbnail slot="start" onClick={() => selectItem(self, true, index)} style={{
                border: "none",
                "--border": "none",
                overflow: "hidden",
                padding: (self.state.itemList[index].type == "folder" ? "0px" : "7px")
            }}>
                {
                    self.state.itemList[index].type == "folder" ? (
                        <div>
                            <img src="assets/images/folder.svg" style={{
                                display: "none"
                            }}></img>
                            {
                                self.state.itemList[index].isBase ? (
                                    <FaHdd style={{
                                        fontSize: "30pt",
                                        color: utils.getFolderColorStyle(self.state.itemList[index].color, true),
                                        position: "absolute",
                                        marginTop: "6px",
                                        marginLeft: "5px"
                                    }} />
                                ) : (
                                    <IonIcon icon={Ionicons.folderSharp} style={{
                                        fontSize: "30pt",
                                        color: utils.getFolderColorStyle(self.state.itemList[index].color, true),
                                        position: "absolute",
                                        marginTop: "6px",
                                        marginLeft: "5px"
                                    }}></IonIcon>
                                )
                            }
                        </div>
                    ) : (
                        <div style={{
                            width: "100%",
                            height: "100%",
                            backgroundColor: "transparent",
                            display: "inline-block",
                            backgroundSize: "cover",
                            backgroundPosition: "center center",
                            backgroundRepeat: "no-repeat",
                            border: "none",
                            outline: "none",
                            zIndex: "101",
                            borderRadius: "5px",
                            backgroundImage: "url(" + (typeof self.state.itemList[index].thumbnail == "string" ? self.state.itemList[index].thumbnail : utils.getFileIconFromName(self.state.itemList[index].name)) + ")",
                        }} id={"item-thumbnail-" + self.state.itemList[index].uuid}></div>
                    )
                }
            </IonThumbnail>
        ) : (
            <IonThumbnail slot="start" onClick={() => self.state.itemList[index].type == "file" ? previewItem(self, self.state.itemList[index]) : self.state.currentHref.indexOf("trash") == -1 && routeToFolder(self, self.state.itemList[index], index, window.location.href.split("/").slice(-1)[0])} style={{
                border: "none",
                "--border": "none",
                overflow: "hidden",
                padding: (self.state.itemList[index].type == "folder" ? "0px" : "7px")
            }}>
                {
                    self.state.itemList[index].type == "folder" ? (
                        <div>
                            <img src="assets/images/folder.svg" style={{
                                display: "none"
                            }}></img>
                            {
                                self.state.itemList[index].isBase ? (
                                    <FaHdd style={{
                                        fontSize: "30pt",
                                        color: utils.getFolderColorStyle(self.state.itemList[index].color, true),
                                        position: "absolute",
                                        marginTop: "6px",
                                        marginLeft: "5px"
                                    }} />
                                ) : (
                                    <IonIcon icon={Ionicons.folderSharp} style={{
                                        fontSize: "30pt",
                                        color: utils.getFolderColorStyle(self.state.itemList[index].color, true),
                                        position: "absolute",
                                        marginTop: "6px",
                                        marginLeft: "5px"
                                    }}></IonIcon>
                                )
                            }
                        </div>
                    ) : (
                        <div style={{
                            width: "100%",
                            height: "100%",
                            backgroundColor: "transparent",
                            display: "inline-block",
                            backgroundSize: "cover",
                            backgroundPosition: "center center",
                            backgroundRepeat: "no-repeat",
                            border: "none",
                            outline: "none",
                            zIndex: "101",
                            borderRadius: "5px",
                            backgroundImage: "url(" + (typeof self.state.itemList[index].thumbnail == "string" ? self.state.itemList[index].thumbnail : utils.getFileIconFromName(self.state.itemList[index].name)) + ")",
                        }} id={"item-thumbnail-" + self.state.itemList[index].uuid}></div>
                    )
                }
            </IonThumbnail>
        )

        let itemLabel = self.state.itemList[index].selected ? (
            <IonLabel onClick={() => selectItem(self, false, index) }>
                {
                    self.state.itemList[index].type == "folder" ? (
                        <div>
                            <h2>{self.state.itemList[index].name}</h2>
                            <p style={{
                                color: self.state.darkMode ? "gray" : "black",
                                fontSize: "9pt"
                            }}>
                                {
                                    self.state.itemList[index].favorited == 1 && (
                                        <IonIcon icon={Ionicons.star} style={{
                                            marginRight: "5px",
                                            fontWeight: "bold"
                                        }}></IonIcon>
                                    )
                                }
                                {
                                    window.location.href.indexOf("shared-in") !== -1 && (
                                        <div>
                                            {self.state.itemList[index].sharerEmail}, 
                                        </div>
                                    )
                                }
                                {
                                    window.location.href.indexOf("shared-out") !== -1 && (
                                        <div>
                                            {self.state.itemList[index].receiverEmail}, 
                                        </div>
                                    )
                                }
                                {(self.state.itemList[index].size >= 0 ? utils.formatBytes(self.state.itemList[index].size) : "N/A")}, {self.state.itemList[index].date}
                            </p>
                        </div>
                    ) : (
                        <div>
                            <h2>{self.state.itemList[index].name}</h2>
                            <p style={{
                                color: self.state.darkMode ? "gray" : "black",
                                fontSize: "9pt"
                            }}>
                                {
                                    self.state.itemList[index].offline && (
                                        <IonIcon icon={Ionicons.checkmark} style={{
                                            color: "darkgreen",
                                            marginRight: "5px",
                                            fontWeight: "bold"
                                        }}></IonIcon>
                                    )
                                }
                                {
                                    self.state.itemList[index].favorited == 1 && (
                                        <IonIcon icon={Ionicons.star} style={{
                                            marginRight: "5px",
                                            fontWeight: "bold"
                                        }}></IonIcon>
                                    )
                                }
                                {
                                    window.location.href.indexOf("shared-in") !== -1 && (
                                        <div>
                                            {self.state.itemList[index].sharerEmail}, 
                                        </div>
                                    )
                                }
                                {
                                    window.location.href.indexOf("shared-out") !== -1 && (
                                        <div>
                                            {self.state.itemList[index].receiverEmail}, 
                                        </div>
                                    )
                                }
                                {utils.formatBytes(self.state.itemList[index].size)}, {self.state.itemList[index].date}
                            </p>
                        </div>
                    )
                }
            </IonLabel>
        ) : (
            self.state.selectedItems > 0 ? (
                <IonLabel onClick={() => selectItem(self, true, index) }>
                    {
                        self.state.itemList[index].type == "folder" ? (
                            <div>
                                <h2>{self.state.itemList[index].name}</h2>
                                <p style={{
                                    color: self.state.darkMode ? "gray" : "black",
                                    fontSize: "9pt"
                                }}>
                                    {
                                        self.state.itemList[index].favorited == 1 && (
                                            <IonIcon icon={Ionicons.star} style={{
                                                marginRight: "5px"
                                            }}></IonIcon>
                                        )
                                    }
                                    {
                                        window.location.href.indexOf("shared-in") !== -1 && (
                                            <div>
                                                {self.state.itemList[index].sharerEmail}, 
                                            </div>
                                        )
                                    }
                                    {
                                        window.location.href.indexOf("shared-out") !== -1 && (
                                            <div>
                                                {self.state.itemList[index].receiverEmail}, 
                                            </div>
                                        )
                                    }
                                    {(self.state.itemList[index].size >= 0 ? utils.formatBytes(self.state.itemList[index].size) : "N/A")}, {self.state.itemList[index].date}
                                </p>
                            </div>
                        ) : (
                            <div>
                                <h2>{self.state.itemList[index].name}</h2>
                                <p style={{
                                    color: self.state.darkMode ? "gray" : "black",
                                    fontSize: "9pt"
                                }}>
                                    {
                                        self.state.itemList[index].offline && (
                                            <IonIcon icon={Ionicons.checkmark} style={{
                                                color: "darkgreen",
                                                marginRight: "5px",
                                                fontWeight: "bold"
                                            }}></IonIcon>
                                        )
                                    }
                                    {
                                        self.state.itemList[index].favorited == 1 && (
                                            <IonIcon icon={Ionicons.star} style={{
                                                marginRight: "5px"
                                            }}></IonIcon>
                                        )
                                    }
                                    {
                                        window.location.href.indexOf("shared-in") !== -1 && (
                                            <span>
                                                {self.state.itemList[index].sharerEmail},&nbsp;
                                            </span>
                                        )
                                    }
                                    {
                                        window.location.href.indexOf("shared-out") !== -1 && (
                                            <span>
                                                {self.state.itemList[index].receiverEmail},&nbsp;
                                            </span>
                                        )
                                    }
                                    {utils.formatBytes(self.state.itemList[index].size)}, {self.state.itemList[index].date}
                                </p>
                            </div>
                        )
                    }
                </IonLabel>
            ) : (
                <IonLabel onClick={() => self.state.itemList[index].type == "file" ? previewItem(self, self.state.itemList[index]) : self.state.currentHref.indexOf("trash") == -1 && routeToFolder(self, self.state.itemList[index], index, window.location.href.split("/").slice(-1)[0])}>
                    {
                        self.state.itemList[index].type == "folder" ? (
                            <div>
                                <h2>{self.state.itemList[index].name}</h2>
                                <p style={{
                                    color: self.state.darkMode ? "gray" : "black",
                                    fontSize: "9pt"
                                }}>
                                    {
                                        self.state.itemList[index].favorited == 1 && (
                                            <IonIcon icon={Ionicons.star} style={{
                                                marginRight: "5px"
                                            }}></IonIcon>
                                        )
                                    }
                                    {
                                        window.location.href.indexOf("shared-in") !== -1 && (
                                            <span>
                                                {self.state.itemList[index].sharerEmail},&nbsp;
                                            </span>
                                        )
                                    }
                                    {
                                        window.location.href.indexOf("shared-out") !== -1 && (
                                            <span>
                                                {self.state.itemList[index].receiverEmail},&nbsp;
                                            </span>
                                        )
                                    }
                                    {(self.state.itemList[index].size >= 0 ? utils.formatBytes(self.state.itemList[index].size) : "N/A")}, {self.state.itemList[index].date}
                                </p>
                            </div>
                        ) : (
                            <div>
                                <h2>{self.state.itemList[index].name}</h2>
                                <p style={{
                                    color: self.state.darkMode ? "gray" : "black",
                                    fontSize: "9pt"
                                }}>
                                    {
                                        self.state.itemList[index].offline && (
                                            <IonIcon icon={Ionicons.checkmarkOutline} style={{
                                                color: "darkgreen",
                                                marginRight: "5px",
                                                fontWeight: "bold"
                                            }}></IonIcon>
                                        )
                                    }
                                    {
                                        self.state.itemList[index].favorited == 1 && (
                                            <IonIcon icon={Ionicons.star} style={{
                                                marginRight: "5px"
                                            }}></IonIcon>
                                        )
                                    }
                                    {
                                        window.location.href.indexOf("shared-in") !== -1 && (
                                            <span>
                                                {self.state.itemList[index].sharerEmail},&nbsp;
                                            </span>
                                        )
                                    }
                                    {
                                        window.location.href.indexOf("shared-out") !== -1 && (
                                            <span>
                                                {self.state.itemList[index].receiverEmail},&nbsp;
                                            </span>
                                        )
                                    }
                                    {utils.formatBytes(self.state.itemList[index].size)}, {self.state.itemList[index].date}
                                </p>
                            </div>
                        )
                    }
                </IonLabel>
            )
        )

        let endContent = self.state.itemList[index].selected ? (
            <IonButtons>
                <IonButton slot="end" onClick={() => selectItem(self, false, index)}>
                    <IonIcon slot="icon-only" icon={Ionicons.checkbox} />
                </IonButton>
            </IonButtons>
        ) : (
            <IonButtons>
                <IonButton slot="end" onClick={() => spawnItemActionSheet(self, self.state.itemList[index])} style={{
                    fontSize: "8pt"
                }}>
                    <IonIcon slot="icon-only" icon={Ionicons.ellipsisVertical} />
                </IonButton>
            </IonButtons>
        )

        genThumbnail(self.state.itemList[index], self)

        return (
            <Hammer key={index} onPress={() => selectItem(self, true, index)} options={{
                recognizers: {
                    press: {
                        time: 500,
                        threshold: 500
                    }
                }
            }} style={style}>
                <IonItem type="button" button lines="none" className={self.state.itemList[index].selected ? (self.state.darkMode ? "item-selected-dark-mode" : "item-selected-light-mode") : "item-not-activated-mode"}>
                    {startContent}
                    {itemLabel}
                    {endContent}
                </IonItem>
            </Hammer>
        )
    }
}

export function render(self){
    let showShareLinks = (typeof self.state.userPublicKey == "string" && typeof self.state.userPrivateKey == "string" && typeof self.state.userMasterKeys == "object") && (self.state.userPublicKey.length > 16 && self.state.userPrivateKey.length > 16 && self.state.userMasterKeys.length > 0)

    let mainToolbar = self.state.selectedItems > 0 ? (
        <IonToolbar style={{
            "--background": self.state.darkMode ? "#121212" : "white"
        }}>
            <IonButtons slot="start">
                <IonButton onClick={() => clearSelectedItems(self)}>
                    <IonIcon slot="icon-only" icon={Ionicons.arrowBack} />
                </IonButton>
              </IonButtons>
            <IonTitle>{self.state.selectedItems} item{self.state.selectedItems == 1 ? "" : "s"}</IonTitle>
            <IonButtons slot="end">
                {
                    window.location.href.indexOf("base") !== -1 && !utils.selectedItemsContainsDefaultFolder(self.state.itemList) && self.state.isDeviceOnline && (
                        <IonButton onClick={() => window.customFunctions.shareSelectedItems()}>
                            <IonIcon slot="icon-only" icon={Ionicons.shareSocial} />
                        </IonButton>
                    )
                }
                {
                    window.location.href.indexOf("base") !== -1 && utils.selectedItemsDoesNotContainFolder(self.state.itemList) && self.state.isDeviceOnline && (
                        <IonButton onClick={() => window.customFunctions.downloadSelectedItems()}>
                            <IonIcon slot="icon-only" icon={Ionicons.cloudDownload} />
                        </IonButton>
                    )
                }
                <IonButton onClick={(e) => selectItemsAction(self, e)}>
                    <IonIcon slot="icon-only" icon={Ionicons.ellipsisVertical} />
                </IonButton>
              </IonButtons>
        </IonToolbar>
    ) : (
        self.state.searchbarOpen ? (
            <IonToolbar style={{
                "--background": self.state.darkMode ? "#121212" : "white"
            }}>
                <IonButtons slot="start">
                    <IonButton onClick={(e) => hideMainSearchbar(self, e)}>
                        <IonIcon slot="icon-only" icon={Ionicons.arrowBack} />
                    </IonButton>
                </IonButtons>
                <IonSearchbar id="main-searchbar" ref={(el) => el !== null && setTimeout(() => /* el.setFocus() */ {}, 100)} type="search" inputmode="search" value={self.state.mainSearchTerm} onInput={() => {
                    let term = document.getElementById("main-searchbar").value

                    if(typeof term == "string"){
                        if(term.length > 0){
                            if(term !== window.customVariables.lastMainSearchbarTerm){
                                window.customVariables.lastMainSearchbarTerm = term
        
                                clearTimeout(window.customVariables.mainSearchbarTimeout)
            
                                window.customVariables.mainSearchbarTimeout = setTimeout(() => {
                                    setMainSearchTerm(self, term)
                                }, 500)
                            }
                        }
                        else{
                            clearTimeout(window.customVariables.mainSearchbarTimeout)
        
                            setMainSearchTerm(self, "")
                        }
                    }
                    else{
                        clearTimeout(window.customVariables.mainSearchbarTimeout)
        
                        setMainSearchTerm(self, "")
                    }
                }}></IonSearchbar>
            </IonToolbar>
        ) : (
            <IonToolbar style={{
                "--background": self.state.darkMode ? "#121212" : "white"
            }}>
                {
                    self.state.showMainToolbarBackButton ? (
                        <IonButtons slot="start">
                            <IonButton onClick={() => goBack(self)}>
                                <IonIcon slot="icon-only" icon={Ionicons.arrowBack} />
                            </IonButton>
                        </IonButtons>
                    ) : (
                        <IonMenuButton menu="sideBarMenu" slot="start">
                            <IonIcon icon={Ionicons.menu}></IonIcon>
                        </IonMenuButton>
                    )
                }
                <IonTitle>{self.state.mainToolbarTitle}</IonTitle>
                <IonButtons slot="secondary">
                    <IonButton onClick={() => self.setState({ searchbarOpen: true })}>
                        <IonIcon slot="icon-only" icon={Ionicons.search} />
                    </IonButton>
                    {
                        self.state.isDeviceOnline && (
                            <IonMenuButton menu="transfersMenu">
                                {
                                    (self.state.uploadsCount + self.state.downloadsCount) > 0 && (
                                        <IonBadge color="danger" style={{
                                            position: "absolute",
                                            borderRadius: "50%",
                                            marginTop: "-8px",
                                            marginLeft: "10px",
                                            zIndex: "1001",
                                            fontSize: "7pt"
                                        }}>
                                            {(self.state.uploadsCount + self.state.downloadsCount)}
                                        </IonBadge>
                                    )
                                }
                                <IonIcon icon={Ionicons.repeatOutline} />
                            </IonMenuButton>
                        )
                    }
                    <IonButton onClick={(e) => mainMenuPopover(e)}>
                        <IonIcon slot="icon-only" icon={Ionicons.ellipsisVertical} />
                    </IonButton>
                </IonButtons>
            </IonToolbar>
        )
    )

    let bottomFab = undefined
    let bottomFabStyle = {
        marginBottom: "0px",
        visibility: (self.state.hideMainFab ? "hidden" : "visible")
    }

    let showMainFab = false

    if(window.location.href.indexOf("base") !== -1){
        showMainFab = true
    }
    else{
        if(window.location.href.indexOf("links") !== -1 && utils.currentParentFolder().length >= 32){
            showMainFab = true
        }
    }

    if(!self.state.isDeviceOnline){
        showMainFab = false
    }

    if(window.location.href.indexOf("trash") !== -1 && self.state.itemList.length > 0){
        bottomFab = <IonFab vertical="bottom" style={bottomFabStyle} horizontal="end" slot="fixed" onClick={() => window.customFunctions.emptyTrash()}>
                        <IonFabButton color="danger">
                            <IonIcon icon={Ionicons.trash} />
                        </IonFabButton>
                    </IonFab>
    }
    else if(showMainFab){
        bottomFab = <IonFab vertical="bottom" style={bottomFabStyle} horizontal="end" slot="fixed" onClick={(e) => {
            hideMainSearchbar(self, e)

            mainFabAction(self)
        }}>
                        <IonFabButton color={self.state.darkMode ? "dark" : "light"}>
                            <IonIcon icon={Ionicons.add} />
                        </IonFabButton>
                    </IonFab>
    }
    else{
        bottomFab = <div style={{
            display: "none"
        }}></div>
    }

    let maxShowingTransfers = 25
    let currentShowingTransfers = 0
    let isShowingMoreInfo = false

    let transfersUploads = Object.keys(self.state.uploads).map((key) => {
        if(maxShowingTransfers > currentShowingTransfers){
            currentShowingTransfers += 1

            return (
                <IonItem lines="none" key={key}>
                    <IonIcon slot="start" icon={Ionicons.arrowUp}></IonIcon>
                    <IonLabel>{self.state.uploads[key].name}</IonLabel>
                    <IonBadge color={self.state.darkMode ? "dark" : "light"} slot="end" id={"uploads-progress-" + key}>
                        {
                            self.state.uploads[key].progress >= 100 ? language.get(self.state.lang, "transfersFinishing") : self.state.uploads[key].progress == 0 ? language.get(self.state.lang, "transfersQueued") : self.state.uploads[key].progress + "%"
                        }
                    </IonBadge>
                    {
                        self.state.uploads[key].progress < 100 && (
                            <IonBadge color="danger" slot="end" onClick={() => {
                                return window.customVariables.stoppedUploads[self.state.uploads[key].uuid] = true
                            }}>
                                {language.get(self.state.lang, "transferStop")}
                            </IonBadge>
                        )
                    }
                </IonItem>
            )
        }
        else{
            if(!isShowingMoreInfo){
                isShowingMoreInfo = true

                return (
                    <IonItem lines="none" key={key}>
                        {language.get(self.state.lang, "transfersMore", true, ["__COUNT__"], [((Object.keys(self.state.uploads).length + Object.keys(self.state.downloads).length) - maxShowingTransfers)])}
                    </IonItem>
                )
            }
        }
    })

    let transfersDownloads = Object.keys(self.state.downloads).map((key) => {
        if(maxShowingTransfers > currentShowingTransfers){
            currentShowingTransfers += 1

            return (
                <IonItem lines="none" key={key}>
                    <IonIcon slot="start" icon={Ionicons.arrowDown}></IonIcon>
                    <IonLabel>{self.state.downloads[key].name}</IonLabel>
                    <IonBadge color={self.state.darkMode ? "dark" : "light"} slot="end" id={"downloads-progress-" + key}>
                        {
                            self.state.downloads[key].progress >= 100 ? language.get(self.state.lang, "transfersFinishing") + " " + self.state.downloads[key].chunksWritten + "/" + self.state.downloads[key].chunks : self.state.downloads[key].progress == 0 ? language.get(self.state.lang, "transfersQueued") : self.state.downloads[key].progress + "%"
                        }
                    </IonBadge>
                    {
                        self.state.downloads[key].progress < 100 && (
                            <IonBadge color="danger" slot="end" onClick={() => {        
                                return window.customVariables.stoppedDownloads[self.state.downloads[key].uuid] = true
                            }}>
                                {language.get(self.state.lang, "transferStop")}
                            </IonBadge>
                        )
                    }
                </IonItem>
            )
        }
        else{
            if(!isShowingMoreInfo){
                isShowingMoreInfo = true

                return (
                    <IonItem lines="none" key={key}>
                        {language.get(self.state.lang, "transfersMore", true, ["__COUNT__"], [((Object.keys(self.state.uploads).length + Object.keys(self.state.downloads).length) - maxShowingTransfers)])}
                    </IonItem>
                )
            }
        }
    })

    if(self.state.isLoggedIn){
        return (
            <IonApp>
                <IonPage>
                    <IonMenu side="start" menuId="sideBarMenu" content-id="main-content">
                        <IonHeader className="ion-no-border" style={{
                            padding: "15px",
                            alignItems: "center",
                            textAlign: "center",
                            background: self.state.darkMode ? "#1E1E1E" : "white"
                        }}>
                            <IonAvatar style={{
                                margin: "0px auto",
                                marginTop: safeAreaInsets.top + "px"
                            }} onClick={() => {
                                if(!self.state.isDeviceOnline){
                                    return false
                                }

                                return document.getElementById("avatar-input-dummy").click()
                            }}>
                                <img src={typeof self.state.cachedUserInfo.avatarURL == "undefined" ? "assets/img/icon.png" : self.state.cachedUserInfo.avatarURL} />
                            </IonAvatar>
                            <br />
                            <IonText style={{
                                color: self.state.darkMode ? "white" : "black"
                            }}>
                                {self.state.userEmail}
                            </IonText>
                            <br />
                            <br />
                            <IonProgressBar color="primary" value={(self.state.userStorageUsagePercentage / 100)}></IonProgressBar>
                            <div style={{
                                width: "100%",
                                color: self.state.darkMode ? "white" : "black",
                                marginTop: "10px"
                            }}>
                                <div style={{
                                    float: "left",
                                    fontSize: "10pt"
                                }}>
                                    {self.state.userStorageUsageMenuText}
                                </div>
                            </div>
                        </IonHeader>
                        <IonContent style={{
                            "--background": self.state.darkMode ? "#1E1E1E" : "white"
                        }} fullscreen={true}>
                            <IonList>
                                {
                                    self.state.isDeviceOnline && (
                                        <IonItem button lines="none" onClick={() => {
                                            window.customFunctions.hideSidebarMenu()
                                            
                                            return window.customFunctions.openEventsModal()
                                        }}>
                                            <IonIcon slot="start" icon={Ionicons.informationCircleOutline}></IonIcon>
                                            <IonLabel>{language.get(self.state.lang, "events")}</IonLabel>
                                        </IonItem>
                                    )
                                }
                                <IonItem button lines="none" onClick={() => {
                                    window.customFunctions.hideSidebarMenu()
                                    
                                    return routeTo(self, "/trash")
                                }}>
                                    <IonIcon slot="start" icon={Ionicons.trash}></IonIcon>
                                    <IonLabel>{language.get(self.state.lang, "trash")}</IonLabel>
                                </IonItem>
                                <IonItem button lines="none" onClick={() => {
                                    window.customFunctions.hideSidebarMenu()
                                    
                                    return window.customFunctions.openSettingsModal()
                                }}>
                                    <IonIcon slot="start" icon={Ionicons.settings}></IonIcon>
                                    <IonLabel>{language.get(self.state.lang, "settings")}</IonLabel>
                                </IonItem>
                                {/*<IonItem button lines="none" onClick={() => {
                                    window.customFunctions.hideSidebarMenu()
                                    
                                    return window.customFunctions.openEncryptionModal()
                                }}>
                                    <IonIcon slot="start" icon={Ionicons.lockClosed}></IonIcon>
                                    <IonLabel>{language.get(self.state.lang, "encryption")}</IonLabel>
                                </IonItem>*/}
                                <IonItem button lines="none" onClick={() => {
                                    window.customFunctions.hideSidebarMenu()
                                    
                                    return window.customFunctions.openHelpModal()
                                }}>
                                    <IonIcon slot="start" icon={Ionicons.help}></IonIcon>
                                    <IonLabel>{language.get(self.state.lang, "help")}</IonLabel>
                                </IonItem>
                            </IonList>
                        </IonContent>
                    </IonMenu>
                    <IonMenu side="end" menuId="transfersMenu" content-id="main-content">
                        <IonHeader className="ion-no-border">
                            <IonToolbar>
                                <IonTitle>
                                    {language.get(self.state.lang, "transfersMenuTitle")} {(self.state.uploadsCount + self.state.downloadsCount) > 0 ? "(" + (self.state.uploadsCount + self.state.downloadsCount) + ")" : ""}
                                </IonTitle>
                            </IonToolbar>
                        </IonHeader>
                        <IonContent style={{
                            "--background": self.state.darkMode ? "#1E1E1E" : "white"
                        }} fullscreen={true}>
                            {
                                (self.state.uploadsCount + self.state.downloadsCount) > 0 ? (
                                    <IonList>
                                        {transfersUploads}
                                        {transfersDownloads}
                                    </IonList>
                                ) : (
                                    <IonList>
                                        <IonItem lines="none">{language.get(self.state.lang, "transfersMenuNoTransfers")}</IonItem>
                                    </IonList>
                                )
                            }
                        </IonContent>
                    </IonMenu>
                    <div id="main-content">
                        <IonHeader className="ion-no-border">
                            {mainToolbar}
                        </IonHeader>
                        <IonContent style={{
                            width: self.state.windowWidth + "px",
                            height: self.state.windowHeight - 56 - 57 - (isPlatform("ios") ? 40 : 0) - safeAreaInsets.bottom + "px",
                            "--background": self.state.darkMode ? "" : "white", //#1E1E1E darkmode
                            outline: "none",
                            border: "none"
                        }} fullscreen={true}>
                            {bottomFab}
                            <IonRefresher slot="fixed" id="refresher" disabled={self.state.refresherEnabled ? false : true} onIonRefresh={() => {
                                return window.customFunctions.refresherPulled()
                            }}>
                                <IonRefresherContent></IonRefresherContent>
                            </IonRefresher>
                            {
                                self.state.itemList.length == 0 && self.state.mainSearchTerm.trim().length > 0 ? (
                                    <div style={{
                                        position: "absolute",
                                        left: "50%",
                                        top: "32%",
                                        transform: "translate(-50%, -50%)",
                                        width: "100%"
                                    }}> 
                                        <center>
                                            <IonIcon icon={Ionicons.searchSharp} style={{
                                                fontSize: "65pt",
                                                color: self.state.darkMode ? "white" : "gray"
                                            }}></IonIcon>
                                            <br />
                                            <br />
                                            <div style={{
                                                width: "75%"
                                            }}>
                                                {language.get(self.state.lang, "nothingFoundSearch", true, ["__TERM__"], [self.state.mainSearchTerm])}
                                            </div>
                                        </center>
                                    </div>
                                ) : (
                                    self.state.itemList.length == 0 && !self.state.searchbarOpen ? (
                                        <div>
                                            {
                                                !self.state.isDeviceOnline ? (
                                                    <div style={{
                                                        position: "absolute",
                                                        left: "50%",
                                                        top: "32%",
                                                        transform: "translate(-50%, -50%)",
                                                        width: "100%"
                                                    }}> 
                                                        <center>
                                                            <IonIcon icon={Ionicons.cloudOfflineOutline} style={{
                                                                fontSize: "65pt",
                                                                color: self.state.darkMode ? "white" : "gray"
                                                            }}></IonIcon>
                                                            <br />
                                                            <br />
                                                            <div style={{
                                                                width: "75%"
                                                            }}>
                                                                {language.get(self.state.lang, "deviceOfflineAS")}
                                                            </div>
                                                        </center>
                                                    </div>
                                                ) : self.state.currentHref.indexOf("base") !== -1 ? (
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
                                                                color: self.state.darkMode ? "white" : "gray"
                                                            }}></IonIcon>
                                                            <br />
                                                            <br />
                                                            <div style={{
                                                                width: "75%"
                                                            }}>
                                                                {language.get(self.state.lang, "nothingInThisFolderYetPlaceholder")}
                                                            </div>
                                                        </center>
                                                    </div>
                                                ) : self.state.currentHref.indexOf("shared") !== -1 ? (
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
                                                                color: self.state.darkMode ? "white" : "gray"
                                                            }}></IonIcon>
                                                            <br />
                                                            <br />
                                                            <div style={{
                                                                width: "75%"
                                                            }}>
                                                                {language.get(self.state.lang, "folderHasNoContentsPlaceholder")}
                                                            </div>
                                                        </center>
                                                    </div>
                                                ) : self.state.currentHref.indexOf("trash") !== -1 ? (
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
                                                                color: self.state.darkMode ? "white" : "gray"
                                                            }}></IonIcon>
                                                            <br />
                                                            <br />
                                                            <div style={{
                                                                width: "75%"
                                                            }}>
                                                                {language.get(self.state.lang, "trashEmptyPlaceholder")}
                                                            </div>
                                                        </center>
                                                    </div>
                                                ) : (
                                                    self.state.currentHref.indexOf("links") !== -1 ? (
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
                                                                    color: self.state.darkMode ? "white" : "gray"
                                                                }}></IonIcon>
                                                                <br />
                                                                <br />
                                                                <div style={{
                                                                    width: "75%"
                                                                }}>
                                                                    {language.get(self.state.lang, "linksEmptyPlaceholder")}
                                                                </div>
                                                            </center>
                                                        </div>
                                                    ) : (
                                                        self.state.currentHref.indexOf("favorites") !== -1 ? (
                                                            <div style={{
                                                                position: "absolute",
                                                                left: "50%",
                                                                top: "32%",
                                                                transform: "translate(-50%, -50%)",
                                                                width: "100%"
                                                            }}> 
                                                                <center>
                                                                    <IonIcon icon={Ionicons.star} style={{
                                                                        fontSize: "65pt",
                                                                        color: self.state.darkMode ? "white" : "gray"
                                                                    }}></IonIcon>
                                                                    <br />
                                                                    <br />
                                                                    <div style={{
                                                                        width: "75%"
                                                                    }}>
                                                                        {language.get(self.state.lang, "noFavorites")}
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
                                                                        color: self.state.darkMode ? "white" : "gray"
                                                                    }}></IonIcon>
                                                                    <br />
                                                                    <br />
                                                                    <div style={{
                                                                        width: "75%"
                                                                    }}>
                                                                        {language.get(self.state.lang, "nothingInThisFolderYetPlaceholder")}
                                                                    </div>
                                                                </center>
                                                            </div>
                                                        )
                                                    )
                                                )
                                            }
                                        </div>
                                    ) : (
                                        self.state.settings.gridModeEnabled ? (
                                            <>
                                                <List 
                                                    id="main-virtual-list"
                                                    height={self.state.windowHeight - 56 - 57 - (isPlatform("ios") ? 45 : 0) - safeAreaInsets.bottom}
                                                    width={self.state.windowWidth}
                                                    rowCount={Math.round(self.state.itemList.length / 2)}
                                                    rowHeight={self.state.gridItemHeight}
                                                    overscanRowCount={8}
                                                    rowRenderer={({ index, style }) => {
                                                        return rowRenderer(self, index, style)
                                                    }}
                                                    scrollToIndex={self.state.scrollToIndex}
                                                    scrollToAlignment="center"
                                                    onScroll={() => window.customFunctions.itemListScrolling()}
                                                    style={{
                                                        outline: "none",
                                                        border: "none"
                                                    }}
                                                    onRowsRendered={({startIndex, stopIndex}) => {
                                                        startIndex = Math.floor(startIndex / 2)
                                                        stopIndex = Math.floor(stopIndex * 2 + 4)

                                                        let inView = {}

                                                        for(let index = startIndex; index < stopIndex; index++){
                                                            if(index >= 0){
                                                                if(typeof self.state.itemList[index] !== "undefined"){
                                                                    inView[self.state.itemList[index].uuid] = true
                                                                    window.customVariables.thumbnailsInView[self.state.itemList[index].uuid] = true
                                                                }
                                                            }
                                                        }

                                                        for(let prop in window.customVariables.thumbnailsInView){
                                                            if(typeof inView[prop] !== "undefined"){
                                                                window.customVariables.thumbnailsInView[prop] = true
                                                            }
                                                            else{
                                                                delete window.customVariables.thumbnailsInView[prop]
                                                            }
                                                        }
                                                    }}
                                                ></List>
                                            </>
                                        ) : (
                                            <>
                                                <List 
                                                    id="main-virtual-list"
                                                    height={self.state.windowHeight - 56 - 57 - (isPlatform("ios") ? 45 : 0) - safeAreaInsets.bottom}
                                                    width={self.state.windowWidth}
                                                    rowCount={self.state.itemList.length}
                                                    rowHeight={72}
                                                    overscanRowCount={8}
                                                    rowRenderer={({ index, style }) => {
                                                        return rowRenderer(self, index, style)
                                                    }}
                                                    scrollToIndex={self.state.scrollToIndex}
                                                    scrollToAlignment="center"
                                                    onScroll={() => window.customFunctions.itemListScrolling()}
                                                    style={{
                                                        outline: "none",
                                                        border: "none"
                                                    }}
                                                    onRowsRendered={({startIndex, stopIndex}) => {
                                                        startIndex = Math.floor(startIndex - 2)
                                                        stopIndex = Math.floor(stopIndex + 2)

                                                        let inView = {}

                                                        for(let index = startIndex; index < stopIndex; index++){
                                                            if(index >= 0){
                                                                if(typeof self.state.itemList[index] !== "undefined"){
                                                                    inView[self.state.itemList[index].uuid] = true
                                                                    window.customVariables.thumbnailsInView[self.state.itemList[index].uuid] = true
                                                                }
                                                            }
                                                        }

                                                        for(let prop in window.customVariables.thumbnailsInView){
                                                            if(typeof inView[prop] !== "undefined"){
                                                                window.customVariables.thumbnailsInView[prop] = true
                                                            }
                                                            else{
                                                                delete window.customVariables.thumbnailsInView[prop]
                                                            }
                                                        }
                                                    }}
                                                ></List>
                                            </>
                                        )
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
                                    let tempName = "UPLOAD_" + utils.uuidv4()
                                    let fileObject = {}

                                    fileObject.tempName = tempName
                                    fileObject.name = files[i].name
                                    fileObject.lastModified = Math.floor(files[i].lastModified)
                                    fileObject.size = files[i].size
                                    fileObject.type = files[i].type
                                    fileObject.fileEntry = files[i]
                                    fileObject.tempFileEntry = undefined

                                    queueFileUpload(fileObject)
                                }

                                document.getElementById("file-input-dummy").value = ""

                                return true
                            }} multiple />
                            <input type="file" accept="image/png, image/jpg, image/jpeg" id="avatar-input-dummy" style={{
                                display: "none"
                            }} onChange={async (e) => {
                                let files = document.getElementById("avatar-input-dummy").files

                                if(!files){
                                    return false
                                }

                                if(files.length <= 0){
                                    return false
                                }

                                if(files.length >= 2){
                                    return false
                                }

                                let file = files[0]

                                if(file.size >= ((1024 * 1024) * 2.99)){
                                    return spawnToast(language.get(self.state.lang, "avatarTooLarge"))
                                }

                                let loading = await loadingController.create({
                                    message: "",
                                    showBackdrop: false
                                })
    
                                loading.present()

                                try{
                                    await new Promise((resolve, reject) => {
                                        let fileReader = new FileReader()
            
                                        fileReader.onload = async () => {
                                            fetch(utils.getAPIServer() + "/v1/user/avatar/upload/" + window.customVariables.apiKey, {
                                                method: "POST",
                                                cache: "no-cache",
                                                body: fileReader.result
                                            }).then((response) => {
                                                response.json().then((obj) => {
                                                    let res = obj
                                        
                                                    if(!res){
                                                        return reject("failed")
                                                    }
    
                                                    if(!res.status){
                                                        return reject(res.message)
                                                    }

                                                    return resolve(null)
                                                }).catch((err) => {
                                                    return reject(err)
                                                })
                                            }).catch((err) => {
                                                return reject(err)
                                            })
                                        }
    
                                        fileReader.onerror = (err) => {
                                            reject(err)
    
                                            return spawnToast(language.get(self.state.lang, "fileUploadCouldNotReadFile", true, ["__NAME__"], [file.name]))
                                        }
    
                                        fileReader.readAsBinaryString(file)
                                    })
                                }
                                catch(e){
                                    console.log(e)

                                    loading.dismiss()

                                    return spawnToast(language.get(self.state.lang, "fileUploadFailed", true, ["__NAME__"], [file.name]))
                                }

                                loading.dismiss()

                                await window.customFunctions.fetchUserInfo()

                                spawnToast(language.get(self.state.lang, "avatarUploaded"))

                                document.getElementById("avatar-input-dummy").value = ""

                                return true
                            }} multiple />
                        </IonContent>
                    </div>
                    <IonToolbar style={{
                        "--background": (self.state.darkMode ? "" : "#F0F0F0"),
                        paddingBottom: safeAreaInsets.bottom + "px"
                    }}>
                        <IonButtons>
                            <IonButton onClick={() => {
                                return routeTo(self, "/base")
                            }} style={{
                                width: (showShareLinks ? "16.66%" : "25%"),
                                "--ripple-color": "transparent",
                                color: (window.location.href.indexOf("base") !== -1 ? "#3780FF" : "")
                            }}>
                                <IonIcon slot="icon-only" icon={Ionicons.cloud} />
                            </IonButton>
                            {
                                showShareLinks && (
                                    <>
                                        <IonButton onClick={() => {
                                            return routeTo(self, "/shared-in")
                                        }} style={{
                                            width: (showShareLinks ? "16.66%" : "25%"),
                                            "--ripple-color": "transparent",
                                            color: (window.location.href.indexOf("shared-in") !== -1 ? "#3780FF" : "")
                                        }}>
                                            <IonIcon slot="icon-only" icon={Ionicons.folder} />
                                        </IonButton>
                                        <IonButton onClick={() => {
                                            return routeTo(self, "/shared-out")
                                        }} style={{
                                            width: (showShareLinks ? "16.66%" : "25%"),
                                            "--ripple-color": "transparent",
                                            color: (window.location.href.indexOf("shared-out") !== -1 ? "#3780FF" : "")
                                        }}>
                                            <IonIcon slot="icon-only" icon={Ionicons.folderOpen} />
                                        </IonButton>
                                    </>
                                )
                            }
                            <IonButton onClick={() => {
                                return routeTo(self, "/links")
                            }} style={{
                                width: (showShareLinks ? "16.66%" : "25%"),
                                "--ripple-color": "transparent",
                                color: (window.location.href.indexOf("links") !== -1 ? "#3780FF" : "")
                            }}>
                                <IonIcon slot="icon-only" icon={Ionicons.link} />
                            </IonButton>
                            <IonButton onClick={() => {
                                return routeTo(self, "/favorites")
                            }} style={{
                                width: (showShareLinks ? "16.66%" : "25%"),
                                "--ripple-color": "transparent",
                                color: (window.location.href.indexOf("favorites") !== -1 ? "#3780FF" : "")
                            }}>
                                <IonIcon slot="icon-only" icon={Ionicons.star} />
                            </IonButton>
                            <IonButton onClick={() => {
                                return routeTo(self, "/recent")
                            }} style={{
                                width: (showShareLinks ? "16.66%" : "25%"),
                                "--ripple-color": "transparent",
                                color: (window.location.href.indexOf("recent") !== -1 ? "#3780FF" : "")
                            }}>
                                <IonIcon slot="icon-only" icon={Ionicons.time} />
                            </IonButton>
                        </IonButtons>
                    </IonToolbar>
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