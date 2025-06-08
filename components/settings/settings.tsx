import { Icon, MaterialIconName } from "@roninoss/icons"
import { View } from "react-native"
import { type SettingsItem, type SettingsProps } from "."
import { Button } from "~/components/nativewindui/Button"
import { List, ListDataItem, ListRenderItemInfo } from "~/components/nativewindui/List"
import { Text } from "~/components/nativewindui/Text"
import { useColorScheme } from "~/lib/useColorScheme"
import { useCallback, Fragment, memo } from "react"
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

export const Settings = memo((props: SettingsProps) => {
	const keyExtractor = useCallback((item: (Omit<ListDataItem, string> & { id: string }) | string) => {
		return typeof item === "string" ? item : item.id
	}, [])

	const renderItem = useCallback(
		(info: ListRenderItemInfo<SettingsItem>) => {
			if (typeof info.item === "string") {
				return null
			}

			return (
				<Button
					size="lg"
					variant="plain"
					className="justify-start py-5 items-center px-4"
					onPress={info.item.onPress}
					android_ripple={props.disableAndroidRipple ? null : undefined}
				>
					{info.item.leftView && <View className="flex-row items-center">{info.item.leftView}</View>}
					<View className={cn("flex-col flex-1", info.item.leftView && "pl-4")}>
						<Text className="text-xl font-normal">{info.item.title}</Text>
						{info.item.subTitle && <Text className="text-muted-foreground text-base font-normal">{info.item.subTitle}</Text>}
					</View>
					{info.item.rightView && <View className="flex-row items-center">{info.item.rightView}</View>}
				</Button>
			)
		},
		[props.disableAndroidRipple]
	)

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
				key={Date.now()} // Force re-render on each new render
				rootClassName="bg-background px-4"
				contentContainerStyle={{
					paddingBottom: 80
				}}
				contentInsetAdjustmentBehavior="automatic"
				variant="full-width"
				data={props.items}
				estimatedItemSize={92}
				renderItem={renderItem}
				keyExtractor={keyExtractor}
				sectionHeaderAsGap={true}
			/>
		</Fragment>
	)
})

Settings.displayName = "Settings"

export default Settings
