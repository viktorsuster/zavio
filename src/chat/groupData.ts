export const CHAT_GROUP_COLOR_OPTIONS = [
  { id: 'emerald', colors: ['#10b981', '#059669'] },
  { id: 'violet', colors: ['#8b5cf6', '#7c3aed'] },
  { id: 'rose', colors: ['#f43f5e', '#e11d48'] },
  { id: 'orange', colors: ['#f97316', '#ea580c'] },
  { id: 'amber', colors: ['#f59e0b', '#d97706'] },
  { id: 'gold', colors: ['#facc15', '#ca8a04'] },
  { id: 'lime', colors: ['#84cc16', '#65a30d'] },
  { id: 'slate', colors: ['#64748b', '#475569'] }
];

export function getGroupColorOption(colorId?: string) {
  return CHAT_GROUP_COLOR_OPTIONS.find((option) => option.id === colorId) || CHAT_GROUP_COLOR_OPTIONS[0];
}

export function getConversationDisplayName(conversation: any) {
  if (conversation?.isGroup || conversation?.type === 'group') {
    return String(conversation?.title || '').trim() || 'Skupina';
  }
  return conversation?.otherUser?.displayName || conversation?.displayName || 'Pouzivatel';
}

export function getConversationInitials(label?: string) {
  const words = String(label || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  if (!words.length) return '?';
  return words.map((word) => word.charAt(0).toUpperCase()).join('');
}
