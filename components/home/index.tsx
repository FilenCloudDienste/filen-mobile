import { memo, useState, Fragment, useMemo, useCallback } from "react"
import { Button } from "@/components/nativewindui/Button"
import { LargeTitleHeader } from "@/components/nativewindui/LargeTitleHeader"
import { useColorScheme } from "@/lib/useColorScheme"
import { Platform, RefreshControl, View, ActivityIndicator, ScrollView } from "react-native"
import { cn } from "@/lib/cn"
import useCloudItemsQuery from "@/queries/useCloudItemsQuery"
import Avatar from "../avatar"
import { Container } from "@/components/Container"
import { useRouter } from "expo-router"
import ContainerComponent from "./container"
import { orderItemsByType } from "@/lib/utils"
import useAccountQuery from "@/queries/useAccountQuery"
import { Icon } from "@roninoss/icons"
import Transfers from "../drive/header/transfers"

export const Home = memo(() => {
	const { colors } = useColorScheme()
	const [refreshing, setRefreshing] = useState<boolean>(false)
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
			pathname: "/(app)/home/settings"
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
					account.status === "success"
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
				rightView={() => {
					return (
						<View className="flex-row items-center">
							<Transfers />
							<Button
								variant="plain"
								size="icon"
								onPress={() => {
									router.push({
										pathname: "/trackPlayer"
									})
								}}
							>
								<Icon
									name="music-note"
									size={24}
									color={colors.primary}
								/>
							</Button>
						</View>
					)
				}}
			/>
			<Container>
				{!loadDone ? (
					<View className="flex-1 flex-row items-center justify-center">
						<ActivityIndicator color={colors.foreground} />
					</View>
				) : (
					<ScrollView
						contentInsetAdjustmentBehavior="automatic"
						contentContainerClassName={cn("pt-2", Platform.OS === "ios" && "pt-4")}
						contentContainerStyle={{
							paddingBottom: 100
						}}
						showsVerticalScrollIndicator={false}
						showsHorizontalScrollIndicator={false}
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
					>
						{(["recents", "favorites", "links", "sharedIn", "sharedOut", "offline", "trash", "bottom"] as const).map(type => {
							if (type === "bottom") {
								return (
									<View
										key={type}
										className="w-full flex-1 h-8"
									/>
								)
							}

							if (type === "recents") {
								return (
									<ContainerComponent
										key={type}
										type="recents"
										items={recentsItems}
									/>
								)
							}

							if (type === "favorites") {
								return (
									<ContainerComponent
										key={type}
										type="favorites"
										items={favoritesItems}
									/>
								)
							}

							if (type === "links") {
								return (
									<ContainerComponent
										key={type}
										type="links"
										items={linksItems}
									/>
								)
							}

							if (type === "sharedIn") {
								return (
									<ContainerComponent
										key={type}
										type="sharedIn"
										items={sharedInItems}
									/>
								)
							}

							if (type === "sharedOut") {
								return (
									<ContainerComponent
										key={type}
										type="sharedOut"
										items={sharedOutItems}
									/>
								)
							}

							if (type === "offline") {
								return (
									<ContainerComponent
										key={type}
										type="offline"
										items={offlineItems}
									/>
								)
							}

							if (type === "trash") {
								return (
									<ContainerComponent
										key={type}
										type="trash"
										items={trashItems}
									/>
								)
							}

							return null
						})}
					</ScrollView>
				)}
			</Container>
		</Fragment>
	)
})

Home.displayName = "Home"

export default Home
