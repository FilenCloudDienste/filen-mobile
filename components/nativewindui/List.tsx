import { cva } from "class-variance-authority"
import { cssInterop } from "nativewind"
import { memo, forwardRef, useMemo, useCallback, Fragment } from "react"
import { Platform, PressableProps, StyleProp, TextStyle, View, ViewProps, ViewStyle } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Text, TextClassContext } from "@/components/nativewindui/Text"
import { Button } from "@/components/nativewindui/Button"
import { cn } from "@/lib/cn"

import {
	FlashList,
	type ListRenderItem as FlashListListRenderItem,
	type ListRenderItemInfo,
	type FlashListProps,
	type FlashListRef
} from "@shopify/flash-list"

cssInterop(FlashList, {
	className: "style",
	contentContainerClassName: "contentContainerStyle"
})

export type ListDataItem =
	| string
	| {
			title: string
			subTitle?: string
	  }

export type ListVariant = "insets" | "full-width"

export type ListRef<T extends ListDataItem> = React.Ref<FlashListRef<T>>

export type ListRenderItemProps<T extends ListDataItem> = ListRenderItemInfo<T> & {
	variant?: ListVariant
	isFirstInSection?: boolean
	isLastInSection?: boolean
	sectionHeaderAsGap?: boolean
}

export type ListProps<T extends ListDataItem> = Omit<FlashListProps<T>, "renderItem"> & {
	renderItem?: ListRenderItem<T>
	variant?: ListVariant
	sectionHeaderAsGap?: boolean
	rootClassName?: string
	rootStyle?: ViewStyle
}

export type ListRenderItem<T extends ListDataItem> = (props: ListRenderItemProps<T>) => ReturnType<FlashListListRenderItem<T>>

export const rootVariants = cva("min-h-2 flex-1", {
	variants: {
		variant: {
			insets: "ios:px-4",
			"full-width": "ios:bg-card ios:dark:bg-background"
		},
		sectionHeaderAsGap: {
			true: "",
			false: ""
		}
	},
	compoundVariants: [
		{
			variant: "full-width",
			sectionHeaderAsGap: true,
			className: "bg-card dark:bg-background"
		}
	],
	defaultVariants: {
		variant: "full-width",
		sectionHeaderAsGap: false
	}
})

export function ListComponent<T extends ListDataItem>(
	{
		variant = "full-width",
		rootClassName,
		rootStyle,
		contentContainerClassName,
		renderItem,
		data,
		sectionHeaderAsGap = false,
		contentInsetAdjustmentBehavior = "automatic",
		...props
	}: ListProps<T>,
	ref: ListRef<T>
) {
	const insets = useSafeAreaInsets()

	const contentContainerClassNameMemo = useMemo(() => {
		return cn(variant === "insets" && (!data || (typeof data?.[0] !== "string" && "pt-4")), contentContainerClassName)
	}, [variant, data, contentContainerClassName])

	const renderItemMemo = useCallback(
		(args: ListRenderItemProps<T>) =>
			renderItemWithVariant(renderItem, variant, data as T[] | undefined | null, sectionHeaderAsGap)(args),
		[renderItem, variant, data, sectionHeaderAsGap]
	)

	const contentContainerStyleMemo = useMemo(() => {
		return {
			paddingBottom: Platform.select({
				ios: !contentInsetAdjustmentBehavior || contentInsetAdjustmentBehavior === "never" ? insets.bottom + 16 : 0,
				default: insets.bottom
			})
		}
	}, [contentInsetAdjustmentBehavior, insets.bottom])

	return (
		<FlashList
			className={cn(
				"flex-1",
				rootVariants({
					variant,
					sectionHeaderAsGap
				}),
				rootClassName
			)}
			style={rootStyle}
			data={data}
			contentInsetAdjustmentBehavior={contentInsetAdjustmentBehavior}
			renderItem={renderItemMemo}
			contentContainerClassName={contentContainerClassNameMemo}
			contentContainerStyle={contentContainerStyleMemo}
			{...props}
			ref={ref}
		/>
	)
}

export function getItemType<T>(item: T) {
	return typeof item === "string" ? "sectioHeader" : "row"
}

