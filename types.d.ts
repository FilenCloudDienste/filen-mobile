declare module "react-native-exif" {
    export function getExif(path: string): Promise<any>
}

declare module "react-native-media-meta" {
    export function get(path: string, {
        getThumb
    }: {
        getThumb: boolean
    }): Promise<any>
}