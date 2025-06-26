import TrackPlayerComponent from "@/components/trackPlayer"
import RequireInternet from "@/components/requireInternet"

export default function TrackPlayer() {
	return (
		<RequireInternet>
			<TrackPlayerComponent />
		</RequireInternet>
	)
}
