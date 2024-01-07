import storage from "../../storage"
import { useMMKVString } from "react-native-mmkv"

const useLang = () => {
	const [lang] = useMMKVString("lang", storage)

	return typeof lang === "string" ? lang : "en"
}

export default useLang
