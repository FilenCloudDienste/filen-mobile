import { memo, useCallback, useMemo, useEffect } from "react"
import { Settings as SettingsComponent, IconView } from "@/components/settings"
import { Toggle } from "@/components/nativewindui/Toggle"
import useCameraUpload from "@/hooks/useCameraUpload"
import { useRouter } from "expo-router"
import driveService from "@/services/drive.service"
import nodeWorker from "@/lib/nodeWorker"
import alerts from "@/lib/alerts"
import { validate as validateUUID } from "uuid"
import * as MediaLibrary from "expo-media-library"
import fullScreenLoadingModal from "@/components/modals/fullScreenLoadingModal"
import useCameraUploadParentQuery from "@/queries/useCameraUploadParentQuery"
import RequireInternet from "@/components/requireInternet"
import { useTranslation } from "react-i18next"
import { foregroundCameraUpload } from "@/lib/cameraUpload"

export const Settings = memo(() => {
	const [cameraUpload, setCameraUpload] = useCameraUpload()
	const { push: routerPush } = useRouter()
	const { t } = useTranslation()

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
			if (enable) {
				fullScreenLoadingModal.show()

				try {
					const permissions = await MediaLibrary.getPermissionsAsync(false, ["video", "photo"])

					if (permissions.status !== MediaLibrary.PermissionStatus.GRANTED && permissions.canAskAgain) {
						const ask = await MediaLibrary.requestPermissionsAsync(false, ["video", "photo"])

						if (ask.status !== MediaLibrary.PermissionStatus.GRANTED) {
							alerts.error(t("photos.settings.index.errors.noPermissions"))

							return
						}
					}
				} catch (e) {
					console.error(e)

					if (e instanceof Error) {
						alerts.error(e.message)
					}

					return
				} finally {
					fullScreenLoadingModal.hide()
				}
			}

			setCameraUpload(prev => ({
				...prev,
				enabled: enable
			}))

			if (enable) {
				setTimeout(() => {
					foregroundCameraUpload.run().catch(console.error)
				}, 1000)
			}
		},
		[setCameraUpload, t]
	)

	const toggleCellular = useCallback(() => {
		setCameraUpload(prev => ({
			...prev,
			cellular: !prev.cellular
		}))
	}, [setCameraUpload])

	const toggleCompress = useCallback(() => {
		setCameraUpload(prev => ({
			...prev,
			compress: !prev.compress
		}))
	}, [setCameraUpload])

	const toggleBackground = useCallback(() => {
		setCameraUpload(prev => ({
			...prev,
			background: !prev.background
		}))
	}, [setCameraUpload])

	const toggleLowBattery = useCallback(() => {
		setCameraUpload(prev => ({
			...prev,
			lowBattery: !prev.lowBattery
		}))
	}, [setCameraUpload])

	const toggleVideos = useCallback(() => {
		setCameraUpload(prev => ({
			...prev,
			videos: !prev.videos
		}))
	}, [setCameraUpload])

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
				remote: {
					...directory,
					path
				}
			}))
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}
		}
	}, [setCameraUpload])

	const items = useMemo(() => {
		return [
			{
				id: "0",
				title: t("photos.settings.index.items.enabled"),
				rightView: (
					<Toggle
						value={cameraUpload.enabled}
						onValueChange={toggleEnabled}
					/>
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
				onPress: async () => {
					fullScreenLoadingModal.show()

					try {
						const permissions = await MediaLibrary.getPermissionsAsync(false, ["video", "photo"])

						if (permissions.status !== MediaLibrary.PermissionStatus.GRANTED) {
							if (!permissions.canAskAgain) {
								alerts.error(t("photos.settings.index.errors.noPermissions"))

								return
							}

							const ask = await MediaLibrary.requestPermissionsAsync(false, ["video", "photo"])

							if (ask.status !== MediaLibrary.PermissionStatus.GRANTED) {
								alerts.error(t("photos.settings.index.errors.noPermissions"))

								return
							}
						}
					} catch (e) {
						console.error(e)

						if (e instanceof Error) {
							alerts.error(e.message)
						}

						return
					} finally {
						fullScreenLoadingModal.hide()
					}

					routerPush({
						pathname: "/photos/settings/albums"
					})
				}
			},
			{
				id: "2",
				title: t("photos.settings.index.items.cloudDirectory"),
				subTitle:
					cameraUpload.remote && validateUUID(cameraUpload.remote.uuid)
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
		t
	])

	useEffect(() => {
		if (!cameraUploadParentExists) {
			setCameraUpload(prev => ({
				...prev,
				enabled: false,
				remote: null
			}))
		}
	}, [cameraUploadParentExists, setCameraUpload])

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
