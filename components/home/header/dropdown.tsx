import { Icon } from "@roninoss/icons"
import { Button } from "@/components/nativewindui/Button"
import { useColorScheme } from "@/lib/useColorScheme"
import { memo, useCallback, useMemo } from "react"
import { DropdownMenu } from "@/components/nativewindui/DropdownMenu"
import { createDropdownItem } from "@/components/nativewindui/DropdownMenu/utils"
import type { DropdownItem, DropdownSubMenu } from "@/components/nativewindui/DropdownMenu/types"
import { useTranslation } from "react-i18next"
import { useRouter } from "expo-router"
import { Platform } from "react-native"
import alerts from "@/lib/alerts"
import useNetInfo from "@/hooks/useNetInfo"
import * as BackgroundTask from "expo-background-task"

export const Dropdown = memo(() => {
	const { colors } = useColorScheme()
	const { t } = useTranslation()
	const { push: routerPush } = useRouter()
	const { hasInternet } = useNetInfo()

	const dropdownItems = useMemo(() => {
		const items: (DropdownItem | DropdownSubMenu)[] = []

		if (hasInternet) {
			items.push(
				createDropdownItem({
					actionKey: "transfers",
					title: t("drive.header.rightView.dropdown.transfers"),
					icon:
						Platform.OS === "ios"
							? {
									namingScheme: "sfSymbol",
									name: "wifi"
							  }
							: {
									namingScheme: "material",
									name: "wifi"
							  }
				})
			)
		}

		items.push(
			createDropdownItem({
				actionKey: "settings",
				title: t("photos.menu.settings"),
				icon:
					Platform.OS === "ios"
						? {
								name: "gearshape",
								namingScheme: "sfSymbol"
						  }
						: {
								namingScheme: "material",
								name: "cog-outline"
						  }
			})
		)

		if (__DEV__) {
			items.push(
				createDropdownItem({
					actionKey: "bgTask",
					title: "[DEV] Run Background Task"
				})
			)
		}

		return items
	}, [t, hasInternet])

	const onItemPress = useCallback(
		async (item: Omit<DropdownItem, "icon">, _?: boolean) => {
			try {
				switch (item.actionKey) {
					case "transfers": {
						routerPush({
							pathname: "/transfers"
						})

						return
					}

					case "settings": {
						routerPush({
							pathname: "/home/settings"
						})

						return
					}

					case "bgTask": {
						console.log("Triggering Background Task for testing...")
						console.log(await BackgroundTask.triggerTaskWorkerForTestingAsync())
						console.log("Triggered Background Task for testing")
					}
				}
			} catch (e) {
				console.error(e)

				if (e instanceof Error) {
					alerts.error(e.message)
				}
			}
		},
		[routerPush]
	)

	if (dropdownItems.length === 0) {
		return null
	}

	return (
		<DropdownMenu
			items={dropdownItems}
			onItemPress={onItemPress}
		>
			<Button
				testID="home.header.rightView.dropdown"
				variant="plain"
				size="icon"
			>
				<Icon
					size={24}
					namingScheme="sfSymbol"
					name="ellipsis"
					ios={{
						name: "ellipsis.circle"
					}}
					color={colors.primary}
				/>
			</Button>
		</DropdownMenu>
	)
})

Dropdown.displayName = "Dropdown"

export default Dropdown
