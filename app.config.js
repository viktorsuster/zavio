module.exports = {
  expo: {
    name: "Sportvia",
    slug: "sportvia-mobile",
    owner: "viktorsuster",
    version: "1.0.0",
    runtimeVersion: {
      policy: "appVersion",
    },
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    scheme: "sportvia",
    platforms: ["ios", "android"],
    newArchEnabled: true,
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#000000",
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "cloud.sportvia",
      bundleDisplayName: "Sportvia",
      config: {
        usesNonExemptEncryption: false,
      },
      infoPlist: {
        NSCameraUsageDescription:
          "Kameru používame na naskenovanie QR kódu pri vstupe na rezervované športovisko, napríklad po potvrdení vašej rezervácie.",
        NSLocationWhenInUseUsageDescription:
          "Aplikácia používa lokalizáciu na zobrazenie polohy hier a športovísk v blízkosti.",
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#0f172a",
      },
      googleServicesFile: "./google-services.json",
      package: "cloud.sportvia",
      label: "Sportvia",
      permissions: [
        "android.permission.CAMERA",
        "android.permission.POST_NOTIFICATIONS",
      ],
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
    },
    updates: {
      checkAutomatically: "NEVER",
      fallbackToCacheTimeout: 0,
      url: "https://u.expo.dev/04e6d31b-bddf-4492-84d0-b0bad42d159d",
    },
    extra: {
      eas: {
        projectId: "04e6d31b-bddf-4492-84d0-b0bad42d159d",
      },
    },
    plugins: ["expo-camera", "expo-notifications"],
  },
};
