import { useLocalSearchParams } from "expo-router"
import { memo, Fragment, useMemo } from "react"
import DriveList from "@/components/drive/list"
import useSDKConfig from "@/hooks/useSDKConfig"
import Header from "@/components/drive/header"

export const Drive = memo(() => {
	const { uuid } = useLocalSearchParams()
	const [{ baseFolderUUID }] = useSDKConfig()

	const queryParams = useMemo(
		(): FetchCloudItemsParams => ({
			parent: typeof uuid !== "string" ? baseFolderUUID : uuid,
			of: "drive",
			receiverId: 0
		}),
		[uuid, baseFolderUUID]
	)

	return (
		<Fragment>
			<Header queryParams={queryParams} />
			<DriveList queryParams={queryParams} />
		</Fragment>
	)
})

Drive.displayName = "Drive"

export default Drive
