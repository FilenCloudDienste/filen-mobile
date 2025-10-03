import { Stack } from "expo-router"
import { Fragment } from "react"
import TrackPlayerBottom from "@/components/trackPlayer/bottom"
import { SCREEN_OPTIONS } from "@/lib/constants"

export default function PhotosLayout() {
	return (
		<Fragment>
			<Stack screenOptions={SCREEN_OPTIONS.base} />
			<TrackPlayerBottom />
		</Fragment>
	)
}
