import { memo, useCallback, useMemo } from "react"
import { Settings as SettingsComponent, IconView } from "@/components/settings"
import { Toggle } from "@/components/nativewindui/Toggle"
import useCameraUpload from "@/hooks/useCameraUpload"
import { useRouter, useFocusEffect } from "expo-router"
import driveService from "@/services/drive.service"
import nodeWorker from "@/lib/nodeWorker"
import alerts from "@/lib/alerts"
import { validate as validateUUID } from "uuid"
import * as MediaLibrary from "expo-media-library"
import useCameraUploadParentQuery from "@/queries/useCameraUploadParent.query"
import RequireInternet from "@/components/requireInternet"
import { useTranslation } from "react-i18next"
import { foregroundCameraUpload } from "@/lib/cameraUpload"
import { View } from "react-native"

export const Settings = memo(() => {
	const [cameraUpload, setCameraUpload] = useCameraUpload()
	const { push: routerPush } = useRouter()
	const { t } = useTranslation()

	const [permissions, requestPermissions] = MediaLibrary.usePermissions({
		writeOnly: false,
		request: false
	})

	const cameraUploadParentQuery = useCameraUploadParentQuery({
		enabled: cameraUpload.enabled
	})

	const cameraUploadParentExists = useMemo(() => {
		if (!cameraUpload.enabled || cameraUploadParentQuery.status !== "success") {
			return true
		}

		return cameraUploadParentQuery.data !== null
	}, [cameraUploadParentQuery.data, cameraUploadParentQuery.status, cameraUpload.enabled])

	const toggleEnabled = useCallback(
		async (enable: boolean) => {
			setCameraUpload(prev => ({
				...prev,
				enabled: enable,
				version: (prev.version ?? 0) + 1
			}))

			if (enable) {
				setTimeout(() => {
					cameraUploadParentQuery.refetch().catch(console.error)
					foregroundCameraUpload.run().catch(console.error)
				}, 1000)
			}
		},
		[setCameraUpload, cameraUploadParentQuery]
	)

	const toggleCellular = useCallback(() => {
		setCameraUpload(prev => ({
			...prev,
			cellular: !prev.cellular
		}))

		setTimeout(() => {
			cameraUploadParentQuery.refetch().catch(console.error)
			foregroundCameraUpload.run().catch(console.error)
		}, 1000)
	}, [setCameraUpload, cameraUploadParentQuery])

	const toggleCompress = useCallback(() => {
		setCameraUpload(prev => ({
			...prev,
			compress: !prev.compress
		}))

		setTimeout(() => {
			cameraUploadParentQuery.refetch().catch(console.error)
			foregroundCameraUpload.run().catch(console.error)
		}, 1000)
	}, [setCameraUpload, cameraUploadParentQuery])

	const toggleBackground = useCallback(() => {
		setCameraUpload(prev => ({
			...prev,
			background: !prev.background
		}))

		setTimeout(() => {
			cameraUploadParentQuery.refetch().catch(console.error)
			foregroundCameraUpload.run().catch(console.error)
		}, 1000)
	}, [setCameraUpload, cameraUploadParentQuery])

	const toggleLowBattery = useCallback(() => {
		setCameraUpload(prev => ({
			...prev,
			lowBattery: !prev.lowBattery
		}))

		setTimeout(() => {
			cameraUploadParentQuery.refetch().catch(console.error)
			foregroundCameraUpload.run().catch(console.error)
		}, 1000)
	}, [setCameraUpload, cameraUploadParentQuery])

	const toggleVideos = useCallback(() => {
		setCameraUpload(prev => ({
			...prev,
			videos: !prev.videos
		}))

		setTimeout(() => {
			cameraUploadParentQuery.refetch().catch(console.error)
			foregroundCameraUpload.run().catch(console.error)
		}, 1000)
	}, [setCameraUpload, cameraUploadParentQuery])

	const selectRemoteDirectory = useCallback(async () => {
		const selectDriveItemsResponse = await driveService.selectDriveItems({
			type: "directory",
			max: 1,
			dismissHref: "/photos/settings"
		})

		if (selectDriveItemsResponse.cancelled || selectDriveItemsResponse.items.length !== 1) {
			return
		}

		const directory = selectDriveItemsResponse.items.at(0)

		if (!directory) {
			return
		}

		try {
			const path = await nodeWorker.proxy("directoryUUIDToPath", {
				uuid: directory.uuid
			})

			setCameraUpload(prev => ({
				...prev,
				version: (prev.version ?? 0) + 1,
				remote: {
					...directory,
					path
				}
			}))

			setTimeout(() => {
				cameraUploadParentQuery.refetch().catch(console.error)
				foregroundCameraUpload.run().catch(console.error)
			}, 1000)
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}
		}
	}, [setCameraUpload, cameraUploadParentQuery])

	const items = useMemo(() => {
		if (permissions && !permissions.granted) {
			return [
				{
					id: "0",
					title: t("photos.settings.index.items.permissionsError"),
					subTitle: t("photos.settings.index.items.permissionsErrorInfo"),
					leftView: (
						<IconView
							name="lock-alert-outline"
							className="bg-red-500"
						/>
					),
					onPress: async () => {
						try {
							const ask = await requestPermissions()

							if (ask.status !== MediaLibrary.PermissionStatus.GRANTED) {
								alerts.error(t("photos.settings.index.errors.noPermissions"))
							}
						} catch (e) {
							console.error(e)

							if (e instanceof Error) {
								alerts.error(e.message)
							}
						}
					}
				}
			]
		}

		return [
			{
				id: "0",
				title: t("photos.settings.index.items.enabled"),
				rightView: (
					<View testID="photos.settings.enabled">
						<Toggle
							value={cameraUpload.enabled}
							onValueChange={toggleEnabled}
						/>
					</View>
				)
			},
			"gap-0",
			{
				id: "1",
				title: t("photos.settings.index.items.albums"),
				subTitle: t("photos.settings.index.items.albumsInfo"),
				rightText: cameraUpload.albums.length.toString(),
				leftView: (
					<IconView
						name="image-multiple-outline"
						className="bg-blue-500"
					/>
				),
				onPress: () => {
					routerPush({
						pathname: "/photos/settings/albums"
					})
				}
			},
			{
				id: "2",
				title: t("photos.settings.index.items.cloudDirectory"),
				subTitle:
					cameraUpload.remote && validateUUID(cameraUpload.remote.uuid) && cameraUploadParentExists
						? cameraUpload.remote.path
						: t("photos.settings.index.items.cloudDirectoryNotSet"),
				leftView: (
					<IconView
						name="cloud-outline"
						className="bg-red-500"
					/>
				),
				onPress: () => selectRemoteDirectory()
			},
			"gap-1",
			{
				id: "3",
				title: t("photos.settings.index.items.videos"),
				subTitle: t("photos.settings.index.items.videosInfo"),
				leftView: (
					<IconView
						name="video-outline"
						className="bg-purple-500"
					/>
				),
				rightView: (
					<Toggle
						value={cameraUpload.videos}
						onValueChange={toggleVideos}
					/>
				)
			},
			{
				id: "4",
				title: t("photos.settings.index.items.cellular"),
				subTitle: t("photos.settings.index.items.cellularInfo"),
				leftView: (
					<IconView
						name="signal-cellular-3"
						className="bg-blue-500"
					/>
				),
				rightView: (
					<Toggle
						value={cameraUpload.cellular}
						onValueChange={toggleCellular}
					/>
				)
			},
			{
				id: "5",
				title: t("photos.settings.index.items.background"),
				subTitle: t("photos.settings.index.items.backgroundInfo"),
				leftView: (
					<IconView
						name="backpack"
						className="bg-gray-500"
					/>
				),
				rightView: (
					<Toggle
						value={cameraUpload.background}
						onValueChange={toggleBackground}
					/>
				)
			},
			{
				id: "6",
				title: t("photos.settings.index.items.lowBattery"),
				subTitle: t("photos.settings.index.items.lowBatteryInfo"),
				leftView: (
					<IconView
						name="power-plug-outline"
						className="bg-green-500"
					/>
				),
				rightView: (
					<Toggle
						value={cameraUpload.lowBattery}
						onValueChange={toggleLowBattery}
					/>
				)
			},
			{
				id: "7",
				title: t("photos.settings.index.items.compress"),
				subTitle: t("photos.settings.index.items.compressInfo"),
				leftView: (
					<IconView
						name="file-document-outline"
						className="bg-orange-500"
					/>
				),
				rightView: (
					<Toggle
						value={cameraUpload.compress}
						onValueChange={toggleCompress}
					/>
				)
			}
		]
	}, [
		cameraUpload,
		toggleEnabled,
		toggleCellular,
		toggleCompress,
		toggleBackground,
		toggleLowBattery,
		toggleVideos,
		selectRemoteDirectory,
		routerPush,
		t,
		permissions,
		requestPermissions,
		cameraUploadParentExists
	])

	useFocusEffect(
		useCallback(() => {
			setTimeout(() => {
				foregroundCameraUpload.run().catch(console.error)
			}, 1000)
		}, [])
	)

	return (
		<RequireInternet>
			<SettingsComponent
				title={t("photos.settings.index.title")}
				showSearchBar={false}
				items={items}
			/>
		</RequireInternet>
	)
})

Settings.displayName = "Settings"

export default Settings
