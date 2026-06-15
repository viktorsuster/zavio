import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Text,
} from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';

const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 56 : 52;
const SCAN_ROUTE = 'Scan';

const CustomTabBar = ({ state, descriptors, navigation }: BottomTabBarProps) => {
  const insets = useSafeAreaInsets();

  const tabs = state.routes
    .filter((route) => route.name !== SCAN_ROUTE)
    .map((route) => {
      const routeIndex = state.routes.findIndex((r) => r.key === route.key);
      const { options } = descriptors[route.key];
      const isFocused = state.index === routeIndex;

      const label =
        typeof options.tabBarLabel === 'string'
          ? options.tabBarLabel
          : options.title ?? route.name;

      const iconColor = isFocused ? '#FFFFFF' : colors.textDisabled;

      const onPress = () => {
        const event = navigation.emit({
          type: 'tabPress',
          target: route.key,
          canPreventDefault: true,
        });
        if (!isFocused && !event.defaultPrevented) {
          navigation.navigate(route.name);
        }
      };

      const onLongPress = () => {
        navigation.emit({ type: 'tabLongPress', target: route.key });
      };

      return (
        <TouchableOpacity
          key={route.key}
          style={styles.tabItem}
          onPress={onPress}
          onLongPress={onLongPress}
          activeOpacity={0.6}
        >
          <View style={styles.iconWrapper}>
            {options.tabBarIcon?.({ focused: isFocused, color: iconColor, size: 22 })}
            {options.tabBarBadge !== undefined && options.tabBarBadge !== null && (
              <View style={styles.badge} />
            )}
          </View>
          <Text style={[styles.tabLabel, { color: iconColor }]}>{label}</Text>
        </TouchableOpacity>
      );
    });

  const scanRoute = state.routes.find((route) => route.name === SCAN_ROUTE);
  const isScanFocused = scanRoute ? state.index === state.routes.indexOf(scanRoute) : false;

  const scanTab = (
    <TouchableOpacity
      key="scan-tab"
      style={[styles.tabItem, styles.scanTabItem]}
      onPress={() => {
        if (scanRoute) {
          const event = navigation.emit({
            type: 'tabPress',
            target: scanRoute.key,
            canPreventDefault: true,
          });
          if (!isScanFocused && !event.defaultPrevented) {
            navigation.navigate(SCAN_ROUTE);
          }
        }
      }}
      activeOpacity={0.6}
    >
      <View style={[styles.scanIconWrapper, isScanFocused && styles.scanIconWrapperActive]}>
        <Ionicons name="scan" size={22} color={isScanFocused ? '#000000' : '#FFFFFF'} />
      </View>
      <Text style={[styles.tabLabel, { color: isScanFocused ? '#FFFFFF' : colors.textDisabled }]}>
        Scan
      </Text>
    </TouchableOpacity>
  );

  tabs.splice(2, 0, scanTab);

  return (
    <View
      style={[
        styles.container,
        {
          height: TAB_BAR_HEIGHT + insets.bottom,
          paddingBottom: insets.bottom,
          backgroundColor: colors.background,
          borderTopColor: colors.border,
        },
      ]}
    >
      {tabs}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 6,
    paddingBottom: 4,
    gap: 3,
  },
  scanTabItem: {
    justifyContent: 'flex-start',
    paddingTop: 4,
    paddingBottom: 4,
    gap: 0,
  },
  iconWrapper: {
    width: 44,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanIconWrapper: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  scanIconWrapperActive: {
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  badge: {
    position: 'absolute',
    top: 1,
    right: 4,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.error,
  },
});

export default CustomTabBar;
