import { Stack } from "expo-router"
import { Fragment } from "react"
import TrackPlayerBottom from "@/components/trackPlayer/bottom"

export default function PhotosLayout() {
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
