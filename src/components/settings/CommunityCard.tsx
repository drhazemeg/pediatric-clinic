// apps/web/src/components/settings/CommunityCard.tsx

import { CommunityChannelList } from "@/components/CommunityChannelList";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from "@/components/ui/card";

export function CommunityCard() {
	return (
		<Card className='clay-shadow rounded-[var(--radius-xl)] border-2 border-[var(--oat-border)] bg-[var(--pure-white)]'>
			<CardHeader>
				<CardTitle className='font-headline text-[var(--clay-black)]'>
					تواصل العيادة والمحتوى التوعوي / Clinic &amp; Parent Channels
				</CardTitle>
				<CardDescription className='text-[var(--warm-charcoal)]'>
					واتساب لحجز المواعيد وقناة التوعية للأمهات والآباء.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<CommunityChannelList
					locale='ar'
					variant='card'
				/>
			</CardContent>
		</Card>
	);
}
