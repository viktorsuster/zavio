module.exports = {
  expo: {
    name: "Zavio",
    slug: "zavio-mobile",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#000000",
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "cloud.zavio",
      bundleDisplayName: "Zavio",
      infoPlist: {
        NSLocationWhenInUseUsageDescription:
          "Aplikácia používa lokalizáciu na zobrazenie polohy hier a športovísk v blízkosti.",
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#0f172a",
      },
      package: "cloud.zavio",
      label: "Zavio",
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
    },
    web: {
      favicon: "./assets/favicon.png",
    },
    plugins: ["expo-camera"],
  },
};
