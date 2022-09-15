import React, { memo } from "react"
import { View } from "react-native"
import LinearGradient from "react-native-linear-gradient"
import MaskedView from "@react-native-community/masked-view"

export const Gradient = memo(({ children, style = undefined }: { children: any, style?: any }) => {
    return (
        <View>
            <MaskedView
                style={{ flex: 1 }}
                maskElement={
                    <View
                        style={{
                            backgroundColor: 'transparent',
                            justifyContent: 'center',
                            alignItems: 'center',
                        }}>
                        {children}
                    </View>
                }
            >
                <LinearGradient
                    colors={['#CA1A80', '#421774']}
                    style={{ flex: 1 }}
                >
                    <View style={{ opacity: 0 }}>
                        {children}
                    </View>
                </LinearGradient>
            </MaskedView>
      </View>
    )
})