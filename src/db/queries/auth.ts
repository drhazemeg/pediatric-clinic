import { db } from "..";

export async function getUserById(userId: string) {
	return db.query.user.findFirst({
		where: { id: userId }
	});
}
