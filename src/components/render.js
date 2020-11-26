import React from 'react';
import { IonToast, IonSearchbar, IonAvatar, IonProgressBar, IonBadge, IonBackButton, IonRefresher, IonRefresherContent, IonFab, IonFabButton, IonFabList, IonCheckbox, IonRippleEffect, IonIcon, IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonList, IonItem, IonLabel, IonThumbnail, IonImg, IonApp, IonModal, IonButton, IonMenu, IonMenuButton, IonButtons, IonText } from '@ionic/react'
import { List } from 'react-virtualized';

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

export function render(){
    let rowRenderer = ({ index, style }) => {
        let startContent = this.state.selectedItems > 0 ? (
            <IonThumbnail slot="start" onClick={() => this.selectItem(true, index)}>
                {
                    this.state.itemList[index].type == "folder" ? (
                        <img src="assets/images/folder.svg" style={{
                            padding: "10px",
                            marginTop: "-2px"
                        }}></img>
                    ) : (
                        <img src={utils.getFileIconFromName(this.state.itemList[index].name)} style={{
                            padding: "10px",
                            marginTop: "-1px"
                        }}></img>
                    )
                }
            </IonThumbnail>
        ) : (
            <IonThumbnail slot="start" onClick={() => this.state.itemList[index].type == "file" ? this.previewItem(this.state.itemList[index]) : this.state.currentHref.indexOf("trash") == -1 && this.routeToFolder(this.state.itemList[index])}>
                {
                    this.state.itemList[index].type == "folder" ? (
                        <img src="assets/images/folder.svg" style={{
                            padding: "10px",
                            marginTop: "-2px"
                        }}></img>
                    ) : (
                        <img src={utils.getFileIconFromName(this.state.itemList[index].name)} style={{
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
                <IonLabel onClick={() => this.state.itemList[index].type == "file" ? this.previewItem(this.state.itemList[index]) : this.state.currentHref.indexOf("trash") == -1 && this.routeToFolder(this.state.itemList[index])}>
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
                <IonItem type="button" button lines="none">
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
                <IonSearchbar ref={(el) => el !== null && setTimeout(() => el.setFocus(), 100)} debounce={250} type="search" inputmode="search" enterkeyhint="go" value={this.state.mainSearchTerm} onIonChange={(e) => this.setMainSearchTerm(e.detail.value)}></IonSearchbar>
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

    let bottomFab = this.state.currentHref.indexOf("base") !== -1 && (
        <IonFab vertical="bottom" horizontal="end" slot="fixed" onClick={() => this.mainFabAction()}>
            <IonFabButton>
                <IonIcon icon={Ionicons.add} />
            </IonFabButton>
        </IonFab>
    )

    let transfersUploads = Object.keys(this.state.uploads).map((key) => {
        return (
            <IonItem lines="none" key={key}>
                <IonIcon slot="start" icon={Ionicons.arrowUp}></IonIcon>
                <IonLabel>{this.state.uploads[key].name}</IonLabel>
                <IonBadge slot="end">
                    {
                        this.state.uploads[key].progress >= 100 ? language.get(this.state.lang, "transfersFinishing") : this.state.uploads[key].progress + "%"
                    }
                </IonBadge>
            </IonItem>
        )
    })

    let transfersDownloads = Object.keys(this.state.downloads).map((key) => {
        return (
            <IonItem lines="none" key={key}>
                <IonIcon slot="start" icon={Ionicons.arrowDown}></IonIcon>
                <IonLabel>{this.state.downloads[key].name}</IonLabel>
                <IonBadge slot="end">
                    {
                        this.state.downloads[key].progress >= 100 ? language.get(this.state.lang, "transfersFinishing") : this.state.downloads[key].progress + "%"
                    }
                </IonBadge>
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
                                margin: "0px auto"
                            }}>
                                <img src="https://gravatar.com/avatar/dba6bae8c566f9d4041fb9cd9ada7741?d=identicon&f=y" />
                            </IonAvatar>
                            <br />
                            <IonText style={{
                                color: this.state.darkMode ? "white" : "black"
                            }}>
                                {this.state.userEmail}
                            </IonText>
                            <br />
                            <br />
                            <IonProgressBar value={this.state.userStorageUsagePercentage}></IonProgressBar>
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
                                                }} color="primary" style={{
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
                        }}>
                            <IonList>
                                <IonItem button lines="none" onClick={() => {
                                    window.customFunctions.hideSidebarMenu()
                                    
                                    return this.routeTo("/base")
                                }}>
                                    <IonIcon slot="start" icon={Ionicons.cloud}></IonIcon>
                                    <IonLabel>{language.get(this.state.lang, "myCloud")}</IonLabel>
                                </IonItem>
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
                        }}>
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
                            height: (this.state.windowHeight - 56) + "px",
                            width: this.state.windowWidth + "px",
                            "--background": this.state.darkMode ? "#1E1E1E" : "white"
                        }}>
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
                                        ></List>
                                    )
                                )
                            }
                            {bottomFab}
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