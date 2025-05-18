import { useLocalSearchParams } from "expo-router"
import { LargeTitleHeader } from "@/components/nativewindui/LargeTitleHeader"
import { type LargeTitleSearchBarRef } from "@/components/nativewindui/LargeTitleHeader/types"
import { memo, useRef, useCallback, useMemo, useState, useEffect } from "react"
import { useDriveStore } from "@/stores/drive.store"
import RightView from "./rightView"
import Search from "./search"
import { type AdaptiveSearchHeaderProps, type AdaptiveSearchBarRef } from "@/components/nativewindui/AdaptiveSearchHeader/types"
import events from "@/lib/events"
import { useShallow } from "zustand/shallow"

export const Android = memo(({ headerTitle, queryParams }: { headerTitle: string; queryParams: FetchCloudItemsParams }) => {
	const searchBarRef = useRef<LargeTitleSearchBarRef>(null)
	const { uuid } = useLocalSearchParams()
	const selectedItemsCount = useDriveStore(useShallow(state => state.selectedItems.length))
	const [searchTerm, setSearchTerm] = useState<string>("")

	const rightView = useCallback(() => {
		return <RightView queryParams={queryParams} />
	}, [queryParams])

	const backVisible = useMemo(() => {
		return (
			selectedItemsCount === 0 &&
			(typeof uuid === "string" ||
				queryParams.of === "recents" ||
				queryParams.of === "links" ||
				queryParams.of === "sharedIn" ||
				queryParams.of === "sharedOut" ||
				queryParams.of === "favorites" ||
				queryParams.of === "trash")
		)
	}, [selectedItemsCount, uuid, queryParams.of])

	const searchBar = useMemo(() => {
		return {
			ref: searchBarRef?.current ? (searchBarRef as React.RefObject<AdaptiveSearchBarRef>) : undefined,
			iosCancelButtonText: "Abort",
			iosHideWhenScrolling: false,
			onChangeText: text => setSearchTerm(text),
			placeholder: "Search...",
			materialBlurOnSubmit: false,
			content: (
				<Search
					searchTerm={searchTerm}
					queryParams={queryParams}
					searchBarRef={searchBarRef?.current ? (searchBarRef as React.RefObject<AdaptiveSearchBarRef>) : undefined}
				/>
			)
		} satisfies AdaptiveSearchHeaderProps["searchBar"]
	}, [searchTerm, queryParams])

	useEffect(() => {
		const hideSearchBarListener = events.subscribe("hideSearchBar", () => {
			searchBarRef?.current?.cancelSearch?.()
		})

		return () => {
			hideSearchBarListener.remove()
		}
	}, [])

	return (
		<LargeTitleHeader
			title={headerTitle}
			materialPreset="inline"
			backVisible={backVisible}
			rightView={rightView}
			searchBar={searchBar}
		/>
	)
})

Android.displayName = "Android"

export default Android
