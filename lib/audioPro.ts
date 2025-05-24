// @ts-expect-error Workaround
import * as AudioProWorkaround from "react-native-audio-pro/lib/commonjs/audioPro"
// @ts-expect-error Workaround
import * as useAudioProWorkaround from "react-native-audio-pro/lib/commonjs/useAudioPro"
import { type AudioPro as AudioProType, type useAudioPro as useAudioProType } from "react-native-audio-pro"

export const AudioPro = AudioProWorkaround.AudioPro as unknown as typeof AudioProType
export const useAudioPro = useAudioProWorkaround.useAudioPro as typeof useAudioProType
