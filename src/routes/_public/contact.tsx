// apps/web/src/routes/_public.contact.tsx

import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MaterialIcon } from '@/components/ui/material-icon';
import { Textarea } from '@/components/ui/textarea';
import { CLINIC_BRAND } from '@/lib/web/constants';

interface InquiryFormState {
  guardianName: string;
  phone: string;
  childAge: string;
  visitType: string;
  message: string;
}

const INITIAL_INQUIRY: InquiryFormState = {
  guardianName: '',
  phone: '',
  childAge: '',
  visitType: 'well_child',
  message: '',
};

const ClinicDetailsCard = ({ isAr }: { isAr: boolean }) => (
  <div className="space-y-6 lg:col-span-5">
    <Card>
      <CardHeader>
        <CardTitle>
          <span className="text-lg">
            {isAr ? 'بيانات العيادة' : 'Clinic Details'}
          </span>
        </CardTitle>
        <CardDescription>
          {isAr ? CLINIC_BRAND.credentialsAr : CLINIC_BRAND.credentialsEn}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 text-sm">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 inline-flex text-primary">
              <MaterialIcon name="location_on" />
            </span>
            <div>
              <p className="font-semibold">{isAr ? 'العنوان' : 'Location'}</p>
              <p className="text-muted-foreground">
                {isAr ? CLINIC_BRAND.cityAr : CLINIC_BRAND.cityEn}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="mt-0.5 inline-flex text-primary">
              <MaterialIcon name="schedule" />
            </span>
            <div>
              <p className="font-semibold">
                {isAr ? 'مواعيد العمل' : 'Clinic Hours'}
              </p>
              <p className="text-muted-foreground">
                {isAr
                  ? 'يُرجى تأكيد المواعيد اليومية واستشارات الرضاعة مسبقاً مع العيادة.'
                  : 'Daily clinic hours and lactation consultations are scheduled by prior coordination.'}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="mt-0.5 inline-flex text-primary">
              <MaterialIcon name="emergency" />
            </span>
            <div>
              <p className="font-semibold">
                {isAr ? 'الحالات الطارئة' : 'Urgent & Emergency Cases'}
              </p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {isAr
                  ? 'في حالات صعوبة التنفس، الخمول الشديد، الجفاف، أو التشنجات يُرجى التوجه فوراً لأقرب طوارئ أطفال.'
                  : 'For breathing difficulty, lethargy, dehydration, or seizures, go directly to the nearest pediatric emergency department.'}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
);

