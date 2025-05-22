import axios, { type AxiosResponse } from "axios"
import { getPreviewTypeFromMime } from "@/lib/utils"

export class WebpageMetadata {
	public title: string = ""
	public description: string = ""
	public language: string = ""
	public author: string = ""
	public copyright: string = ""
	public canonicalUrl: string = ""
	public favicon: string = ""
	public appleTouchIcon: string = ""
	public manifestUrl: string = ""
	public themeColor: string = ""
	public backgroundColor: string = ""
	public ogTitle: string = ""
	public ogDescription: string = ""
	public ogImage: string = ""
	public ogUrl: string = ""
	public ogSiteName: string = ""
	public ogType: string = ""
	public ogLocale: string = ""
	public ogVideoUrl: string = ""
	public ogAudioUrl: string = ""
	public twitterTitle: string = ""
	public twitterDescription: string = ""
	public twitterImage: string = ""
	public twitterCard: string = ""
	public twitterSite: string = ""
	public twitterCreator: string = ""
	public fbAppId: string = ""
	public articlePublishedTime: string = ""
	public articleModifiedTime: string = ""
	public articleSection: string = ""
	public articleTags: string[] = []
	public publisherName: string = ""
	public publisherLogo: string = ""
	public robots: string = ""
	public keywords: string = ""
	public appleMobileWebAppCapable: string = ""
	public msapplicationTileImage: string = ""
	public msapplicationTileColor: string = ""
	public prevPage: string = ""
	public nextPage: string = ""
	public schemaType: string = ""
}

export class UrlUtils {
	public static resolveUrl(baseUrl: string, relativeUrl: string): string {
		if (!relativeUrl) {
			return ""
		}

		try {
			if (typeof URL !== "undefined") {
				return new URL(relativeUrl, baseUrl).toString()
			}

			if (relativeUrl.startsWith("http://") || relativeUrl.startsWith("https://")) {
				return relativeUrl
			}

			const baseUrlObj = this.parseUrl(baseUrl)

			if (relativeUrl.startsWith("/")) {
				return `${baseUrlObj.protocol}//${baseUrlObj.host}${relativeUrl}`
			} else {
				const pathParts = baseUrlObj.pathname.split("/")

				pathParts.pop()

				return `${baseUrlObj.protocol}//${baseUrlObj.host}${pathParts.join("/")}/${relativeUrl}`
			}
		} catch {
			return relativeUrl
		}
	}

	public static parseUrl(url: string): { protocol: string; host: string; pathname: string } {
		const protocolMatch = /^(https?:)\/\//.exec(url)
		const protocol = protocolMatch ? protocolMatch[1] : "https:"
		const withoutProtocol = url.replace(/^(https?:)?\/\//, "")
		const pathIndex = withoutProtocol.indexOf("/")
		const host = pathIndex >= 0 ? withoutProtocol.substring(0, pathIndex) : withoutProtocol
		const pathname = pathIndex >= 0 ? withoutProtocol.substring(pathIndex) : "/"

		return {
			protocol: protocol ?? "",
			host,
			pathname
		}
	}
}

export class HtmlParser {
	public static extractMetaContent(html: string, pattern: RegExp): string {
		const match = pattern.exec(html)

		return match && match[1] ? match[1].trim() : ""
	}

	public static extractMultipleMatches(html: string, pattern: RegExp): string[] {
		const matches: string[] = []
		let match: RegExpExecArray | null
		const globalPattern = new RegExp(pattern.source, pattern.flags + (pattern.flags.includes("g") ? "" : "g"))

		while ((match = globalPattern.exec(html)) !== null) {
			if (match[1]) {
				matches.push(match[1].trim())
			}
		}

		return matches
	}
}

export type ParseWebpageMetadataResult =
	| {
			type: "html"
			metadata: {
				title: string
				description: string
				image: string
				url: string
				siteName: string
				contentPreview: string
				publishDate: string
				themeColor: string
			}
	  }
	| {
			type: "error"
			error: Error
	  }
	| {
			type: "image" | "video" | "audio" | "pdf" | "docx" | "text" | "code"
			uri: string
	  }

export class WebpageMetadataParser {
	private readonly url: string

