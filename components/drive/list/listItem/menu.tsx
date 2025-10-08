import { memo, useMemo, useCallback, Fragment } from "react"
import { ContextMenu } from "@/components/nativewindui/ContextMenu"
import { createContextSubMenu, createContextItem } from "@/components/nativewindui/ContextMenu/utils"
import type { ContextItem, ContextSubMenu } from "@/components/nativewindui/ContextMenu/types"
import { DropdownMenu } from "@/components/nativewindui/DropdownMenu"
import { useTranslation } from "react-i18next"
import { useRouter, usePathname } from "expo-router"
import useDimensions from "@/hooks/useDimensions"
import alerts from "@/lib/alerts"
import { getPreviewType, hideSearchBarWithDelay } from "@/lib/utils"
import { useDriveStore } from "@/stores/drive.store"
import { Platform, View } from "react-native"
import useIsProUser from "@/hooks/useIsProUser"
import TurboImage from "react-native-turbo-image"
import { useColorScheme } from "@/lib/useColorScheme"
import useNetInfo from "@/hooks/useNetInfo"
import useFileOfflineStatusQuery from "@/queries/useFileOfflineStatus.query"
import driveService from "@/services/drive.service"
import { useShallow } from "zustand/shallow"
import { usePhotosStore } from "@/stores/photos.store"
import assets from "@/lib/assets"

