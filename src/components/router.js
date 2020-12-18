export function routeTo(route){
    return window.location.hash = "#!" + route
}

export function routeToFolder(folder, index = 0){
    this.setState({
        mainToolbarTitle: folder.name,
        currentReceiverId: folder.receiverId
    })

    if(index !== 0){
        window.customVariables.scrollToIndex[folder.uuid] = index
    }
    else{
        window.customVariables.scrollToIndex[folder.uuid] = 0
    }

    window.customVariables.cachedFolders[folder.uuid] = folder

    return window.location.hash = window.location.hash + "/" + folder.uuid
}

export function goToFolder(uuid){
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
    return window.history.back()
}