export function renderItemWithVariant<T extends ListDataItem>(
	renderItem: ListRenderItem<T> | null | undefined,
	variant: ListVariant,
	data: readonly T[] | null | undefined,
	sectionHeaderAsGap?: boolean
) {
	return (args: ListRenderItemProps<T>) => {
		const previousItem = data?.[args.index - 1]
		const nextItem = data?.[args.index + 1]
		return renderItem
			? renderItem({
					...args,
					variant,
					isFirstInSection: !previousItem || typeof previousItem === "string",
					isLastInSection: !nextItem || typeof nextItem === "string",
					sectionHeaderAsGap
			  })
			: null
	}
}

export const List = memo(forwardRef(ListComponent)) as <T extends ListDataItem>(
	props: ListProps<T> & { ref?: ListRef<T> }
) => React.ReactElement

export function isPressable(props: PressableProps) {
	return (
		("onPress" in props && props.onPress) ||
		("onLongPress" in props && props.onLongPress) ||
		("onPressIn" in props && props.onPressIn) ||
		("onPressOut" in props && props.onPressOut) ||
		("onLongPress" in props && props.onLongPress)
	)
}

export type ListItemProps<T extends ListDataItem> = PressableProps &
	ListRenderItemProps<T> & {
		androidRootClassName?: string
		titleClassName?: string
		titleEllipsizeMode?: "head" | "middle" | "tail" | "clip"
		subTitleEllipsizeMode?: "head" | "middle" | "tail" | "clip"
		className?: string
		titleStyle?: StyleProp<TextStyle>
		textNumberOfLines?: number
		subTitleClassName?: string
		subTitleStyle?: StyleProp<TextStyle>
		subTitleNumberOfLines?: number
		textContentClassName?: string
		leftView?: React.ReactNode
		rightView?: React.ReactNode
		removeSeparator?: boolean
		innerClassName?: string
	}

export type ListItemRef = React.Ref<View>

export const itemVariants = cva("ios:gap-0 flex-row gap-0 bg-card", {
	variants: {
		variant: {
			insets: "ios:bg-card bg-card/70",
			"full-width": "bg-card dark:bg-background"
		},
		sectionHeaderAsGap: {
			true: "",
			false: ""
		},
		isFirstItem: {
			true: "",
			false: ""
		},
		isFirstInSection: {
			true: "",
			false: ""
		},
		removeSeparator: {
			true: "",
			false: ""
		},
		isLastInSection: {
			true: "",
			false: ""
		},
		disabled: {
			true: "opacity-70",
			false: "opacity-100"
		}
	},
	compoundVariants: [
		{
			variant: "insets",
			sectionHeaderAsGap: true,
			className: "ios:dark:bg-card dark:bg-card/70"
		},
		{
			variant: "insets",
			isFirstInSection: true,
			className: "ios:rounded-t-[10px]"
		},
		{
			variant: "insets",
			isLastInSection: true,
			className: "ios:rounded-b-[10px]"
		},
		{
			removeSeparator: false,
			isLastInSection: true,
			className: "ios:border-b-0 border-b border-border/25 dark:border-border/80"
		},
		{
			variant: "insets",
			isFirstItem: true,
			className: "border-border/40 border-t"
		}
	],
	defaultVariants: {
		variant: "insets",
		sectionHeaderAsGap: false,
		isFirstInSection: false,
		isLastInSection: false,
		disabled: false
	}
})

