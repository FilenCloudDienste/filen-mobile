import { Icon, MaterialIconName } from "@roninoss/icons"
import { View, ActivityIndicator } from "react-native"
import { memo, Fragment, useCallback } from "react"
import { LargeTitleHeader } from "@/components/nativewindui/LargeTitleHeader"
import { List, ListDataItem, ListItem, ListSectionHeader, type ListRenderItemInfo } from "@/components/nativewindui/List"
import { Text } from "@/components/nativewindui/Text"
import { cn } from "@/lib/cn"
import { useColorScheme } from "@/lib/useColorScheme"
import { type SettingsItem, type SettingsProps } from "."

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

export const Settings = memo((props: SettingsProps) => {
	const { colors } = useColorScheme()

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
				innerClassName={cn("py-2 ios:py-2 android:py-2", info.item.destructive && "text-destructive")}
				titleClassName={cn("text-lg", info.item.destructive && "text-destructive")}
				leftView={info.item.leftView ? <View className="flex-1 flex-row items-center px-4">{info.item.leftView}</View> : undefined}
				rightView={
					info.item.rightView ? (
						<View className="flex-1 flex-row items-center justify-center gap-2 px-4">{info.item.rightView}</View>
					) : (
						<View className="flex-1 flex-row items-center justify-center gap-2 px-4">
							{info.item.rightText && (
								<Text
									variant="callout"
									className="ios:px-0 text-muted-foreground px-2 max-w-[100px] font-normal"
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
			{!props.hideHeader && (
				<LargeTitleHeader
					title={props.title}
					searchBar={
						props.showSearchBar
							? {
									iosHideWhenScrolling: true
							  }
							: undefined
					}
				/>
			)}
			<List
				contentInsetAdjustmentBehavior="automatic"
				variant="insets"
				contentContainerStyle={{
					paddingBottom: 100
				}}
				data={props.loading ? [] : props.items}
				extraData={__DEV__ ? (props.loading ? [] : props.items) : undefined}
				renderItem={renderItem}
				keyExtractor={keyExtractor}
				sectionHeaderAsGap={true}
				refreshing={props.loading}
				ListEmptyComponent={() => {
					return (
						<View className="flex-1 items-center justify-center">
							<ActivityIndicator
								size="small"
								color={colors.foreground}
							/>
						</View>
					)
				}}
				ListFooterComponent={props.listFooter ? () => props.listFooter : undefined}
			/>
		</Fragment>
	)
})

Settings.displayName = "Settings"

export default Settings
