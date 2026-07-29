import CardItem from "@/components/notes/item/cardItem"
import type { Note } from "@filen/sdk/dist/types/api/v3/notes"
import { memo, useMemo } from "react"
import { ScrollView, View, type RefreshControlProps } from "react-native"

export type MasonryGridProps = {
	notes: Note[]
	refreshing: boolean
	refreshControl?: React.ReactElement<RefreshControlProps>
	ListHeaderComponent?: React.ComponentType | React.ReactElement | null
	ListFooterComponent?: React.ComponentType | React.ReactElement | null
	ListEmptyComponent?: React.ComponentType | React.ReactElement | null
}

export const MasonryGrid = memo(
	({ notes, refreshControl, ListHeaderComponent, ListFooterComponent, ListEmptyComponent }: MasonryGridProps) => {
		// Split notes into two columns for masonry effect
		const { leftColumn, rightColumn } = useMemo(() => {
			const left: Note[] = []
			const right: Note[] = []

			notes.forEach((note, index) => {
				// Alternate between columns, but also consider content length
				// to help balance the columns visually
				if (index % 2 === 0) {
					left.push(note)
				} else {
					right.push(note)
				}
			})

			return { leftColumn: left, rightColumn: right }
		}, [notes])

		const renderHeader = () => {
			if (!ListHeaderComponent) return null
			if (typeof ListHeaderComponent === "function") {
				const Component = ListHeaderComponent as React.ComponentType
				return <Component />
			}
			return ListHeaderComponent
		}

		const renderFooter = () => {
			if (!ListFooterComponent) return null
			if (typeof ListFooterComponent === "function") {
				const Component = ListFooterComponent as React.ComponentType
				return <Component />
			}
			return ListFooterComponent
		}

		const renderEmpty = () => {
			if (!ListEmptyComponent) return null
			if (typeof ListEmptyComponent === "function") {
				const Component = ListEmptyComponent as React.ComponentType
				return <Component />
			}
			return ListEmptyComponent
		}

		return (
			<ScrollView
				contentContainerStyle={{ paddingBottom: 100 }}
				contentInsetAdjustmentBehavior="automatic"
				refreshControl={refreshControl}
			>
				{renderHeader()}
				{notes.length === 0 ? (
					renderEmpty()
				) : (
					<View className="flex-row px-1">
						{/* Left Column */}
						<View className="flex-1">
							{leftColumn.map(note => (
								<CardItem
									key={note.uuid}
									note={note}
								/>
							))}
						</View>
						{/* Right Column */}
						<View className="flex-1">
							{rightColumn.map(note => (
								<CardItem
									key={note.uuid}
									note={note}
								/>
							))}
						</View>
					</View>
				)}
				{notes.length > 0 && renderFooter()}
			</ScrollView>
		)
	}
)

MasonryGrid.displayName = "MasonryGrid"

export default MasonryGrid
