import { Icon, MaterialIconName } from "@roninoss/icons"
import { View, ActivityIndicator } from "react-native"
import { memo, Fragment, useCallback, useMemo } from "react"
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

export const Item = memo(({ info }: { info: ListRenderItemInfo<SettingsItem> }) => {
	const { colors, isDarkColorScheme } = useColorScheme()

	const rightView = useMemo(() => {
		if (typeof info.item === "string") {
			return undefined
		}

		return info.item.rightView ? (
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
	}, [info.item])

	const leftView = useMemo(() => {
		if (typeof info.item === "string") {
			return undefined
		}

		return info.item.leftView ? (
			<View className={cn("flex-1 flex-row px-4 justify-start", info.item.subTitle ? "pt-4" : "items-center")}>
				{info.item.leftView}
			</View>
		) : undefined
	}, [info.item])

	if (typeof info.item === "string") {
		return <ListSectionHeader {...info} />
	}

	return (
		<ListItem
			{...info}
			className={cn("ios:pl-0 pl-2", info.index === 0 && "ios:border-t-0 border-border/25 dark:border-border/80 border-t")}
			innerClassName={cn("py-2 ios:py-2 android:py-2", info.item.destructive && "text-destructive")}
			titleClassName={cn("text-lg", info.item.destructive && "text-destructive")}
			leftView={leftView}
			rightView={rightView}
			onPress={info.item.onPress}
			style={
				!isDarkColorScheme
					? {
							backgroundColor: colors.grey5
					  }
					: undefined
			}
		/>
	)
})

Item.displayName = "Item"

const contentContainerStyle = {
	paddingBottom: 100
}

export const Settings = memo((props: SettingsProps) => {
	const { colors } = useColorScheme()

	const keyExtractor = useCallback((item: (Omit<ListDataItem, string> & { id: string }) | string) => {
		return typeof item === "string" ? item : item.id
	}, [])

	const renderItem = useCallback((info: ListRenderItemInfo<SettingsItem>) => {
		return <Item info={info} />
	}, [])

	const headerSearchBar = useMemo(() => {
		return props.showSearchBar
			? {
					iosHideWhenScrolling: false
			  }
			: undefined
	}, [props.showSearchBar])

	const items = useMemo(() => {
		return props.loading ? [] : props.items
	}, [props.loading, props.items])

	const extraData = useMemo(() => {
		return __DEV__ ? (props.loading ? [] : props.items) : undefined
	}, [props.loading, props.items])

	const listEmpty = useMemo(() => {
		return (
			<View className="flex-1 items-center justify-center">
				<ActivityIndicator
					size="small"
					color={colors.foreground}
				/>
			</View>
		)
	}, [colors.foreground])

	return (
		<Fragment>
			{!props.hideHeader && (
				<LargeTitleHeader
					title={props.title}
					searchBar={headerSearchBar}
				/>
			)}
			<List
				contentInsetAdjustmentBehavior="automatic"
				variant="insets"
				contentContainerStyle={contentContainerStyle}
				data={items}
				extraData={extraData}
				renderItem={renderItem}
				keyExtractor={keyExtractor}
				sectionHeaderAsGap={true}
				refreshing={props.loading}
				ListEmptyComponent={listEmpty}
				ListHeaderComponent={props.listHeader ? () => props.listHeader : undefined}
				ListFooterComponent={props.listFooter ? () => props.listFooter : undefined}
				windowSize={3}
				maxToRenderPerBatch={16}
				initialNumToRender={32}
				removeClippedSubviews={true}
				updateCellsBatchingPeriod={100}
			/>
		</Fragment>
	)
})

Settings.displayName = "Settings"

export default Settings
