import { View, type ListRenderItemInfo, type ViewToken, type ViewabilityConfig } from "react-native"
import { memo, useState, useCallback, useMemo } from "react"
import { FlatList } from "react-native-gesture-handler"
import Item from "./item"
import { type GalleryItem, useGalleryStore } from "@/stores/gallery.store"
import useDimensions from "@/hooks/useDimensions"
import { useShallow } from "zustand/shallow"

export const Gallery = memo(
	({
		items,
		panEnabled,
		pinchEnabled,
		doubleTapEnabled,
		swipeToCloseEnabled
	}: {
		items: GalleryItem[]
		panEnabled: boolean
		pinchEnabled: boolean
		doubleTapEnabled: boolean
		swipeToCloseEnabled: boolean
	}) => {
		const [scrollEnabled, setScrollEnabled] = useState<boolean>(true)
		const { screen, isPortrait } = useDimensions()
		const [scrolling, setScrolling] = useState<boolean>(false)
		const currentVisibleIndex = useGalleryStore(useShallow(state => state.currentVisibleIndex))

		const getItemLayout = useCallback(
			(_: unknown, index: number) => ({
				length: screen.width,
				offset: screen.width * index,
				index
			}),
			[screen.width]
		)

		const viewabilityConfig = useMemo((): ViewabilityConfig => {
			return {
				itemVisiblePercentThreshold: 99
			}
		}, [])

		const renderItem = useCallback(
			(item: ListRenderItemInfo<GalleryItem>) => {
				return (
					<Item
						setScrollEnabled={setScrollEnabled}
						panEnabled={panEnabled}
						pinchEnabled={pinchEnabled}
						doubleTapEnabled={doubleTapEnabled}
						swipeToCloseEnabled={swipeToCloseEnabled}
						item={item.item}
						index={item.index}
						layout={screen}
						scrolling={scrolling}
					/>
				)
			},
			[panEnabled, pinchEnabled, doubleTapEnabled, swipeToCloseEnabled, screen, scrolling]
		)

		const onViewableItemsChanged = useCallback(
			(e: { viewableItems: ViewToken<GalleryItem>[]; changed: ViewToken<GalleryItem>[] }) => {
				if (e.viewableItems.length > 0) {
					const visibleIndex = e.viewableItems.map(item => item.index).at(0) ?? -1
					const visibleItem = items.at(visibleIndex)

					if (!visibleItem) {
						return
					}

					useGalleryStore.getState().setCurrentVisibleIndex(visibleIndex)
				}
			},
			[items]
		)

		const fullScreenStyle = useMemo(() => {
			return {
				width: screen.width,
				height: screen.height
			}
		}, [screen.width, screen.height])

		const onScrollBeginDrag = useCallback(() => {
			setScrolling(true)
		}, [])

		const onScrollEndDrag = useCallback(() => {
			setScrolling(false)
		}, [])

		const key = useMemo(() => {
			return isPortrait ? "portrait" : "landscape"
		}, [isPortrait])

		const keyExtractor = useCallback((item: GalleryItem) => {
			return item.itemType === "cloudItem" ? item.data.item.uuid : item.data.uri
		}, [])

		const validatedInitialScrollIndex = useMemo(() => {
			if (!currentVisibleIndex) {
				return undefined
			}

			return items.at(currentVisibleIndex) ? currentVisibleIndex : undefined
		}, [items, currentVisibleIndex])

		return (
			<View
				className="flex-1"
				style={fullScreenStyle}
			>
				<FlatList
					key={key}
					data={items}
					pagingEnabled={true}
					horizontal={true}
					initialScrollIndex={validatedInitialScrollIndex}
					onScrollBeginDrag={onScrollBeginDrag}
					onScrollEndDrag={onScrollEndDrag}
					showsHorizontalScrollIndicator={false}
					showsVerticalScrollIndicator={false}
					scrollEnabled={scrollEnabled}
					renderItem={renderItem}
					keyExtractor={keyExtractor}
					decelerationRate="fast"
					overScrollMode="never"
					bounces={false}
					contentInsetAdjustmentBehavior="never"
					initialNumToRender={3}
					windowSize={3}
					maxToRenderPerBatch={3}
					updateCellsBatchingPeriod={100}
					getItemLayout={getItemLayout}
					viewabilityConfig={viewabilityConfig}
					onViewableItemsChanged={onViewableItemsChanged}
					style={fullScreenStyle}
					nestedScrollEnabled={true}
					snapToAlignment="start"
				/>
			</View>
		)
	}
)

Gallery.displayName = "Gallery"

export default Gallery
