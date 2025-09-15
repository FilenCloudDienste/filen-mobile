import { Checkbox } from "@/components/nativewindui/Checkbox"
import { cn } from "@/lib/cn"
import { Pressable, I18nManager } from "react-native"
import Animated, { LinearTransition, SlideInLeft, SlideInRight, SlideOutLeft, SlideOutRight } from "react-native-reanimated"

type Props = {
	selectionActive: boolean
	selected: boolean
	onSelected: (selected: boolean) => void
	children?: React.ReactNode
}

/**
 * Renders a list item that has a checkbox at the leading end that animates into view when selectionActive is true, respect text direction
 */
export const SelectableListItem = ({ selectionActive, selected, onSelected, children }: Props) => {
	const isRTL = I18nManager.isRTL

	return (
		<Pressable
			className={cn(isRTL ? "flex-row-reverse" : "flex-row", "items-center w-full")}
			onPress={selectionActive ? () => onSelected(!selected) : undefined}
			pointerEvents={selectionActive ? "auto" : "none"}
		>
			{selectionActive && (
				<Animated.View
					className="m-4"
					entering={isRTL ? SlideInRight : SlideInLeft}
					exiting={isRTL ? SlideOutRight : SlideOutLeft}
				>
					<Checkbox
						checked={selected}
						onPress={() => onSelected(!selected)}
					/>
				</Animated.View>
			)}
			<Animated.View
				className={cn(isRTL ? "flex-row-reverse" : "flex-row", "flex-shrink")}
				entering={isRTL ? SlideInRight : SlideInLeft}
				layout={LinearTransition}
			>
				{children}
			</Animated.View>
		</Pressable>
	)
}
