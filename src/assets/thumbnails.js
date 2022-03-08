export const getImageForItem = (item) => {
    if(item.type == "folder"){
        return require("./images/folder.png")
    }

    if(typeof item.thumbnail == "string"){
        return require("./images/types/jpg.png")
    }

    let ex = item.name.split(".")

    if(item.name.indexOf(".") !== -1){
        switch(ex[ex.length - 1]){
            case "pdf":
                return require("./images/types/pdf.png")
            break
            case "doc":
            case "docx":
                return require("./images/types/doc.png")
            break
            case "exe":
                return require("./images/types/exe.png")
            break
            case "mp3":
                return require("./images/types/mp3.png")
            break
            case "json":
                return require("./images/types/json-file.png")
            break
            case "png":
                return require("./images/types/png.png")
            break
            //case "ico":
            //  return require("./images/types/ico.png")
            //break
            case "txt":
                return require("./images/types/txt.png")
            break
            case "jpg":
            case "jpeg":
                return require("./images/types/jpg.png")
            break
            case "iso":
                return require("./images/types/iso.png")
            break
            case "js":
                return require("./images/types/javascript.png")
            break
            case "html":
                return require("./images/types/html.png")
            break
            case "css":
                return require("./images/types/css.png")
            break
            case "csv":
                return require("./images/types/csv.png")
            break
            case "avi":
                return require("./images/types/avi.png")
            break
            case "mp4":
                return require("./images/types/mp4.png")
            break
            case "ppt":
                return require("./images/types/ppt.png")
            break
            case "zip":
                return require("./images/types/zip.png")
            break
            case "rar":
            case "tar":
            case "tgz":
            case "gz":
            case "gzip":
                return require("./images/types/zip-1.png")
            break
            case "svg":
                return require("./images/types/svg.png")
            break
            case "xml":
                return require("./images/types/xml.png")
            break
            case "dwg":
                return require("./images/types/dwg.png")
            break
            case "fla":
                return require("./images/types/fla.png")
            break
            case "ai":
                return require("./images/types/ai.png")
            break
            default:
                return require("./images/types/file.png")
            break
        }
    }

    return require("./images/types/file.png")
}