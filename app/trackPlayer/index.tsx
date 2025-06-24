import TrackPlayerComponent from "@/components/trackPlayer"
import RequireInternet from "@/components/requireInternet"
import { FullScreenLoadingModal } from "@/components/modals/fullScreenLoadingModal"
import { Platform } from "react-native"

export default function TrackPlayer() {
	return (
		<RequireInternet>
			<TrackPlayerComponent />
			{Platform.OS === "ios" && <FullScreenLoadingModal />}
		</RequireInternet>
	)
}
