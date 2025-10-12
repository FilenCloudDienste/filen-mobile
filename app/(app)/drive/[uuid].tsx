import RightView from "@/components/drive/header/rightView"
import Search from "@/components/drive/header/search"
import DriveList from "@/components/drive/list"
import { useDriveHeaderTitle } from "@/hooks/useDriveHeaderTitle"
import useSDKConfig from "@/hooks/useSDKConfig"
import events from "@/lib/events"
import { useDriveStore } from "@/stores/drive.store"
import { Stack, useLocalSearchParams } from "expo-router"
import { Fragment, memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { Platform } from "react-native"
import { SearchBarCommands } from "react-native-screens"
import { validate as validateUUID } from "uuid"

export const Drive = memo(() => {
	const { uuid, scrollToUUID } = useLocalSearchParams()
	const [{ baseFolderUUID }] = useSDKConfig()
	const { t } = useTranslation()
	const searchBarRef = useRef<SearchBarCommands>({
		focus: () => {},
		blur: () => {},
		clearText: () => {},
		toggleCancelButton: (_: boolean) => {},
		setText: (_: string) => {},
		cancelSearch: () => {}
	})

	console.log("uuid:", uuid)

	const [isSearchActive, setIsSearchActive] = useState<boolean>(false)

	const queryParams = useMemo(
		(): FetchCloudItemsParams => ({
			parent: typeof uuid !== "string" ? baseFolderUUID : uuid,
			of: "drive",
			receiverId: 0
		}),
		[uuid, baseFolderUUID]
	)

	const scrollToUUIDParsed = useMemo(() => {
		return typeof scrollToUUID === "string" && validateUUID(scrollToUUID) ? scrollToUUID : undefined
	}, [scrollToUUID])

	const headerTitle = useDriveHeaderTitle({ uuid, queryParams })

	useEffect(() => {
		const hideSearchBarListener = events.subscribe("hideSearchBar", ({ clearText }) => {
			searchBarRef.current.blur()

			if (clearText) {
				// searchBarRef.current.cancelSearch()
				// searchBarRef.current.clearText()
			}

			setTimeout(() => {
				events.emit("searchBarHidden", true)
			}, 100)
		})

		return () => {
			hideSearchBarListener.remove()
		}
	}, [searchBarRef])

	const buildHeaderRight = useCallback(() => <RightView queryParams={queryParams} />, [queryParams])

	return (
		<Fragment>
			<Stack.Screen
				options={{
					headerShown: true,
					title: headerTitle,
					headerLargeTitle: true,
					headerTransparent: Platform.select({
						ios: true,
						android: false,
						default: false
					}),
					headerBlurEffect: "systemChromeMaterial",
					headerSearchBarOptions: {
						ref: searchBarRef,
						placeholder: t("nwui.search.placeholder"),
						hideWhenScrolling: false,
						onFocus: () => setIsSearchActive(true),
						onBlur: () => setIsSearchActive(false),
						onChangeText: event => useDriveStore.getState().setSearchTerm(event.nativeEvent.text)
					},
					headerRight: buildHeaderRight
				}}
			/>

			{isSearchActive ? (
				<Search queryParams={queryParams} />
			) : (
				<DriveList
					queryParams={queryParams}
					scrollToUUID={scrollToUUIDParsed}
				/>
			)}
		</Fragment>
	)
})

Drive.displayName = "Drive"

export default Drive