export const Menu = memo(
	({
		item,
		type,
		children,
		fromPreview,
		queryParams,
		fromPhotos,
		fromSearch,
		fromHome
	}: {
		item: DriveCloudItem
		type: "context" | "dropdown"
		children: React.ReactNode
		fromPreview?: boolean
		queryParams: FetchCloudItemsParams
		fromPhotos?: boolean
		fromSearch?: boolean
		fromHome?: boolean
	}) => {
		const { t } = useTranslation()
		const router = useRouter()
		const { isPortrait, isTablet, screen } = useDimensions()
		const isProUser = useIsProUser()
		const pathname = usePathname()
		const { colors } = useColorScheme()
		const { hasInternet } = useNetInfo()
		const isSelectedDrive = useDriveStore(useShallow(state => state.selectedItems.some(i => i.uuid === item.uuid)))
		const isSelectedPhotos = usePhotosStore(useShallow(state => state.selectedItems.some(i => i.uuid === item.uuid)))

		const fileOfflineStatus = useFileOfflineStatusQuery(
			{
				uuid: item.uuid
			},
			{
				enabled: item.type === "file"
			}
		)

		const offlineStatus = useMemo(() => {
			return item.type === "file" && fileOfflineStatus.status === "success" ? fileOfflineStatus.data : null
		}, [item.type, fileOfflineStatus.status, fileOfflineStatus.data])

		const isUndecryptable = useMemo(() => {
			const nameNormalized = item.name.toLowerCase().trim()

			return nameNormalized.startsWith("cannot_decrypt_") && nameNormalized.endsWith(`_${item.uuid}`)
		}, [item.name, item.uuid])

		const menuItems = useMemo(() => {
			const items: (ContextItem | ContextSubMenu)[] = []

			if (!fromPreview && !fromSearch && !fromHome && !isUndecryptable) {
				items.push(
					createContextItem({
						actionKey: "select",
						title: isSelectedDrive || isSelectedPhotos ? t("drive.list.item.menu.deselect") : t("drive.list.item.menu.select"),
						icon:
							Platform.OS === "ios"
								? {
										namingScheme: "sfSymbol",
										name: "checkmark.circle"
								  }
								: {
										namingScheme: "material",
										name: "check-circle-outline"
								  }
					})
				)
			}

			if (item.type === "directory" && queryParams.of !== "trash" && !fromPreview && !isUndecryptable) {
				items.push(
					createContextItem({
						actionKey: "openDirectory",
						title: t("drive.list.item.menu.open"),
						icon:
							Platform.OS === "ios"
								? {
										namingScheme: "sfSymbol",
										name: "folder"
								  }
								: {
										namingScheme: "material",
										name: "folder-open"
								  }
					})
				)
			}

			if ((Platform.OS === "ios" ? item.type === "file" && item.size > 0 : item.size > 0) && !isUndecryptable) {
				items.push(
					createContextSubMenu(
						{
							title: t("drive.list.item.menu.download"),
							iOSItemSize: "large"
						},
						[
							...(Platform.OS === "android" && queryParams.of !== "offline" && hasInternet
								? [
										createContextItem({
											actionKey: "download",
											title: t("drive.list.item.menu.download"),
											icon: {
												namingScheme: "material",
												name: "file-download-outline"
											}
										})
								  ]
								: []),
							...(item.type === "file" && (hasInternet || offlineStatus?.exists)
								? [
										createContextItem({
											actionKey: "export",
											title: t("drive.list.item.menu.export"),
											icon:
												Platform.OS === "ios"
													? {
															namingScheme: "sfSymbol",
															name: "square.and.arrow.up"
													  }
													: {
															namingScheme: "material",
															name: "send-outline"
													  }
										})
								  ]
								: []),
							...(["image", "video"].includes(getPreviewType(item.name)) &&
							queryParams.of !== "offline" &&
							(hasInternet || offlineStatus?.exists)
								? [
										createContextItem({
											actionKey: "saveToGallery",
											title: t("drive.list.item.menu.saveToGallery"),
											icon:
												Platform.OS === "ios"
													? {
															namingScheme: "sfSymbol",
															name: "photo"
													  }
													: {
															namingScheme: "material",
															name: "image-outline"
													  }
										})
								  ]
								: []),
							...(item.type === "file" && queryParams.of !== "offline" && (hasInternet || offlineStatus?.exists)
								? [
										createContextItem({
											actionKey: offlineStatus?.exists ? "removeOffline" : "makeOffline",
											title: t("drive.list.item.menu.availableOffline"),
											state: {
												checked: offlineStatus?.exists ?? false
											},
											icon:
												Platform.OS === "ios"
													? {
															namingScheme: "sfSymbol",
															name: "arrow.down.circle"
													  }
													: {
															namingScheme: "material",
															name: "arrow-down-circle-outline"
													  }
										})
								  ]
								: [])
						]
					)
				)
			}

			if (
				queryParams.of !== "sharedIn" &&
				queryParams.of !== "offline" &&
				queryParams.of !== "trash" &&
				hasInternet &&
				!isUndecryptable
			) {
				if (isProUser && (item.type === "directory" || item.size > 0)) {
					items.push(
						createContextSubMenu(
							{
								title: t("drive.list.item.menu.share"),
								iOSItemSize: "large"
							},
							[
								createContextItem({
									actionKey: "publicLink",
									title: t("drive.list.item.menu.publicLink"),
									icon:
										Platform.OS === "ios"
											? {
													namingScheme: "sfSymbol",
													name: "link"
											  }
											: {
													namingScheme: "material",
													name: "link"
											  }
								}),
								createContextItem({
									actionKey: "share",
									title: t("drive.list.item.menu.share"),
									icon:
										Platform.OS === "ios"
											? {
													namingScheme: "sfSymbol",
													name: "square.and.arrow.up"
											  }
											: {
													namingScheme: "material",
													name: "send-outline"
											  }
								})
							]
						)
					)
				} else {
					items.push(
						createContextItem({
							actionKey: "share",
							title: t("drive.list.item.menu.share"),
							icon:
								Platform.OS === "ios"
									? {
											namingScheme: "sfSymbol",
											name: "square.and.arrow.up"
									  }
									: {
											namingScheme: "material",
											name: "send-outline"
									  }
						})
					)
				}
			}

			if (
				queryParams.of !== "sharedIn" &&
				queryParams.of !== "offline" &&
				queryParams.of !== "trash" &&
				hasInternet &&
				!isUndecryptable
			) {
				items.push(
					createContextItem({
						actionKey: item.favorited ? "unfavorite" : "favorite",
						title: t("drive.list.item.menu.favorite"),
						state: {
							checked: item.favorited
						},
						icon:
							Platform.OS === "ios"
								? {
										namingScheme: "sfSymbol",
										name: "heart"
								  }
								: {
										namingScheme: "material",
										name: "heart-outline"
								  }
					})
				)
			}

			if (queryParams.of !== "offline" && queryParams.of !== "trash" && hasInternet && !isUndecryptable) {
				if (item.type === "directory") {
					items.push(
						createContextItem({
							actionKey: "info",
							title: t("drive.list.item.menu.info"),
							icon:
								Platform.OS === "ios"
									? {
											namingScheme: "sfSymbol",
											name: "info.circle"
									  }
									: {
											namingScheme: "material",
											name: "information-outline"
									  }
						})
					)
				} else {
					if (queryParams.of === "sharedIn") {
						items.push(
							createContextItem({
								actionKey: "info",
								title: t("drive.list.item.menu.info"),
								icon:
									Platform.OS === "ios"
										? {
												namingScheme: "sfSymbol",
												name: "info.circle"
										  }
										: {
												namingScheme: "material",
												name: "information-outline"
										  }
							})
						)
					} else {
						items.push(
							createContextSubMenu(
								{
									title: t("drive.list.item.menu.info"),
									iOSItemSize: "large"
								},
								[
									createContextItem({
										actionKey: "info",
										title: t("drive.list.item.menu.properties"),
										icon:
											Platform.OS === "ios"
												? {
														namingScheme: "sfSymbol",
														name: "info.circle"
												  }
												: {
														namingScheme: "material",
														name: "information-outline"
												  }
									}),
									createContextItem({
										actionKey: "versionHistory",
										title: t("drive.list.item.menu.versionHistory"),
										icon:
											Platform.OS === "ios"
												? {
														namingScheme: "sfSymbol",
														name: "clock"
												  }
												: {
														namingScheme: "material",
														name: "clock-outline"
												  }
									})
								]
							)
						)
					}
				}
			}

			if (
				item.type === "directory" &&
				queryParams.of !== "sharedIn" &&
				queryParams.of !== "offline" &&
				queryParams.of !== "trash" &&
				hasInternet &&
				!isUndecryptable
			) {
				items.push(
					createContextItem({
						actionKey: "color",
						title: t("drive.list.item.menu.color"),
						icon:
							Platform.OS === "ios"
								? {
										namingScheme: "sfSymbol",
										name: "paintpalette"
								  }
								: {
										namingScheme: "material",
										name: "palette-outline"
								  }
					})
				)
			}

			if (
				queryParams.of !== "sharedIn" &&
				queryParams.of !== "offline" &&
				queryParams.of !== "trash" &&
				hasInternet &&
				!isUndecryptable
			) {
				items.push(
					createContextItem({
						actionKey: "rename",
						title: t("drive.list.item.menu.rename"),
						icon:
							Platform.OS === "ios"
								? {
										namingScheme: "sfSymbol",
										name: "pencil"
								  }
								: {
										namingScheme: "material",
										name: "pencil"
								  }
					})
				)
			}

			if (
				queryParams.of !== "sharedIn" &&
				queryParams.of !== "offline" &&
				queryParams.of !== "trash" &&
				hasInternet &&
				!isUndecryptable
			) {
				items.push(
					createContextItem({
						actionKey: "move",
						title: t("drive.list.item.menu.move"),
						icon:
							Platform.OS === "ios"
								? {
										namingScheme: "sfSymbol",
										name: "folder"
								  }
								: {
										namingScheme: "material",
										name: "folder-cog-outline"
								  }
					})
				)
			}

			if (queryParams.of === "sharedOut" && hasInternet) {
				items.push(
					createContextItem({
						actionKey: "removeSharedOut",
						title: t("drive.list.item.menu.removeSharedOut"),
						destructive: true,
						icon:
							Platform.OS === "ios"
								? {
										namingScheme: "sfSymbol",
										name: "delete.left",
										color: colors.destructive
								  }
								: {
										namingScheme: "material",
										name: "delete-off-outline",
										color: colors.destructive
								  }
					})
				)
			}

			if (queryParams.of === "links" && hasInternet) {
				items.push(
					createContextItem({
						actionKey: "disablePublicLink",
						title: t("drive.list.item.menu.disablePublicLink"),
						destructive: true,
						icon:
							Platform.OS === "ios"
								? {
										namingScheme: "sfSymbol",
										name: "link",
										color: colors.destructive
								  }
								: {
										namingScheme: "material",
										name: "link",
										color: colors.destructive
								  }
					})
				)
			}

			if (queryParams.of !== "offline" && queryParams.of !== "trash" && hasInternet) {
				if (queryParams.of !== "sharedIn") {
					items.push(
						createContextItem({
							actionKey: "trash",
							title: t("drive.list.item.menu.trash"),
							destructive: true,
							icon:
								Platform.OS === "ios"
									? {
											namingScheme: "sfSymbol",
											name: "trash",
											color: colors.destructive
									  }
									: {
											namingScheme: "material",
											name: "trash-can-outline",
											color: colors.destructive
									  }
						})
					)
				} else {
					items.push(
						createContextItem({
							actionKey: "removeSharedIn",
							title: t("drive.list.item.menu.removeSharedIn"),
							destructive: true,
							icon:
								Platform.OS === "ios"
									? {
											namingScheme: "sfSymbol",
											name: "delete.left",
											color: colors.destructive
									  }
									: {
											namingScheme: "material",
											name: "delete-off-outline",
											color: colors.destructive
									  }
						})
					)
				}
			}

			if (queryParams.of === "offline") {
				items.push(
					createContextItem({
						actionKey: "removeOffline",
						title: t("drive.list.item.menu.removeOffline"),
						destructive: true,
						icon:
							Platform.OS === "ios"
								? {
										namingScheme: "sfSymbol",
										name: "delete.left",
										color: colors.destructive
								  }
								: {
										namingScheme: "material",
										name: "delete-off-outline",
										color: colors.destructive
								  }
					})
				)
			}

			if (queryParams.of === "trash" && hasInternet) {
				if (!isUndecryptable) {
					items.push(
						createContextItem({
							actionKey: "restore",
							title: t("drive.list.item.menu.restore"),
							icon:
								Platform.OS === "ios"
									? {
											namingScheme: "sfSymbol",
											name: "repeat"
									  }
									: {
											namingScheme: "material",
											name: "repeat"
									  }
						})
					)
				}

				items.push(
					createContextItem({
						actionKey: "deletePermanently",
						title: t("drive.list.item.menu.deletePermanently"),
						destructive: true,
						icon:
							Platform.OS === "ios"
								? {
										namingScheme: "sfSymbol",
										name: "trash",
										color: colors.destructive
								  }
								: {
										namingScheme: "material",
										name: "trash-can-outline",
										color: colors.destructive
								  }
					})
				)
			}

			return items
		}, [
			offlineStatus,
			item,
			queryParams,
			t,
			isProUser,
			fromPreview,
			fromSearch,
			colors.destructive,
			hasInternet,
			isSelectedDrive,
			isSelectedPhotos,
			fromHome,
			isUndecryptable
		])

		const select = useCallback(() => {
			if (fromPhotos) {
				const isSelected = usePhotosStore.getState().selectedItems.some(i => i.uuid === item.uuid)

				usePhotosStore
					.getState()
					.setSelectedItems(prev =>
						isSelected ? prev.filter(i => i.uuid !== item.uuid) : [...prev.filter(i => i.uuid !== item.uuid), item]
					)

				return
			}

			const isSelected = useDriveStore.getState().selectedItems.some(i => i.uuid === item.uuid)

			useDriveStore
				.getState()
				.setSelectedItems(prev =>
					isSelected ? prev.filter(i => i.uuid !== item.uuid) : [...prev.filter(i => i.uuid !== item.uuid), item]
				)
		}, [item, fromPhotos])

		const openDirectory = useCallback(async () => {
			if (item.type !== "directory") {
				return
			}

			await hideSearchBarWithDelay(true)

			router.push({
				pathname: "/drive/[uuid]",
				params: {
					uuid: item.uuid
				}
			})
		}, [item.uuid, item.type, router])

		const publicLink = useCallback(() => {
			router.push({
				pathname: "/editPublicLink",
				params: {
					item: JSON.stringify(item)
				}
			})
		}, [router, item])

		const versionHistory = useCallback(() => {
			router.push({
				pathname: "/fileVersionHistory",
				params: {
					item: JSON.stringify(item)
				}
			})
		}, [item, router])

		const onItemPress = useCallback(
			async (contextItem: Omit<ContextItem, "icon">, _?: boolean) => {
				try {
					switch (contextItem.actionKey) {
						case "select": {
							select()

							break
						}

						case "openDirectory": {
							openDirectory()

							break
						}

						case "copyId": {
							await driveService.copyItemUUID({
								item
							})

							break
						}

						case "copyPath": {
							await driveService.copyItemPath({
								item
							})

							break
						}

						case "rename": {
							await driveService.renameItem({
								item,
								queryParams
							})

							break
						}

						case "color": {
							await driveService.changeDirectoryColor({
								item,
								queryParams
							})

							break
						}

						case "info": {
							await driveService.showItemInfo(item)

							break
						}

						case "favorite": {
							await driveService.toggleItemFavorite({
								item,
								queryParams
							})

							break
						}

						case "unfavorite": {
							await driveService.toggleItemFavorite({
								item,
								queryParams
							})

							break
						}

						case "share": {
							await driveService.shareItem({
								item
							})

							break
						}

						case "export": {
							await driveService.exportItem({
								item
							})

							break
						}

						case "trash": {
							await driveService.trashItem({
								item,
								queryParams,
								fromPreview
							})

							break
						}

						case "move": {
							await driveService.moveItem({
								item,
								queryParams,
								dismissHref: pathname
							})

							break
						}

						case "publicLink": {
							publicLink()

							break
						}

						case "download": {
							await driveService.downloadItem({
								item,
								disableLoader: true
							})

							break
						}

						case "makeOffline": {
							await driveService.toggleItemOffline({
								item,
								disableLoader: true,
								offline: true
							})

							break
						}

						case "removeOffline": {
							await driveService.toggleItemOffline({
								item,
								offline: false
							})

							break
						}

						case "saveToGallery": {
							await driveService.saveItemToGallery({
								item
							})

							break
						}

						case "versionHistory": {
							versionHistory()

							break
						}

						case "removeSharedIn": {
							await driveService.removeItemSharedIn({
								item,
								queryParams
							})

							break
						}

						case "removeSharedOut": {
							await driveService.removeItemSharedOut({
								item,
								queryParams
							})

							break
						}

						case "deletePermanently": {
							await driveService.deleteItemPermanently({
								item,
								queryParams
							})

							break
						}

						case "restore": {
							await driveService.restoreItem({
								item,
								queryParams
							})

							break
						}

						case "disablePublicLink": {
							await driveService.disableItemPublicLink({
								item,
								queryParams
							})

							break
						}
					}
				} catch (e) {
					console.error(e)

					if (e instanceof Error) {
						alerts.error(e.message)
					}
				}
			},
			[select, openDirectory, item, queryParams, fromPreview, pathname, publicLink, versionHistory]
		)

		const iosRenderPreview = useCallback(() => {
			if (!item.thumbnail) {
				return <Fragment />
			}

			return (
				<View
					className="flex-row items-center justify-center bg-background"
					style={{
						width: Math.floor(screen.width - 32),
						height: Math.floor(screen.height / 3)
					}}
				>
					<TurboImage
						className="rounded-lg"
						source={{
							uri: item.thumbnail
						}}
						resizeMode="contain"
						style={{
							width: "100%",
							height: "100%"
						}}
						placeholder={{
							blurhash: assets.blurhash.images.fallback
						}}
					/>
				</View>
			)
		}, [item.thumbnail, screen])

		const contextKey = useMemo(() => {
			return hasInternet ? `${isPortrait}:${isTablet}` : undefined
		}, [hasInternet, isPortrait, isTablet])

		if (menuItems.length === 0) {
			return children
		}

		if (type === "context") {
			return (
				<ContextMenu
					items={menuItems}
					onItemPress={onItemPress}
					key={contextKey}
					iosRenderPreview={
						!fromPreview && item.type === "file" && item.thumbnail && (isPortrait || isTablet) && hasInternet
							? iosRenderPreview
							: undefined
					}
				>
					{children}
				</ContextMenu>
			)
		}

		return (
			<DropdownMenu
				items={menuItems}
				onItemPress={onItemPress}
			>
				{children}
			</DropdownMenu>
		)
	}
)

Menu.displayName = "Menu"

export default Menu
