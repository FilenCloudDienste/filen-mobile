import { View } from "react-native"
import { memo } from "react"
import { useColorScheme } from "@/lib/useColorScheme"
import { Icon } from "@roninoss/icons"
import { Button } from "@/components/nativewindui/Button"
import Menu from "./menu"

export const RightView = memo(({ item, queryParams }: { item: DriveCloudItem; queryParams: FetchCloudItemsParams }) => {
	const { colors } = useColorScheme()

	return (
		<View className="flex-1 justify-center px-4">
			<Menu
				type="dropdown"
				item={item}
				queryParams={queryParams}
			>
				<Button
					testID={`drive.list.listItem.rightView.dropdown.${item.name}`}
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
