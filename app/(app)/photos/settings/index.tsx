import { memo, useCallback, useMemo, useEffect } from "react"
import { Settings as SettingsComponent, IconView } from "@/components/settings"
import { Toggle } from "@/components/nativewindui/Toggle"
import useCameraUpload from "@/hooks/useCameraUpload"
import { useRouter } from "expo-router"
import { selectDriveItems } from "@/app/selectDriveItems/[parent]"
import nodeWorker from "@/lib/nodeWorker"
import alerts from "@/lib/alerts"
import { validate as validateUUID } from "uuid"
import * as MediaLibrary from "expo-media-library"
import fullScreenLoadingModal from "@/components/modals/fullScreenLoadingModal"
import useCameraUploadParentQuery from "@/queries/useCameraUploadParentQuery"

export const Settings = memo(() => {
	const [cameraUpload, setCameraUpload] = useCameraUpload()
	const { push: routerPush } = useRouter()

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
							alerts.error("Camera upload requires permission to access your photos and videos.")

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
		},
		[setCameraUpload]
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
		const selectDriveItemsResponse = await selectDriveItems({
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
		<SettingsComponent
			title="Settings"
			showSearchBar={false}
			items={[
				{
					id: "0",
					title: "Enabled",
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
					title: "Albums",
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

							if (permissions.status !== MediaLibrary.PermissionStatus.GRANTED && permissions.canAskAgain) {
								const ask = await MediaLibrary.requestPermissionsAsync(false, ["video", "photo"])

								if (ask.status !== MediaLibrary.PermissionStatus.GRANTED) {
									alerts.error("Camera upload requires permission to access your photos and videos.")

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
					title: "Cloud directory",
					subTitle: cameraUpload.remote && validateUUID(cameraUpload.remote.uuid) ? cameraUpload.remote.path : "Not set",
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
					id: "33",
					title: "Videos",
					leftView: (
						<IconView
							name="signal-cellular-3"
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
					id: "3",
					title: "Cellular",
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
					id: "4",
					title: "Background",
					leftView: (
						<IconView
							name="signal-cellular-3"
							className="bg-blue-500"
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
					id: "5",
					title: "Low battery",
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
					id: "6",
					title: "Compress",
					leftView: (
						<IconView
							name="power-plug-outline"
							className="bg-green-500"
						/>
					),
					rightView: (
						<Toggle
							value={cameraUpload.compress}
							onValueChange={toggleCompress}
						/>
					)
				}
			]}
		/>
	)
})

Settings.displayName = "Settings"

export default Settings
