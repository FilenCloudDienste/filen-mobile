import { useLocalSearchParams } from "expo-router"
import { memo, useRef, useCallback, useMemo, useState } from "react"
import { AdaptiveSearchHeader } from "@/components/nativewindui/AdaptiveSearchHeader"
import { type AdaptiveSearchBarRef, type AdaptiveSearchHeaderProps } from "@/components/nativewindui/AdaptiveSearchHeader/types"
import { useDriveStore } from "@/stores/drive.store"
import RightView from "./rightView"
import Search from "./search"
import { useShallow } from "zustand/shallow"
import useNetInfo from "@/hooks/useNetInfo"

export const IOS = memo(({ headerTitle, queryParams }: { headerTitle: string; queryParams: FetchCloudItemsParams }) => {
	const searchBarRef = useRef<AdaptiveSearchBarRef>(null)
	const { uuid } = useLocalSearchParams()
	const selectedItemsCount = useDriveStore(useShallow(state => state.selectedItems.length))
	const [searchTerm, setSearchTerm] = useState<string>("")
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
			ref: searchBarRef?.current ? (searchBarRef as React.RefObject<AdaptiveSearchBarRef>) : undefined,
			iosHideWhenScrolling: false,
			onChangeText: setSearchTerm,
			content: (
				<Search
					searchTerm={searchTerm}
					queryParams={queryParams}
				/>
			)
		} satisfies AdaptiveSearchHeaderProps["searchBar"]
	}, [searchTerm, queryParams])

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
