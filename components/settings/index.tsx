import { Icon, MaterialIconName } from "@roninoss/icons"
import { View } from "react-native"
import { memo, Fragment, useCallback } from "react"
import { LargeTitleHeader } from "@/components/nativewindui/LargeTitleHeader"
import { ESTIMATED_ITEM_HEIGHT, List, ListDataItem, ListItem, ListSectionHeader } from "@/components/nativewindui/List"
import { Text } from "@/components/nativewindui/Text"
import { cn } from "@/lib/cn"
import { useColorScheme } from "@/lib/useColorScheme"
import { type ListRenderItemInfo } from "@shopify/flash-list"
import { Container } from "../Container"

export type SettingsItem =
	| {
			id: string
			title: string
			subTitle?: string
			leftView?: React.ReactNode
			rightView?: React.ReactNode
			rightText?: string
			badge?: number
			onPress?: () => void
	  }
	| string

export const ChevronRight = memo(() => {
	const { colors } = useColorScheme()

	return (
		<Icon
			name="chevron-right"
			size={17}
			color={colors.grey}
		/>
	)
})

ChevronRight.displayName = "ChevronRight"

export const IconView = memo(({ className, name }: { className?: string; name: MaterialIconName }) => {
	return (
		<View className={cn("h-6 w-6 items-center justify-center rounded-md", className)}>
			<Icon
				name={name}
				size={15}
				color="white"
			/>
		</View>
	)
})

IconView.displayName = "IconView"

export const Settings = memo(
	({
		items,
		title,
		showSearchBar,
		hideHeader
	}: {
		items: SettingsItem[]
		title: string
		showSearchBar: boolean
		hideHeader?: boolean
	}) => {
		const keyExtractor = useCallback((item: (Omit<ListDataItem, string> & { id: string }) | string) => {
			return typeof item === "string" ? item : item.id
		}, [])

		const renderItem = useCallback((info: ListRenderItemInfo<SettingsItem>) => {
			if (typeof info.item === "string") {
				return <ListSectionHeader {...info} />
			}

			return (
				<ListItem
					className={cn("ios:pl-0 pl-2", info.index === 0 && "ios:border-t-0 border-border/25 dark:border-border/80 border-t")}
					innerClassName="py-1.5 ios:py-1.5 android:py-1.5"
					titleClassName="text-lg"
					leftView={
						info.item.leftView ? <View className="flex-1 flex-row items-center px-4">{info.item.leftView}</View> : undefined
					}
					rightView={
						info.item.rightView ? (
							<View className="flex-1 flex-row items-center justify-center gap-2 px-4">{info.item.rightView}</View>
						) : (
							<View className="flex-1 flex-row items-center justify-center gap-2 px-4">
								{info.item.rightText && (
									<Text
										variant="callout"
										className="ios:px-0 text-muted-foreground px-2"
										numberOfLines={1}
									>
										{info.item.rightText}
									</Text>
								)}
								{info.item.badge && (
									<View className="bg-destructive h-5 w-5 items-center justify-center rounded-full">
										<Text
											variant="footnote"
											className="text-destructive-foreground font-bold leading-4"
											numberOfLines={1}
										>
											{info.item.badge}
										</Text>
									</View>
								)}
								<ChevronRight />
							</View>
						)
					}
					onPress={info.item.onPress}
					{...info}
				/>
			)
		}, [])

		return (
			<Fragment>
				{!hideHeader && (
					<LargeTitleHeader
						title={title}
						searchBar={
							showSearchBar
								? {
										iosHideWhenScrolling: true
								  }
								: undefined
						}
					/>
				)}
				<Container>
					<List
						contentContainerClassName="pt-4 pb-20"
						contentInsetAdjustmentBehavior="automatic"
						variant="insets"
						data={items}
						estimatedItemSize={ESTIMATED_ITEM_HEIGHT.titleOnly}
						renderItem={renderItem}
						keyExtractor={keyExtractor}
						sectionHeaderAsGap={true}
						drawDistance={ESTIMATED_ITEM_HEIGHT.titleOnly * 3}
					/>
				</Container>
			</Fragment>
		)
	}
)

Settings.displayName = "Settings"
