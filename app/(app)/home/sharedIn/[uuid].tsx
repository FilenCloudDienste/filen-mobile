import { useLocalSearchParams } from "expo-router"
import { memo, Fragment, useMemo } from "react"
import DriveList from "@/components/drive/list"
import Header from "@/components/drive/header"

export const SharedIn = memo(() => {
	const { uuid } = useLocalSearchParams()

	const queryParams = useMemo((): FetchCloudItemsParams => {
		const parent = typeof uuid !== "string" ? "shared-in" : uuid

		return {
			parent,
			of: "sharedIn",
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

SharedIn.displayName = "SharedIn"

export default SharedIn
