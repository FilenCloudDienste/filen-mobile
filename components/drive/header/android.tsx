import { useLocalSearchParams } from "expo-router"
import { LargeTitleHeader } from "@/components/nativewindui/LargeTitleHeader"
import { memo, useCallback, useMemo, useState } from "react"
import { useDriveStore } from "@/stores/drive.store"
import RightView from "./rightView"
import Search from "./search"
import { type AdaptiveSearchHeaderProps } from "@/components/nativewindui/AdaptiveSearchHeader/types"
import { useShallow } from "zustand/shallow"
import useNetInfo from "@/hooks/useNetInfo"

export const Android = memo(({ headerTitle, queryParams }: { headerTitle: string; queryParams: FetchCloudItemsParams }) => {
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
			iosHideWhenScrolling: false,
			onChangeText: setSearchTerm,
			materialBlurOnSubmit: false,
			content: (
				<Search
					searchTerm={searchTerm}
					queryParams={queryParams}
				/>
			)
		} satisfies AdaptiveSearchHeaderProps["searchBar"]
	}, [searchTerm, queryParams])

	return (
		<LargeTitleHeader
			title={headerTitle}
			materialPreset="inline"
			backVisible={backVisible}
			rightView={rightView}
			searchBar={hasInternet ? searchBar : undefined}
		/>
	)
})

Android.displayName = "Android"

export default Android
