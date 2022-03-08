export const colors = {
    dark: {
        primary: "black",
        primaryBorder: "#202020",
        actionSheetBorder: "#222222",
        underlaySettingsButton: "#222222",
        underlayActionSheet: "#222222",
        switchTrackColor: {
            false: "#767577",
            true: "#81b0ff"
        },
        switchThumbColorEnabled: "#0A84FF",
        switchThumbColorDisabled: "lightgray",
        switchIOSBackgroundColor: "#111111"
    },
    light: {
        primary: "white",
        primaryBorder: "lightgray",
        actionSheetBorder: "lightgray",
        underlaySettingsButton: "#999999",
        underlayActionSheet: "lightgray",
        switchTrackColor: {
            false: "#767577",
            true: "#81b0ff"
        },
        switchThumbColorEnabled: "#0A84FF",
        switchThumbColorDisabled: "white",
        switchIOSBackgroundColor: "gray"
    }
}

export const getColor = (darkMode, value) => {
    const color = colors[darkMode ? 'dark' : 'light'][value]

    if(typeof color == "undefined"){
        return "black"
    }

    return color
}