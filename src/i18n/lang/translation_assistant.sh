#!/usr/bin/env bash

#
# Program asking for a language code,
# which will automatically convert or create the corresponding PO files
# to better handle translation with a dedicated translation editor (POedit, Lokalize, etc.)
#
# Script based on this template: https://github.com/ralish/bash-script-template
#

# Version code
VERSION="0.6"

# Valid language codes (based on https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes)
ACCEPTED_LANGS=( ab aa af ak sq am ar an hy as av ae ay az bm ba eu be bn bi bs br bg my ca ch ce ny zh cu cv kw co cr hr cs da dv nl dz en eo et ee fo fj fi fr fy ff gd gl lg ka de el kl gn gu ht ha he hz hi ho hu is io ig id ia ie iu ik ga it ja jv kn kr ks kk km ki rw ky kv kg ko kj ku lo la lv li ln lt lu lb mk mg ms ml mt gv mi mr mh mn na nv nd nr ng ne no nb nn ii oc oj or om os pi ps fa pl pt pa qu ro rm rn ru se sm sg sa sc sr sn sd si sk sl so st es su sw ss sv tl ty tg ta tt te th bo ti to ts tn tr tk tw ug uk ur uz ve vi vo wa cy wo xh yi yo za zu )

############# SCRIPTING TOOLS #############

# Enable xtrace if the DEBUG environment variable is set
if [[ ${DEBUG-} =~ ^1|yes|true$ ]]; then
    set -o xtrace       # Trace the execution of the script (debug)
fi

# Enable errtrace or the error trap handler will not work as expected
set -o errtrace         # Ensure the error trap handler is inherited

# DESC: Generic script initialisation
# ARGS: $@ (optional): Arguments provided to the script
# OUTS: $orig_cwd: The current working directory when the script was run
#       $script_path: The full path to the script
#       $script_dir: The directory path of the script
#       $script_name: The file name of the script
#       $script_params: The original parameters provided to the script
#       $ta_none: The ANSI control code to reset all text attributes
# NOTE: $script_path only contains the path that was used to call the script
#       and will not resolve any symlinks which may be present in the path.
#       You can use a tool like realpath to obtain the "true" path. The same
#       caveat applies to both the $script_dir and $script_name variables.
# shellcheck disable=SC2034
function script_init() {
    # Useful variables
    readonly orig_cwd="$PWD"
    readonly script_params="$*"
    readonly script_path="${BASH_SOURCE[1]}"
    script_dir="$(dirname "$script_path")"
    script_name="$(basename "$script_path")"
    readonly script_dir script_name
    readonly source_translation="$script_dir/en/en.ts"
    readonly langselect_po="$script_dir/$2/$2.po"
    readonly langselect_ts="$script_dir/$2/$2.ts"


    # Check necessary files
    if [[ ! -e $source_translation ]]; then
        echo "Source files were not found!"
        echo "Make sure the file was not moved from it's original location!"
        exit 1
    fi

    # Init color output
    readonly ta_none="$(tput sgr0 2> /dev/null || true)"
    if [[ -z ${no_colour-} ]]; then
        # Text attributes
        readonly ta_bold="$(tput bold 2> /dev/null || true)"
        printf '%b' "$ta_none"
        readonly ta_uscore="$(tput smul 2> /dev/null || true)"
        printf '%b' "$ta_none"
        readonly ta_blink="$(tput blink 2> /dev/null || true)"
        printf '%b' "$ta_none"
        readonly ta_reverse="$(tput rev 2> /dev/null || true)"
        printf '%b' "$ta_none"
        readonly ta_conceal="$(tput invis 2> /dev/null || true)"
        printf '%b' "$ta_none"

        # Foreground codes
        readonly fg_grey="$(tput setaf 8 2> /dev/null || true)"
        printf '%b' "$ta_none"
        readonly fg_blue="$(tput setaf 4 2> /dev/null || true)"
        printf '%b' "$ta_none"
        readonly fg_cyan="$(tput setaf 6 2> /dev/null || true)"
        printf '%b' "$ta_none"
        readonly fg_green="$(tput setaf 2 2> /dev/null || true)"
        printf '%b' "$ta_none"
        readonly fg_magenta="$(tput setaf 5 2> /dev/null || true)"
        printf '%b' "$ta_none"
        readonly fg_red="$(tput setaf 1 2> /dev/null || true)"
        printf '%b' "$ta_none"
        readonly fg_white="$(tput setaf 7 2> /dev/null || true)"
        printf '%b' "$ta_none"
        readonly fg_yellow="$(tput setaf 3 2> /dev/null || true)"
        printf '%b' "$ta_none"
    else
        # Text attributes
        readonly ta_bold=''
        readonly ta_uscore=''
        readonly ta_blink=''
        readonly ta_reverse=''
        readonly ta_conceal=''

        # Foreground codes
        readonly fg_grey=''
        readonly fg_blue=''
        readonly fg_cyan=''
        readonly fg_green=''
        readonly fg_magenta=''
        readonly fg_red=''
        readonly fg_white=''
        readonly fg_yellow=''
    fi
    init_help
}

