import { useLocalSearchParams } from "expo-router"
import { memo, useRef, useCallback, useMemo } from "react"
import { AdaptiveSearchHeader } from "@/components/nativewindui/AdaptiveSearchHeader"
import type { AdaptiveSearchBarRef, AdaptiveSearchHeaderProps } from "@/components/nativewindui/AdaptiveSearchHeader/types"
import { useDriveStore } from "@/stores/drive.store"
import RightView from "./rightView"
import Search from "./search"
import { useShallow } from "zustand/shallow"
import useNetInfo from "@/hooks/useNetInfo"

export const IOS = memo(({ headerTitle, queryParams }: { headerTitle: string; queryParams: FetchCloudItemsParams }) => {
	const searchBarRef = useRef<AdaptiveSearchBarRef>(null)
	const { uuid } = useLocalSearchParams()
	const selectedItemsCount = useDriveStore(useShallow(state => state.selectedItems.length))
	const { hasInternet } = useNetInfo()

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
			// eslint-disable-next-line react-hooks/refs
			ref: searchBarRef?.current ? (searchBarRef as React.RefObject<AdaptiveSearchBarRef>) : undefined,
			iosHideWhenScrolling: false,
			onChangeText: text => useDriveStore.getState().setSearchTerm(text),
			persistBlur: queryParams.of !== "drive",
			contentTransparent: queryParams.of !== "drive",
			content: queryParams.of === "drive" ? <Search queryParams={queryParams} /> : undefined
		} satisfies AdaptiveSearchHeaderProps["searchBar"]
	}, [queryParams])

	return (
		<AdaptiveSearchHeader
			iosTitle={headerTitle}
			iosBackButtonMenuEnabled={true}
			iosBackVisible={backVisible}
			rightView={rightView}
			iosBlurEffect="systemChromeMaterial"
			searchBar={hasInternet ? searchBar : undefined}
		/>
	)
})

IOS.displayName = "IOS"

export default IOS
