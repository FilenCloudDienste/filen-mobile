import { useLocalSearchParams, useFocusEffect } from "expo-router"
import { memo, Fragment, useMemo, useCallback } from "react"
import DriveList from "@/components/drive/list"
import useSDKConfig from "@/hooks/useSDKConfig"
import Header from "@/components/drive/header"
import { validate as validateUUID } from "uuid"
import { foregroundCameraUpload } from "@/lib/cameraUpload"

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

	useFocusEffect(
		useCallback(() => {
			if (queryParams.parent === baseFolderUUID) {
				foregroundCameraUpload.run().catch(console.error)
			}

			return () => {
				if (queryParams.parent === baseFolderUUID) {
					foregroundCameraUpload.run().catch(console.error)
				}
			}
		}, [queryParams.parent, baseFolderUUID])
	)

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
