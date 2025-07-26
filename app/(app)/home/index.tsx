import { memo, useState, Fragment, useMemo, useCallback } from "react"
import { Button } from "@/components/nativewindui/Button"
import { LargeTitleHeader } from "@/components/nativewindui/LargeTitleHeader"
import { useColorScheme } from "@/lib/useColorScheme"
import { Platform, RefreshControl, View, ActivityIndicator, ScrollView } from "react-native"
import { cn } from "@/lib/cn"
import useCloudItemsQuery from "@/queries/useCloudItemsQuery"
import Avatar from "@/components/avatar"
import { Container } from "@/components/Container"
import { useRouter } from "expo-router"
import { orderItemsByType } from "@/lib/utils"
import useAccountQuery from "@/queries/useAccountQuery"
import { Icon } from "@roninoss/icons"
import Transfers from "@/components/drive/header/transfers"
import alerts from "@/lib/alerts"
import useNetInfo from "@/hooks/useNetInfo"
import OfflineListHeader from "@/components/offlineListHeader"
import ContainerComponent from "@/components/home/container"
import { useTranslation } from "react-i18next"
import Dropdown from "@/components/home/header/dropdown"

const contentContainerStyle = {
	paddingBottom: 100
}

export type ItemType = "recents" | "favorites" | "links" | "sharedIn" | "sharedOut" | "offline" | "trash" | "bottom"

export const Item = memo(({ type, items }: { type: ItemType; items: DriveCloudItem[] }) => {
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
				items={items}
			/>
		)
	}

	if (type === "favorites") {
		return (
			<ContainerComponent
				key={type}
				type="favorites"
				items={items}
			/>
		)
	}

	if (type === "links") {
		return (
			<ContainerComponent
				key={type}
				type="links"
				items={items}
			/>
		)
	}

	if (type === "sharedIn") {
		return (
			<ContainerComponent
				key={type}
				type="sharedIn"
				items={items}
			/>
		)
	}

	if (type === "sharedOut") {
		return (
			<ContainerComponent
				key={type}
				type="sharedOut"
				items={items}
			/>
		)
	}

	if (type === "offline") {
		return (
			<ContainerComponent
				key={type}
				type="offline"
				items={items}
			/>
		)
	}

	if (type === "trash") {
		return (
			<ContainerComponent
				key={type}
				type="trash"
				items={items}
			/>
		)
	}

	return null
})

Item.displayName = "Item"

