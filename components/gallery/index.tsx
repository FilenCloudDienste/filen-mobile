import { View, type ListRenderItemInfo, type ViewToken, type ViewabilityConfig } from "react-native"
import { memo, useState, useCallback, useMemo, useEffect, useRef } from "react"
import { FlatList } from "react-native-gesture-handler"
import Item from "./item"
import { type GalleryItem, useGalleryStore } from "@/stores/gallery.store"
import useDimensions from "@/hooks/useDimensions"
import Header from "./header"
import { useShallow } from "zustand/shallow"

export const Gallery = memo(
	({
		items,
		initialScrollIndex,
		panEnabled,
		pinchEnabled,
		doubleTapEnabled,
		swipeToCloseEnabled
	}: {
		items: GalleryItem[]
		initialScrollIndex: number
		panEnabled: boolean
		pinchEnabled: boolean
		doubleTapEnabled: boolean
		swipeToCloseEnabled: boolean
	}) => {
		const [scrollEnabled, setScrollEnabled] = useState<boolean>(true)
		const [showHeader, setShowHeader] = useState<boolean>(false)
		const setGalleryCurrentVisibleIndex = useGalleryStore(useShallow(state => state.setCurrentVisibleIndex))
		const { screen, isPortrait } = useDimensions()
		const initialVisibleIndexSet = useRef<boolean>(false)
		const galleryCurrentVisibleIndex = useGalleryStore(useShallow(state => state.currentVisibleIndex))
		const setVisible = useGalleryStore(useShallow(state => state.setVisible))
		const visible = useGalleryStore(useShallow(state => state.visible))
		const [scrolling, setScrolling] = useState<boolean>(false)

		const validInitialScrollIndex = useMemo(() => {
			if (galleryCurrentVisibleIndex && typeof items.at(galleryCurrentVisibleIndex) !== "undefined") {
				return galleryCurrentVisibleIndex >= 0 ? galleryCurrentVisibleIndex : 0
			}

			return typeof items.at(initialScrollIndex) === "undefined" || initialScrollIndex < 0 ? 0 : initialScrollIndex
		}, [initialScrollIndex, items, galleryCurrentVisibleIndex])

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
						setShowHeader={setShowHeader}
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
				if (e.viewableItems.length > 0 && initialVisibleIndexSet.current) {
					const visibleIndex = e.viewableItems.map(item => item.index).at(0) ?? -1
					const visibleItem = items.at(visibleIndex)

					if (!visibleItem) {
						return
					}

					setGalleryCurrentVisibleIndex(visibleIndex)
				}
			},
			[setGalleryCurrentVisibleIndex, items]
		)

		const fullScreenStyle = useMemo(() => {
			return {
				width: screen.width,
				height: screen.height
			}
		}, [screen.width, screen.height])

		useEffect(() => {
			if (initialVisibleIndexSet.current) {
				return
			}

			initialVisibleIndexSet.current = true

			setGalleryCurrentVisibleIndex(validInitialScrollIndex)
		}, [setGalleryCurrentVisibleIndex, validInitialScrollIndex])

		useEffect(() => {
			if (items.length === 0 && visible) {
				setVisible(false)
			}

			return () => {
				setGalleryCurrentVisibleIndex(null)
			}
		}, [items.length, setGalleryCurrentVisibleIndex, setVisible, visible])

		return (
			<View
				className="flex-1"
				style={fullScreenStyle}
			>
				<Header
					items={items}
					show={showHeader}
				/>
				<FlatList
					key={isPortrait ? "portrait" : "landscape"}
					data={items}
					pagingEnabled={true}
					horizontal={true}
					initialScrollIndex={validInitialScrollIndex}
					onScrollBeginDrag={() => {
						setScrolling(true)
					}}
					onScrollEndDrag={() => {
						setScrolling(false)
					}}
					showsHorizontalScrollIndicator={false}
					showsVerticalScrollIndicator={false}
					scrollEnabled={scrollEnabled}
					renderItem={renderItem}
					decelerationRate="fast"
					overScrollMode="never"
					bounces={false}
					contentInsetAdjustmentBehavior="never"
					initialNumToRender={5}
					windowSize={5}
					maxToRenderPerBatch={5}
					getItemLayout={getItemLayout}
					viewabilityConfig={viewabilityConfig}
					onViewableItemsChanged={onViewableItemsChanged}
					style={fullScreenStyle}
					removeClippedSubviews={true}
					nestedScrollEnabled={true}
					snapToAlignment="start"
				/>
			</View>
		)
	}
)

Gallery.displayName = "Gallery"

export default Gallery
