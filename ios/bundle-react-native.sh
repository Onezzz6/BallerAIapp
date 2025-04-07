#!/bin/bash
set -e

export NODE_BINARY=node

# The project root directory
PROJECT_ROOT="$PROJECT_DIR/.."

# Bundle React Native code and assets
echo "Bundling React Native code and assets..."
$NODE_BINARY "$PROJECT_ROOT/node_modules/react-native/scripts/react-native-xcode.sh"

# Copy the bundle to the correct location
echo "Copying bundle to the correct location..."
cp "$CONFIGURATION_BUILD_DIR/$UNLOCALIZED_RESOURCES_FOLDER_PATH/main.jsbundle" "$PROJECT_ROOT/ios/"

echo "Bundling complete!"
