import TrackPlayerBottom from "@/components/trackPlayer/bottom"
import { Stack } from "expo-router"
import { Fragment } from "react"

export default function HomeLayout() {
	return (
		<Fragment>
			<Stack
				screenOptions={{
					headerBlurEffect: "systemChromeMaterial"
				}}
			/>
			<TrackPlayerBottom />
		</Fragment>
	)
}
