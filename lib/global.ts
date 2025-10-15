import "../global.css"
import "expo-dev-client"
import "@/lib/reactQueryOnlineStatus"
import "@/lib/i18n"
import NetInfo from "@react-native-community/netinfo"

if (!__DEV__) {
	globalThis.console = {
		...globalThis.console,
		log: () => {},
		error: () => {},
		warn: () => {},
		info: () => {},
		debug: () => {},
		trace: () => {},
		table: () => {},
		dir: () => {}
	}
}

NetInfo.configure({
	reachabilityUrl: "https://gateway.filen.io",
	reachabilityTest: async response => response.status === 200,
	reachabilityLongTimeout: 60 * 1000,
	reachabilityShortTimeout: 30 * 1000,
	reachabilityRequestTimeout: 45 * 1000,
	reachabilityShouldRun: () => true,
	shouldFetchWiFiSSID: false,
	useNativeReachability: false
})
