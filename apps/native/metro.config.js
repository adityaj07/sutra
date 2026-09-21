const {
  withVarlockMetroConfig,
} = require("@varlock/expo-integration/metro-config");
const { getDefaultConfig } = require("expo/metro-config");
const { withUniwindConfig } = require("uniwind/metro");

const config = getDefaultConfig(__dirname);

module.exports = withUniwindConfig(withVarlockMetroConfig(config), {
  cssEntryFile: "./global.css", // relative path, not absolute
  dtsFile: "./uniwind-types.d.ts",
});
