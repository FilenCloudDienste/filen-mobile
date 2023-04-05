import React, { memo, useMemo } from "react"
import { getRouteURL } from "../../lib/helpers"
import { Text, View } from "react-native"
import Ionicon from "@expo/vector-icons/Ionicons"
import storage from "../../lib/storage"
import { useMMKVBoolean, useMMKVString, useMMKVNumber } from "react-native-mmkv"
import { i18n } from "../../i18n"
import useNetworkInfo from "../../lib/services/isOnline/useNetworkInfo"
import { getColor } from "../../style"
import useDarkMode from "../../lib/hooks/useDarkMode"
import useLang from "../../lib/hooks/useLang"

export interface ListEmptyProps {
	route: any
	searchTerm?: string
}

export const ListEmpty = memo(({ route, searchTerm = "" }: ListEmptyProps) => {
	const darkMode = useDarkMode()
	const lang = useLang()
	const [userId] = useMMKVNumber("userId", storage)
	const [cameraUploadFolderUUID] = useMMKVString("cameraUploadFolderUUID:" + userId, storage)
	const [defaultDriveOnly] = useMMKVBoolean("defaultDriveOnly:" + userId, storage)
	const [defaultDriveUUID] = useMMKVString("defaultDriveUUID:" + userId, storage)
	const networkInfo = useNetworkInfo()

	const [routeURL, currentScreenName, baseName] = useMemo(() => {
		const routeURL = getRouteURL(route)
		const currentScreenName: string = route.name
		const baseName: string = defaultDriveOnly ? (defaultDriveUUID as string) : "base"

		return [routeURL, currentScreenName, baseName]
	}, [route, defaultDriveOnly, defaultDriveUUID])

	return (
		<View
			style={{
				justifyContent: "center",
				alignItems: "center",
				marginTop: -100
			}}
		>
			{searchTerm.length > 0 ? (
				<>
					<Ionicon
						name="search-outline"
						size={70}
						color={getColor(darkMode, "textSecondary")}
					/>
					<Text
						style={{
							color: "gray",
							marginTop: 5
						}}
					>
						{i18n(lang, "noSearchFound", true, ["__TERM__"], [searchTerm])}
					</Text>
				</>
			) : (
				<>
					{networkInfo.online ? (
						<>
							{routeURL.indexOf("photos") !== -1 && (
								<>
									{typeof cameraUploadFolderUUID == "string" && cameraUploadFolderUUID.length > 16 ? (
										<>
											<Ionicon
												name="image-outline"
												size={70}
												color={getColor(darkMode, "textSecondary")}
											/>
											<Text
												style={{
													color: "gray",
													marginTop: 5
												}}
											>
												{i18n(lang, "noImagesUploadedYet")}
											</Text>
										</>
									) : (
										<>
											<Ionicon
												name="image-outline"
												size={70}
												color={getColor(darkMode, "textSecondary")}
											/>
											<Text
												style={{
													color: "gray",
													marginTop: 5
												}}
											>
												{i18n(lang, "cameraUploadNotEnabled")}
											</Text>
										</>
									)}
								</>
							)}
							{routeURL.indexOf(baseName) !== -1 && (
								<>
									<Ionicon
										name="document-outline"
										size={70}
										color={getColor(darkMode, "textSecondary")}
									/>
									<Text
										style={{
											color: "gray",
											marginTop: 5
										}}
									>
										{i18n(lang, "noFilesOrFoldersUploadedYet")}
									</Text>
								</>
							)}
							{routeURL.indexOf("recents") !== -1 && (
								<>
									<Ionicon
										name="time-outline"
										size={70}
										color={getColor(darkMode, "textSecondary")}
									/>
									<Text
										style={{
											color: "gray",
											marginTop: 5
										}}
									>
										{i18n(lang, "noFilesOrFoldersUploadedYet")}
									</Text>
								</>
							)}
							{routeURL.indexOf("shared-in") !== -1 && (
								<>
									<Ionicon
										name="people-outline"
										size={70}
										color={getColor(darkMode, "textSecondary")}
									/>
									<Text
										style={{
											color: "gray",
											marginTop: 5
										}}
									>
										{i18n(lang, "nothingSharedYet")}
									</Text>
								</>
							)}
							{routeURL.indexOf("shared-out") !== -1 && (
								<>
									<Ionicon
										name="people-outline"
										size={70}
										color={getColor(darkMode, "textSecondary")}
									/>
									<Text
										style={{
											color: "gray",
											marginTop: 5
										}}
									>
										{i18n(lang, "nothingSharedYet")}
									</Text>
								</>
							)}
							{routeURL.indexOf("links") !== -1 && (
								<>
									<Ionicon
										name="link-outline"
										size={70}
										color={getColor(darkMode, "textSecondary")}
									/>
									<Text
										style={{
											color: "gray",
											marginTop: 5
										}}
									>
										{i18n(lang, "noPublicLinksYet")}
									</Text>
								</>
							)}
							{routeURL.indexOf("favorites") !== -1 && (
								<>
									<Ionicon
										name="heart-outline"
										size={70}
										color={getColor(darkMode, "textSecondary")}
									/>
									<Text
										style={{
											color: "gray",
											marginTop: 5
										}}
									>
										{i18n(lang, "noFavoritesYet")}
									</Text>
								</>
							)}
							{routeURL.indexOf("offline") !== -1 && (
								<>
									<Ionicon
										name="cloud-offline-outline"
										size={70}
										color={getColor(darkMode, "textSecondary")}
									/>
									<Text
										style={{
											color: "gray",
											marginTop: 5
										}}
									>
										{i18n(lang, "noOfflineFilesYet")}
									</Text>
								</>
							)}
							{routeURL.indexOf("trash") !== -1 && (
								<>
									<Ionicon
										name="trash-outline"
										size={70}
										color={getColor(darkMode, "textSecondary")}
									/>
									<Text
										style={{
											color: "gray",
											marginTop: 5
										}}
									>
										{i18n(lang, "noItemsInTrash")}
									</Text>
								</>
							)}
							{currentScreenName == "EventsScreen" && (
								<>
									<Ionicon
										name="alert-circle-outline"
										size={70}
										color={getColor(darkMode, "textSecondary")}
									/>
									<Text
										style={{
											color: "gray",
											marginTop: 5
										}}
									>
										{i18n(lang, "noEventsYet")}
									</Text>
								</>
							)}
						</>
					) : (
						<>
							<Ionicon
								name="cloud-offline-outline"
								size={70}
								color={getColor(darkMode, "textSecondary")}
							/>
							<Text
								style={{
									color: "gray",
									marginTop: 5
								}}
							>
								{i18n(lang, "deviceOffline")}
							</Text>
						</>
					)}
				</>
			)}
		</View>
	)
})
