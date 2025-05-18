import { memo, Fragment, useMemo } from "react"
import DriveList from "@/components/drive/list"
import Header from "@/components/drive/header"

export const Favorites = memo(() => {
	const queryParams = useMemo(
		(): FetchCloudItemsParams => ({
			parent: "favorites",
			of: "favorites",
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

Favorites.displayName = "Favorites"

export default Favorites
