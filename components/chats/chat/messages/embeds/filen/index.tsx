import { memo, useMemo } from "react"
import { parseFilenPublicLink, getPreviewType } from "@/lib/utils"
import { useQuery } from "@tanstack/react-query"
import nodeWorker from "@/lib/nodeWorker"
import Image from "../containers/image"
import Code from "../containers/code"
import Video from "../containers/video"
import Audio from "../containers/audio"
import PDF from "../containers/pdf"
import DOCX from "../containers/docx"
import { type FileLinkInfoResponse } from "@filen/sdk/dist/types/api/v3/file/link/info"
import { type PreviewType } from "@/stores/gallery.store"
import { type DirLinkInfoDecryptedResponse } from "@filen/sdk/dist/types/api/v3/dir/link/info"
import Directory from "./directory"
import Fallback from "../containers/fallback"
import useHTTPServer from "@/hooks/useHTTPServer"
import useNetInfo from "@/hooks/useNetInfo"

export type PublicLinkInfo =
	| {
			type: "file"
			data: {
				info: Omit<FileLinkInfoResponse, "size"> & {
					size: number
				}
				previewType: PreviewType
			}
	  }
	| {
			type: "directory"
			data: {
				info: DirLinkInfoDecryptedResponse
			}
	  }
	| null

export const Filen = memo(({ link }: { link: string }) => {
	const httpServer = useHTTPServer()
	const { hasInternet } = useNetInfo()

	const publicLink = useMemo(() => {
		return parseFilenPublicLink(link)
	}, [link])

	const query = useQuery({
		queryKey: ["chatEmbedFilenInfo", publicLink],
		enabled: publicLink !== null && hasInternet,
		queryFn: async (): Promise<PublicLinkInfo> => {
			if (!publicLink) {
				throw new Error("No publicLink provided.")
			}

			if (publicLink.type === "directory") {
				const info = await nodeWorker.proxy("directoryPublicLinkInfo", {
					uuid: publicLink.uuid,
					key: publicLink.key
				})

				return {
					type: "directory",
					data: {
						info
					}
				}
			} else {
				const password = await nodeWorker.proxy("filePublicLinkHasPassword", {
					uuid: publicLink.uuid
				})

				if (password.hasPassword) {
					return null
				}

				const info = await nodeWorker.proxy("filePublicLinkInfo", {
					uuid: publicLink.uuid,
					key: publicLink.key
				})

				const previewType = getPreviewType(info.name)

				if (
					previewType === "code" ||
					previewType === "text" ||
					previewType === "image" ||
					previewType === "video" ||
					previewType === "audio" ||
					previewType === "pdf" ||
					previewType === "docx"
				) {
					return {
						type: "file",
						data: {
							info,
							previewType
						}
					}
				}
			}

			return null
		},
		throwOnError(err) {
			console.error(err)

			return false
		},
		refetchOnMount: false,
		refetchOnReconnect: false,
		refetchIntervalInBackground: false,
		refetchOnWindowFocus: false
	})

	const source = useMemo(() => {
		if (!publicLink || query.status !== "success" || !query.data || query.data.type === "directory") {
			return ""
		}

		return `http://127.0.0.1:${httpServer.port}/stream?auth=${httpServer.authToken}&file=${encodeURIComponent(
			btoa(
				JSON.stringify({
					mime: query.data.data.info.mime,
					size: query.data.data.info.size,
					uuid: query.data.data.info.uuid,
					bucket: query.data.data.info.bucket,
					key: publicLink.key,
					version: query.data.data.info.version,
					chunks: query.data.data.info.chunks,
					region: query.data.data.info.region
				})
			)
		)}`
	}, [query.data, query.status, publicLink, httpServer.port, httpServer.authToken])

	if (!publicLink || query.status !== "success" || !query.data) {
		return <Fallback link={link} />
	}

	if (query.data.type === "directory") {
		return (
			<Directory
				info={query.data}
				link={link}
				parsedLink={publicLink}
			/>
		)
	}

	if (query.data.data.previewType === "image" && query.data.data.info.size > 0) {
		return (
			<Image
				link={link}
				source={source}
			/>
		)
	}

	if ((query.data.data.previewType === "code" || query.data.data.previewType === "text") && query.data.data.info.size > 0) {
		return (
			<Code
				link={link}
				name={query.data.data.info.name}
				size={query.data.data.info.size}
				source={source}
			/>
		)
	}

	if (query.data.data.previewType === "video" && query.data.data.info.size > 0) {
		return (
			<Video
				link={link}
				name={query.data.data.info.name}
				source={source}
			/>
		)
	}

	if (query.data.data.previewType === "audio" && query.data.data.info.size > 0) {
		return (
			<Audio
				link={link}
				name={query.data.data.info.name}
				source={source}
			/>
		)
	}

	if (query.data.data.previewType === "pdf" && query.data.data.info.size > 0) {
		return (
			<PDF
				size={query.data.data.info.size}
				name={query.data.data.info.name}
				source={source}
			/>
		)
	}

	if (query.data.data.previewType === "docx" && query.data.data.info.size > 0) {
		return (
			<DOCX
				size={query.data.data.info.size}
				name={query.data.data.info.name}
				source={source}
			/>
		)
	}

	return <Fallback link={link} />
})

Filen.displayName = "Filen"

export default Filen
