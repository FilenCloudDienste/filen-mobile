#!/bin/bash
      # Helper script for Gradle to call node on macOS in case it is not found
      export PATH=$PATH:/Users/jan/filen/app/node_modules/nodejs-mobile-react-native/node_modules/.bin:/Users/jan/filen/app/node_modules/node_modules/.bin:/Users/jan/filen/app/node_modules/.bin:/Users/jan/filen/node_modules/.bin:/Users/jan/node_modules/.bin:/Users/node_modules/.bin:/node_modules/.bin:/Users/jan/.nvm/versions/node/v18.15.0/lib/node_modules/npm/node_modules/@npmcli/run-script/lib/node-gyp-bin:/Users/jan/.nvm/versions/node/v18.15.0/bin:/opt/homebrew/opt/openssl@1.1/bin:/opt/homebrew/bin:/usr/local/bin:/System/Cryptexes/App/usr/bin:/usr/bin:/bin:/usr/sbin:/sbin:/opt/X11/bin:/Library/Apple/usr/bin
      node $@
    