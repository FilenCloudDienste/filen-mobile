import React from "react"
import { getRouteURL } from "../lib/helpers"
import { Text, View } from "react-native"
import Ionicon from "react-native-vector-icons/Ionicons"
import { storage } from "../lib/storage"
import { useMMKVBoolean, useMMKVString } from "react-native-mmkv"
import { i18n } from "../i18n/i18n"

export const ListEmpty = ({ route, searchTerm = "" }) => {
    const [darkMode, setDarkMode] = useMMKVBoolean("darkMode", storage)
    const [lang, setLang] = useMMKVString("lang", storage)

    const routeURL = getRouteURL(route)
    const currentScreenName = route.name

    return (
        <View style={{
            justifyContent: "center",
            alignItems: "center",
            marginTop: -100
        }}>
            {
                searchTerm.length > 0 ? (
                    <>
                        <Ionicon name="search-outline" size={70} color={darkMode ? "gray" : "gray"} />
                        <Text style={{
                            color: "gray",
                            marginTop: 5
                        }}>
                            {i18n(lang, "noSearchFound", true, ["__TERM__"], [searchTerm])}
                        </Text>
                    </>
                ) : (
                    <>
                        {
                            routeURL.indexOf("photos") !== -1 && (
                                <>
                                    <Ionicon name="image-outline" size={70} color={darkMode ? "gray" : "gray"} />
                                    <Text style={{
                                        color: "gray",
                                        marginTop: 5
                                    }}>
                                        {i18n(lang, "noImagesUploadedYet")}
                                    </Text>
                                </>
                            )
                        }
                        {
                            routeURL.indexOf("base") !== -1 && (
                                <>
                                    <Ionicon name="document-outline" size={70} color={darkMode ? "gray" : "gray"} />
                                    <Text style={{
                                        color: "gray",
                                        marginTop: 5
                                    }}>
                                        {i18n(lang, "noFilesOrFoldersUploadedYet")}
                                    </Text>
                                </>
                            )
                        }
                        {
                            routeURL.indexOf("recents") !== -1 && (
                                <>
                                    <Ionicon name="time-outline" size={70} color={darkMode ? "gray" : "gray"} />
                                    <Text style={{
                                        color: "gray",
                                        marginTop: 5
                                    }}>
                                        {i18n(lang, "noFilesOrFoldersUploadedYet")}
                                    </Text>
                                </>
                            )
                        }
                        {
                            routeURL.indexOf("shared-in") !== -1 && (
                                <>
                                    <Ionicon name="people-outline" size={70} color={darkMode ? "gray" : "gray"} />
                                    <Text style={{
                                        color: "gray",
                                        marginTop: 5
                                    }}>
                                        {i18n(lang, "nothingSharedYet")}
                                    </Text>
                                </>
                            )
                        }
                        {
                            routeURL.indexOf("shared-out") !== -1 && (
                                <>
                                    <Ionicon name="people-outline" size={70} color={darkMode ? "gray" : "gray"} />
                                    <Text style={{
                                        color: "gray",
                                        marginTop: 5
                                    }}>
                                        {i18n(lang, "nothingSharedYet")}
                                    </Text>
                                </>
                            )
                        }
                        {
                            routeURL.indexOf("links") !== -1 && (
                                <>
                                    <Ionicon name="link-outline" size={70} color={darkMode ? "gray" : "gray"} />
                                    <Text style={{
                                        color: "gray",
                                        marginTop: 5
                                    }}>
                                        {i18n(lang, "noPublicLinksYet")}
                                    </Text>
                                </>
                            )
                        }
                        {
                            routeURL.indexOf("favorites") !== -1 && (
                                <>
                                    <Ionicon name="heart-outline" size={70} color={darkMode ? "gray" : "gray"} />
                                    <Text style={{
                                        color: "gray",
                                        marginTop: 5
                                    }}>
                                        {i18n(lang, "noFavoritesYet")}
                                    </Text>
                                </>
                            )
                        }
                        {
                            routeURL.indexOf("offline") !== -1 && (
                                <>
                                    <Ionicon name="cloud-offline-outline" size={70} color={darkMode ? "gray" : "gray"} />
                                    <Text style={{
                                        color: "gray",
                                        marginTop: 5
                                    }}>
                                        {i18n(lang, "noOfflineFilesYet")}
                                    </Text>
                                </>
                            )
                        }
                        {
                            currentScreenName == "EventsScreen" && (
                                <>
                                    <Ionicon name="alert-circle-outline" size={70} color={darkMode ? "gray" : "gray"} />
                                    <Text style={{
                                        color: "gray",
                                        marginTop: 5
                                    }}>
                                        {i18n(lang, "noEventsYet")}
                                    </Text>
                                </>
                            )
                        }
                    </>
                )
            }
        </View>
    )
}