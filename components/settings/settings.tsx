import { Icon, MaterialIconName } from "@roninoss/icons"
import { View, ActivityIndicator } from "react-native"
import type { SettingsItem, SettingsProps } from "."
import { Button } from "~/components/nativewindui/Button"
import { List, ListDataItem, ListRenderItemInfo } from "~/components/nativewindui/List"
import { Text } from "~/components/nativewindui/Text"
import { useColorScheme } from "~/lib/useColorScheme"
import { useCallback, Fragment, memo, useMemo } from "react"
import { LargeTitleHeader } from "../nativewindui/LargeTitleHeader"
import { cn } from "@/lib/cn"

export const ChevronRight = memo(() => {
	return null
})

ChevronRight.displayName = "ChevronRight"

export const IconView = memo(({ name, className }: { name: MaterialIconName; className?: string }) => {
	const { colors } = useColorScheme()

	return (
		<View className={cn("items-center justify-center rounded-md", className, "bg-transparent px-0 py-0")}>
			<Icon
				name={name}
				size={24}
				color={colors.foreground}
			/>
		</View>
	)
})

IconView.displayName = "IconView"

export const Item = memo(({ info, props }: { info: ListRenderItemInfo<SettingsItem>; props: SettingsProps }) => {
	if (typeof info.item === "string") {
		return null
	}

	return (
		<View className="px-4">
			<Button
				size="lg"
				variant="plain"
				className="justify-start py-5 items-center"
				onPress={info.item.onPress}
				{...(props.disableAndroidRipple
					? {
							android_ripple: undefined
					  }
					: {})}
			>
				{info.item.leftView && <View className="flex-row items-center">{info.item.leftView}</View>}
				<View className={cn("flex-col flex-1", info.item.leftView && "pl-4")}>
					<Text
						className={cn("text-xl font-normal", info.item.destructive && "text-destructive")}
						numberOfLines={1}
						ellipsizeMode="middle"
					>
						{info.item.title}
					</Text>
					{info.item.subTitle && <Text className="text-muted-foreground text-base font-normal">{info.item.subTitle}</Text>}
				</View>
				{info.item.rightView && <View className="flex-row items-center">{info.item.rightView}</View>}
			</Button>
		</View>
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

	const renderItem = useCallback(
		(info: ListRenderItemInfo<SettingsItem>) => {
			return (
				<Item
					info={info}
					props={props}
				/>
			)
		},
		[props]
	)

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

	const ListEmptyComponent = useCallback(() => {
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
				rootClassName="bg-background"
				contentContainerStyle={contentContainerStyle}
				contentInsetAdjustmentBehavior="automatic"
				variant="full-width"
				data={items}
				extraData={extraData}
				renderItem={renderItem}
				keyExtractor={keyExtractor}
				sectionHeaderAsGap={true}
				showsHorizontalScrollIndicator={false}
				showsVerticalScrollIndicator={false}
				refreshing={props.loading}
				ListEmptyComponent={ListEmptyComponent}
				ListHeaderComponent={props.listHeader ? () => props.listHeader : undefined}
				ListFooterComponent={props.listFooter ? () => props.listFooter : undefined}
			/>
		</Fragment>
	)
})

Settings.displayName = "Settings"

export default Settings
