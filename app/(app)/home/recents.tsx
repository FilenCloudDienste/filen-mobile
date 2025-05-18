import { memo, Fragment, useMemo } from "react"
import DriveList from "@/components/drive/list"
import Header from "@/components/drive/header"

export const Recents = memo(() => {
	const queryParams = useMemo(
		(): FetchCloudItemsParams => ({
			parent: "recents",
			of: "recents",
			receiverId: 0
		}),
		[]
	)

	return (
		<Fragment>
			<Header queryParams={queryParams} />
			<DriveList queryParams={queryParams} />
		</Fragment>
	)
})

Recents.displayName = "Recents"

export default Recents
