import { memo, useCallback, useMemo } from "react"
import { Settings as SettingsComponent, IconView } from "@/components/settings"
import { Toggle } from "@/components/nativewindui/Toggle"
import useCameraUpload, { setCameraUploadState } from "@/hooks/useCameraUpload"
import { useRouter } from "expo-router"
import driveService from "@/services/drive.service"
import nodeWorker from "@/lib/nodeWorker"
import alerts from "@/lib/alerts"
import { validate as validateUUID } from "uuid"
import * as MediaLibrary from "expo-media-library"
import useCameraUploadParentQuery from "@/queries/useCameraUploadParent.query"
import RequireInternet from "@/components/requireInternet"
import { translateMemoized } from "@/lib/i18n"
import { foregroundCameraUpload } from "@/lib/cameraUpload"
import { View } from "react-native"

export const Settings = memo(() => {
	const [cameraUpload] = useCameraUpload()
	const { push: routerPush } = useRouter()

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

	const toggleEnabled = useCallback(async (enable: boolean) => {
		setCameraUploadState(prev => ({
			...prev,
			enabled: enable,
			version: (prev.version ?? 0) + 1,
			enabledTimestamp: Date.now()
		}))

		if (enable) {
			setTimeout(() => {
				foregroundCameraUpload.run().catch(console.error)
			}, 1000)
		}
	}, [])

	const toggleCellular = useCallback(() => {
		setCameraUploadState(prev => ({
			...prev,
			cellular: !prev.cellular,
			version: (prev.version ?? 0) + 1
		}))
	}, [])

	const toggleCompress = useCallback(() => {
		setCameraUploadState(prev => ({
			...prev,
			compress: !prev.compress,
			version: (prev.version ?? 0) + 1
		}))
	}, [])

	const toggleBackground = useCallback(() => {
		setCameraUploadState(prev => ({
			...prev,
			background: !prev.background
		}))
	}, [])

	const toggleLowBattery = useCallback(() => {
		setCameraUploadState(prev => ({
			...prev,
			lowBattery: !prev.lowBattery,
			version: (prev.version ?? 0) + 1
		}))
	}, [])

	const toggleVideos = useCallback(() => {
		setCameraUploadState(prev => ({
			...prev,
			videos: !prev.videos,
			version: (prev.version ?? 0) + 1
		}))
	}, [])

	const toggleOnlyDeltasAfterEnabled = useCallback(() => {
		setCameraUploadState(prev => ({
			...prev,
			onlyDeltasAfterEnabled: !prev.onlyDeltasAfterEnabled,
			enabledTimestamp: Date.now(),
			version: (prev.version ?? 0) + 1
		}))
	}, [])

	const selectRemoteDirectory = useCallback(async () => {
		const selectDriveItemsResponse = await driveService.selectDriveItems({
			type: "directory",
			max: 1,
			dismissHref: "/photosSettings"
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

			setCameraUploadState(prev => ({
				...prev,
				version: (prev.version ?? 0) + 1,
				remote: {
					...directory,
					path
				}
			}))

			cameraUploadParentQuery.refetch().catch(console.error)

			setTimeout(() => {
				foregroundCameraUpload.run().catch(console.error)
			}, 1000)
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}
		}
	}, [cameraUploadParentQuery])

	const items = useMemo(() => {
		if (permissions && !permissions.granted) {
			return [
				{
					id: "0",
					title: translateMemoized("photos.settings.index.items.permissionsError"),
					subTitle: translateMemoized("photos.settings.index.items.permissionsErrorInfo"),
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
								alerts.error(translateMemoized("photos.settings.index.errors.noPermissions"))
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
				title: translateMemoized("photos.settings.index.items.enabled"),
				rightView: (
					<View testID="photos.settings.enabled">
						<Toggle
							value={cameraUpload.enabled && permissions?.granted && cameraUploadParentExists}
							onValueChange={toggleEnabled}
						/>
					</View>
				)
			},
			"gap-0",
			{
				id: "1",
				title: translateMemoized("photos.settings.index.items.albums"),
				subTitle: translateMemoized("photos.settings.index.items.albumsInfo"),
				rightText: cameraUpload.albums.length.toString(),
				leftView: (
					<IconView
						name="image-multiple-outline"
						className="bg-blue-500"
					/>
				),
				onPress: () => {
					routerPush({
						pathname: "/photosSettings/albums"
					})
				}
			},
			{
				id: "2",
				title: translateMemoized("photos.settings.index.items.cloudDirectory"),
				subTitle:
					cameraUpload.remote && validateUUID(cameraUpload.remote.uuid) && cameraUploadParentExists
						? cameraUpload.remote.path
						: translateMemoized("photos.settings.index.items.cloudDirectoryNotSet"),
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
				title: translateMemoized("photos.settings.index.items.videos"),
				subTitle: translateMemoized("photos.settings.index.items.videosInfo"),
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
				title: translateMemoized("photos.settings.index.items.cellular"),
				subTitle: translateMemoized("photos.settings.index.items.cellularInfo"),
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
				title: translateMemoized("photos.settings.index.items.background"),
				subTitle: translateMemoized("photos.settings.index.items.backgroundInfo"),
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
				title: translateMemoized("photos.settings.index.items.lowBattery"),
				subTitle: translateMemoized("photos.settings.index.items.lowBatteryInfo"),
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
				title: translateMemoized("photos.settings.index.items.compress"),
				subTitle: translateMemoized("photos.settings.index.items.compressInfo"),
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
			},
			{
				id: "8",
				title: translateMemoized("photos.settings.index.items.onlyDeltasAfterActivation"),
				subTitle: translateMemoized("photos.settings.index.items.onlyDeltasAfterActivationInfo"),
				leftView: (
					<IconView
						name="clock-outline"
						className="bg-teal-500"
					/>
				),
				rightView: (
					<Toggle
						value={cameraUpload.onlyDeltasAfterEnabled ?? false}
						onValueChange={toggleOnlyDeltasAfterEnabled}
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
		permissions,
		requestPermissions,
		cameraUploadParentExists,
		toggleOnlyDeltasAfterEnabled
	])

	return (
		<RequireInternet>
			<SettingsComponent
				iosBackButtonTitle={translateMemoized("settings.index.back")}
				title={translateMemoized("photos.settings.index.title")}
				showSearchBar={false}
				items={items}
			/>
		</RequireInternet>
	)
})

Settings.displayName = "Settings"

export default Settings
