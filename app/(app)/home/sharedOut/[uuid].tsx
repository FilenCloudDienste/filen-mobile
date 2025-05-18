import { useLocalSearchParams } from "expo-router"
import { memo, Fragment, useMemo } from "react"
import DriveList from "@/components/drive/list"
import Header from "@/components/drive/header"

export const SharedOut = memo(() => {
	const { uuid, receiverId } = useLocalSearchParams()

	const queryParams = useMemo((): FetchCloudItemsParams => {
		const parent = typeof uuid !== "string" ? "shared-out" : uuid

		return {
			parent,
			of: "sharedOut",
			receiverId: typeof receiverId === "string" ? parseInt(receiverId) : 0
		}
	}, [uuid, receiverId])

	return (
		<Fragment>
			<Header queryParams={queryParams} />
			<DriveList queryParams={queryParams} />
		</Fragment>
	)
})

SharedOut.displayName = "SharedOut"

export default SharedOut