###########################################


############# HELP VARIABLES #############

function init_help() {
    COMMANDS_HELP="$ta_uscore""AVAILABLE COMMANDS:$ta_none
        create                  Create a new translation project (output file: po)
        convertPO | po          Convert po file to ts file
        convertTS | ts          Convert ts file to po file"

    LANG_HELP="$ta_uscore""LANGUAGES:$ta_none
        Please refer to https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes
        for a complete list of valid language codes"
}

# DESC: Usage help
# ARGS: None
# OUTS: None
function script_usage() {
    cat << EOF

$ta_bold=== FILEN TRANSLATION SUITE v$VERSION ===$ta_none

Usage: $0 [command] [language]

    $COMMANDS_HELP

    $LANG_HELP


$fg_grey- Made by DodoLeDev -$ta_none
EOF
}

###########################################


# DESC: Parameter parser
# ARGS: $@ (optional): Arguments provided to the script
# OUTS: Variables indicating command-line parameters and options
function parse_params() {
    local argument
    local lang
    echo "$ta_bold$fg_yellow""WARNING: Keep in mind that this program is still in the experimental stage! Use at your own risk!$ta_none"
    while [[ $# -gt 0 ]]; do
        argument="$1"  # Command
        lang="$2"      # Language
        shift 2
        case $argument in
            create | c)
                function="create"
                ;;

            convertpo | convertPO | po)
                function="po"
                ;;

            convertts | convertTS | ts)
                function="ts"
                ;;

            help)
                script_usage
                exit 0
                ;;

            *)
                echo "$ta_bold$fg_red""Invalid command was provided: $argument$ta_none"
                echo
                echo "    $COMMANDS_HELP"
                exit 1
                ;;
        esac

        # Source: https://unix.stackexchange.com/a/411006
        case " ${ACCEPTED_LANGS[*]} " in
            (*" $lang "*)
                case $function in
                    create)
                        create_po_file "$lang";;
                    po)
                        convert_po_to_ts "$lang";;
                    ts)
                        convert_ts_to_po "$lang";;
                esac
                ;;

            (*)
                echo "$ta_bold$fg_red""Invalid Language code provided: $lang$ta_none"
                echo
                echo "    $LANG_HELP"
                exit 1;;
        esac
        # # #
    done
}


############# TEXT GENERATORS #############

function new_po_text() {

    # PO file header
    echo 'msgid ""
msgstr ""
"Project-Id-Version: filen-drive' "$1" 'translation project\n"
"POT-Creation-Date: 2023-04-22 18:51+0200\n"
"PO-Revision-Date: 2023-04-22 18:52+0200\n"
"Last-Translator:' "$USER" '\n"
"Language-Team:' "$USER" '\n"
"Language:' "$1" '\n"
"Plural-Forms: nplurals=2; plural=(n != 1);\n"
"MIME-Version: 1.0\n"
"Content-Type: text/plain; charset=utf-8\n"
"Content-Transfer-Encoding: 8bit\n"
"X-Source-Language: en\n"
"X-Generator: Filen Translation Suite version' "$VERSION" '\n"'

    # Enumerating source file entries and appending empty strings
    grep -o -E '".*"' $source_translation | while read line; do
        echo
        echo "msgid $line"
        echo 'msgstr ""'
    done
}

