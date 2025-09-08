import { useLocalSearchParams, Stack, Redirect } from "expo-router"
import Content from "@/components/notes/content"
import { useMemo, Fragment, useState, useCallback } from "react"
import { View, ActivityIndicator, Platform } from "react-native"
import { validate as validateUUID } from "uuid"
import { Button } from "@/components/nativewindui/Button"
import { Icon } from "@roninoss/icons"
import { useColorScheme } from "@/lib/useColorScheme"
import Menu from "@/components/notes/menu"
import useNotesQuery from "@/queries/useNotesQuery"
import { LargeTitleHeader } from "@/components/nativewindui/LargeTitleHeader"
import useNetInfo from "@/hooks/useNetInfo"

export default function Note() {
	const { uuid } = useLocalSearchParams()
	const { colors } = useColorScheme()
	const [syncing, setSyncing] = useState<boolean>(false)
	const [markdownPreview, setMarkdownPreview] = useState<boolean>(false)
	const { hasInternet } = useNetInfo()

	const uuidParsed = useMemo((): string | null => {
		try {
			return typeof uuid === "string" && validateUUID(uuid) ? uuid : null
		} catch {
			return null
		}
	}, [uuid])

	const notesQuery = useNotesQuery({
		enabled: false
	})

	const note = useMemo(() => {
		if (notesQuery.status !== "success") {
			return undefined
		}

		return notesQuery.data.find(note => note.uuid === uuidParsed)
	}, [notesQuery.status, notesQuery.data, uuidParsed])

	const headerRight = useCallback(() => {
		if (!note || (!hasInternet && note.type !== "md")) {
			return null
		}

		return (
			<View className="flex-row items-center justify-center">
				{syncing ? (
					<Button
						variant="plain"
						size="icon"
					>
						<ActivityIndicator
							size="small"
							color={colors.foreground}
						/>
					</Button>
				) : (
					<Menu
						note={note}
						type="dropdown"
						insideNote={true}
						markdownPreview={markdownPreview}
						setMarkdownPreview={setMarkdownPreview}
					>
						<Button
							variant="plain"
							size="icon"
						>
							<Icon
								namingScheme="sfSymbol"
								name="ellipsis"
								ios={{
									name: "ellipsis.circle"
								}}
								size={24}
								color={colors.primary}
							/>
						</Button>
					</Menu>
				)}
			</View>
		)
	}, [note, syncing, colors.foreground, markdownPreview, colors.primary, hasInternet])

	const header = useMemo(() => {
		if (!note) {
			return null
		}

		if (Platform.OS === "android") {
			return (
				<LargeTitleHeader
					title={note.title}
					rightView={headerRight}
					materialPreset="inline"
					backgroundColor={colors.card}
				/>
			)
		}

		return (
			<Stack.Screen
				options={{
					headerShown: true,
					headerTitle: note.title,
					headerRight,
					headerShadowVisible: false
				}}
			/>
		)
	}, [note, headerRight, colors.card])

	if (!note) {
		return <Redirect href="/notes" />
	}

	return (
		<Fragment>
			{header}
			<View className="flex-1">
				<Content
					note={note}
					setSyncing={setSyncing}
					isPreview={false}
					markdownPreview={markdownPreview}
				/>
			</View>
		</Fragment>
	)
}
