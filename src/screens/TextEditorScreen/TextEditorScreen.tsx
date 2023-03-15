import React, { useState, useEffect, memo, useCallback } from "react"
import { View, TouchableOpacity, Alert, useWindowDimensions, Platform } from "react-native"
import useLang from "../../lib/hooks/useLang"
import Ionicon from "@expo/vector-icons/Ionicons"
import { i18n } from "../../i18n"
import { showToast } from "../../components/Toasts"
import RNFS from "react-native-fs"
import { getDownloadPath } from "../../lib/services/download/download"
import { queueFileUpload } from "../../lib/services/upload/upload"
import { useStore } from "../../lib/state"
import { getColor } from "../../style/colors"
import { getParent, getFileExt } from "../../lib/helpers"
import DefaultTopBar from "../../components/TopBar/DefaultTopBar"
import useDarkMode from "../../lib/hooks/useDarkMode"
import CodeEditor, { CodeEditorSyntaxStyles } from "@rivascva/react-native-code-editor"
import { NavigationContainerRef } from "@react-navigation/native"
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context"
import { useKeyboard } from "@react-native-community/hooks"
import { useMountedState } from "react-use"

export type Languages = '1c' | 'abnf' | 'accesslog' | 'actionscript' | 'ada' | 'angelscript' | 'apache' | 'applescript' | 'arcade' | 'arduino' | 'armasm' | 'asciidoc' | 'aspectj' | 'autohotkey' | 'autoit' | 'avrasm' | 'awk' | 'axapta' | 'bash' | 'basic' | 'bnf' | 'brainfuck' | 'c-like' | 'c' | 'cal' | 'capnproto' | 'ceylon' | 'clean' | 'clojure-repl' | 'clojure' | 'cmake' | 'coffeescript' | 'coq' | 'cos' | 'cpp' | 'crmsh' | 'crystal' | 'csharp' | 'csp' | 'css' | 'd' | 'dart' | 'delphi' | 'diff' | 'django' | 'dns' | 'dockerfile' | 'dos' | 'dsconfig' | 'dts' | 'dust' | 'ebnf' | 'elixir' | 'elm' | 'erb' | 'erlang-repl' | 'erlang' | 'excel' | 'fix' | 'flix' | 'fortran' | 'fsharp' | 'gams' | 'gauss' | 'gcode' | 'gherkin' | 'glsl' | 'gml' | 'go' | 'golo' | 'gradle' | 'groovy' | 'haml' | 'handlebars' | 'haskell' | 'haxe' | 'hsp' | 'htmlbars' | 'http' | 'hy' | 'inform7' | 'ini' | 'irpf90' | 'isbl' | 'java' | 'javascript' | 'jboss-cli' | 'json' | 'julia-repl' | 'julia' | 'kotlin' | 'lasso' | 'latex' | 'ldif' | 'leaf' | 'less' | 'lisp' | 'livecodeserver' | 'livescript' | 'llvm' | 'lsl' | 'lua' | 'makefile' | 'markdown' | 'mathematica' | 'matlab' | 'maxima' | 'mel' | 'mercury' | 'mipsasm' | 'mizar' | 'mojolicious' | 'monkey' | 'moonscript' | 'n1ql' | 'nginx' | 'nim' | 'nix' | 'node-repl' | 'nsis' | 'objectivec' | 'ocaml' | 'openscad' | 'oxygene' | 'parser3' | 'perl' | 'pf' | 'pgsql' | 'php-template' | 'php' | 'plaintext' | 'pony' | 'powershell' | 'processing' | 'profile' | 'prolog' | 'properties' | 'protobuf' | 'puppet' | 'purebasic' | 'python-repl' | 'python' | 'q' | 'qml' | 'r' | 'reasonml' | 'rib' | 'roboconf' | 'routeros' | 'rsl' | 'ruby' | 'ruleslanguage' | 'rust' | 'sas' | 'scala' | 'scheme' | 'scilab' | 'scss' | 'shell' | 'smali' | 'smalltalk' | 'sml' | 'sqf' | 'sql' | 'stan' | 'stata' | 'step21' | 'stylus' | 'subunit' | 'swift' | 'taggerscript' | 'tap' | 'tcl' | 'thrift' | 'tp' | 'twig' | 'typescript' | 'vala' | 'vbnet' | 'vbscript-html' | 'vbscript' | 'verilog' | 'vhdl' | 'vim' | 'x86asm' | 'xl' | 'xml' | 'xquery' | 'yaml' | 'zephir'

export const getLanguageOfFile = (name: string): Languages => {
    const ext: string = getFileExt(name)

    switch(ext){
        case "json":
            return "json"
        break
        case "xml":
            return "xml"
        break
        case "rs":
            return "rust"
        break
        case "py":
            return "python"
        break
        case "css":
            return "css"
        break
        case "cpp":
            return "cpp"
        break
        case "md":
            return "markdown"
        break
        case "php":
            return "php"
        break
        case "java":
            return "java"
        break
        case "html":
        case "html5":
            return "htmlbars"
        break
        case "sql":
            return "sql"
        break
        case "ts":
            return "typescript"
        break
        case "tsx":
            return "typescript"
        break
        case "jsx":
            return "javascript"
        break
        case "js":
            return "javascript"
        break
        default:
            return "plaintext"
        break
    }
}

