const cacheMap = new Map()

const memoryCache = {
    has: (key: string) => {
        return cacheMap.has(key)
    },
    get: (key: string) => {
        if(cacheMap.has(key)){
            return cacheMap.get(key)
        }

        return null
    },
    set: (key: string, value: any) => {
        cacheMap.set(key, value)

        return true
    },
    delete: (key: string) => {
        if(cacheMap.has(key)){
            cacheMap.delete(key)
        }

        return true
    },
    cache: cacheMap
}

export default memoryCache