const InquiryFormCard = ({ isAr }: { isAr: boolean }) => {
  const [form, setForm] = useState<InquiryFormState>(INITIAL_INQUIRY);

  const [submittedSummary, setSubmittedSummary] =
    useState<InquiryFormState | null>(null);

  const handleSubmit = (e: React.ChangeEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!form.guardianName.trim() || !form.phone.trim()) {
      toast.error(
        isAr
          ? 'يرجى إدخال اسم ولي الأمر ورقم الهاتف للتواصل.'
          : 'Please enter guardian name and phone number.',
      );

      return;
    }

    setSubmittedSummary(form);
    toast.success(
      isAr
        ? 'تم تسجيل طلب الاستفسار — سيتواصل معك فريق العيادة لتأكيد الموعد.'
        : 'Inquiry recorded — clinic staff will follow up to confirm scheduling.',
    );
    setForm(INITIAL_INQUIRY);
  };

  return (
    <div className="lg:col-span-7">
      <Card>
        <CardHeader>
          <CardTitle>
            <span className="text-lg">
              {isAr
                ? 'طلب حجز أو استفسار'
                : 'Request an Appointment or Callback'}
            </span>
          </CardTitle>
          <CardDescription>
            {isAr
              ? 'اترك بيانات التواصل وسنعاود الاتصال بك لتحديد موعد مناسب.'
              : 'Share your contact details so the clinic can coordinate a visit time.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="guardianName">
                  {isAr ? 'اسم ولي الأمر *' : 'Parent / Guardian Name *'}
                </Label>
                <Input
                  id="guardianName"
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      guardianName: e.target.value,
                    }))
                  }
                  placeholder={
                    isAr ? 'مثال: أ. سارة محمود' : 'e.g. Sarah Mahmoud'
                  }
                  required
                  value={form.guardianName}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">
                  {isAr ? 'رقم الهاتف / واتساب *' : 'Phone / WhatsApp *'}
                </Label>
                <Input
                  id="phone"
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, phone: e.target.value }))
                  }
                  placeholder="+20 10..."
                  required
                  type="tel"
                  value={form.phone}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="childAge">
                  {isAr ? 'عمر الطفل' : "Child's Age"}
                </Label>
                <Input
                  id="childAge"
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      childAge: e.target.value,
                    }))
                  }
                  placeholder={
                    isAr
                      ? 'مثال: 3 أسابيع أو 8 أشهر'
                      : 'e.g. 3 weeks or 8 months'
                  }
                  value={form.childAge}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="visitType">
                  {isAr ? 'نوع الزيارة' : 'Reason for Visit'}
                </Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  id="visitType"
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      visitType: e.target.value,
                    }))
                  }
                  value={form.visitType}
                >
                  <option value="well_child">
                    {isAr ? 'متابعة نمو وتطور' : 'Well-Child & Growth'}
                  </option>
                  <option value="lactation">
                    {isAr
                      ? 'استشارة رضاعة طبيعية (IBCLC)'
                      : 'Lactation Consultation'}
                  </option>
                  <option value="sick_visit">
                    {isAr ? 'كشف حالة مرضية' : 'Sick Visit'}
                  </option>
                  <option value="immunization">
                    {isAr ? 'تطعيم' : 'Immunization'}
                  </option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">
                {isAr ? 'ملاحظات إضافية' : 'Additional Notes'}
              </Label>
              <Textarea
                id="message"
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, message: e.target.value }))
                }
                placeholder={
                  isAr
                    ? 'اكتب نبذة مختصرة عن سبب الزيارة أو الفترة المناسبة...'
                    : 'Briefly note symptoms, feeding questions, or preferred days...'
                }
                rows={4}
                value={form.message}
              />
            </div>

            <Button className="w-full sm:w-auto" size="lg" type="submit">
              <span className="me-1.5 inline-flex text-base">
                <MaterialIcon name="send" />
              </span>
              {isAr ? 'إرسال الطلب' : 'Submit Request'}
            </Button>
          </form>

          {submittedSummary && (
            <div className="mt-6 rounded-xl border border-border bg-muted/60 p-4 text-sm">
              <p className="font-semibold">
                {isAr ? 'ملخص الطلب المسجل:' : 'Recorded Request Summary:'}
              </p>
              <p className="mt-1 text-muted-foreground">
                {submittedSummary.guardianName} · {submittedSummary.phone}
                {submittedSummary.childAge
                  ? ` · ${submittedSummary.childAge}`
                  : ''}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const PublicContactPage = () => {
  const search = Route.useSearch();
  const isAr = search.lang === 'ar';

  return (
    <div className="mx-auto max-w-6xl space-y-10 px-4 py-10 sm:px-6 lg:px-8">
      <div className="max-w-2xl space-y-2">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          {isAr
            ? 'التواصل وموقع العيادة بالغردقة'
            : 'Clinic Location & Appointment Request'}
        </h1>
        <p className="text-base text-muted-foreground">
          {isAr
            ? 'عيادة د. حازم علي لطب الأطفال والرضاعة الطبيعية — الغردقة، محافظة البحر الأحمر.'
            : 'Dr. Hazem Ali Pediatric & Lactation Clinic — Hurghada, Red Sea Governorate, Egypt.'}
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        <ClinicDetailsCard isAr={isAr} />
        <InquiryFormCard isAr={isAr} />
      </div>
    </div>
  );
};

export const Route = createFileRoute('/_public/contact')({
  head: () => ({
    meta: [
      {
        title:
          'التواصل ومواعيد العيادة بالغردقة | Clinic Location & Contact — Hurghada',
      },
    ],
  }),
  component: PublicContactPage,
});
