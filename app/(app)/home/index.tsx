import Avatar from "@/components/avatar"
import { Container } from "@/components/Container"
import Transfers from "@/components/drive/header/transfers"
import ContainerComponent from "@/components/home/container"
import Dropdown from "@/components/home/header/dropdown"
import { ActivityIndicator } from "@/components/nativewindui/ActivityIndicator"
import { Button } from "@/components/nativewindui/Button"
import OfflineListHeader from "@/components/offlineListHeader"
import useIsProUser from "@/hooks/useIsProUser"
import useNetInfo from "@/hooks/useNetInfo"
import alerts from "@/lib/alerts"
import assets from "@/lib/assets"
import { foregroundCameraUpload } from "@/lib/cameraUpload"
import { cn } from "@/lib/cn"
import { useColorScheme } from "@/lib/useColorScheme"
import { orderItemsByType } from "@/lib/utils"
import useAccountQuery from "@/queries/useAccount.query"
import useDriveItemsQuery from "@/queries/useDriveItems.query"
import { useDriveStore } from "@/stores/drive.store"
import { Icon } from "@roninoss/icons"
import { Stack, useFocusEffect, useRouter } from "expo-router"
import { Fragment, memo, useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Platform, RefreshControl, ScrollView, View } from "react-native"

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
	const isProUser = useIsProUser()

	const recentsQuery = useDriveItemsQuery({
		parent: "recents",
		of: "recents",
		receiverId: 0
	})

	const favoritesQuery = useDriveItemsQuery({
		parent: "favorites",
		of: "favorites",
		receiverId: 0
	})

	const linksQuery = useDriveItemsQuery(
		{
			parent: "links",
			of: "links",
			receiverId: 0
		},
		{
			enabled: isProUser
		}
	)

	const sharedInQuery = useDriveItemsQuery({
		parent: "shared-in",
		of: "sharedIn",
		receiverId: 0
	})

	const sharedOutQuery = useDriveItemsQuery({
		parent: "shared-out",
		of: "sharedOut",
		receiverId: 0
	})

	const offlineQuery = useDriveItemsQuery({
		parent: "offline",
		of: "offline",
		receiverId: 0
	})

	const trashQuery = useDriveItemsQuery({
		parent: "trash",
		of: "trash",
		receiverId: 0
	})

	const accountQuery = useAccountQuery()

	const recentsItems = useMemo(() => {
		return recentsQuery.status === "success"
			? orderItemsByType({
					items: recentsQuery.data.filter(item => item.type === "file").slice(0, 12),
					type: "uploadDateDesc"
			  })
			: []
	}, [recentsQuery.status, recentsQuery.data])

	const favoritesItems = useMemo(() => {
		return favoritesQuery.status === "success"
			? orderItemsByType({
					items: favoritesQuery.data.slice(0, 12),
					type: "lastModifiedDesc"
			  })
			: []
	}, [favoritesQuery.status, favoritesQuery.data])

	const linksItems = useMemo(() => {
		if (!isProUser) {
			return []
		}

		return linksQuery.status === "success"
			? orderItemsByType({
					items: linksQuery.data.slice(0, 12),
					type: "lastModifiedDesc"
			  })
			: []
	}, [linksQuery.status, linksQuery.data, isProUser])

	const sharedInItems = useMemo(() => {
		return sharedInQuery.status === "success"
			? orderItemsByType({
					items: sharedInQuery.data.slice(0, 12),
					type: "lastModifiedDesc"
			  })
			: []
	}, [sharedInQuery.status, sharedInQuery.data])

	const sharedOutItems = useMemo(() => {
		return sharedOutQuery.status === "success"
			? orderItemsByType({
					items: sharedOutQuery.data.slice(0, 12),
					type: "lastModifiedDesc"
			  })
			: []
	}, [sharedOutQuery.status, sharedOutQuery.data])

	const offlineItems = useMemo(() => {
		return offlineQuery.status === "success"
			? orderItemsByType({
					items: offlineQuery.data.slice(0, 12),
					type: "lastModifiedDesc"
			  })
			: []
	}, [offlineQuery.status, offlineQuery.data])

	const trashItems = useMemo(() => {
		return trashQuery.status === "success"
			? orderItemsByType({
					items: trashQuery.data.slice(0, 12),
					type: "lastModifiedDesc"
			  })
			: []
	}, [trashQuery.status, trashQuery.data])

	const openSettings = useCallback(() => {
		router.push({
			pathname: "/(app)/home/settings"
		})
	}, [router])

	const avatarSource = useMemo(() => {
		if (
			accountQuery.status !== "success" ||
			!accountQuery.data.account.avatarURL ||
			!accountQuery.data.account.avatarURL.startsWith("https://")
		) {
			return {
				uri: assets.uri.images.avatar_fallback()
			}
		}

		return {
			uri: accountQuery.data.account.avatarURL
		}
	}, [accountQuery.data, accountQuery.status])

	const headerLeftView = useMemo(() => {
		return accountQuery.status === "success" && hasInternet
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
	}, [accountQuery.status, hasInternet, avatarSource, openSettings])

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
				recentsQuery.refetch(),
				favoritesQuery.refetch(),
				isProUser ? linksQuery.refetch() : Promise.resolve(),
				sharedInQuery.refetch(),
				sharedOutQuery.refetch(),
				offlineQuery.refetch(),
				trashQuery.refetch(),
				accountQuery.refetch()
			])
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}
		} finally {
			setRefreshing(false)
		}
	}, [recentsQuery, favoritesQuery, linksQuery, sharedInQuery, sharedOutQuery, offlineQuery, trashQuery, accountQuery, isProUser])

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
		return [
			...(recentsQuery.status === "success" ? ["recents"] : []),
			...(favoritesQuery.status === "success" ? ["favorites"] : []),
			...(isProUser && linksQuery.status === "success" ? ["links"] : []),
			...(sharedInQuery.status === "success" ? ["sharedIn"] : []),
			...(sharedOutQuery.status === "success" ? ["sharedOut"] : []),
			...(offlineQuery.status === "success" ? ["offline"] : []),
			...(hasInternet && trashQuery.status === "success" ? ["trash"] : []),
			"bottom"
		].map(type => {
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
		})
	}, [
		hasInternet,
		recentsItems,
		favoritesItems,
		linksItems,
		sharedInItems,
		sharedOutItems,
		offlineItems,
		trashItems,
		isProUser,
		recentsQuery.status,
		favoritesQuery.status,
		linksQuery.status,
		sharedInQuery.status,
		sharedOutQuery.status,
		offlineQuery.status,
		trashQuery.status
	])

	useEffect(() => {
		foregroundCameraUpload.run().catch(console.error)
	}, [])

	useFocusEffect(
		useCallback(() => {
			useDriveStore.getState().setSelectedItems([])
		}, [])
	)

	return (
		<Fragment>
			<Stack.Screen
				options={{
					title: t("home.title"),
					headerLargeTitle: true,
					headerShown: true,
					headerTransparent: Platform.select({
						ios: true,
						android: false,
						default: false
					}),
					headerBlurEffect: "systemChromeMaterial",
					headerLeft: () => (headerLeftView ? headerLeftView() : null),
					headerRight: headerRightView
				}}
			/>
			<Container>
				<ScrollView
					contentInsetAdjustmentBehavior="automatic"
					contentContainerClassName={cn("pt-2", Platform.OS === "ios" && "pt-4")}
					contentContainerStyle={contentContainerStyle}
					showsVerticalScrollIndicator={false}
					showsHorizontalScrollIndicator={false}
					refreshControl={refreshControl}
				>
					{!hasInternet && <OfflineListHeader className="mb-4" />}
					{items.length > 1 ? (
						items
					) : (
						<View className="flex flex-1 justify-center items-center mt-32">
							<ActivityIndicator
								size="small"
								color={colors.foreground}
							/>
						</View>
					)}
				</ScrollView>
			</Container>
		</Fragment>
	)
})

Home.displayName = "Home"

export default Home
