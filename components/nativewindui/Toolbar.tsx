import { Icon, type IconProps as ROIconProps } from "@roninoss/icons"
import { BlurView } from "expo-blur"
import { cssInterop } from "nativewind"
import { memo, forwardRef, Fragment } from "react"
import { Platform, View, ViewProps } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Button, ButtonProps } from "~/components/nativewindui/Button"
import { Text } from "~/components/nativewindui/Text"
import { cn } from "~/lib/cn"
import { useColorScheme } from "~/lib/useColorScheme"

cssInterop(BlurView, {
	className: "style"
})

export type ToolbarProps = Omit<ViewProps, "children" | "style"> & {
	leftView?: React.ReactNode
	rightView?: React.ReactNode
	iosHint?: string
	iosBlurIntensity?: number
}

export const Toolbar = memo(({ leftView, rightView, iosHint, className, iosBlurIntensity = 60, ...props }: ToolbarProps) => {
	const insets = useSafeAreaInsets()

	return (
		<BlurView
			intensity={Platform.select({
				ios: iosBlurIntensity,
				default: 0
			})}
			style={{
				paddingBottom: insets.bottom + 8
			}}
			className={cn(
				"ios:bg-transparent ios:border-t-0 border-border/25 bg-card flex-row items-center justify-between border-t px-4 pt-2.5 dark:border-t-0",
				className
			)}
			{...props}
		>
			{Platform.OS === "ios" && !iosHint ? (
				<Fragment>
					{leftView}
					{rightView}
				</Fragment>
			) : (
				<Fragment>
					<View className="flex-1 flex-row gap-2">{leftView}</View>
					{Platform.OS === "ios" && !!iosHint && (
						<Text
							variant="caption2"
							className="font-medium max-w-[70%]"
							numberOfLines={1}
							ellipsizeMode="middle"
						>
							{iosHint}
						</Text>
					)}
					<View className="flex-1 flex-row justify-end">{rightView}</View>
				</Fragment>
			)}
		</BlurView>
	)
})

Toolbar.displayName = "Toolbar"

export type IconProps = ROIconProps<"material">

export type MaterialSchemeOnlyIconProps = Omit<ROIconProps<"material">, "namingScheme">

export const ToolbarIcon = memo(
	forwardRef<React.ElementRef<typeof Button>, ButtonProps & { icon: MaterialSchemeOnlyIconProps }>(
		({ icon, className, androidRootClassName, ...props }, ref) => {
			const { colors } = useColorScheme()

			return (
				<Button
					ref={ref}
					size="icon"
					variant="plain"
					className={cn("h-11 w-11 rounded-lg", className)}
					androidRootClassName={cn("rounded-lg", androidRootClassName)}
					{...props}
				>
					<Icon
						color={Platform.select({
							ios: colors.primary,
							default: colors.foreground
						})}
						size={Platform.select({
							ios: 27,
							default: 24
						})}
						{...(icon as IconProps)}
					/>
				</Button>
			)
		}
	)
)

ToolbarIcon.displayName = "ToolbarIcon"

export const ToolbarCTA = memo(
	forwardRef<React.ElementRef<typeof Button>, ButtonProps & { icon: MaterialSchemeOnlyIconProps }>(
		({ icon, className, androidRootClassName, ...props }, ref) => {
			const { colors } = useColorScheme()
			return (
				<Button
					ref={ref}
					size="icon"
					variant={Platform.select({
						ios: "plain",
						default: "tonal"
					})}
					className={cn("h-11 w-11 rounded-lg", className)}
					androidRootClassName={cn("rounded-lg", androidRootClassName)}
					{...props}
				>
					<Icon
						size={Platform.select({
							ios: 27,
							default: 24
						})}
						color={Platform.select({
							ios: colors.primary,
							default: colors.foreground
						})}
						{...(icon as IconProps)}
					/>
				</Button>
			)
		}
	)
)

ToolbarCTA.displayName = "ToolbarCTA"
