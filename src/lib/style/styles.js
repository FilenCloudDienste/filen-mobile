import { StyleSheet } from "react-native"

export const colors = {
    light: {
        systemBackground: "#FFFFFF",
        secondarySystemBackground: "#F2F2F7",
        tertiarySystemBackground: "#FFFFFF",
        systemGroupedBackground: "#F2F2F7",
        secondarySystemGroupedBackground: "#FFFFFF",
        tertiarySystemGroupedBackground: "#F2F2F7",
        label: "#000000",
        secondaryLabel: "#3C3C4399",
        tertiaryLabel: "#3C3C434D",
        quaternaryLabel: "#3C3C432E",
        placeholderText: "#3C3C434D",
        seperator: "#3C3C434A",
        opaqueSeperator: "#C6C6C8FF",
        systemBlue: "#007AFFFF",
        systemGreen: "#34C759FF",
        systemIndigo: "#5856D6FF",
        systemOrange: "#FF9500FF",
        systemPink: "#FF2D55FF",
        systemPurple: "#AF52DEFF",
        systemRed: "#FF3B30FF",
        systemTeal: "#5AC8FAFF",
        systemYellow: "#FFCC00FF",
        systemGray: "#8E8E93FF",
        systemGray2: "#AEAEB2FF",
        systemGray3: "#C7C7CCFF",
        systemGray4: "#D1D1D6FF",
        systemGray5: "#E5E5EAFF",
        systemGray6: "#F2F2F7FF"
    },
    dark: {
        systemBackground: "#000000",
        secondarySystemBackground: "#1C1C1E",
        tertiarySystemBackground: "#2C2C2E",
        systemGroupedBackground: "#000000",
        secondarySystemGroupedBackground: "#1C1C1E",
        tertiarySystemGroupedBackground: "#2C2C2E",
        label: "#FFFFFF",
        secondaryLabel: "#EBEBF599",
        tertiaryLabel: "#EBEBF54D",
        quaternaryLabel: "#EBEBF52E",
        placeholderText: "#EBEBF54D",
        seperator: "#54545899",
        opaqueSeperator: "#38383AFF",
        systemBlue: "#0A84FFFF",
        systemGreen: "#30D158FF",
        systemIndigo: "#5E5CE6FF",
        systemOrange: "#FF9F0AFF",
        systemPink: "#FF375FFF",
        systemPurple: "#BF5AF2FF",
        systemRed: "#FF453AFF",
        systemTeal: "#64D2FFFF",
        systemYellow: "#FFD60AFF",
        systemGray: "#8E8E93FF",
        systemGray2: "#636366FF",
        systemGray3: "#48484AFF",
        systemGray4: "#3A3A3CFF",
        systemGray5: "#2C2C2EFF",
        systemGray6: "#1C1C1EFF"
    }
}

export const theme = StyleSheet.create({
    dark: {
        bottomBar: {
            backgroundColor: colors.darkBackgroundGray
        }
    },
    light: {
        bottomBar: {
            backgroundColor: colors.lightGray
        }
    }
})

export const styles = StyleSheet.create({
    bottomBar: {
        paddingLeft: 20,
        paddingRight: 20,
        paddingTop: 8,
        height: 50,
        flexDirection: "row",
        justifyContent: "space-between"
    }
})