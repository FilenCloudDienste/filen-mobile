import { memo } from "react"
import { Text } from "@/components/nativewindui/Text"
import { View, ActivityIndicator } from "react-native"
import { useColorScheme } from "@/lib/useColorScheme"
import { cn } from "@/lib/cn"
import { useTranslation } from "react-i18next"
import { Icon, type IconProps as ROIconProps } from "@roninoss/icons"

export type IconProps = ROIconProps<"material">

export type MaterialSchemeOnlyIconProps = Omit<ROIconProps<"material">, "namingScheme">

const containerBaseClassName = "flex-col gap-4 items-center justify-center py-[100px] px-16"
const textBaseClassName = "text-sm text-center"

export const ListEmpty = memo(
	({
		queryStatus,
		itemCount,
		searchTermLength,
		className,
		activityIndicatorSize,
		textClassName,
		texts,
		icons,
		textEllipsizeMode,
		textNumberOfLines
	}: {
		queryStatus?: "pending" | "error" | "success"
		itemCount?: number
		searchTermLength?: number
		className?: string
		activityIndicatorSize?: number | "small" | "large"
		textClassName?: string
		textNumberOfLines?: number
		textEllipsizeMode?: "head" | "middle" | "tail" | "clip"
		texts?: {
			error?: string
			empty?: string
			emptySearch?: string
		}
		icons?: {
			error?: MaterialSchemeOnlyIconProps
			empty?: MaterialSchemeOnlyIconProps
			emptySearch?: MaterialSchemeOnlyIconProps
		}
	}) => {
		const { colors } = useColorScheme()
		const { t } = useTranslation()

		if (queryStatus === "pending") {
			return (
				<View className={cn(containerBaseClassName, className)}>
					<ActivityIndicator
						size={activityIndicatorSize ?? "small"}
						color={colors.foreground}
					/>
				</View>
			)
		}

		if (queryStatus === "error") {
			return (
				<View className={cn(containerBaseClassName, className)}>
					{icons?.error && (
						<Icon
							color={colors.grey}
							size={64}
							{...(icons.error as IconProps)}
						/>
					)}
					<Text
						className={cn(textBaseClassName, textClassName)}
						numberOfLines={textNumberOfLines ?? 6}
						ellipsizeMode={textEllipsizeMode ?? "tail"}
					>
						{texts?.error ?? t("listEmpty.error")}
					</Text>
				</View>
			)
		}

		if ((itemCount ?? -1) === 0) {
			if ((searchTermLength ?? -1) > 0) {
				return (
					<View className={cn(containerBaseClassName, className)}>
						{icons?.emptySearch && (
							<Icon
								color={colors.grey}
								size={64}
								{...(icons.emptySearch as IconProps)}
							/>
						)}
						<Text
							className={cn(textBaseClassName, textClassName)}
							numberOfLines={textNumberOfLines ?? 6}
							ellipsizeMode={textEllipsizeMode ?? "tail"}
						>
							{texts?.emptySearch ?? t("listEmpty.emptySearch")}
						</Text>
					</View>
				)
			}

			return (
				<View className={cn(containerBaseClassName, className)}>
					{icons?.empty && (
						<Icon
							color={colors.grey}
							size={64}
							{...(icons.empty as IconProps)}
						/>
					)}
					<Text
						className={cn(textBaseClassName, textClassName)}
						numberOfLines={textNumberOfLines ?? 6}
						ellipsizeMode={textEllipsizeMode ?? "tail"}
					>
						{texts?.empty ?? t("listEmpty.empty")}
					</Text>
				</View>
			)
		}

		return (
			<View className={cn(containerBaseClassName, className)}>
				{icons?.empty && (
					<Icon
						color={colors.grey}
						size={64}
						{...(icons.empty as IconProps)}
					/>
				)}
				<Text
					className={cn(textBaseClassName, textClassName)}
					numberOfLines={textNumberOfLines ?? 6}
					ellipsizeMode={textEllipsizeMode ?? "tail"}
				>
					{texts?.empty ?? t("listEmpty.empty")}
				</Text>
			</View>
		)
	}
)

ListEmpty.displayName = "ListEmpty"

export default ListEmpty