function fetch_po_to_ts() {

    # TS file header
    echo "const $1: {
    [key: string]: string
} = {"

    # Command which took me around 4 hours to find TwT
    # Detects the end of the PO header, goes down 2 lines (beginning of translations)
    # Structures the output as "msgid" "msgstr" for a better parsing with grep
    awk '/X-Generator/{ n=NR+2 }n && n<=NR && !((NR-n-1)%3){gsub(/msgid /,"",p); gsub(/msgstr/,"",$0); print p$0}{p=$0}' $langselect_po | while read line; do

        # Parse PO keys and values
        translateID=$(echo $line | grep -o -E '^".*" ' | sed 's/" /"/')
        translateValue=$(echo $line | grep -o -E ' ".*"$')

        # Find textual key in the source file
        tsID=$(grep "$translateID" $source_translation | awk '{print $1}')

        # In the case of translation strings defined on 2 lines
        if [[ ${tsID:0:1} == "\"" ]]; then
            tsID=$(grep -1 "$translateID" $source_translation | awk '(NR==1){print $1}')
        fi

        # Print the final line

        # Separator for detecting multiple lines with a 'for' loop
        BS='
'
        for line in $tsID; do
            # If there is more than one line found,
            # warn in the file with '!!' at the beginning of the line
            case "$tsID" in
                *"$BS"*) echo -n " !! " ;;
                *) echo -n "    " ;;
            esac

            echo "$line$translateValue,"
        done
    done

    # TS file footer
    echo "}"
    echo
    echo "export default $1"
}

function fetch_ts_to_po() {
    # PO file header
    echo 'msgid ""
msgstr ""
"Project-Id-Version: filen-drive' "$1" 'translation project\n"
"POT-Creation-Date: 2023-04-22 18:51+0200\n"
"PO-Revision-Date: 2023-04-22 18:52+0200\n"
"Last-Translator:' "$USER" '\n"
"Language-Team:' "$USER" '\n"
"Language:' "$1" '\n"
"Plural-Forms: nplurals=2; plural=(n != 1);\n"
"MIME-Version: 1.0\n"
"Content-Type: text/plain; charset=utf-8\n"
"Content-Transfer-Encoding: 8bit\n"
"X-Source-Language: en\n"
"X-Generator: Filen Translation Suite version' "$VERSION" '\n"'

    # Finds the end of the TS header, goes down 1 line (beginning of translations)
    # Only prints the first word of each line (TS dictionary key)
    awk '/} = {/{ n=NR+1 }n && n<=NR {print $0}' $langselect_ts | while read line; do

        # Parse TS keys and values
        translateID=$(echo $line | grep -o -E '^.*:' | sed 's/://' | awk '{ print $1}')

        # If the translateID field is empty (because of a previous translation string defined on 2 lines), skip this iteration (otherwise it'll shift the rest of the content)
        if [[ -z $translateID ]]; then
            continue
        fi
        translateValue=$(echo $line | grep -o -E '".*"')

        # In the case of translation strings defined on 2 lines
        # Ask grep for the context, then take the previous line
        if [[ -z $translateValue ]]; then
            translateValue=$(grep -1 "$translateID" $langselect_ts | awk '(NR==3){print $0}' | sed 's/",/"/' | sed 's/^[ \t]*//')
        fi

        # Find textual value in the source file to use it as a translate string description
        sourceDocTip=$(grep "$translateID:" $source_translation | sed "s/$translateID://" | sed 's/",/"/' | sed 's/^[ \t]*//')

        # In the case of translation strings defined on 2 lines
        if [[ -z $sourceDocTip ]]; then
            sourceDocTip=$(grep -1 "$translateID" $source_translation | awk '(NR==3){print $0}' | sed 's/",/"/' | sed 's/^[ \t]*//')
        fi

        # Print PO file content
        echo
        echo "msgid $sourceDocTip"
        echo "msgstr $translateValue"
    done
}

