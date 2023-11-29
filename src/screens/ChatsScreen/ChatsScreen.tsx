import React, { useState, useEffect, useRef, memo, useMemo, useCallback } from "react"
import { View } from "react-native"
import { TopBar } from "../../components/TopBar"
import { getColor } from "../../style"
import useDarkMode from "../../lib/hooks/useDarkMode"
import { NavigationContainerRef } from "@react-navigation/native"

export interface ChatsScreenProps {
	navigation: NavigationContainerRef<ReactNavigation.RootParamList>
	route: any
}

const ChatsScreen = memo(({ navigation, route }: ChatsScreenProps) => {
	const darkMode = useDarkMode()
	const [searchTerm, setSearchTerm] = useState<string>("")
	const [loadDone, setLoadDone] = useState<boolean>(false)

	return (
		<View
			style={{
				height: "100%",
				width: "100%",
				backgroundColor: getColor(darkMode, "backgroundPrimary")
			}}
		>
			<TopBar
				navigation={navigation}
				route={route}
				setLoadDone={setLoadDone}
				searchTerm={searchTerm}
				setSearchTerm={setSearchTerm}
			/>
		</View>
	)
})

export default ChatsScreen
