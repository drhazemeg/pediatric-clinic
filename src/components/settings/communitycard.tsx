// apps/web/src/components/settings/CommunityCard.tsx

import { CommunityChannelList } from '#/components/community-channel-list.tsx';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export const CommunityCard = () => (
  <div className="rounded-xl border-2 border-border bg-card shadow-sm">
    <Card>
      <CardHeader>
        <CardTitle>
          <span className="font-heading text-foreground">
            تواصل العيادة والمحتوى التوعوي / Clinic &amp; Parent Channels
          </span>
        </CardTitle>
        <CardDescription>
          <span className="text-muted-foreground">
            واتساب لحجز المواعيد وقناة التوعية للأمهات والآباء.
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <CommunityChannelList locale="ar" variant="card" />
      </CardContent>
    </Card>
  </div>
);
