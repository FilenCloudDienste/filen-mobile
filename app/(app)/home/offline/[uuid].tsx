import { useLocalSearchParams } from "expo-router"
import { memo, Fragment, useMemo } from "react"
import DriveList from "@/components/drive/list"
import Header from "@/components/drive/header"

export const Offline = memo(() => {
	const { uuid } = useLocalSearchParams()

	const queryParams = useMemo((): FetchCloudItemsParams => {
		const parent = typeof uuid !== "string" ? "" : uuid

		return {
			parent,
			of: "offline",
			receiverId: 0
		}
	}, [uuid])

	return (
		<Fragment>
			<Header queryParams={queryParams} />
			<DriveList queryParams={queryParams} />
		</Fragment>
	)
})

Offline.displayName = "Offline"

export default Offline
