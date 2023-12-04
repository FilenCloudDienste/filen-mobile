import { useState, useEffect } from "react"
import storage from "../../storage"
import { useMMKVBoolean } from "react-native-mmkv"

const useIsLoggedIn = () => {
	const [isLoggedIn] = useMMKVBoolean("isLoggedIn", storage)

	return isLoggedIn
}

export default useIsLoggedIn
