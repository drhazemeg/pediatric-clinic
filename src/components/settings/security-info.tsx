// apps/web/src/components/settings/SecurityInfo.tsx
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { MaterialIcon } from '@/components/ui/material-icon';

const SECURITY_GUARANTEES = [
  'عدم إرسال بيانات هوية المرضى إلى خدمات خارجية',
  'تشفير البيانات المحلية في متصفح جهاز العيادة',
  'حفظ مفتاح التشفير محليًا عبر IndexedDB',
  'مسح بيانات الجلسة عند تسجيل الخروج على الأجهزة المشتركة',
] as const;

export function SecurityInfo() {
  return (
    <div className="max-w-xl">
      <Card>
        <CardHeader>
          <CardTitle>
            أمان البيانات والخصوصية / Clinic Data &amp; Key Security
          </CardTitle>
          <CardDescription>
            حماية بيانات العيادة والمفاتيح المشفرة على أجهزة العمل.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-lg bg-accent p-4">
              <span className="inline-flex text-xl text-accent-foreground">
                <MaterialIcon name="lock" />
              </span>
              <div>
                <p className="font-medium text-accent-foreground">
                  تشفير محلي / Local Encryption
                </p>
                <p className="text-sm text-accent-foreground/80">
                  AES-GCM-256 مع تخزين المفتاح في IndexedDB
                </p>
              </div>
            </div>
            <div className="space-y-2 text-xs text-muted-foreground">
              {SECURITY_GUARANTEES.map((item) => (
                <p className="flex items-center gap-2" key={item}>
                  <span className="mt-0.5 inline-flex shrink-0 text-xs text-primary">
                    <MaterialIcon name="check_circle" />
                  </span>
                  {item}
                </p>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
