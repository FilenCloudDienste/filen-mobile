export function setMainSearchTerm(self, term){
    self.setState({
        mainSearchTerm: term
    })

    if(term.trim() == "" && window.customVariables.itemList.length > 0){
        return self.setState({
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

    return self.setState({
        itemList: items
    })
}

export function hideMainSearchbar(self, event){
    self.setState({
        searchbarOpen: false,
        mainSearchTerm: ""
    })

    if(window.customVariables.itemList.length > 0){
        self.setState({
            itemList: window.customVariables.itemList
        })
    }

    return true
}