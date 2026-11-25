import { Link, createFileRoute } from '@tanstack/react-router';
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
import { authClient } from '@/lib/auth-client';
import { images } from '@/lib/web/app-images';
import { routeShell } from '@/lib/web/route-shell';

const RouteComponent = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.ChangeEvent<HTMLFormElement>) => {
    e.preventDefault();

    const trimmedEmail = email.trim();

    if (trimmedEmail === '') {
      return;
    }

    setIsSubmitting(true);

    try {
      await authClient.$fetch('/request-password-reset', {
        method: 'POST',
        body: {
          email: trimmedEmail,
          redirectTo: '/login',
        },
      });
      setSent(true);
      toast.success('تم إرسال رابط إعادة التعيين إلى بريدك الإلكتروني');
    } catch (error: unknown) {
      const msg =
        error instanceof Error
          ? error.message
          : 'Failed to request password reset';

      toast.error('خطأ في الطلب', { description: msg });
    }

    setIsSubmitting(false);
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-muted/30 p-4">
      <div className="flex w-full max-w-md flex-col items-center">
        <img
          alt="Smart Clinic Logo"
          className="mb-6 h-16 w-auto"
          src={images.logo.src}
        />

        <div className="w-full rounded-xl shadow-lg">
          <Card>
            <CardHeader>
              <div className="space-y-1 text-center">
                <CardTitle>
                  <span className="text-xl font-bold">
                    إعادة تعيين كلمة المرور / Reset Password
                  </span>
                </CardTitle>
                <CardDescription>
                  {sent
                    ? 'تم إرسال تعليمات إعادة التعيين إلى البريد الإلكتروني'
                    : 'أدخل بريدك الإلكتروني لتلقي رابط إعادة تعيين كلمة المرور'}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {sent ? (
                <div className="space-y-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    يرجى فحص صندوق الوارد لعنوان <strong>{email}</strong> واتباع
                    التعليمات.
                  </p>
                  <Link className="grid" to="/login">
                    <Button type="button">
                      العودة لتسجيل الدخول / Back to Login
                    </Button>
                  </Link>
                </div>
              ) : (
                <form
                  className="space-y-4"
                  onSubmit={(e) => {
                    handleSubmit(e).catch(() => null);
                  }}
                >
                  <div className="space-y-2">
                    <Label htmlFor="email">البريد الإلكتروني / Email</Label>
                    <Input
                      id="email"
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="doctor@clinic.com"
                      required
                      type="email"
                      value={email}
                    />
                  </div>

                  <div className="grid">
                    <Button
                      disabled={isSubmitting || email === ''}
                      type="submit"
                    >
                      {isSubmitting
                        ? 'جاري الإرسال...'
                        : 'إرسال رابط التعيين / Send Reset Link'}
                    </Button>
                  </div>

                  <div className="text-center">
                    <Link
                      className="text-sm text-primary hover:underline"
                      to="/login"
                    >
                      العودة لتسجيل الدخول / Back to Login
                    </Link>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export const Route = createFileRoute('/_auth/forgot-password')({
  staticData: routeShell.public,
  component: RouteComponent,
});
