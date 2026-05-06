export function getLatestOwnUserMessageId(messages: any[], currentUserId: number | null) {
  if (currentUserId == null || !Array.isArray(messages)) return null;
  const uid = String(currentUserId);
  for (let i = 0; i < messages.length; i += 1) {
    const m = messages[i];
    if (m.system || m.kind === 'system') continue;
    if (String(m.user?._id) === uid) return String(m._id);
  }
  return null;
}

export function formatReadReceiptLabel({
  messageId,
  currentUserId,
  conversation,
  memberReadsByUser
}: {
  messageId: any;
  currentUserId: number | null;
  conversation: any;
  memberReadsByUser: Record<string, any>;
}) {
  if (messageId == null || currentUserId == null || !conversation) return null;
  const mid = Number(messageId);
  if (!Number.isFinite(mid)) return null;

  const reads = memberReadsByUser || {};
  const readLevel = (userId: any) => {
    const raw = reads[String(userId)];
    if (raw == null) return null;
    return Number(raw);
  };

  if (conversation.isGroup) {
    const members = conversation.members || [];
    const others = members.filter((m: any) => Number(m.id) !== Number(currentUserId));
    if (!others.length) return null;
    const readNames = others
      .filter((m: any) => {
        const lr = readLevel(m.id) ?? m.lastReadMessageId;
        return lr != null && Number(lr) >= mid;
      })
      .map((m: any) => m.displayName);
    if (!readNames.length) return null;
    if (readNames.length === others.length) return 'Videné všetkými';
    if (readNames.length <= 2) return `Videné: ${readNames.join(', ')}`;
    return `Videné: ${readNames.slice(0, 2).join(', ')} +${readNames.length - 2}`;
  }

  const otherId = conversation.otherUser?.id;
  if (otherId == null) return null;
  const lr = readLevel(otherId);
  if (lr != null && Number(lr) >= mid) return 'Videné';
  return null;
}
