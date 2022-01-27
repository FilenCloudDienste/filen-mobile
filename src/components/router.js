import { doRouting } from "./window"

export function routeTo(self, route){
    if(window.customVariables.navigateBackTimeout > (+new Date())){
        return false
    }

    window.customVariables.navigateBackTimeout = ((+new Date()) + 250)
    window.customVariables.didRequestThumbnail = {}

    window.location.hash = "#!" + route

    if(typeof self !== "object"){
        return false
    }

    return doRouting(self)
}

export function routeToFolder(self, folder, index = 0, lastFolderUUID = undefined){
    if(window.customVariables.navigateBackTimeout > (+new Date())){
        return false
    }

    window.customVariables.navigateBackTimeout = ((+new Date()) + 250)
    window.customVariables.didRequestThumbnail = {}

    /*if(window.location.href.indexOf("links") !== -1){
        self.openPublicLinkModal(folder)
        
        return false
    }*/

    if(window.location.href.indexOf("trash") !== -1){
        return false
    }

    self.setState({
        mainToolbarTitle: folder.name,
        currentReceiverId: folder.receiverId
    })

    if(typeof lastFolderUUID !== "undefined"){
        window.customVariables.scrollToIndex[lastFolderUUID] = index
    }

    window.customVariables.cachedFolders[folder.uuid] = folder

    window.location.hash = window.location.hash + "/" + folder.uuid

    if(typeof self !== "object"){
        return false
    }

    return doRouting(self)
}

export function goToFolder(self, uuid){
    if(window.customVariables.navigateBackTimeout > (+new Date())){
        return false
    }

    window.customVariables.navigateBackTimeout = ((+new Date()) + 250)
    window.customVariables.didRequestThumbnail = {}

    let ex = window.location.hash.split("/").slice(1)
    let nextURL = "/" + window.location.hash.split("/")[1]

    for(let i = 0; i < ex.length; i++){
        ex[i] = ex[i].split("?")[0]

        if(ex[i] == uuid){
            nextURL += "/" + ex[i]

            console.log(nextURL)

            return routeTo(self, nextURL)
        }
        else{
            nextURL += "/" + ex[i]
        }
    }
}

export function goBack(self){
    if(window.customVariables.navigateBackTimeout > (+new Date())){
        return false
    }

    window.customVariables.navigateBackTimeout = ((+new Date()) + 250)
    window.customVariables.didRequestThumbnail = {}

    window.history.back()

    if(typeof self !== "object"){
        return false
    }

    return doRouting(self)
}