import { db } from '..';

export async function getUserById(userId: string) {
  return await db.query.user.findFirst({
    where: { id: userId },
  });
}
