import { memo } from "react"
import type { MessageLinkType } from "@/lib/utils"
import YouTube from "./youtube"
import Filen from "./filen"
import Fetch from "./fetch"

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

export default Embed
