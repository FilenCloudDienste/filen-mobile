import { memo } from "react"
import { Button } from "@/components/nativewindui/Button"
import { cn } from "@/lib/cn"
import { Text } from "@/components/nativewindui/Text"
import { View, type GestureResponderEvent } from "react-native"
import useChatEmbedContainerStyle from "@/hooks/useChatEmbedContainerStyle"

export const Outer = memo(
	({
		children,
		onPress,
		leftBorderColor,
		title,
		titleClassName,
		description,
		descriptionClassName,
		className,
		innerClassName,
		childrenClassName,
		above
	}: {
		children?: React.ReactNode
		onPress?: ((e: GestureResponderEvent) => void) | ((e: GestureResponderEvent) => Promise<void>)
		leftBorderColor?: string
		title?: string | React.ReactNode
		titleClassName?: string
		description?: string | React.ReactNode
		descriptionClassName?: string
		className?: string
		innerClassName?: string
		childrenClassName?: string
		above?: React.ReactNode
	}) => {
		const chatEmbedContainerStyle = useChatEmbedContainerStyle()

		return (
			<Button
				variant="plain"
				size="none"
				unstable_pressDelay={100}
				onPress={onPress}
				className={cn("flex-1 flex-col active:opacity-70 basis-full", className)}
				android_ripple={null}
				style={chatEmbedContainerStyle}
			>
				{above && (
					<View
						className="flex-row flex-1 w-full"
						style={chatEmbedContainerStyle}
					>
						{above}
					</View>
				)}
				<View
					className={cn(
						"flex-1 flex-col bg-card rounded-md p-2 gap-2 border-l-2",
						leftBorderColor ? `border-l-[${leftBorderColor}]` : "border-l-gray-500",
						innerClassName,
						above && "mt-1"
					)}
					style={chatEmbedContainerStyle}
				>
					{title && typeof title === "string" ? (
						<Text
							className={cn("text-blue-500 font-normal text-xs", titleClassName)}
							numberOfLines={1}
							ellipsizeMode="middle"
						>
							{title}
						</Text>
					) : (
						title
					)}
					{description && typeof description === "string" ? (
						<Text
							numberOfLines={4}
							ellipsizeMode="tail"
							className={cn("text-sm font-normal", descriptionClassName)}
						>
							{description}
						</Text>
					) : (
						description
					)}
					{children && (
						<View className={cn("flex-1 bg-background rounded-md aspect-video overflow-hidden", childrenClassName)}>
							{children}
						</View>
					)}
				</View>
			</Button>
		)
	}
)

Outer.displayName = "Outer"

export default Outer
