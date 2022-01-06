import React from 'react'
import { IonSkeletonText, IonSearchbar, IonAvatar, IonProgressBar, IonBadge, IonRefresher, IonRefresherContent, IonFab, IonFabButton, IonIcon, IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonList, IonItem, IonLabel, IonThumbnail, IonApp, IonButton, IonMenu, IonMenuButton, IonButtons, IonText } from '@ionic/react'
import { List } from 'react-virtualized'
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
import { routeTo } from './router';

const utils = require("../utils/utils")
const safeAreaInsets = require('safe-area-insets')

export function render(){
    let showShareLinks = (typeof this.state.userPublicKey == "string" && typeof this.state.userPrivateKey == "string" && typeof this.state.userMasterKeys == "object") && (this.state.userPublicKey.length > 16 && this.state.userPrivateKey.length > 16 && this.state.userMasterKeys.length > 0)

    let rowRenderer = ({ index, style }) => {
        if(this.state.settings.gridModeEnabled){
            let startFromIndex = 0
            let gridItemsPerRow = 2
            let indexesToLoop = []

            if(this.state.itemList.length == 1){
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

            window.customVariables.currentThumbnailURL = window.location.href

            if(typeof this.state.itemList[index] !== "undefined"){
                if(typeof this.state.itemList[index].thumbnail !== "string" && typeof window.customVariables.gettingThumbnails[this.state.itemList[index].uuid] == "undefined"){
                    window.customVariables.gettingThumbnails[this.state.itemList[index].uuid] = true

                    this.getFileThumbnail(this.state.itemList[index], window.customVariables.currentThumbnailURL, 1)
                }
            }

            return (
                <IonItem key={index} style={style} className="background-transparent full-width">
                    <div style={{
                        width: "100%",
                        height: this.state.gridItemHeight,
                        display: "flex"
                    }}>
                        {
                            indexesToLoop.filter((el) => {
                                if(typeof this.state.itemList[el] == "undefined"){
                                    return false
                                }

                                return true
                            }).map((currentIndex) => {
                                return (
                                    <Hammer key={currentIndex} onPress={() => this.selectItem(true, currentIndex)} options={{
                                        recognizers: {
                                            press: {
                                                time: 500,
                                                threshold: 500
                                            }
                                        }
                                    }} >
                                        <div style={{
                                            width: this.state.gridItemWidth,
                                            marginRight: "10px",
                                            marginBottom: "10px",
                                            background: (this.state.darkMode ? "transparent" : "transparent"),
                                            borderRadius: "5px",
                                            border: "1px solid " + (this.state.darkMode ? "#1e1e1e" : "lightgray")
                                        }}>
                                            <div style={{
                                                width: "100%",
                                                height: this.state.gridItemHeight - 45 + "px",
                                                padding: "0px",
                                                backgroundClip: "content-box",
                                                zIndex: "101"
                                            }} onClick={() => {
                                                if(this.state.itemList[currentIndex].selected){
                                                    if(this.state.selectedItems > 0){
                                                        this.selectItem(false, currentIndex)
                                                    }
                                                    else{
                                                        this.selectItem(true, currentIndex)
                                                    }
                                                }
                                                else{
                                                    if(this.state.selectedItems > 0){
                                                        this.selectItem(true, currentIndex)
                                                    }
                                                    else{
                                                        this.state.itemList[currentIndex].type == "file" ? this.previewItem(this.state.itemList[currentIndex]) : this.state.currentHref.indexOf("trash") == -1 && this.routeToFolder(this.state.itemList[currentIndex], currentIndex, window.location.href.split("/").slice(-1)[0])
                                                    }
                                                }
                                            } }>
                                                {
                                                    this.state.itemList[currentIndex].type == "folder" ? (
                                                        <div style={{
                                                            width: "100%",
                                                            height: "100%",
                                                            backgroundColor: "transparent",
                                                            lineHeight: this.state.gridItemHeight - 45 + "px",
                                                            textAlign: "center",
                                                            border: "none",
                                                            borderRadius: "0px",
                                                            outline: "none",
                                                            zIndex: "101",
                                                            borderBottom: "1px solid " + (this.state.darkMode ? "#1e1e1e" : "lightgray")
                                                        }}>
                                                            <div style={{
                                                                display: "inline-block",
                                                                verticalAlign: "middle",
                                                                lineHeight: "initial",
                                                                textAlign: "left"
                                                            }}>
                                                                {
                                                                    this.state.itemList[currentIndex].isBase ? (
                                                                        <FaHdd style={{
                                                                            fontSize: "50pt",
                                                                            color: utils.getFolderColorStyle(this.state.itemList[currentIndex].color, true)
                                                                        }} />
                                                                    ) : (
                                                                        <IonIcon icon={Ionicons.folderSharp} style={{
                                                                            fontSize: "50pt",
                                                                            color: utils.getFolderColorStyle(this.state.itemList[currentIndex].color, true),
                                                                        }}></IonIcon>
                                                                    )
                                                                }
                                                            </div>
                                                        </div>
                                                    )
                                                    : typeof this.state.itemList[currentIndex].thumbnail == "string" ? (
                                                        <div style={{
                                                            width: "100%",
                                                            height: "100%",
                                                            backgroundColor: "black",
                                                            display: "inline-block",
                                                            backgroundSize: "cover",
                                                            backgroundPosition: "center center",
                                                            backgroundRepeat: "no-repeat",
                                                            border: "none",
                                                            borderTopRightRadius: "5px",
                                                            borderTopLeftRadius: "5px",
                                                            outline: "none",
                                                            zIndex: "101",
                                                            backgroundImage: "url(" + this.state.itemList[currentIndex].thumbnail + ")",
                                                            borderBottom: "1px solid " + (this.state.darkMode ? "#1e1e1e" : "lightgray")
                                                        }} id={"item-thumbnail-" + this.state.itemList[currentIndex].uuid}></div>
                                                    ) : (
                                                        <div style={{
                                                            width: "100%",
                                                            height: "100%",
                                                            backgroundColor: "transparent",
                                                            lineHeight: this.state.gridItemHeight - 45 + "px",
                                                            textAlign: "center",
                                                            border: "none",
                                                            borderRadius: "0px",
                                                            outline: "none",
                                                            zIndex: "101",
                                                            borderBottom: "1px solid " + (this.state.darkMode ? "#1e1e1e" : "lightgray")
                                                        }}>
                                                            <div style={{
                                                                display: "inline-block",
                                                                verticalAlign: "middle",
                                                                lineHeight: "initial",
                                                                textAlign: "left"
                                                            }} id={"item-thumbnail-" + this.state.itemList[currentIndex].uuid}>
                                                                <img src={utils.getFileIconFromName(this.state.itemList[currentIndex].name)} width="55"></img>
                                                            </div>
                                                        </div>
                                                    )
                                                }
                                            </div>
                                            <div style={{
                                                width: "100%",
                                                marginTop: "6px"
                                            }} onClick={() => {
                                                this.state.itemList[currentIndex].selected ? this.selectItem(false, currentIndex) : this.spawnItemActionSheet(this.state.itemList[currentIndex])
                                            }}>
                                                <div style={{
                                                    width: "81%",
                                                    float: "left",
                                                    paddingLeft: "10px"
                                                }} className="overflow-ellipsis">
                                                    {this.state.itemList[currentIndex].name}
                                                </div>
                                                <div style={{
                                                    width: "14%",
                                                    float: "right"
                                                }}>
                                                    {
                                                        this.state.itemList[currentIndex].selected ? (
                                                            <IonButtons style={{
                                                                marginTop: "-14px",
                                                                marginLeft: "-16px"
                                                            }}>
                                                                <IonButton slot="end" onClick={() => this.selectItem(false, currentIndex)}>
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

        if(this.state.showMainSkeletonPlaceholder){
            return (
                <IonItem key={index} type="button" button lines="none" style={style}>
                    <IonThumbnail slot="start">
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
            let startContent = this.state.selectedItems > 0 ? (
                <IonThumbnail id={"item-thumbnail-" + this.state.itemList[index].uuid} slot="start" onClick={() => this.selectItem(true, index)}>
                    {
                        this.state.itemList[index].type == "folder" ? (
                            <div>
                                <img src="assets/images/folder.svg" style={{
                                    display: "none"
                                }}></img>
                                {
                                    this.state.itemList[index].isBase ? (
                                        <FaHdd style={{
                                            fontSize: "30pt",
                                            color: utils.getFolderColorStyle(this.state.itemList[index].color, true),
                                            position: "absolute",
                                            marginTop: "6px",
                                            marginLeft: "9px"
                                        }} />
                                    ) : (
                                        <IonIcon icon={Ionicons.folderSharp} style={{
                                            fontSize: "30pt",
                                            color: utils.getFolderColorStyle(this.state.itemList[index].color, true),
                                            position: "absolute",
                                            marginTop: "6px",
                                            marginLeft: "9px"
                                        }}></IonIcon>
                                    )
                                }
                            </div>
                        ) : (
                            <img src={typeof this.state.itemList[index].thumbnail == "string" ? this.state.itemList[index].thumbnail : utils.getFileIconFromName(this.state.itemList[index].name)} style={{
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
                                {
                                    this.state.itemList[index].isBase ? (
                                        <FaHdd style={{
                                            fontSize: "30pt",
                                            color: utils.getFolderColorStyle(this.state.itemList[index].color, true),
                                            position: "absolute",
                                            marginTop: "6px",
                                            marginLeft: "9px"
                                        }} />
                                    ) : (
                                        <IonIcon icon={Ionicons.folderSharp} style={{
                                            fontSize: "30pt",
                                            color: utils.getFolderColorStyle(this.state.itemList[index].color, true),
                                            position: "absolute",
                                            marginTop: "6px",
                                            marginLeft: "9px"
                                        }}></IonIcon>
                                    )
                                }
                            </div>
                        ) : (
                            <img src={typeof this.state.itemList[index].thumbnail == "string" ? this.state.itemList[index].thumbnail : utils.getFileIconFromName(this.state.itemList[index].name)} style={{
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
                                        this.state.itemList[index].favorited == 1 && (
                                            <IonIcon icon={Ionicons.star} style={{
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
                                        this.state.itemList[index].favorited == 1 && (
                                            <IonIcon icon={Ionicons.star} style={{
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
                                            this.state.itemList[index].favorited == 1 && (
                                                <IonIcon icon={Ionicons.star} style={{
                                                    marginRight: "5px"
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
                                            this.state.itemList[index].favorited == 1 && (
                                                <IonIcon icon={Ionicons.star} style={{
                                                    marginRight: "5px"
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
                                            this.state.itemList[index].favorited == 1 && (
                                                <IonIcon icon={Ionicons.star} style={{
                                                    marginRight: "5px"
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
                                            this.state.itemList[index].favorited == 1 && (
                                                <IonIcon icon={Ionicons.star} style={{
                                                    marginRight: "5px"
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

            window.customVariables.currentThumbnailURL = window.location.href

            if(typeof this.state.itemList[index] !== "undefined"){
                if(typeof this.state.itemList[index].thumbnail !== "string" && typeof window.customVariables.gettingThumbnails[this.state.itemList[index].uuid] == "undefined"){
                    console.log(this.state.itemList[index].name, index)

                    window.customVariables.gettingThumbnails[this.state.itemList[index].uuid] = true

                    this.getFileThumbnail(this.state.itemList[index], window.customVariables.currentThumbnailURL, 1)
                }
            }

            return (
                <Hammer key={index} onPress={() => this.selectItem(true, index)} options={{
                    recognizers: {
                        press: {
                            time: 500,
                            threshold: 500
                        }
                    }
                }} style={style}>
                    <IonItem type="button" button lines="none" className={this.state.itemList[index].selected ? (this.state.darkMode ? "item-selected-dark-mode" : "item-selected-light-mode") : "item-not-activated-mode"}>
                        {startContent}
                        {itemLabel}
                        {endContent}
                    </IonItem>
                </Hammer>
            )
        }
    }

    let mainToolbar = this.state.selectedItems > 0 ? (
        <IonToolbar style={{
            "--background": this.state.darkMode ? "#121212" : "white"
        }}>
            <IonButtons slot="start">
                <IonButton onClick={() => this.clearSelectedItems()}>
                    <IonIcon slot="icon-only" icon={Ionicons.arrowBack} />
                </IonButton>
              </IonButtons>
            <IonTitle>{this.state.selectedItems} item{this.state.selectedItems == 1 ? "" : "s"}</IonTitle>
            <IonButtons slot="end">
                {
                    window.location.href.indexOf("base") !== -1 && !utils.selectedItemsContainsDefaultFolder(this.state.itemList) && this.state.isDeviceOnline && (
                        <IonButton onClick={() => window.customFunctions.shareSelectedItems()}>
                            <IonIcon slot="icon-only" icon={Ionicons.shareSocial} />
                        </IonButton>
                    )
                }
                {
                    window.location.href.indexOf("base") !== -1 && utils.selectedItemsDoesNotContainFolder(this.state.itemList) && this.state.isDeviceOnline && (
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
            <IonToolbar style={{
                "--background": this.state.darkMode ? "#121212" : "white"
            }}>
                <IonButtons slot="start">
                    <IonButton onClick={this.hideMainSearchbar}>
                        <IonIcon slot="icon-only" icon={Ionicons.arrowBack} />
                    </IonButton>
                </IonButtons>
                <IonSearchbar id="main-searchbar" ref={(el) => el !== null && setTimeout(() => /* el.setFocus() */ {}, 100)} type="search" inputmode="search" value={this.state.mainSearchTerm} onInput={() => {
                    let term = document.getElementById("main-searchbar").value

                    if(typeof term == "string"){
                        if(term.length > 0){
                            if(term !== window.customVariables.lastMainSearchbarTerm){
                                window.customVariables.lastMainSearchbarTerm = term
        
                                clearTimeout(window.customVariables.mainSearchbarTimeout)
            
                                window.customVariables.mainSearchbarTimeout = setTimeout(() => {
                                    this.setMainSearchTerm(term)
                                }, 500)
                            }
                        }
                        else{
                            clearTimeout(window.customVariables.mainSearchbarTimeout)
        
                            this.setMainSearchTerm("")
                        }
                    }
                    else{
                        clearTimeout(window.customVariables.mainSearchbarTimeout)
        
                        this.setMainSearchTerm("")
                    }
                }}></IonSearchbar>
            </IonToolbar>
        ) : (
            <IonToolbar style={{
                "--background": this.state.darkMode ? "#121212" : "white"
            }}>
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
                    {
                        this.state.isDeviceOnline && (
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
                        )
                    }
                    <IonButton onClick={this.mainMenuPopover}>
                        <IonIcon slot="icon-only" icon={Ionicons.ellipsisVertical} />
                    </IonButton>
                </IonButtons>
            </IonToolbar>
        )
    )

    let bottomFab = undefined
    let bottomFabStyle = {
        marginBottom: "0px",
        visibility: (this.state.hideMainFab ? "hidden" : "visible")
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

    if(!this.state.isDeviceOnline){
        showMainFab = false
    }

    if(window.location.href.indexOf("trash") !== -1 && this.state.itemList.length > 0){
        bottomFab = <IonFab vertical="bottom" style={bottomFabStyle} horizontal="end" slot="fixed" onClick={() => window.customFunctions.emptyTrash()}>
                        <IonFabButton color="danger">
                            <IonIcon icon={Ionicons.trash} />
                        </IonFabButton>
                    </IonFab>
    }
    else if(showMainFab){
        bottomFab = <IonFab vertical="bottom" style={bottomFabStyle} horizontal="end" slot="fixed" onClick={() => {
            this.hideMainSearchbar()

            this.mainFabAction()
        }}>
                        <IonFabButton color={this.state.darkMode ? "dark" : "light"}>
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

    let transfersUploads = Object.keys(this.state.uploads).map((key) => {
        if(maxShowingTransfers > currentShowingTransfers){
            currentShowingTransfers += 1

            return (
                <IonItem lines="none" key={key}>
                    <IonIcon slot="start" icon={Ionicons.arrowUp}></IonIcon>
                    <IonLabel>{this.state.uploads[key].name}</IonLabel>
                    <IonBadge color={this.state.darkMode ? "dark" : "light"} slot="end">
                        {
                            this.state.uploads[key].progress >= 100 ? language.get(this.state.lang, "transfersFinishing") : this.state.uploads[key].progress == 0 ? language.get(this.state.lang, "transfersQueued") : this.state.uploads[key].progress + "%"
                        }
                    </IonBadge>
                    {
                        this.state.uploads[key].progress < 100 && (
                            <IonBadge color="danger" slot="end" onClick={() => {
                                return window.customVariables.stoppedUploads[this.state.uploads[key].uuid] = true
                            }}>
                                {language.get(this.state.lang, "transferStop")}
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
                        {language.get(this.state.lang, "transfersMore", true, ["__COUNT__"], [((Object.keys(this.state.uploads).length + Object.keys(this.state.downloads).length) - maxShowingTransfers)])}
                    </IonItem>
                )
            }
        }
    })

    let transfersDownloads = Object.keys(this.state.downloads).map((key) => {
        if(maxShowingTransfers > currentShowingTransfers){
            currentShowingTransfers += 1

            return (
                <IonItem lines="none" key={key}>
                    <IonIcon slot="start" icon={Ionicons.arrowDown}></IonIcon>
                    <IonLabel>{this.state.downloads[key].name}</IonLabel>
                    <IonBadge color={this.state.darkMode ? "dark" : "light"} slot="end">
                        {
                            this.state.downloads[key].progress >= 100 ? language.get(this.state.lang, "transfersFinishing") + " " + this.state.downloads[key].chunksWritten + "/" + this.state.downloads[key].chunks : this.state.downloads[key].progress == 0 ? language.get(this.state.lang, "transfersQueued") : this.state.downloads[key].progress + "%"
                        }
                    </IonBadge>
                    {
                        this.state.downloads[key].progress < 100 && (
                            <IonBadge color="danger" slot="end" onClick={() => {        
                                return window.customVariables.stoppedDownloads[this.state.downloads[key].uuid] = true
                            }}>
                                {language.get(this.state.lang, "transferStop")}
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
                        {language.get(this.state.lang, "transfersMore", true, ["__COUNT__"], [((Object.keys(this.state.uploads).length + Object.keys(this.state.downloads).length) - maxShowingTransfers)])}
                    </IonItem>
                )
            }
        }
    })

    if(this.state.isLoggedIn){
        return (
            <IonApp>
                <IonPage>
                    <IonMenu side="start" menuId="sideBarMenu" content-id="main-content">
                        <IonHeader className="ion-no-border" style={{
                            padding: "15px",
                            alignItems: "center",
                            textAlign: "center",
                            background: this.state.darkMode ? "#1E1E1E" : "white"
                        }}>
                            <IonAvatar style={{
                                margin: "0px auto",
                                marginTop: safeAreaInsets.top + "px"
                            }} onClick={() => {
                                if(!this.state.isDeviceOnline){
                                    return false
                                }

                                return document.getElementById("avatar-input-dummy").click()
                            }}>
                                <img src={typeof this.state.cachedUserInfo.avatarURL == "undefined" ? "assets/img/icon.png" : this.state.cachedUserInfo.avatarURL} />
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
                            </div>
                        </IonHeader>
                        <IonContent style={{
                            "--background": this.state.darkMode ? "#1E1E1E" : "white"
                        }} fullscreen={true}>
                            <IonList>
                                {
                                    this.state.isDeviceOnline && (
                                        <IonItem button lines="none" onClick={() => {
                                            window.customFunctions.hideSidebarMenu()
                                            
                                            return window.customFunctions.openEventsModal()
                                        }}>
                                            <IonIcon slot="start" icon={Ionicons.informationCircleOutline}></IonIcon>
                                            <IonLabel>{language.get(this.state.lang, "events")}</IonLabel>
                                        </IonItem>
                                    )
                                }
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
                                {/*<IonItem button lines="none" onClick={() => {
                                    window.customFunctions.hideSidebarMenu()
                                    
                                    return window.customFunctions.openEncryptionModal()
                                }}>
                                    <IonIcon slot="start" icon={Ionicons.lockClosed}></IonIcon>
                                    <IonLabel>{language.get(this.state.lang, "encryption")}</IonLabel>
                                </IonItem>*/}
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
                        <IonHeader className="ion-no-border">
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
                        <IonHeader className="ion-no-border">
                            {mainToolbar}
                        </IonHeader>
                        <IonContent style={{
                            width: this.state.windowWidth + "px",
                            height: this.state.windowHeight - 56 - 57 - (isPlatform("ios") ? 40 : 0) - safeAreaInsets.bottom + "px",
                            "--background": this.state.darkMode ? "" : "white", //#1E1E1E darkmode
                            outline: "none",
                            border: "none"
                        }} fullscreen={true}>
                            {bottomFab}
                            <IonRefresher slot="fixed" id="refresher" disabled={this.state.refresherEnabled ? false : true} onIonRefresh={() => {
                                return window.customFunctions.refresherPulled()
                            }}>
                                <IonRefresherContent></IonRefresherContent>
                            </IonRefresher>
                            {
                                this.state.itemList.length == 0 && this.state.mainSearchTerm.trim().length > 0 ? (
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
                                                color: this.state.darkMode ? "white" : "gray"
                                            }}></IonIcon>
                                            <br />
                                            <br />
                                            <div style={{
                                                width: "75%"
                                            }}>
                                                {language.get(this.state.lang, "nothingFoundSearch", true, ["__TERM__"], [this.state.mainSearchTerm])}
                                            </div>
                                        </center>
                                    </div>
                                ) : (
                                    this.state.itemList.length == 0 && !this.state.searchbarOpen ? (
                                        <div>
                                            {
                                                !this.state.isDeviceOnline ? (
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
                                                                color: this.state.darkMode ? "white" : "gray"
                                                            }}></IonIcon>
                                                            <br />
                                                            <br />
                                                            <div style={{
                                                                width: "75%"
                                                            }}>
                                                                {language.get(this.state.lang, "deviceOfflineAS")}
                                                            </div>
                                                        </center>
                                                    </div>
                                                ) : this.state.currentHref.indexOf("base") !== -1 ? (
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
                                                        this.state.currentHref.indexOf("favorites") !== -1 ? (
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
                                                                        color: this.state.darkMode ? "white" : "gray"
                                                                    }}></IonIcon>
                                                                    <br />
                                                                    <br />
                                                                    <div style={{
                                                                        width: "75%"
                                                                    }}>
                                                                        {language.get(this.state.lang, "noFavorites")}
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
                                                )
                                            }
                                        </div>
                                    ) : (
                                        this.state.settings.gridModeEnabled ? (
                                            <>
                                                <List 
                                                    id="main-virtual-list"
                                                    height={this.state.windowHeight - 56 - 57 - (isPlatform("ios") ? 45 : 0) - safeAreaInsets.bottom}
                                                    width={this.state.windowWidth}
                                                    rowCount={Math.round(this.state.itemList.length / 2)}
                                                    rowHeight={this.state.gridItemHeight}
                                                    overscanRowCount={3}
                                                    rowRenderer={rowRenderer}
                                                    scrollToIndex={this.state.scrollToIndex}
                                                    scrollToAlignment="center"
                                                    onScroll={() => window.customFunctions.itemListScrolling()}
                                                    style={{
                                                        outline: "none",
                                                        border: "none"
                                                    }}
                                                ></List>
                                            </>
                                        ) : (
                                            <>
                                                <List 
                                                    id="main-virtual-list"
                                                    height={this.state.windowHeight - 56 - 57 - (isPlatform("ios") ? 45 : 0) - safeAreaInsets.bottom}
                                                    width={this.state.windowWidth}
                                                    rowCount={this.state.itemList.length}
                                                    rowHeight={72}
                                                    overscanRowCount={3}
                                                    rowRenderer={rowRenderer}
                                                    scrollToIndex={this.state.scrollToIndex}
                                                    scrollToAlignment="center"
                                                    onScroll={() => window.customFunctions.itemListScrolling()}
                                                    style={{
                                                        outline: "none",
                                                        border: "none"
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

                                    this.queueFileUpload(fileObject)
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
                                    return this.spawnToast(language.get(this.state.lang, "avatarTooLarge"))
                                }

                                let loading = await loadingController.create({
                                    message: ""
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
    
                                            return this.spawnToast(language.get(this.state.lang, "fileUploadCouldNotReadFile", true, ["__NAME__"], [file.name]))
                                        }
    
                                        fileReader.readAsBinaryString(file)
                                    })
                                }
                                catch(e){
                                    console.log(e)

                                    loading.dismiss()

                                    return this.spawnToast(language.get(this.state.lang, "fileUploadFailed", true, ["__NAME__"], [file.name]))
                                }

                                loading.dismiss()

                                await window.customFunctions.fetchUserInfo()

                                this.spawnToast(language.get(this.state.lang, "avatarUploaded"))

                                document.getElementById("avatar-input-dummy").value = ""

                                return true
                            }} multiple />
                        </IonContent>
                    </div>
                    <IonToolbar style={{
                        "--background": (this.state.darkMode ? "" : "#F0F0F0"),
                        paddingBottom: safeAreaInsets.bottom + "px"
                    }}>
                        <IonButtons>
                            <IonButton onClick={() => {
                                return routeTo("/base")
                            }} style={{
                                width: (showShareLinks ? "16.66%" : "25%"),
                                "--ripple-color": "gray",
                                color: (window.location.href.indexOf("base") !== -1 ? "#3780FF" : "")
                            }}>
                                <IonIcon slot="icon-only" icon={Ionicons.cloud} />
                            </IonButton>
                            {
                                showShareLinks && (
                                    <>
                                        <IonButton onClick={() => {
                                            return routeTo("/shared-in")
                                        }} style={{
                                            width: (showShareLinks ? "16.66%" : "25%"),
                                            "--ripple-color": "gray",
                                            color: (window.location.href.indexOf("shared-in") !== -1 ? "#3780FF" : "")
                                        }}>
                                            <IonIcon slot="icon-only" icon={Ionicons.folder} />
                                        </IonButton>
                                        <IonButton onClick={() => {
                                            return routeTo("/shared-out")
                                        }} style={{
                                            width: (showShareLinks ? "16.66%" : "25%"),
                                            "--ripple-color": "gray",
                                            color: (window.location.href.indexOf("shared-out") !== -1 ? "#3780FF" : "")
                                        }}>
                                            <IonIcon slot="icon-only" icon={Ionicons.folderOpen} />
                                        </IonButton>
                                    </>
                                )
                            }
                            <IonButton onClick={() => {
                                return routeTo("/links")
                            }} style={{
                                width: (showShareLinks ? "16.66%" : "25%"),
                                "--ripple-color": "gray",
                                color: (window.location.href.indexOf("links") !== -1 ? "#3780FF" : "")
                            }}>
                                <IonIcon slot="icon-only" icon={Ionicons.link} />
                            </IonButton>
                            <IonButton onClick={() => {
                                return routeTo("/favorites")
                            }} style={{
                                width: (showShareLinks ? "16.66%" : "25%"),
                                "--ripple-color": "gray",
                                color: (window.location.href.indexOf("favorites") !== -1 ? "#3780FF" : "")
                            }}>
                                <IonIcon slot="icon-only" icon={Ionicons.star} />
                            </IonButton>
                            <IonButton onClick={() => {
                                return routeTo("/recent")
                            }} style={{
                                width: (showShareLinks ? "16.66%" : "25%"),
                                "--ripple-color": "gray",
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