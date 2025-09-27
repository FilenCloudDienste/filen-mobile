#!/bin/bash
set -e  # Exit immediately if any command fails

# Detect the first connected emulator
DEVICE_ID=$(adb devices | grep emulator | awk 'NR==1{print $1}')

if [ -z "$DEVICE_ID" ]; then
  echo "No emulator found. Please start an Android emulator first."
  exit 1
fi

# Upload the test image
echo "Uploading test-image.png to emulator: $DEVICE_ID"
adb -s "$DEVICE_ID" push .maestro/assets/test-image.png /sdcard/Download/test-image.png

# Trigger media scan so the image appears in Photos/Gallery
adb -s "$DEVICE_ID" shell am broadcast -a android.intent.action.MEDIA_SCANNER_SCAN_FILE -d file:///sdcard/Download/test-image.png

echo "Test image uploaded successfully!"
