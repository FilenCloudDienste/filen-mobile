import React, { useEffect, useState, memo, useCallback } from "react"
import { View } from "react-native"
import ActionSheet, { SheetManager } from "react-native-actions-sheet"
import useLang from "../../../lib/hooks/useLang"
import useDimensions from "../../../lib/hooks/useDimensions"
import storage from "../../../lib/storage"
import { i18n } from "../../../i18n"
import { getColor } from "../../../style/colors"
import { ActionButton } from "../ActionSheets"
import useDarkMode from "../../../lib/hooks/useDarkMode"
import { getRouteURL } from "../../../lib/helpers"

const SortByActionSheet = memo(() => {
	const darkMode = useDarkMode()
	const dimensions = useDimensions()
	const lang = useLang()
	const [showASCDESC, setShowASCDESC] = useState<boolean>(false)
	const [sortBy, setSortBy] = useState<string>("")

	const setItemsSortBy = useCallback((sort: string) => {
		const routeURL = getRouteURL()
		const current = JSON.parse(storage.getString("sortBy") || "{}")

		current[routeURL] = sort

		storage.set("sortBy", JSON.stringify(current))
	}, [])

	useEffect(() => {
		if (sortBy.indexOf("Asc") !== -1 || sortBy.indexOf("Desc") !== -1) {
			setItemsSortBy(sortBy)
		}
	}, [sortBy])

	return (
		<ActionSheet
			id="SortByActionSheet"
			gestureEnabled={true}
			containerStyle={{
				backgroundColor: getColor(darkMode, "backgroundSecondary"),
				borderTopLeftRadius: 15,
				borderTopRightRadius: 15
			}}
			indicatorStyle={{
				backgroundColor: getColor(darkMode, "backgroundTertiary")
			}}
			onBeforeShow={() => {
				setShowASCDESC(false)
				setSortBy("")
			}}
		>
			<View
				style={{
					paddingBottom: dimensions.insets.bottom + dimensions.navigationBarHeight
				}}
			>
				{showASCDESC ? (
					<>
						<ActionButton
							onPress={() => {
								setSortBy(prev => (prev.indexOf("Asc") == -1 ? prev + "Asc" : prev))

								SheetManager.hide("SortByActionSheet")
							}}
							icon="arrow-up-outline"
							text={i18n(lang, "ascending")}
						/>
						<ActionButton
							onPress={() => {
								setSortBy(prev => (prev.indexOf("Desc") == -1 ? prev + "Desc" : prev))

								SheetManager.hide("SortByActionSheet")
							}}
							icon="arrow-down-outline"
							text={i18n(lang, "descending")}
						/>
					</>
				) : (
					<>
						<ActionButton
							onPress={() => {
								setSortBy("name")
								setShowASCDESC(true)
							}}
							icon="text-outline"
							text={i18n(lang, "sortByName")}
						/>
						<ActionButton
							onPress={() => {
								setSortBy("size")
								setShowASCDESC(true)
							}}
							icon="barbell-outline"
							text={i18n(lang, "sortBySize")}
						/>
						<ActionButton
							onPress={() => {
								setSortBy("date")
								setShowASCDESC(true)
							}}
							icon="time-outline"
							text={i18n(lang, "sortByDate")}
						/>
						<ActionButton
							onPress={() => {
								setSortBy("uploadDate")
								setShowASCDESC(true)
							}}
							icon="time-outline"
							text={i18n(lang, "sortByUploadDate")}
						/>
						<ActionButton
							onPress={() => {
								setSortBy("type")
								setShowASCDESC(true)
							}}
							icon="albums-outline"
							text={i18n(lang, "sortByType")}
						/>
						<ActionButton
							onPress={() => {
								setItemsSortBy("nameAsc")

								SheetManager.hide("SortByActionSheet")
							}}
							icon="refresh-outline"
							text={i18n(lang, "reset")}
						/>
					</>
				)}
			</View>
		</ActionSheet>
	)
})

export default SortByActionSheet
