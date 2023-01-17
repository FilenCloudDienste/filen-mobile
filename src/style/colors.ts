import { memoize } from "lodash"

export type SwitchTrackColors = {
    false: string,
    true: string
}

export type Color = 
    "primary"
    | "primaryBorder"
    | "actionSheetBorder"
    | "underlaySettingsButton"
    | "underlayActionSheet"
    | "switchThumbColorEnabled"
    | "switchThumbColorDisabled"
    | "switchIOSBackgroundColor"
    | "red"
    | "orange"
    | "yellow"
    | "green"
    | "mint"
    | "teal"
    | "cyan"
    | "blue"
    | "indigo"
    | "purple"
    | "pink"
    | "brown"
    | "switchTrackColor"
    | "backgroundPrimary"
    | "backgroundSecondary"
    | "backgroundTertiary"
    | "textPrimary"
    | "textSecondary"
    | "linkPrimary"

export const colors = {
    dark: {
        primary: "black",
        primaryBorder: "#202020",
        actionSheetBorder: "#222222",
        underlaySettingsButton: "#222222",
        underlayActionSheet: "#222222",
        switchThumbColorEnabled: "white",
        switchThumbColorDisabled: "white",
        switchIOSBackgroundColor: "#2B2B2E",
        red: "rgba(255, 59, 48, 1)",
        orange: "rgba(255, 149, 0, 1)",
        yellow: "rgba(255, 204, 0, 1)",
        green: "rgba(52, 199, 89, 1)",
        mint: "rgba(0, 199, 190, 1)",
        teal: "rgba(48, 176, 199, 1)",
        cyan: "rgba(50, 173, 230, 1)",
        blue: "rgba(0, 122, 255, 1)",
        indigo: "rgba(88, 86, 214, 1)",
        purple: "rgba(175, 82, 222, 1)",
        pink: "rgba(255, 45, 85, 1)",
        brown: "rgba(162, 132, 94, 1)",
        switchTrackColor: {
            false: "#2B2B2E",
            true: "rgba(52, 199, 89, 1)"
        },
        backgroundPrimary: "#000000",
        backgroundSecondary: "#1C1C1E",
        backgroundTertiary: "#2B2B2E",
        textPrimary: "white",
        textSecondary: "gray",
        linkPrimary: "#0A84FF"
    },
    light: {
        primary: "white",
        primaryBorder: "lightgray",
        actionSheetBorder: "lightgray",
        underlaySettingsButton: "#999999",
        underlayActionSheet: "lightgray",
        switchThumbColorEnabled: "white",
        switchThumbColorDisabled: "white",
        switchIOSBackgroundColor: "#E3E3E9",
        red: "rgba(255, 59, 48, 1)",
        orange: "rgba(255, 149, 0, 1)",
        yellow: "rgba(255, 204, 0, 1)",
        green: "rgba(52, 199, 89, 1)",
        mint: "rgba(0, 199, 190, 1)",
        teal: "rgba(48, 176, 199, 1)",
        cyan: "rgba(50, 173, 230, 1)",
        blue: "rgba(0, 122, 255, 1)",
        indigo: "rgba(88, 86, 214, 1)",
        purple: "rgba(175, 82, 222, 1)",
        pink: "rgba(255, 45, 85, 1)",
        brown: "rgba(162, 132, 94, 1)",
        switchTrackColor: {
            false: "#E3E3E9",
            true: "rgba(52, 199, 89, 1)"
        },
        backgroundPrimary: "#F2F2F7",
        backgroundSecondary: "#FFFFFF",
        backgroundTertiary: "#E3E3E9",
        textPrimary: "black",
        textSecondary: "gray",
        linkPrimary: "#0A84FF"
    }
}

export const getColor = memoize((darkMode: boolean, value: Color): any => {
    const color = colors[darkMode ? 'dark' : 'light'][value]

    if(typeof color == "undefined"){
        return "black"
    }

    return color
}, (darkMode: boolean, value: Color) => darkMode.toString() + ":" + value)