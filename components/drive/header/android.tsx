import { useLocalSearchParams } from "expo-router"
import { LargeTitleHeader } from "@/components/nativewindui/LargeTitleHeader"
import { memo, useCallback, useMemo } from "react"
import { useDriveStore } from "@/stores/drive.store"
import RightView from "./rightView"
import Search from "./search"
import type { AdaptiveSearchHeaderProps } from "@/components/nativewindui/AdaptiveSearchHeader/types"
import { useShallow } from "zustand/shallow"
import useNetInfo from "@/hooks/useNetInfo"

export const Android = memo(({ headerTitle, queryParams }: { headerTitle: string; queryParams: FetchCloudItemsParams }) => {
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
			iosHideWhenScrolling: false,
			onChangeText: text => useDriveStore.getState().setSearchTerm(text),
			materialBlurOnSubmit: false,
			persistBlur: queryParams.of !== "drive",
			contentTransparent: queryParams.of !== "drive",
			content: queryParams.of === "drive" ? <Search queryParams={queryParams} /> : undefined
		} satisfies AdaptiveSearchHeaderProps["searchBar"]
	}, [queryParams])

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
