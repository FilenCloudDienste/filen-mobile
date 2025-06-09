import { memo, useCallback, useMemo } from "react"
import Menu from "./menu"
import { Button } from "@/components/nativewindui/Button"
import { type NoteTag } from "@filen/sdk/dist/types/api/v3/notes"
import { Icon } from "@roninoss/icons"
import { Text } from "@/components/nativewindui/Text"
import { useMMKVString } from "react-native-mmkv"
import mmkvInstance from "@/lib/mmkv"
import { validate as validateUUID } from "uuid"
import { inputPrompt } from "@/components/prompts/inputPrompt"
import { useTranslation } from "react-i18next"
import queryUtils from "@/queries/utils"
import nodeWorker from "@/lib/nodeWorker"
import fullScreenLoadingModal from "@/components/modals/fullScreenLoadingModal"
import alerts from "@/lib/alerts"
import { cn } from "@/lib/cn"

export const Tag = memo(
	({ tag, name, id, withRightMargin }: { tag: NoteTag | null; name: string; id: string; withRightMargin?: boolean }) => {
		const [, setSelectedTag] = useMMKVString("selectedTag", mmkvInstance)
		const { t } = useTranslation()

		const isValidUUID = useMemo(() => {
			return validateUUID(id)
		}, [id])

		const select = useCallback(() => {
			setSelectedTag(id)
		}, [id, setSelectedTag])

		const className = useMemo(() => {
			return cn("bg-card rounded-full px-2.5 py-1.5 flex-row gap-1.5 items-center", withRightMargin && "mr-2")
		}, [withRightMargin])

		const createTag = useCallback(async () => {
			const inputPromptResponse = await inputPrompt({
				title: t("drive.header.rightView.actionSheet.create.directory"),
				materialIcon: {
					name: "folder-plus-outline"
				},
				prompt: {
					type: "plain-text",
					keyboardType: "default",
					defaultValue: "",
					placeholder: t("drive.header.rightView.actionSheet.directoryNamePlaceholder")
				}
			})

			if (inputPromptResponse.cancelled || inputPromptResponse.type !== "text") {
				return
			}

			const name = inputPromptResponse.text.trim()

			if (name.length === 0) {
				return
			}

			fullScreenLoadingModal.show()

			try {
				const uuid = await nodeWorker.proxy("createNoteTag", {
					name
				})

				queryUtils.useNotesTagsQuerySet({
					updater: prev => [
						...prev.filter(t => t.uuid !== uuid),
						{
							uuid,
							name,
							favorite: false,
							editedTimestamp: Date.now(),
							createdTimestamp: Date.now()
						} satisfies NoteTag
					]
				})
			} catch (e) {
				console.error(e)

				if (e instanceof Error) {
					alerts.error(e.message)
				}
			} finally {
				fullScreenLoadingModal.hide()
			}
		}, [t])

		if (!isValidUUID) {
			if (id === "plus") {
				return (
					<Button
						variant="plain"
						size="none"
						className={className}
						onPress={createTag}
						androidRootClassName="rounded-full overflow-hidden"
					>
						<Text className="text-sm text-muted-foreground">+</Text>
					</Button>
				)
			}

			return (
				<Button
					variant="plain"
					size="none"
					className={className}
					onPress={select}
					androidRootClassName="rounded-full overflow-hidden"
				>
					<Text className="text-sm text-muted-foreground">{name}</Text>
				</Button>
			)
		}

		if (!tag) {
			return (
				<Button
					variant="plain"
					size="none"
					className={className}
					androidRootClassName="rounded-full overflow-hidden"
				>
					<Text className="text-sm text-muted-foreground">...</Text>
				</Button>
			)
		}

		return (
			<Menu tag={tag}>
				<Button
					variant="plain"
					size="none"
					className={className}
					onPress={select}
					androidRootClassName="rounded-full overflow-hidden"
				>
					{tag.favorite && (
						<Icon
							name="heart"
							color="#ef4444"
							size={14}
						/>
					)}
					<Text className="text-sm text-muted-foreground">{tag.name}</Text>
				</Button>
			</Menu>
		)
	}
)

Tag.displayName = "Tag"

export default Tag
