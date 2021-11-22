export function routeTo(route){
    if(window.customVariables.navigateBackTimeout > (+new Date())){
        return false
    }

    window.customVariables.navigateBackTimeout = ((+new Date()) + 500)

    window.location.hash = "#!" + route

    return this.routing()
}

export function routeToFolder(folder, index = 0, lastFolderUUID = undefined){
    if(window.customVariables.navigateBackTimeout > (+new Date())){
        return false
    }

    window.customVariables.navigateBackTimeout = ((+new Date()) + 500)

    /*if(window.location.href.indexOf("links") !== -1){
        this.openPublicLinkModal(folder)
        
        return false
    }*/

    if(window.location.href.indexOf("trash") !== -1){
        return false
    }

    this.setState({
        mainToolbarTitle: folder.name,
        currentReceiverId: folder.receiverId
    })

    if(typeof lastFolderUUID !== "undefined"){
        window.customVariables.scrollToIndex[lastFolderUUID] = index
    }

    window.customVariables.cachedFolders[folder.uuid] = folder

    window.location.hash = window.location.hash + "/" + folder.uuid

    return this.routing()
}

export function goToFolder(uuid){
    if(window.customVariables.navigateBackTimeout > (+new Date())){
        return false
    }

    window.customVariables.navigateBackTimeout = ((+new Date()) + 500)

    let ex = window.location.hash.split("/").slice(1)
    let nextURL = "/" + window.location.hash.split("/")[1]

    for(let i = 0; i < ex.length; i++){
        ex[i] = ex[i].split("?")[0]

        if(ex[i] == uuid){
            nextURL += "/" + ex[i]

            console.log(nextURL)

            return this.routeTo(nextURL)
        }
        else{
            nextURL += "/" + ex[i]
        }
    }
}

export function goBack(){
    if(window.customVariables.navigateBackTimeout > (+new Date())){
        return false
    }

    window.customVariables.navigateBackTimeout = ((+new Date()) + 500)

    window.history.back()

    return this.routing()
}