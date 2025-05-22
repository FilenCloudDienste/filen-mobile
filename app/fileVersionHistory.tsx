import FileVersionHistoryComponent from "@/components/fileVersionHistory"
import { Fragment } from "react"
import { FullScreenLoadingModal } from "@/components/modals/fullScreenLoadingModal"
import { Platform } from "react-native"

export default function SelectContacts() {
	return (
		<Fragment>
			<FileVersionHistoryComponent />
			{Platform.OS === "ios" && <FullScreenLoadingModal />}
		</Fragment>
	)
}
