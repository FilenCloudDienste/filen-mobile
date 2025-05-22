import { memo, useState, Fragment, useMemo, useCallback } from "react"
import { Button } from "@/components/nativewindui/Button"
import { LargeTitleHeader } from "@/components/nativewindui/LargeTitleHeader"
import { DropdownMenu } from "@/components/nativewindui/DropdownMenu"
import { createDropdownItem, createDropdownSubMenu } from "@/components/nativewindui/DropdownMenu/utils"
import { useColorScheme } from "@/lib/useColorScheme"
import { Platform, RefreshControl, View, FlatList, ActivityIndicator } from "react-native"
import { cn } from "@/lib/cn"
import { Icon } from "@roninoss/icons"
import useCloudItemsQuery from "@/queries/useCloudItemsQuery"
import Avatar from "../avatar"
import useBottomListContainerPadding from "@/hooks/useBottomListContainerPadding"
import { Container } from "@/components/Container"
import { useRouter } from "expo-router"
import ContainerComponent from "./container"
import { orderItemsByType } from "@/lib/utils"
import useAccountQuery from "@/queries/useAccountQuery"
import * as BackgroundTask from "expo-background-task"
import { FLATLIST_BASE_PROPS } from "@/lib/constants"

export const Home = memo(() => {
	const { colors } = useColorScheme()
	const [refreshing, setRefreshing] = useState<boolean>(false)
	const bottomListContainerPadding = useBottomListContainerPadding()
	const router = useRouter()

	const recents = useCloudItemsQuery({
		parent: "recents",
		of: "recents",
		receiverId: 0
	})

	const favorites = useCloudItemsQuery({
		parent: "favorites",
		of: "favorites",
		receiverId: 0
	})

	const links = useCloudItemsQuery({
		parent: "links",
		of: "links",
		receiverId: 0
	})

	const sharedIn = useCloudItemsQuery({
		parent: "shared-in",
		of: "sharedIn",
		receiverId: 0
	})

	const sharedOut = useCloudItemsQuery({
		parent: "shared-out",
		of: "sharedOut",
		receiverId: 0
	})

	const offline = useCloudItemsQuery({
		parent: "offline",
		of: "offline",
		receiverId: 0
	})

	const trash = useCloudItemsQuery({
		parent: "trash",
		of: "trash",
		receiverId: 0
	})

	const account = useAccountQuery({})

	const recentsItems = useMemo(() => {
		return recents.isSuccess
			? orderItemsByType({
					items: recents.data.filter(item => item.type === "file").slice(0, 12),
					type: "uploadDateDesc"
			  })
			: []
	}, [recents.isSuccess, recents.data])

	const favoritesItems = useMemo(() => {
		return favorites.isSuccess
			? orderItemsByType({
					items: favorites.data.filter(item => item.type === "file").slice(0, 12),
					type: "lastModifiedDesc"
			  })
			: []
	}, [favorites.isSuccess, favorites.data])

	const linksItems = useMemo(() => {
		return links.isSuccess
			? orderItemsByType({
					items: links.data.slice(0, 12),
					type: "lastModifiedDesc"
			  })
			: []
	}, [links.isSuccess, links.data])

	const sharedInItems = useMemo(() => {
		return sharedIn.isSuccess
			? orderItemsByType({
					items: sharedIn.data.slice(0, 12),
					type: "lastModifiedDesc"
			  })
			: []
	}, [sharedIn.isSuccess, sharedIn.data])

	const sharedOutItems = useMemo(() => {
		return sharedOut.isSuccess
			? orderItemsByType({
					items: sharedOut.data.slice(0, 12),
					type: "lastModifiedDesc"
			  })
			: []
	}, [sharedOut.isSuccess, sharedOut.data])

	const offlineItems = useMemo(() => {
		return offline.isSuccess
			? orderItemsByType({
					items: offline.data.slice(0, 12),
					type: "lastModifiedDesc"
			  })
			: []
	}, [offline.isSuccess, offline.data])

	const trashItems = useMemo(() => {
		return trash.isSuccess
			? orderItemsByType({
					items: trash.data.slice(0, 12),
					type: "lastModifiedDesc"
			  })
			: []
	}, [trash.isSuccess, trash.data])

	const openSettings = useCallback(() => {
		router.push({
			pathname: "/home/settings"
		})
	}, [router])

	const loadDone = useMemo(() => {
		return (
			recents.isSuccess &&
			links.isSuccess &&
			account.isSuccess &&
			trash.isSuccess &&
			sharedIn.isSuccess &&
			sharedOut.isSuccess &&
			offline.isSuccess &&
			favorites.isSuccess
		)
	}, [
		recents.isSuccess,
		links.isSuccess,
		account.isSuccess,
		trash.isSuccess,
		sharedIn.isSuccess,
		sharedOut.isSuccess,
		offline.isSuccess,
		favorites.isSuccess
	])

	const avatarSource = useMemo(() => {
		if (account.status !== "success" || !account.data.account.avatarURL || !account.data.account.avatarURL.startsWith("https://")) {
			return {
				uri: "avatar_fallback"
			}
		}

		return {
			uri: account.data.account.avatarURL
		}
	}, [account.data, account.status])

	return (
		<Fragment>
			<LargeTitleHeader
				title="Home"
				backVisible={false}
				materialPreset="stack"
				leftView={
					account.isSuccess
						? () => {
								return (
									<View className="flex flex-row items-center">
										<Button
											variant="plain"
											size="icon"
											onPress={openSettings}
										>
											<Avatar
												source={avatarSource}
												style={{
													width: 24,
													height: 24
												}}
											/>
										</Button>
									</View>
								)
						  }
						: undefined
				}
				rightView={() => (
					<View>
						<DropdownMenu
							items={[
								createDropdownItem({
									actionKey: "first",
									title: "Item 1"
								}),
								createDropdownItem({
									actionKey: "item2",
									title: "Item 1"
								}),
								createDropdownItem({
									actionKey: "trackPlayer",
									title: "trackPlayer"
								}),
								createDropdownSubMenu(
									{
										title: "Submenu 1",
										iOSItemSize: "large"
									},
									[
										createDropdownItem({
											actionKey: "sub-first",
											title: "Sub Item 1"
										}),
										createDropdownItem({
											actionKey: "sub-second",
											title: "Sub Item 2"
										})
									]
								)
							]}
							onItemPress={item => {
								console.log("Item Pressed", item)

								if (item.actionKey === "first") {
									router.push("/_sitemap")
								}

								if (item.actionKey === "trackPlayer") {
									router.push("/trackPlayer")
								}

								if (item.actionKey === "item2") {
									BackgroundTask.triggerTaskWorkerForTestingAsync().then(console.log).catch(console.error)
								}
							}}
						>
							<Button
								variant="plain"
								size="icon"
							>
								<Icon
									size={24}
									namingScheme="sfSymbol"
									name="ellipsis.circle"
									color={colors.foreground}
								/>
							</Button>
						</DropdownMenu>
					</View>
				)}
			/>
			<Container>
				{!loadDone ? (
					<View className="flex-1 flex-row items-center justify-center">
						<ActivityIndicator color={colors.foreground} />
					</View>
				) : (
					<FlatList
						{...FLATLIST_BASE_PROPS}
						data={["recents", "favorites", "links", "sharedIn", "sharedOut", "offline", "trash", "bottom"] as const}
						contentInsetAdjustmentBehavior="automatic"
						contentContainerClassName={cn("pt-2", Platform.OS === "ios" && "pt-4")}
						contentContainerStyle={{
							paddingBottom: bottomListContainerPadding
						}}
						showsVerticalScrollIndicator={false}
						showsHorizontalScrollIndicator={false}
						keyExtractor={(_, index) => index.toString()}
						refreshControl={
							<RefreshControl
								refreshing={refreshing}
								onRefresh={async () => {
									setRefreshing(true)

									await Promise.all([
										recents.refetch(),
										favorites.refetch(),
										links.refetch(),
										sharedIn.refetch(),
										sharedOut.refetch(),
										offline.refetch(),
										trash.refetch(),
										account.refetch()
									]).catch(console.error)

									setRefreshing(false)
								}}
							/>
						}
						renderItem={({ item }) => {
							if (item === "bottom") {
								return <View className="w-full flex-1 h-8" />
							}

							if (item === "recents") {
								return (
									<ContainerComponent
										type="recents"
										items={recentsItems}
									/>
								)
							}

							if (item === "favorites") {
								return (
									<ContainerComponent
										type="favorites"
										items={favoritesItems}
									/>
								)
							}

							if (item === "links") {
								return (
									<ContainerComponent
										type="links"
										items={linksItems}
									/>
								)
							}

							if (item === "sharedIn") {
								return (
									<ContainerComponent
										type="sharedIn"
										items={sharedInItems}
									/>
								)
							}

							if (item === "sharedOut") {
								return (
									<ContainerComponent
										type="sharedOut"
										items={sharedOutItems}
									/>
								)
							}

							if (item === "offline") {
								return (
									<ContainerComponent
										type="offline"
										items={offlineItems}
									/>
								)
							}

							if (item === "trash") {
								return (
									<ContainerComponent
										type="trash"
										items={trashItems}
									/>
								)
							}

							return null
						}}
					/>
				)}
			</Container>
		</Fragment>
	)
})

Home.displayName = "Home"

export default Home
