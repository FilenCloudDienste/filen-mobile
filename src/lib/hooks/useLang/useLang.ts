import { useState, useEffect } from "react"
import storage from "../../storage"
import { useMMKVString } from "react-native-mmkv"

const useLang = () => {
    const [lang, setLang] = useState<string>(storage.getString("lang") || "en")
    const [langDb, _] = useMMKVString("lang", storage)

    useEffect(() => {
        setLang(typeof langDb == "string" ? langDb : "en")
    }, [langDb])

    return lang
}

export default useLang