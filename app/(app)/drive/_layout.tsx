import { Stack } from "expo-router"
import TrackPlayerBottom from "@/components/trackPlayer/bottom"
import { Fragment } from "react"

export default function DriveLayout() {
	return (
		<Fragment>
			<Stack
				screenOptions={{
					headerShown: false,
					headerBlurEffect: "systemChromeMaterial"
				}}
			/>
			<TrackPlayerBottom />
		</Fragment>
	)
}
