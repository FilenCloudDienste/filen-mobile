import { useLocalSearchParams } from "expo-router"
import { memo, Fragment, useMemo } from "react"
import DriveList from "@/components/drive/list"
import useSDKConfig from "@/hooks/useSDKConfig"
import Header from "@/components/drive/header"
import { validate as validateUUID } from "uuid"

export const Drive = memo(() => {
	const { uuid, scrollToUUID } = useLocalSearchParams()
	const [{ baseFolderUUID }] = useSDKConfig()

	const queryParams = useMemo(
		(): FetchCloudItemsParams => ({
			parent: typeof uuid !== "string" ? baseFolderUUID : uuid,
			of: "drive",
			receiverId: 0
		}),
		[uuid, baseFolderUUID]
	)

	const scrollToUUIDParsed = useMemo(() => {
		return typeof scrollToUUID === "string" && validateUUID(scrollToUUID) ? scrollToUUID : undefined
	}, [scrollToUUID])

	return (
		<Fragment>
			<Header queryParams={queryParams} />
			<DriveList
				queryParams={queryParams}
				scrollToUUID={scrollToUUIDParsed}
			/>
		</Fragment>
	)
})

Drive.displayName = "Drive"

export default Drive
