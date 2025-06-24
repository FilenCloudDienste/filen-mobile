import EditPublicLinkComponent from "@/components/editPublicLink"
import { FullScreenLoadingModal } from "@/components/modals/fullScreenLoadingModal"
import { Platform } from "react-native"
import RequireInternet from "@/components/requireInternet"

export default function EditPublicLink() {
	return (
		<RequireInternet>
			<EditPublicLinkComponent />
			{Platform.OS === "ios" && <FullScreenLoadingModal />}
		</RequireInternet>
	)
}
