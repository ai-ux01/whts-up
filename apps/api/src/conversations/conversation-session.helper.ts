import { MessageSender } from '@prisma/client';
import {
  isSessionOpen,
  sessionExpiresAt,
} from '../common/utils/whatsapp-session';

export async function getLastCustomerMessageAt(
  prisma: { message: { findFirst: Function } },
  conversationId: string,
): Promise<Date | null> {
  const last = await prisma.message.findFirst({
    where: { conversationId, sender: MessageSender.CONTACT },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  });
  return last?.createdAt ?? null;
}

export function sessionFields(lastCustomerMessageAt: Date | null) {
  const sessionWindowOpen = isSessionOpen(lastCustomerMessageAt);
  return {
    lastCustomerMessageAt,
    sessionWindowOpen,
    sessionExpiresAt: sessionExpiresAt(lastCustomerMessageAt),
  };
}
