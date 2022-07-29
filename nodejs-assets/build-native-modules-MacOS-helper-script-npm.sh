#!/bin/bash
      # Helper script for Gradle to call npm on macOS in case it is not found
      export PATH=$PATH:/Users/jan/filen/app/node_modules/nodejs-mobile-react-native/node_modules/.bin:/Users/jan/filen/app/node_modules/node_modules/.bin:/Users/jan/filen/app/node_modules/.bin:/Users/jan/filen/node_modules/.bin:/Users/jan/node_modules/.bin:/Users/node_modules/.bin:/node_modules/.bin:/usr/local/lib/node_modules/npm/node_modules/@npmcli/run-script/lib/node-gyp-bin:/opt/homebrew/opt/openssl@1.1/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:/opt/X11/bin:/Library/Apple/usr/bin
      npm $@
    