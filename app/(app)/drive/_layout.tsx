import { Stack } from "expo-router"
import TrackPlayerBottom from "@/components/trackPlayer/bottom"
import { Fragment } from "react"
import { SCREEN_OPTIONS } from "@/lib/constants"

export default function DriveLayout() {
	return (
		<Fragment>
			<Stack screenOptions={SCREEN_OPTIONS.base} />
			<TrackPlayerBottom />
		</Fragment>
	)
}
