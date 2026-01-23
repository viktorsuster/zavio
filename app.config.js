module.exports = {
  expo: {
    name: "sportvia",
    slug: "sportvia-mobile",
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
      bundleIdentifier: "cloud.sportvia",
      scheme: "sportvia",
      bundleDisplayName: "sportvia",
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
      package: "cloud.sportvia",
      label: "sportvia",
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
    },
    web: {
      favicon: "./assets/favicon.png",
    },
    plugins: ["expo-camera"],
  },
};
