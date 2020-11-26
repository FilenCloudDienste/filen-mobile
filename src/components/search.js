export function setMainSearchTerm(term){
    this.setState({
        mainSearchTerm: term
    })

    if(term.trim() == "" && window.customVariables.itemList.length > 0){
        return this.setState({
            itemList: window.customVariables.itemList
        })
    }

    let items = []

    for(let i = 0; i < window.customVariables.itemList.length; i++){
        if(window.customVariables.itemList[i].name.toLowerCase().indexOf(term.toLowerCase().trim()) !== -1
            || window.customVariables.itemList[i].date.toLowerCase().indexOf(term.toLowerCase().trim()) !== -1
            || term.trim() == ""){
            items.push(window.customVariables.itemList[i])
        }
    }

    return this.setState({
        itemList: items
    })
}

export function hideMainSearchbar(event){
    this.setState({
        searchbarOpen: false,
        mainSearchTerm: ""
    })

    if(window.customVariables.itemList.length > 0){
        this.setState({
            itemList: window.customVariables.itemList
        })
    }
}