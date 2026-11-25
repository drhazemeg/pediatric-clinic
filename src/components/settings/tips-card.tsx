// apps/web/src/components/settings/TipsCard.tsx
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { MaterialIcon } from '@/components/ui/material-icon';

const CLINIC_TIPS = [
  'مراجعة الطبيب إلزامية لكل مسودة SOAP أو حساب جرعة أو إرشادات أهل',
  'التحقق من وزن الطفل بالكيلوجرام وعمر الحمل قبل اعتماد الجرعات',
  'تأمين المفاتيح محليًا عبر IndexedDB دون تخزينها بشكل مكشوف',
  'يمكن حفظ أكثر من إعداد مزود للذكاء الاصطناعي والتبديل بينها',
];

export const TipsCard = () => (
  <div className="sticky top-8 rounded-xl border-2 border-border bg-card shadow-sm">
    <Card>
      <CardHeader>
        <CardTitle>
          <span className="font-heading text-foreground">
            إرشادات تشغيل العيادة / Clinic Tips
          </span>
        </CardTitle>
        <CardDescription>
          <span className="text-muted-foreground">
            ملاحظات سريعة لإدارة الإعدادات والذكاء الإكلينيكي.
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-xs text-muted-foreground">
          {CLINIC_TIPS.map((tip) => (
            <p className="flex items-start gap-2" key={tip}>
              <span className="mt-0.5 inline-flex shrink-0 text-xs text-primary">
                <MaterialIcon name="check_circle" />
              </span>
              <span>{tip}</span>
            </p>
          ))}
        </div>
      </CardContent>
    </Card>
  </div>
);
