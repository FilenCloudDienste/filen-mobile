const cacheMap = new Map()

const memoryCache = {
	has: (key: string) => {
		return cacheMap.has(key)
	},
	get: (key: string) => {
		if (cacheMap.has(key)) {
			return cacheMap.get(key)
		}

		return null
	},
	set: (key: string, value: any) => {
		cacheMap.set(key, value)
	},
	delete: (key: string) => {
		cacheMap.delete(key)
	},
	cache: cacheMap
}

export default memoryCache
