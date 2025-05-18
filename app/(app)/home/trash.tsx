import { memo, Fragment, useMemo } from "react"
import DriveList from "@/components/drive/list"
import Header from "@/components/drive/header"

export const Trash = memo(() => {
	const queryParams = useMemo(
		(): FetchCloudItemsParams => ({
			parent: "trash",
			of: "trash",
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

Trash.displayName = "Trash"

export default Trash
