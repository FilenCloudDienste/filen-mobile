import { memo, useCallback } from "react"
import { type GestureResponderEvent, ScrollView } from "react-native"
import * as Linking from "expo-linking"
import alerts from "@/lib/alerts"
import { Text } from "@/components/nativewindui/Text"
import { useQuery } from "@tanstack/react-query"
import axios from "axios"
import useDimensions from "@/hooks/useDimensions"
import { type TextEditorItem } from "@/components/textEditor/editor"
import { useRouter } from "expo-router"
import Outer from "./outer"
import Fallback from "./fallback"

export const Code = memo(({ name, source, link }: { name: string; source: string; link: string }) => {
	const { screen } = useDimensions()
	const { push: routerPush } = useRouter()

	const query = useQuery({
		queryKey: ["chatEmbedCodeData", source],
		enabled: source !== null,
		queryFn: async () => {
			if (!source) {
				throw new Error("No source provided.")
			}

			const request = await axios.get(source, {
				timeout: 60000
			})

			if (request.status !== 200) {
				throw new Error("Failed to fetch data.")
			}

			if (typeof request.data !== "string") {
				throw new Error("Invalid data type.")
			}

			return request.data.slice(0, 2048)
		},
		refetchOnMount: false,
		refetchOnReconnect: false,
		refetchIntervalInBackground: false,
		refetchOnWindowFocus: false
	})

	const onPress = useCallback(
		async (e: GestureResponderEvent) => {
			e.preventDefault()
			e.stopPropagation()

			if (query.status === "success") {
				routerPush({
					pathname: "/textEditor",
					params: {
						item: JSON.stringify({
							type: "remote",
							name,
							uri: source
						} satisfies TextEditorItem)
					}
				})

				return
			}

			try {
				if (!(await Linking.canOpenURL(link))) {
					throw new Error("Cannot open URL.")
				}

				await Linking.openURL(link)
			} catch (e) {
				console.error(e)

				if (e instanceof Error) {
					alerts.error(e.message)
				}
			}
		},
		[link, source, name, routerPush, query.status]
	)

	if (query.status !== "success") {
		return <Fallback link={link} />
	}

	return (
		<Outer
			title={name}
			onPress={onPress}
			childrenClassName="aspect-auto px-2 py-1"
			titleClassName="text-foreground"
		>
			<ScrollView
				showsHorizontalScrollIndicator={false}
				showsVerticalScrollIndicator={true}
				directionalLockEnabled={true}
				scrollEnabled={false}
				style={{
					maxHeight: screen.height / 3,
					flex: 1
				}}
			>
				<Text className="text-muted-foreground text-sm font-normal">{query.data}</Text>
			</ScrollView>
		</Outer>
	)
})

Code.displayName = "Code"

export default Code
