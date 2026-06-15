const BUBBLE_RADIUS = 18;

export function getChatTheme(isDark: boolean, _insets: { bottom?: number }) {
  return {
    isDark: Boolean(isDark),
    bubbleBorderRadius: BUBBLE_RADIUS,
    backgroundColor: isDark ? '#000000' : '#f8fafc',
    primary: isDark ? '#facc15' : '#10b981',
    bubbleLeft: isDark ? '#334155' : '#e2e8f0',
    bubbleRight: isDark ? '#facc15' : '#10b981',
    inputBackground: isDark ? '#1e293b' : '#f1f5f9',
    inputText: isDark ? '#f1f5f9' : '#0f172a',
    placeholderTextColor: isDark ? '#64748b' : '#94a3b8',
    leftBubbleContainerStyle: {
      marginLeft: 10,
      marginRight: 48,
      marginVertical: 3,
      alignItems: 'flex-start'
    },
    rightBubbleContainerStyle: {
      marginLeft: 48,
      marginRight: 10,
      marginVertical: 3,
      alignItems: 'flex-end'
    },
    inputToolbarContainerStyle: {
      borderTopWidth: 1,
      borderTopColor: isDark ? '#334155' : '#e2e8f0',
      paddingTop: 8,
      paddingBottom: 0,
      paddingHorizontal: 16,
      backgroundColor: isDark ? '#000000' : '#ffffff'
    },
    sendButtonActive: isDark ? '#facc15' : '#10b981',
    sendButtonInactive: isDark ? '#334155' : '#cbd5e1',
    leftBubbleTextColor: isDark ? '#f1f5f9' : '#0f172a',
    readReceiptColor: isDark ? '#94a3b8' : '#64748b'
  };
}
