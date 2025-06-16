import { Icon, MaterialIconName } from "@roninoss/icons"
import { View, ActivityIndicator } from "react-native"
import { type SettingsItem, type SettingsProps } from "."
import { Button } from "~/components/nativewindui/Button"
import { List, ListDataItem, ListRenderItemInfo } from "~/components/nativewindui/List"
import { Text } from "~/components/nativewindui/Text"
import { useColorScheme } from "~/lib/useColorScheme"
import { useCallback, Fragment, memo, useRef } from "react"
import { LargeTitleHeader } from "../nativewindui/LargeTitleHeader"
import { cn } from "@/lib/cn"
import useViewLayout from "@/hooks/useViewLayout"

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
	const viewRef = useRef<View>(null)
	const { layout: listLayout, onLayout } = useViewLayout(viewRef)
	const { colors } = useColorScheme()

	const keyExtractor = useCallback((item: (Omit<ListDataItem, string> & { id: string }) | string) => {
		return typeof item === "string" ? item : item.id
	}, [])

	const renderItem = useCallback(
		(info: ListRenderItemInfo<SettingsItem>) => {
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
							<Text className={cn("text-xl font-normal", info.item.destructive && "text-destructive")}>
								{info.item.title}
							</Text>
							{info.item.subTitle && (
								<Text className="text-muted-foreground text-base font-normal">{info.item.subTitle}</Text>
							)}
						</View>
						{info.item.rightView && <View className="flex-row items-center">{info.item.rightView}</View>}
					</Button>
				</View>
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
			<View
				className="flex-1"
				ref={viewRef}
				onLayout={onLayout}
			>
				<List
					rootClassName="bg-background"
					contentContainerStyle={{
						paddingBottom: 100
					}}
					contentInsetAdjustmentBehavior="automatic"
					variant="full-width"
					data={props.loading ? [] : props.items}
					extraData={__DEV__ ? (props.loading ? [] : props.items) : undefined}
					renderItem={renderItem}
					keyExtractor={keyExtractor}
					sectionHeaderAsGap={true}
					refreshing={props.loading}
					ListEmptyComponent={() => {
						return (
							<View
								className="flex-1 items-center justify-center"
								style={{
									width: listLayout.width,
									height: listLayout.height
								}}
							>
								<ActivityIndicator
									size="large"
									color={colors.foreground}
								/>
							</View>
						)
					}}
					estimatedListSize={
						listLayout.width > 0 && listLayout.height > 0
							? {
									width: listLayout.width,
									height: listLayout.height
							  }
							: undefined
					}
					estimatedItemSize={92}
					drawDistance={0}
					removeClippedSubviews={true}
					disableAutoLayout={true}
				/>
			</View>
		</Fragment>
	)
})

Settings.displayName = "Settings"

export default Settings