###########################################


function create_po_file() {
    if [[ -e "$langselect_ts" ]]; then
        echo "$ta_bold$fg_red""WARNING!$ta_none$fg_red The language you want to translate already exists!"
        echo "You may want to use the 'convertTS' command instead."
        echo -n "Continue anyway? [y/N] $ta_none"
        read shallcontinue
        if [[ "$shallcontinue" != "y" && "$shallcontinue" != "Y" && "$shallcontinue" != "yes" ]]; then
            echo "$fg_yellow""Aborting...$ta_none"
            exit 0
        fi
        unset shallcontinue
    fi
    if [[ -e "$langselect_po" ]]; then
        echo "$ta_bold$fg_red""WARNING!$ta_none$fg_red The language you want to translate already has a PO file!"
        echo "You are about to overwrite the file $langselect_po"
        echo -n "Continue anyway? [y/N] $ta_none"
        read shallcontinue
        if [[ "$shallcontinue" != "y" && "$shallcontinue" != "Y" && "$shallcontinue" != "yes" ]]; then
            echo "$fg_yellow""Aborting...$ta_none"
            exit 0
        fi
        unset shallcontinue
    fi
    echo -n "$fg_blue""Creating translation files for the $1 language..."
    if [[ ! -e "$script_dir/$1" ]]; then
        mkdir "$script_dir/$1"
    fi
    new_po_text "$1" > "$langselect_po"
    echo "$fg_green$ta_bold""Done!$ta_none"
}

function convert_po_to_ts() {
    if [[ -e "$langselect_ts" ]]; then
        echo "$ta_bold$fg_red""WARNING!$ta_none$fg_red A file with the same destination name exists in this location!"
        echo "You are about to overwrite the file $langselect_ts"
        echo -n "Continue anyway? [y/N] $ta_none"
        read shallcontinue
        if [[ "$shallcontinue" != "y" && "$shallcontinue" != "Y" && "$shallcontinue" != "yes" ]]; then
            echo "$fg_yellow""Aborting...$ta_none"
            exit 0
        fi
        unset shallcontinue
    fi
    echo -n "$fg_blue""Converting $langselect_po into $langselect_ts..."
    fetch_po_to_ts "$1" > "$langselect_ts"
    echo "$fg_green$ta_bold""Done!$ta_none"
    echo "$fg_magenta""INFO: Some entries have been marked as duplicates, because the program can not handle this type of problems (yet)!"
    echo "You'll find them by searching lines starting with '!!'.$ta_none"
}

function convert_ts_to_po() {
    if [[ -e "$langselect_po" ]]; then
        echo "$ta_bold$fg_red""WARNING!$ta_none$fg_red A file with the same destination name exists in this location!"
        echo "You are about to overwrite the file $langselect_po"
        echo -n "Continue anyway? [y/N] $ta_none"
        read shallcontinue
        if [[ "$shallcontinue" != "y" && "$shallcontinue" != "Y" && "$shallcontinue" != "yes" ]]; then
            echo "$fg_yellow""Aborting...$ta_none"
            exit 0
        fi
        unset shallcontinue
    fi
    echo -n "$fg_blue""Converting $langselect_ts into $langselect_po..."
    fetch_ts_to_po "$1" > "$langselect_po"
    echo "$fg_green$ta_bold""Done!$ta_none"
}



# DESC: Main control flow
# ARGS: $@ (optional): Arguments provided to the script
# OUTS: None
function main() {
    script_init "$@"
    if [[ -z "$1" ]]; then
        echo "No parameter provided!"
        script_usage
        exit 1
    fi
    parse_params "$@"
}

# Invoke main with args if not sourced
# Approach via: https://stackoverflow.com/a/28776166/8787985
if ! (return 0 2> /dev/null); then
    main "$@"
fi
