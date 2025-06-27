import { Icon, type IconProps } from "@roninoss/icons"
import { memo, forwardRef, Fragment, useMemo, isValidElement, cloneElement, Children } from "react"
import { Platform, View, ViewProps, ViewStyle } from "react-native"
import { Text } from "@/components/nativewindui/Text"
import { cn } from "@/lib/cn"
import { useColorScheme } from "@/lib/useColorScheme"

export const Form = memo(
	forwardRef<View, ViewProps>(({ className, ...props }, ref) => {
		return (
			<View
				ref={ref}
				className={cn("flex-1 gap-9", className)}
				{...props}
			/>
		)
	})
)

Form.displayName = "Form"

// Add as class when possible: https://github.com/marklawlor/nativewind/issues/522
export const BORDER_CURVE: ViewStyle = {
	borderCurve: "continuous"
}

export type FormSectionProps = ViewProps & {
	rootClassName?: string
	footnote?: string
	footnoteClassName?: string
	ios?: {
		title: string
		titleClassName?: string
	}
	materialIconProps?: Omit<IconProps<"material">, "namingScheme" | "ios">
}

export const FormSection = memo(
	forwardRef<React.ElementRef<typeof View>, FormSectionProps>(
		(
			{
				rootClassName,
				className,
				footnote,
				footnoteClassName,
				ios,
				materialIconProps,
				style = BORDER_CURVE,
				children: childrenProps,
				...props
			},
			ref
		) => {
			const { colors } = useColorScheme()

			const children = useMemo(() => {
				if (Platform.OS !== "ios") {
					return childrenProps
				}

				const childrenArray = Children.toArray(childrenProps)
				// Add isLast prop to last child
				return Children.map(childrenArray, (child, index) => {
					if (!isValidElement(child)) {
						return child
					}

					const isLast = index === childrenArray.length - 1

					if (typeof child === "string") {
						console.log("FormSection - Invalid asChild element", child)
					}

					return cloneElement<
						ViewProps & {
							isLast?: boolean
						},
						View
					>(typeof child === "string" ? <Fragment></Fragment> : child, {
						isLast
					})
				})
			}, [childrenProps])

			return (
				<View className={cn("relative", Platform.OS !== "ios" && !!materialIconProps && "flex-row gap-4", rootClassName)}>
					{Platform.OS === "ios" && !!ios?.title && (
						<Text
							variant="footnote"
							className={cn("text-muted-foreground pb-1 pl-3 uppercase", ios?.titleClassName)}
						>
							{ios.title}
						</Text>
					)}
					{!!materialIconProps && (
						<View className="ios:hidden pt-0.5">
							<Icon
								color={colors.grey}
								size={24}
								{...(materialIconProps as IconProps<"material">)}
							/>
						</View>
					)}
					<View className="flex-1">
						<View
							ref={ref}
							className={cn("ios:overflow-hidden ios:rounded-lg ios:bg-card ios:gap-0 ios:pl-1 gap-4", className)}
							style={style}
							// eslint-disable-next-line react/no-children-prop
							children={children}
							{...props}
						/>
						{!!footnote && (
							<Text
								className={cn("ios:pl-3 ios:pt-1 text-muted-foreground pl-3 pt-0.5", footnoteClassName)}
								variant="footnote"
							>
								{footnote}
							</Text>
						)}
					</View>
				</View>
			)
		}
	)
)

FormSection.displayName = "FormSection"

export const FormItem = memo(
	forwardRef<
		View,
		ViewProps & {
			isLast?: boolean
			iosSeparatorClassName?: string
		}
	>(({ className, isLast, iosSeparatorClassName, ...props }, ref) => {
		return (
			<Fragment>
				<View
					ref={ref}
					className={cn("ios:pr-1", className)}
					{...props}
				/>
				{Platform.OS === "ios" && !isLast && <View className={cn("bg-border ml-2 h-px flex-1", iosSeparatorClassName)} />}
			</Fragment>
		)
	})
)

FormItem.displayName = "FormItem"
