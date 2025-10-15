import { View } from "react-native"
import { memo } from "react"
import { useColorScheme } from "@/lib/useColorScheme"
import { Icon } from "@roninoss/icons"
import { Button } from "@/components/nativewindui/Button"
import Menu from "./menu"
import type { ListRenderItemInfo } from "@/components/nativewindui/List"
import type { ListItemInfo } from "."

export const RightView = memo(({ info }: { info: ListRenderItemInfo<ListItemInfo> }) => {
	const { colors } = useColorScheme()

	return (
		<View className="flex-1 justify-center px-4">
			<Menu
				type="dropdown"
				info={info}
			>
				<Button
					variant="plain"
					size="icon"
				>
					<Icon
						namingScheme="sfSymbol"
						name="ellipsis"
						color={colors.foreground}
					/>
				</Button>
			</Menu>
		</View>
	)
})

RightView.displayName = "RightView"

export default RightView
