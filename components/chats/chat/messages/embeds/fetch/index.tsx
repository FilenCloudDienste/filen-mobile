import { memo, useCallback, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { DEFAULT_QUERY_OPTIONS } from "@/queries/client"
import { WebpageMetadataParser } from "./parser"
import * as Linking from "expo-linking"
import alerts from "@/lib/alerts"
import TurboImage from "react-native-turbo-image"
import Video from "../containers/video"
import Image from "../containers/image"
import DOCX from "../containers/docx"
import PDF from "../containers/pdf"
import Audio from "../containers/audio"
import Code from "../containers/code"
import Outer from "../containers/outer"
import Fallback from "../containers/fallback"
import pathModule from "path"
import useNetInfo from "@/hooks/useNetInfo"
import assets from "@/lib/assets"

export const Fetch = memo(({ link }: { link: string }) => {
	const { hasInternet } = useNetInfo()

	const query = useQuery({
		queryKey: ["chatEmbedFetchDataParsed", link],
		queryFn: () => new WebpageMetadataParser(link).parseWebpageMetadata(),
		throwOnError(err) {
			console.error(err)

			return false
		},
		refetchOnMount: DEFAULT_QUERY_OPTIONS.refetchOnMount,
		refetchOnReconnect: DEFAULT_QUERY_OPTIONS.refetchOnReconnect,
		refetchOnWindowFocus: DEFAULT_QUERY_OPTIONS.refetchOnWindowFocus,
		staleTime: DEFAULT_QUERY_OPTIONS.staleTime,
		gcTime: DEFAULT_QUERY_OPTIONS.gcTime,
		refetchInterval: false,
		enabled: hasInternet
	})

	const name = useMemo(() => {
		return pathModule.posix.basename(link)
	}, [link])

	const onPress = useCallback(async () => {
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
	}, [link])

	if (query.status !== "success" || query.data.type === "error") {
		return <Fallback link={link} />
	}

	if (query.data.type === "image") {
		return (
			<Image
				link={link}
				source={query.data.uri}
			/>
		)
	}

	if (query.data.type === "video") {
		return (
			<Video
				link={link}
				source={query.data.uri}
				name={name}
			/>
		)
	}

	if (query.data.type === "audio") {
		return (
			<Audio
				link={link}
				source={query.data.uri}
				name={name}
			/>
		)
	}

	if (query.data.type === "docx") {
		return (
			<DOCX
				source={query.data.uri}
				name={name}
			/>
		)
	}

	if (query.data.type === "pdf") {
		return (
			<PDF
				source={query.data.uri}
				name={name}
			/>
		)
	}

	if (query.data.type === "code") {
		return (
			<Code
				link={link}
				source={query.data.uri}
				name={name}
			/>
		)
	}

	if (
		query.data.type === "html" &&
		query.data.metadata.title &&
		query.data.metadata.title.length > 0 &&
		query.data.metadata.description &&
		query.data.metadata.description.length > 0
	) {
		return (
			<Outer
				leftBorderColor={
					query.data.metadata.themeColor && query.data.metadata.themeColor.length > 0 ? query.data.metadata.themeColor : undefined
				}
				title={query.data.metadata.title}
				onPress={onPress}
				description={query.data.metadata.description}
				above={<Fallback link={link} />}
			>
				{query.data.metadata.image && query.data.metadata.image.length > 0 ? (
					<TurboImage
						source={{
							uri: query.data.metadata.image
						}}
						cachePolicy="dataCache"
						resizeMode="contain"
						style={{
							width: "100%",
							height: "100%"
						}}
						placeholder={{
							blurhash: assets.blurhash.images.fallback
						}}
					/>
				) : undefined}
			</Outer>
		)
	}

	return <Fallback link={link} />
})

Fetch.displayName = "Fetch"

export default Fetch