export function ListItemComponent<T extends ListDataItem>(
	{
		item,
		isFirstInSection,
		isLastInSection,
		index,
		variant,
		className,
		androidRootClassName,
		titleClassName,
		titleEllipsizeMode = "tail",
		subTitleEllipsizeMode = "tail",
		titleStyle,
		textNumberOfLines,
		subTitleStyle,
		subTitleClassName,
		subTitleNumberOfLines,
		textContentClassName,
		sectionHeaderAsGap,
		removeSeparator = false,
		innerClassName,
		leftView,
		rightView,
		disabled,
		...props
	}: ListItemProps<T>,
	ref: ListItemRef
) {
	const cn1 = useMemo(() => {
		return cn(
			itemVariants({
				variant,
				sectionHeaderAsGap,
				isFirstInSection,
				isLastInSection,
				disabled,
				removeSeparator
			}),
			className
		)
	}, [variant, sectionHeaderAsGap, isFirstInSection, isLastInSection, disabled, removeSeparator, className])

	const disabledMemo = useMemo(() => disabled || !isPressable(props), [disabled, props])

	const cn2 = useMemo(() => {
		if (typeof item === "string") {
			return undefined
		}

		return cn(
			"h-full flex-1 flex-row",
			!item.subTitle ? "ios:py-3 py-[18px]" : "ios:py-2 py-2",
			!leftView && "ml-4",
			!rightView && "pr-4",
			!removeSeparator && (!isLastInSection || variant === "full-width") && "ios:border-b ios:border-border/80",
			!removeSeparator && isFirstInSection && variant === "full-width" && "ios:border-t ios:border-border/80",
			innerClassName
		)
	}, [item, isLastInSection, variant, leftView, rightView, removeSeparator, isFirstInSection, innerClassName])

	if (typeof item === "string") {
		console.log("List.tsx", "ListItemComponent", "Invalid item of type 'string' was provided. Use ListSectionHeader instead.")

		return null
	}

	return (
		<Fragment>
			<Button
				disabled={disabledMemo}
				variant="plain"
				size="none"
				unstable_pressDelay={100}
				androidRootClassName={androidRootClassName}
				className={cn1}
				{...props}
				ref={ref}
			>
				<TextClassContext.Provider value="font-normal leading-5">
					{!!leftView && <View>{leftView}</View>}
					<View className={cn2}>
						<View className={cn("flex-1", textContentClassName)}>
							<Text
								numberOfLines={textNumberOfLines}
								style={titleStyle}
								className={cn("flex-1", titleClassName)}
								ellipsizeMode={titleEllipsizeMode}
							>
								{item.title}
							</Text>
							{!!item.subTitle && (
								<Text
									numberOfLines={subTitleNumberOfLines}
									variant="subhead"
									style={subTitleStyle}
									className={cn("flex-1 text-muted-foreground", subTitleClassName)}
									ellipsizeMode={subTitleEllipsizeMode}
								>
									{item.subTitle}
								</Text>
							)}
						</View>
						{!!rightView && <View>{rightView}</View>}
					</View>
				</TextClassContext.Provider>
			</Button>
			{!removeSeparator && Platform.OS !== "ios" && !isLastInSection && (
				<View className={cn(variant === "insets" && "px-4")}>
					<View className="bg-border/25 dark:bg-border/80 h-px" />
				</View>
			)}
		</Fragment>
	)
}

export const ListItem = memo(forwardRef(ListItemComponent)) as <T extends ListDataItem>(
	props: ListItemProps<T> & { ref?: ListItemRef }
) => React.ReactElement

export type ListSectionHeaderProps<T extends ListDataItem> = ViewProps &
	ListRenderItemProps<T> & {
		textClassName?: string
	}

export type ListSectionHeaderRef = React.Ref<View>

export function ListSectionHeaderComponent<T extends ListDataItem>(
	{
		item,
		isFirstInSection,
		isLastInSection,
		index,
		variant,
		className,
		textClassName,
		sectionHeaderAsGap,
		...props
	}: ListSectionHeaderProps<T>,
	ref: ListSectionHeaderRef
) {
	if (typeof item !== "string") {
		console.log("List.tsx", "ListSectionHeaderComponent", "Invalid item provided. Expected type 'string'. Use ListItem instead.")

		return null
	}

	if (sectionHeaderAsGap) {
		return (
			<View
				className={cn("bg-background", Platform.OS !== "ios" && "border-border/25 dark:border-border/80 border-b", className)}
				{...props}
				ref={ref}
			>
				<View className="h-8" />
			</View>
		)
	}

	return (
		<View
			className={cn(
				"ios:pb-1 pb-4 pl-4 pt-4",
				Platform.OS !== "ios" && "border-border/25 dark:border-border/80 border-b",
				variant === "full-width" ? "bg-card dark:bg-background" : "bg-background",
				className
			)}
			{...props}
			ref={ref}
		>
			<Text
				variant={Platform.select({
					ios: "footnote",
					default: "body"
				})}
				className={cn("ios:uppercase ios:text-muted-foreground", textClassName)}
			>
				{item}
			</Text>
		</View>
	)
}

export const ListSectionHeader = memo(forwardRef(ListSectionHeaderComponent)) as <T extends ListDataItem>(
	props: ListSectionHeaderProps<T> & { ref?: ListSectionHeaderRef }
) => React.ReactElement

export const ESTIMATED_ITEM_HEIGHT = {
	titleOnly: Platform.select({
		ios: 45,
		default: 57
	}),
	withSubTitle: 56
}

export function getStickyHeaderIndices<T extends ListDataItem>(data: T[]) {
	if (!data) return []
	const indices: number[] = []
	for (let i = 0; i < data.length; i++) {
		if (typeof data[i] === "string") {
			indices.push(i)
		}
	}
	return indices
}

export { ListRenderItemInfo }