export const Home = memo(() => {
	const { colors } = useColorScheme()
	const [refreshing, setRefreshing] = useState<boolean>(false)
	const router = useRouter()
	const { hasInternet } = useNetInfo()
	const { t } = useTranslation()

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
		return recents.status === "success"
			? orderItemsByType({
					items: recents.data.filter(item => item.type === "file").slice(0, 12),
					type: "uploadDateDesc"
			  })
			: []
	}, [recents.status, recents.data])

	const favoritesItems = useMemo(() => {
		return favorites.status === "success"
			? orderItemsByType({
					items: favorites.data.filter(item => item.type === "file").slice(0, 12),
					type: "lastModifiedDesc"
			  })
			: []
	}, [favorites.status, favorites.data])

	const linksItems = useMemo(() => {
		return links.status === "success"
			? orderItemsByType({
					items: links.data.slice(0, 12),
					type: "lastModifiedDesc"
			  })
			: []
	}, [links.status, links.data])

	const sharedInItems = useMemo(() => {
		return sharedIn.status === "success"
			? orderItemsByType({
					items: sharedIn.data.slice(0, 12),
					type: "lastModifiedDesc"
			  })
			: []
	}, [sharedIn.status, sharedIn.data])

	const sharedOutItems = useMemo(() => {
		return sharedOut.status === "success"
			? orderItemsByType({
					items: sharedOut.data.slice(0, 12),
					type: "lastModifiedDesc"
			  })
			: []
	}, [sharedOut.status, sharedOut.data])

	const offlineItems = useMemo(() => {
		return offline.status === "success"
			? orderItemsByType({
					items: offline.data.slice(0, 12),
					type: "lastModifiedDesc"
			  })
			: []
	}, [offline.status, offline.data])

	const trashItems = useMemo(() => {
		return trash.status === "success"
			? orderItemsByType({
					items: trash.data.slice(0, 12),
					type: "lastModifiedDesc"
			  })
			: []
	}, [trash.status, trash.data])

	const openSettings = useCallback(() => {
		router.push({
			pathname: "/(app)/home/settings"
		})
	}, [router])

	const loadDone = useMemo(() => {
		return (
			recents.status === "success" &&
			links.status === "success" &&
			account.status === "success" &&
			trash.status === "success" &&
			sharedIn.status === "success" &&
			sharedOut.status === "success" &&
			offline.status === "success" &&
			favorites.status === "success"
		)
	}, [recents.status, links.status, account.status, trash.status, sharedIn.status, sharedOut.status, offline.status, favorites.status])

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

	const headerLeftView = useMemo(() => {
		return account.status === "success" && hasInternet
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
	}, [account.status, hasInternet, avatarSource, openSettings])

	const headerRightView = useCallback(() => {
		return (
			<View className="flex-row items-center">
				{hasInternet && (
					<Fragment>
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
					</Fragment>
				)}
				<Dropdown />
			</View>
		)
	}, [hasInternet, router, colors.primary])

	const onRefresh = useCallback(async () => {
		setRefreshing(true)

		try {
			await Promise.all([
				recents.refetch(),
				favorites.refetch(),
				links.refetch(),
				sharedIn.refetch(),
				sharedOut.refetch(),
				offline.refetch(),
				trash.refetch(),
				account.refetch()
			])
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}
		} finally {
			setRefreshing(false)
		}
	}, [recents, favorites, links, sharedIn, sharedOut, offline, trash, account])

	const refreshControl = useMemo(() => {
		if (!hasInternet) {
			return undefined
		}

		return (
			<RefreshControl
				refreshing={refreshing}
				onRefresh={onRefresh}
			/>
		)
	}, [refreshing, onRefresh, hasInternet])

	const items = useMemo(() => {
		return ["recents", "favorites", "links", "sharedIn", "sharedOut", "offline", ...(hasInternet ? ["trash"] : []), "bottom"].map(
			type => {
				return (
					<Item
						key={type}
						type={type as unknown as ItemType}
						items={
							type === "recents"
								? recentsItems
								: type === "favorites"
								? favoritesItems
								: type === "links"
								? linksItems
								: type === "sharedIn"
								? sharedInItems
								: type === "sharedOut"
								? sharedOutItems
								: type === "offline"
								? offlineItems
								: type === "trash"
								? trashItems
								: []
						}
					/>
				)
			}
		)
	}, [hasInternet, recentsItems, favoritesItems, linksItems, sharedInItems, sharedOutItems, offlineItems, trashItems])

	return (
		<Fragment>
			<LargeTitleHeader
				title={t("home.title")}
				backVisible={false}
				materialPreset="stack"
				leftView={headerLeftView}
				rightView={headerRightView}
			/>
			<Container>
				{!loadDone ? (
					<View className="flex-1 flex-row items-center justify-center">
						<ActivityIndicator
							color={colors.foreground}
							size="small"
						/>
					</View>
				) : (
					<ScrollView
						contentInsetAdjustmentBehavior="automatic"
						contentContainerClassName={cn("pt-2", Platform.OS === "ios" && "pt-4")}
						contentContainerStyle={contentContainerStyle}
						showsVerticalScrollIndicator={false}
						showsHorizontalScrollIndicator={false}
						refreshControl={refreshControl}
					>
						{!hasInternet && <OfflineListHeader className="mb-4" />}
						{items}
					</ScrollView>
				)}
			</Container>
		</Fragment>
	)
})

Home.displayName = "Home"

export default Home
