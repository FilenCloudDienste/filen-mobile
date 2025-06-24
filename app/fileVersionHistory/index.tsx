import FileVersionHistoryComponent from "@/components/fileVersionHistory"
import { FullScreenLoadingModal } from "@/components/modals/fullScreenLoadingModal"
import { Platform } from "react-native"
import RequireInternet from "@/components/requireInternet"

export default function FileVersionHistory() {
	return (
		<RequireInternet>
			<FileVersionHistoryComponent />
			{Platform.OS === "ios" && <FullScreenLoadingModal />}
		</RequireInternet>
	)
}