	public constructor(url: string) {
		this.url = url
	}

	public async parseWebpageMetadata(): Promise<ParseWebpageMetadataResult> {
		const metadata = new WebpageMetadata()

		try {
			const head: AxiosResponse<string> = await axios.head(this.url, {
				timeout: 15000,
				maxRedirects: 5
			})

			if (head.status !== 200) {
				return {
					type: "error",
					error: new Error("Failed to fetch webpage metadata.")
				}
			}

			const contentType = (head.headers["content-type"] || head.headers["Content-Type"] || "").toLowerCase()

			if (contentType.includes("text/html")) {
				const get: AxiosResponse<string> = await axios.get(this.url, {
					timeout: 15000,
					maxRedirects: 5,
					responseType: "text"
				})

				if (get.status !== 200) {
					return {
						type: "error",
						error: new Error("Failed to fetch webpage metadata.")
					}
				}

				const html = get.data

				metadata.title = HtmlParser.extractMetaContent(html, /<title[^>]*>(.*?)<\/title>/is)
				metadata.description = HtmlParser.extractMetaContent(
					html,
					/<meta[^>]*name=["']description["'][^>]*content=["'](.*?)["'][^>]*>/i
				)
				metadata.language = HtmlParser.extractMetaContent(html, /<html[^>]*lang=["'](.*?)["'][^>]*>/i)
				metadata.author = HtmlParser.extractMetaContent(html, /<meta[^>]*name=["']author["'][^>]*content=["'](.*?)["'][^>]*>/i)
				metadata.copyright = HtmlParser.extractMetaContent(
					html,
					/<meta[^>]*name=["']copyright["'][^>]*content=["'](.*?)["'][^>]*>/i
				)

				metadata.canonicalUrl = HtmlParser.extractMetaContent(html, /<link[^>]*rel=["']canonical["'][^>]*href=["'](.*?)["'][^>]*>/i)

				const faviconContent = HtmlParser.extractMetaContent(
					html,
					/<link[^>]*rel=["'](?:icon|shortcut icon)["'][^>]*href=["'](.*?)["'][^>]*>/i
				)

				metadata.favicon = UrlUtils.resolveUrl(this.url, faviconContent)

				const appleTouchIconContent = HtmlParser.extractMetaContent(
					html,
					/<link[^>]*rel=["']apple-touch-icon["'][^>]*href=["'](.*?)["'][^>]*>/i
				)

				metadata.appleTouchIcon = UrlUtils.resolveUrl(this.url, appleTouchIconContent)

				const manifestUrlContent = HtmlParser.extractMetaContent(
					html,
					/<link[^>]*rel=["']manifest["'][^>]*href=["'](.*?)["'][^>]*>/i
				)

				metadata.manifestUrl = UrlUtils.resolveUrl(this.url, manifestUrlContent)
				metadata.themeColor = HtmlParser.extractMetaContent(
					html,
					/<meta[^>]*name=["']theme-color["'][^>]*content=["'](.*?)["'][^>]*>/i
				)
				metadata.backgroundColor = HtmlParser.extractMetaContent(
					html,
					/<meta[^>]*name=["']background-color["'][^>]*content=["'](.*?)["'][^>]*>/i
				)
				metadata.ogTitle = HtmlParser.extractMetaContent(
					html,
					/<meta[^>]*property=["']og:title["'][^>]*content=["'](.*?)["'][^>]*>/i
				)
				metadata.ogDescription = HtmlParser.extractMetaContent(
					html,
					/<meta[^>]*property=["']og:description["'][^>]*content=["'](.*?)["'][^>]*>/i
				)

				const ogImageContent = HtmlParser.extractMetaContent(
					html,
					/<meta[^>]*property=["']og:image["'][^>]*content=["'](.*?)["'][^>]*>/i
				)

				metadata.ogImage = UrlUtils.resolveUrl(this.url, ogImageContent)

				metadata.ogUrl = HtmlParser.extractMetaContent(html, /<meta[^>]*property=["']og:url["'][^>]*content=["'](.*?)["'][^>]*>/i)
				metadata.ogSiteName = HtmlParser.extractMetaContent(
					html,
					/<meta[^>]*property=["']og:site_name["'][^>]*content=["'](.*?)["'][^>]*>/i
				)
				metadata.ogType = HtmlParser.extractMetaContent(html, /<meta[^>]*property=["']og:type["'][^>]*content=["'](.*?)["'][^>]*>/i)
				metadata.ogLocale = HtmlParser.extractMetaContent(
					html,
					/<meta[^>]*property=["']og:locale["'][^>]*content=["'](.*?)["'][^>]*>/i
				)

				const ogVideoContent = HtmlParser.extractMetaContent(
					html,
					/<meta[^>]*property=["']og:video["'][^>]*content=["'](.*?)["'][^>]*>/i
				)

				metadata.ogVideoUrl = UrlUtils.resolveUrl(this.url, ogVideoContent)

				const ogAudioContent = HtmlParser.extractMetaContent(
					html,
					/<meta[^>]*property=["']og:audio["'][^>]*content=["'](.*?)["'][^>]*>/i
				)

				metadata.ogAudioUrl = UrlUtils.resolveUrl(this.url, ogAudioContent)

				metadata.twitterTitle = HtmlParser.extractMetaContent(
					html,
					/<meta[^>]*name=["']twitter:title["'][^>]*content=["'](.*?)["'][^>]*>/i
				)
				metadata.twitterDescription = HtmlParser.extractMetaContent(
					html,
					/<meta[^>]*name=["']twitter:description["'][^>]*content=["'](.*?)["'][^>]*>/i
				)

				const twitterImageContent = HtmlParser.extractMetaContent(
					html,
					/<meta[^>]*name=["']twitter:image["'][^>]*content=["'](.*?)["'][^>]*>/i
				)

				metadata.twitterImage = UrlUtils.resolveUrl(this.url, twitterImageContent)
				metadata.twitterCard = HtmlParser.extractMetaContent(
					html,
					/<meta[^>]*name=["']twitter:card["'][^>]*content=["'](.*?)["'][^>]*>/i
				)
				metadata.twitterSite = HtmlParser.extractMetaContent(
					html,
					/<meta[^>]*name=["']twitter:site["'][^>]*content=["'](.*?)["'][^>]*>/i
				)
				metadata.twitterCreator = HtmlParser.extractMetaContent(
					html,
					/<meta[^>]*name=["']twitter:creator["'][^>]*content=["'](.*?)["'][^>]*>/i
				)
				metadata.fbAppId = HtmlParser.extractMetaContent(
					html,
					/<meta[^>]*property=["']fb:app_id["'][^>]*content=["'](.*?)["'][^>]*>/i
				)
				metadata.articlePublishedTime = HtmlParser.extractMetaContent(
					html,
					/<meta[^>]*property=["']article:published_time["'][^>]*content=["'](.*?)["'][^>]*>/i
				)
				metadata.articleModifiedTime = HtmlParser.extractMetaContent(
					html,
					/<meta[^>]*property=["']article:modified_time["'][^>]*content=["'](.*?)["'][^>]*>/i
				)
				metadata.articleSection = HtmlParser.extractMetaContent(
					html,
					/<meta[^>]*property=["']article:section["'][^>]*content=["'](.*?)["'][^>]*>/i
				)
				metadata.articleTags = HtmlParser.extractMultipleMatches(
					html,
					/<meta[^>]*property=["']article:tag["'][^>]*content=["'](.*?)["'][^>]*>/i
				)
				metadata.publisherName =
					HtmlParser.extractMetaContent(html, /<meta[^>]*property=["']og:publisher["'][^>]*content=["'](.*?)["'][^>]*>/i) ||
					HtmlParser.extractMetaContent(html, /<meta[^>]*name=["']publisher["'][^>]*content=["'](.*?)["'][^>]*>/i)
				metadata.publisherLogo = HtmlParser.extractMetaContent(
					html,
					/<meta[^>]*property=["']og:publisher:logo["'][^>]*content=["'](.*?)["'][^>]*>/i
				)
				metadata.robots = HtmlParser.extractMetaContent(html, /<meta[^>]*name=["']robots["'][^>]*content=["'](.*?)["'][^>]*>/i)
				metadata.keywords = HtmlParser.extractMetaContent(html, /<meta[^>]*name=["']keywords["'][^>]*content=["'](.*?)["'][^>]*>/i)
				metadata.appleMobileWebAppCapable = HtmlParser.extractMetaContent(
					html,
					/<meta[^>]*name=["']apple-mobile-web-app-capable["'][^>]*content=["'](.*?)["'][^>]*>/i
				)

				const msapplicationTileImageContent = HtmlParser.extractMetaContent(
					html,
					/<meta[^>]*name=["']msapplication-TileImage["'][^>]*content=["'](.*?)["'][^>]*>/i
				)

				metadata.msapplicationTileImage = UrlUtils.resolveUrl(this.url, msapplicationTileImageContent)
				metadata.msapplicationTileColor = HtmlParser.extractMetaContent(
					html,
					/<meta[^>]*name=["']msapplication-TileColor["'][^>]*content=["'](.*?)["'][^>]*>/i
				)

				const prevPageContent = HtmlParser.extractMetaContent(html, /<link[^>]*rel=["']prev["'][^>]*href=["'](.*?)["'][^>]*>/i)

				metadata.prevPage = UrlUtils.resolveUrl(this.url, prevPageContent)

				const nextPageContent = HtmlParser.extractMetaContent(html, /<link[^>]*rel=["']next["'][^>]*href=["'](.*?)["'][^>]*>/i)

				metadata.nextPage = UrlUtils.resolveUrl(this.url, nextPageContent)
				metadata.schemaType = HtmlParser.extractMetaContent(html, /<[^>]*itemtype=["'](http:\/\/schema\.org\/[^"']*)["'][^>]*>/i)

				if (!metadata.ogTitle) {
					metadata.ogTitle = metadata.title
				}

				if (!metadata.ogDescription) {
					metadata.ogDescription = metadata.description
				}

				if (!metadata.twitterTitle) {
					metadata.twitterTitle = metadata.ogTitle || metadata.title
				}

				if (!metadata.twitterDescription) {
					metadata.twitterDescription = metadata.ogDescription || metadata.description
				}

				return {
					type: "html",
					metadata: {
						title: metadata.ogTitle || metadata.twitterTitle || metadata.title || "",
						description: metadata.ogDescription || metadata.twitterDescription || metadata.description || "",
						image: metadata.ogImage || metadata.twitterImage || metadata.msapplicationTileImage || "",
						url: metadata.ogUrl || metadata.canonicalUrl || "",
						siteName: metadata.ogSiteName || metadata.publisherName || "",
						contentPreview: metadata.description || "",
						publishDate: metadata.articlePublishedTime || "",
						themeColor: metadata.themeColor || metadata.backgroundColor || ""
					}
				}
			}

			const previewType = getPreviewTypeFromMime(contentType)

			if (
				previewType === "image" ||
				previewType === "video" ||
				previewType === "audio" ||
				previewType === "pdf" ||
				previewType === "docx" ||
				previewType === "code" ||
				previewType === "text"
			) {
				return {
					type: previewType,
					uri: this.url
				}
			}

			return {
				type: "error",
				error: new Error("Unknown content type.")
			}
		} catch (e) {
			if (e instanceof Error) {
				return {
					type: "error",
					error: e
				}
			}

			return {
				type: "error",
				error: new Error("Unknown error.")
			}
		}
	}
}
