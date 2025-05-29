import EditPublicLinkComponent from "@/components/editPublicLink"
import { Fragment } from "react"
import { FullScreenLoadingModal } from "@/components/modals/fullScreenLoadingModal"
import { Platform } from "react-native"

export default function EditPublicLink() {
	return (
		<Fragment>
			<EditPublicLinkComponent />
			{Platform.OS === "ios" && <FullScreenLoadingModal />}
		</Fragment>
	)
}
