export function apiMessageToGifted(msg: any, currentUserId: number | null, conversationName: string) {
  const kind = msg.kind || 'user';
  const rawSenderId = msg.senderId ?? msg.sender_id;
  const senderId = rawSenderId != null ? String(rawSenderId) : '';
  const isMe = currentUserId != null && String(currentUserId) === senderId;
  const createdAt = msg.createdAt ?? msg.created_at;
  const id = msg.id != null ? String(msg.id) : `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const senderDisplayName = msg.senderDisplayName ?? msg.sender_display_name;

  if (kind === 'system') {
    return {
      _id: id,
      text: msg.body || '',
      createdAt: createdAt ? new Date(createdAt) : new Date(),
      system: true,
      kind,
      meta: msg.meta ?? null
    };
  }
  return {
    _id: id,
    text: msg.body || '',
    createdAt: createdAt ? new Date(createdAt) : new Date(),
    kind,
    meta: msg.meta ?? null,
    user: {
      _id: senderId,
      name: isMe ? 'Ty' : senderDisplayName || conversationName || 'Pouzivatel'
    }
  };
}
