import { memo } from "react"
import { type MessageLinkType } from "@/lib/utils"
import YouTube from "./youtube"
import Filen from "./filen"
import Fetch from "./fetch"

export const Embeds = memo(({ links }: { links: { link: string; type: MessageLinkType }[] }) => {
	if (links.length === 0) {
		return null
	}

	return links.map((link, index) => {
		if (link.link.startsWith("http://")) {
			return null
		}

		switch (link.type) {
			case "youtubeEmbed": {
				return (
					<YouTube
						key={`${link}:${index}`}
						link={link.link}
					/>
				)
			}

			case "filenEmbed": {
				return (
					<Filen
						key={`${link}:${index}`}
						link={link.link}
					/>
				)
			}

			case "fetch": {
				return (
					<Fetch
						key={`${link}:${index}`}
						link={link.link}
					/>
				)
			}

			default: {
				return null
			}
		}
	})
})

Embeds.displayName = "Embeds"

export const Embed = memo(({ link, type }: { link: string; type: MessageLinkType }) => {
	if (link.length === 0 || link.startsWith("http://")) {
		return null
	}

	switch (type) {
		case "youtubeEmbed": {
			return <YouTube link={link} />
		}

		case "filenEmbed": {
			return <Filen link={link} />
		}

		case "fetch": {
			return <Fetch link={link} />
		}

		default: {
			return null
		}
	}
})

Embed.displayName = "Embed"

export default Embeds
