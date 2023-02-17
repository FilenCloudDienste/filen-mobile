import React, { memo, useMemo } from "react"
import { ICFG, CFGAnnouncement } from "../../types"
import { View, Text, TouchableOpacity } from "react-native"
import { getColor } from "../../style"
import useDarkMode from "../../lib/hooks/useDarkMode"
import useLang from "../../lib/hooks/useLang"
import { i18n } from "../../i18n"
import storage from "../../lib/storage"
import { useMMKVObject } from "react-native-mmkv"

const Announcement = memo(({ announcement, index }: { announcement: CFGAnnouncement, index: number }) => {
    const darkMode = useDarkMode()
    const lang = useLang()
    const [acknowledgedAnnouncements, setAcknowledgedAnnouncements] = useMMKVObject<Record<string, boolean>>("acknowledgedAnnouncements", storage)

    return (
        <View
            style={{
                zIndex: (9999 + index),
                flexDirection: "row",
                justifyContent: "space-between"
            }}
        >
            <Text
                style={{
                    color: getColor(darkMode, "textSecondary"),
                    fontSize: 14,
                    fontWeight: "400",
                    width: "90%",
                    paddingRight: 15
                }}
            >
                {announcement.message}
            </Text>
            <TouchableOpacity
                style={{
                    flexDirection: "row",
                    justifyContent: "flex-end",
                    alignItems: "center"
                }}
                hitSlop={{
                    top: 15,
                    bottom: 15,
                    right: 15,
                    left: 15
                }}
                onPress={() => {
                    if(typeof acknowledgedAnnouncements == "undefined"){
                        setAcknowledgedAnnouncements({
                            [announcement.uuid]: true
                        })

                        return
                    }
                    
                    setAcknowledgedAnnouncements({
                        ...acknowledgedAnnouncements,
                        [announcement.uuid]: true
                    })
                }}
            >
                <Text
                    style={{
                        color: getColor(darkMode, "linkPrimary"),
                        fontSize: 16,
                        fontWeight: "400"
                    }}
                >
                    {i18n(lang, "ok")}
                </Text>
            </TouchableOpacity>
        </View>
    )
})

const Announcements = memo(({ cfg }: { cfg: ICFG }) => {
    const darkMode = useDarkMode()
    const [acknowledgedAnnouncements, setAcknowledgedAnnouncements] = useMMKVObject<Record<string, boolean>>("acknowledgedAnnouncements", storage)

    const announcements = useMemo(() => {
        return cfg.announcements.filter(announcement => announcement.active && (announcement.platforms.includes("mobile") || announcement.platforms.includes("all") && (typeof (acknowledgedAnnouncements || {})[announcement.uuid] == "undefined")))
    }, [cfg.announcements, acknowledgedAnnouncements])

    if(announcements.length == 0){
        return null
    }

    return (
        <View
            style={{
                position: "relative",
                width: "100%",
                bottom: 5,
                height: "auto",
                padding: 5
            }}
        >
            <View
                style={{
                    padding: 10,
                    height: "auto",
                    flexDirection: "row",
                    justifyContent: "space-between",
                    backgroundColor: getColor(darkMode, "backgroundSecondary"),
                    borderRadius: 5
                }}
            >
                {
                    announcements.map((announcement, index) => {
                        if(typeof (acknowledgedAnnouncements || {})[announcement.uuid] !== "undefined"){
                            return null
                        }

                        if(!announcement.platforms.includes("mobile") || !announcement.platforms.includes("all")){
                            return null
                        }

                        return (
                            <Announcement
                                key={index}
                                index={index}
                                announcement={announcement}
                            />
                        )
                    })
                }
            </View>
        </View>
    )
})

export default Announcements