import { memo, Fragment, useMemo, useCallback } from "react"
import Menu from "../menu"
import { useRouter } from "expo-router"
import { type Note } from "@filen/sdk/dist/types/api/v3/notes"
import { Button } from "@/components/nativewindui/Button"
import { View, Platform } from "react-native"
import useSDKConfig from "@/hooks/useSDKConfig"
import { Icon } from "@roninoss/icons"
import { useColorScheme } from "@/lib/useColorScheme"
import Avatar from "@/components/avatar"
import { cn } from "@/lib/cn"
import { simpleDate, contactName } from "@/lib/utils"
import { Text } from "@/components/nativewindui/Text"
import Tag from "../tag"
import events from "@/lib/events"
import queryUtils from "@/queries/utils"
import useNetInfo from "@/hooks/useNetInfo"
import alerts from "@/lib/alerts"
import { useTranslation } from "react-i18next"
import { Checkbox } from "@/components/nativewindui/Checkbox"
import Animated, { SlideInLeft, SlideOutLeft } from "react-native-reanimated"
import { useNotesStore } from "@/stores/notes.store"
import { useShallow } from "zustand/shallow"
import Ionicons from "@expo/vector-icons/Ionicons"

const ICON_SIZE = 24

export const Item = memo(({ note }: { note: Note }) => {
	const { push: routerPush } = useRouter()
	const [{ userId }] = useSDKConfig()
	const { colors } = useColorScheme()
	const { hasInternet } = useNetInfo()
	const { t } = useTranslation()
	const selectedNotesCount = useNotesStore(useShallow(state => state.selectedNotes.length))
	const isSelected = useNotesStore(useShallow(state => state.selectedNotes.some(n => n.uuid === note.uuid)))

	const hasWriteAccess = useMemo(() => {
		if (note.isOwner) {
			return true
		}

		return note.participants.some(participant => {
			if (participant.userId === userId) {
				return participant.permissionsWrite
			}

			return false
		})
	}, [note.isOwner, note.participants, userId])

	const participants = useMemo(() => {
		return note.participants
			.filter(p => p.userId !== userId)
			.sort((a, b) =>
				contactName(a.email, a.nickName).localeCompare(contactName(b.email, b.nickName), "en", {
					numeric: true
				})
			)
			.slice(0, 3)
	}, [note.participants, userId])

	const tags = useMemo(() => {
		return note.tags.sort((a, b) => {
			return a.name.localeCompare(b.name, "en", {
				numeric: true
			})
		})
	}, [note.tags])

	const onPress = useCallback(() => {
		if (selectedNotesCount > 0) {
			useNotesStore.getState().setSelectedNotes(prev => {
				return isSelected ? prev.filter(i => i.uuid !== note.uuid) : [...prev.filter(i => i.uuid !== note.uuid), note]
			})

			return
		}

		events.emit("hideSearchBar", {
			clearText: true
		})

		if (!hasInternet) {
			const cachedContent = queryUtils.useNoteContentQueryGet({
				uuid: note.uuid
			})

			if (!cachedContent) {
				alerts.error(t("errors.youAreOffline"))

				return
			}
		}

		routerPush({
			pathname: "/notes/[uuid]",
			params: {
				uuid: note.uuid
			}
		})
	}, [routerPush, hasInternet, t, selectedNotesCount, isSelected, note])

	const noop = useCallback(() => {}, [])

	return (
		<Menu
			note={note}
			type="context"
			insideNote={false}
			markdownPreview={false}
			setMarkdownPreview={noop}
		>
			<Button
				className="bg-background"
				variant="plain"
				size="none"
				onPress={onPress}
			>
				{selectedNotesCount > 0 && (
					<Animated.View
						entering={SlideInLeft}
						exiting={SlideOutLeft}
						className="pl-4"
					>
						<Checkbox
							checked={isSelected}
							onPress={onPress}
						/>
					</Animated.View>
				)}
				<View className="flex-1 flex-row gap-4 pt-3">
					<View className="flex-col gap-2 pt-0.5 pb-2 pl-4">
						{!note.isOwner ? (
							<Fragment>
								{hasWriteAccess ? (
									<Icon
										name="person-outline"
										color={colors.foreground}
										size={ICON_SIZE}
									/>
								) : (
									<Icon
										name="eye-outline"
										color={colors.foreground}
										size={ICON_SIZE}
									/>
								)}
							</Fragment>
						) : note.trash ? (
							<Ionicons
								name="trash-outline"
								color="#ef4444"
								size={ICON_SIZE}
							/>
						) : note.archive ? (
							<Ionicons
								name="archive-outline"
								color="#eab308"
								size={ICON_SIZE}
							/>
						) : note.type === "text" ? (
							<Ionicons
								name="text-outline"
								color="#3b82f6"
								size={ICON_SIZE}
							/>
						) : note.type === "checklist" ? (
							<Ionicons
								name="checkbox-outline"
								color="#a855f7"
								size={ICON_SIZE}
							/>
						) : note.type === "code" ? (
							<Ionicons
								name="code-outline"
								color="#ef4444"
								size={ICON_SIZE}
							/>
						) : note.type === "md" ? (
							<Ionicons
								name="logo-markdown"
								color="#6366f1"
								size={ICON_SIZE}
							/>
						) : note.type === "rich" ? (
							<Ionicons
								name="document-text-outline"
								color="#06b6d4"
								size={ICON_SIZE}
							/>
						) : null}
						{note.pinned && (
							<Icon
								name="pin-outline"
								color={colors.grey}
								size={ICON_SIZE}
							/>
						)}
						{note.favorite && (
							<Icon
								name="heart"
								color="#ef4444"
								size={ICON_SIZE}
							/>
						)}
					</View>
					<View className={cn("flex-row gap-4 flex-1 pb-4 pr-4", Platform.OS === "ios" && "border-b border-border/80")}>
						<View className="flex-1 flex-col gap-0">
							<Text
								numberOfLines={1}
								ellipsizeMode="middle"
								className="font-normal text-base"
							>
								{note.title}
							</Text>
							{note.preview.length > 0 && (
								<Text
									numberOfLines={2}
									ellipsizeMode="tail"
									variant="subhead"
									className="text-muted-foreground py-0.5 font-normal text-sm"
								>
									{note.preview}
								</Text>
							)}
							<Text
								numberOfLines={1}
								ellipsizeMode="middle"
								variant="footnote"
								className="text-muted-foreground mt-0.5 font-normal text-xs"
							>
								{simpleDate(note.editedTimestamp)}
							</Text>
							{tags.length > 0 && (
								<View className="flex-row gap-2 mt-2 flex-wrap">
									{tags.map((tag, index) => (
										<Tag
											key={index}
											tag={tag}
											name={tag.name}
											id={tag.uuid}
										/>
									))}
								</View>
							)}
						</View>
						{participants.length > 0 && (
							<View className="flex-row items-center">
								{participants.map((participant, index) => {
									return (
										<Avatar
											key={index}
											className={cn("h-7 w-7", index > 0 && "-ml-3")}
											source={
												participant.avatar?.startsWith("https")
													? {
															uri: participant.avatar
													  }
													: {
															uri: "avatar_fallback"
													  }
											}
											style={{
												width: 36,
												height: 36
											}}
										/>
									)
								})}
							</View>
						)}
					</View>
				</View>
			</Button>
		</Menu>
	)
})

Item.displayName = "Item"

export default Item