export interface TextEditorScreenProps {
    navigation: NavigationContainerRef<ReactNavigation.RootParamList>
}

export const TextEditorScreen = memo(({ navigation }: TextEditorScreenProps) => {
    const darkMode = useDarkMode()
    const lang = useLang()
    const textEditorText = useStore(state => state.textEditorText)
    const textEditorState = useStore(state => state.textEditorState)
    const currentActionSheetItem = useStore(state => state.currentActionSheetItem)
    const [value, setValue] = useState<string>("")
    const createTextFileDialogName = useStore(state => state.createTextFileDialogName)
    const textEditorParent = useStore(state => state.textEditorParent)
    const setTextEditorState = useStore(state => state.setTextEditorState)
    const keyboard = useKeyboard()
    const insets = useSafeAreaInsets()
    const dimensions = useWindowDimensions()
    const [portrait, setPortrait] = useState<boolean>(dimensions.height >= dimensions.width)
    const isMounted = useMountedState()

    const fileName: string = textEditorState == "edit" ? createTextFileDialogName : currentActionSheetItem?.name as string

    const save = useCallback(() => {
        if(value.length <= 0){
            return
        }

        if(value == textEditorText){
            return navigation.goBack()
        }

        let parent: string = getParent()

        if(textEditorParent.length > 16){
            parent = textEditorParent
        }

        if(parent.length < 16){
            return
        }

        navigation.goBack()

        getDownloadPath({ type: "temp" }).then(async (path) => {
            path = path + fileName

            try{
                if((await RNFS.exists(path))){
                    await RNFS.unlink(path)
                }
            }
            catch(e){
                //console.log(e)
            }

            RNFS.writeFile(path, value, "utf8").then(async () => {
                try{
                    var stat = await RNFS.stat(path)
                }
                catch(e: any){
                    console.log(e)

                    showToast({ message: e.toString() })

                    return
                }

                if(typeof stat !== "object"){
                    return
                }

                queueFileUpload({
                    file: {
                        path: decodeURIComponent(path).replace("file://", ""),
                        name: fileName,
                        size: stat.size,
                        mime: "text/plain",
                        lastModified: new Date().getTime()
                    },
                    parent
                }).catch((err) => {
                    if(err == "stopped"){
                        return
                    }
                    
                    if(err == "wifiOnly"){
                        showToast({ message: i18n(lang, "onlyWifiUploads") })

                        return
                    }
    
                    console.error(err)
    
                    showToast({ message: err.toString() })
                })
            }).catch((err) => {
                console.log(err)

                showToast({ message: err.toString() })
            })
        })
    }, [textEditorText, value, textEditorParent])

    const close = useCallback(() => {
        if(textEditorText !== value){
            Alert.alert(i18n(lang, "exit"), i18n(lang, "exitWithoutSavingChanges"), [
                {
                    text: i18n(lang, "cancel"),
                    onPress: () => {
                        return false
                    },
                    style: "cancel"
                },
                {
                    text: i18n(lang, "exit"),
                    onPress: () => {
                        navigation.goBack()
                    },
                    style: "default"
                }
            ], {
                cancelable: true
            })
        }
        else{
            navigation.goBack()
        }
    }, [textEditorText, value])

    useEffect(() => {
        if(isMounted()){
            setPortrait(dimensions.height >= dimensions.width)
        }
    }, [dimensions])

    useEffect(() => {
        if(textEditorText.length > 0){
            setValue(textEditorText)
        }
        else{
            setValue("")
        }
    }, [textEditorText])

    return (
        <>
            <DefaultTopBar
                leftText={i18n(lang, "back")}
                middleText={fileName}
                onPressBack={() => close()}
                height={44}
                rightComponent={
                    textEditorState == "edit" ? (
                        <View
                            style={{
                                flexDirection: "row",
                                width: "33%",
                                justifyContent: "flex-end",
                                paddingRight: 15
                            }}
                        >
                            {
                                textEditorText !== value && (
                                    <TouchableOpacity
                                        onPress={() => save()}
                                        hitSlop={{
                                            top: 15,
                                            bottom: 15,
                                            right: 15,
                                            left: 15
                                        }}
                                    >
                                        <Ionicon
                                            name="save-outline"
                                            size={21}
                                            color={getColor(darkMode, "linkPrimary")}
                                            style={{
                                                marginTop: 5
                                            }}
                                        />
                                    </TouchableOpacity>
                                )
                            }
                        </View>
                    ) : undefined
                }
            />
            <SafeAreaView>
                <CodeEditor
                    style={{
                        marginTop: portrait && Platform.OS == "ios" ? -insets.top : 0,
                        fontSize: 15,
                        inputLineHeight: 21,
                        highlighterLineHeight: 21,
                        ...(keyboard.keyboardShown
                            ? { marginBottom: keyboard.keyboardHeight - insets.bottom }
                            : {}),
                    }}
                    autoFocus={false}
                    onChange={(e) => {
                        setValue(e)
                        setTextEditorState("edit")
                    }}
                    initialValue={textEditorText.length > 0 ? textEditorText : ""}
                    language={getLanguageOfFile(fileName) as Languages}
                    syntaxStyle={darkMode ? CodeEditorSyntaxStyles.monokai : CodeEditorSyntaxStyles.github}
                    showLineNumbers={true}
                />
            </SafeAreaView>
        </>
    )
})