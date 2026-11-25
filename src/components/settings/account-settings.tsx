import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { CommunityCard } from '@/components/settings/communitycard';
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
// apps/web/src/components/settings/AccountSettings.tsx
import { env } from '@/env/web';
import { authClient } from '@/lib/auth-client';
import { getErrorMessage } from '@/lib/web/error-utils';

interface AccountInfo {
  id: string;
  providerId: string;
  accountId: string;
  userId: string;
}

export function AccountSettings() {
  const { data: session } = authClient.useSession();
  const user = session?.user;

  const [accounts, setAccounts] = useState<Array<AccountInfo>>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [newEmail, setNewEmail] = useState('');
  const [isChangingEmail, setIsChangingEmail] = useState(false);

  const [linking, setLinking] = useState(false);
  const [unlinking, setUnlinking] = useState(false);

  useEffect(() => {
    const loadAccounts = async () => {
      try {
        const res = await authClient.listAccounts();

        if (res.data !== null) {
          setAccounts(res.data);
        }
      } catch {
        // Accounts list falls back to empty when unavailable.
      }

      setLoadingAccounts(false);
    };

    loadAccounts().catch(() => null);
  }, []);

  const hasEmailAccount = accounts.some((a) => a.providerId === 'email');
  const hasGoogleAccount = accounts.some((a) => a.providerId === 'google');
  const canDisconnectGoogle = hasEmailAccount;

  const handleChangePassword = async (
    e: React.ChangeEvent<HTMLFormElement>,
  ) => {
    e.preventDefault();

    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/u.test(newPassword)) {
      toast.error(
        'كلمة المرور يجب أن تكون 8 أحرف على الأقل وتحتوي على حرف كبير وحرف صغير ورقم',
      );

      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('كلمة المرور الجديدة غير متطابقة');

      return;
    }

    setIsChangingPassword(true);

    try {
      await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      });
      toast.success('تم تغيير كلمة المرور بنجاح');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: unknown) {
      const msg = getErrorMessage(error);

      toast.error(msg === '' ? 'تعذر تغيير كلمة المرور' : msg);
    }

    setIsChangingPassword(false);
  };

  const handleChangeEmail = async (e: React.ChangeEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (newEmail === '') {
      return;
    }

    setIsChangingEmail(true);

    try {
      await authClient.changeEmail({ newEmail });
      toast.success(
        'تم تحديث البريد الإلكتروني. يرجى مراجعة بريدك الجديد للتأكيد.',
      );
      setNewEmail('');
    } catch (error: unknown) {
      const msg = getErrorMessage(error);

      toast.error(msg === '' ? 'تعذر تحديث البريد الإلكتروني' : msg);
    }

    setIsChangingEmail(false);
  };

  const handleConnectGoogle = async () => {
    setLinking(true);

    try {
      await authClient.signIn.social({
        provider: 'google',
        callbackURL: `${env.VITE_SITE_URL}/settings?tab=account`,
      });
    } catch {
      toast.error('تعذر ربط حساب Google');
    }

    setLinking(false);
  };

  const handleDisconnectGoogle = async () => {
    setUnlinking(true);

    try {
      const googleAccount = accounts.find((a) => a.providerId === 'google');

      if (googleAccount === undefined) {
        setUnlinking(false);

        return;
      }

      await authClient.unlinkAccount({
        accountId:
          googleAccount.accountId === ''
            ? googleAccount.id
            : googleAccount.accountId,
      });
      toast.success('تم فصل حساب Google');
      setAccounts((prev) => prev.filter((a) => a.providerId !== 'google'));
    } catch (error: unknown) {
      const msg = getErrorMessage(error);

      toast.error(msg === '' ? 'تعذر فصل حساب Google' : msg);
    }

    setUnlinking(false);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>معلومات الحساب / Account Info</CardTitle>
          <CardDescription>
            بيانات حساب العيادة والطاقم الطبي الحالية
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <p className="text-sm leading-none font-medium">الاسم / Name</p>
              <p className="font-medium text-foreground">{user?.name}</p>
            </div>
            <div>
              <p className="text-sm leading-none font-medium">
                البريد الإلكتروني / Email
              </p>
              <p className="font-medium text-foreground">{user?.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>الحسابات المرتبطة / Connected Accounts</CardTitle>
          <CardDescription>
            إدارة طرق تسجيل الدخول إلى نظام العيادة
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {loadingAccounts ? (
              <p className="text-sm text-muted-foreground">جاري التحميل...</p>
            ) : (
              <>
                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div className="flex items-center gap-3">
                    <svg
                      aria-hidden="true"
                      className="h-5 w-5"
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                        fill="var(--color-chart-6)"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="var(--color-chart-2)"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="var(--color-warning)"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="var(--color-destructive)"
                      />
                    </svg>
                    <div>
                      <p className="text-sm font-medium">Google</p>
                      <p className="text-xs text-muted-foreground">
                        {hasGoogleAccount ? 'مرتبط / Connected' : 'غير مرتبط'}
                      </p>
                    </div>
                  </div>
                  {hasGoogleAccount ? (
                    <Button
                      disabled={unlinking || !canDisconnectGoogle}
                      onClick={() => {
                        handleDisconnectGoogle().catch(() => null);
                      }}
                      size="sm"
                      title={
                        canDisconnectGoogle
                          ? 'فصل حساب Google'
                          : 'لا يمكن فصل Google لأنه وسيلة الدخول الوحيدة'
                      }
                      variant="outline"
                    >
                      {unlinking ? 'جاري الفصل...' : 'فصل / Unlink'}
                    </Button>
                  ) : (
                    <Button
                      disabled={linking}
                      onClick={() => {
                        handleConnectGoogle().catch(() => null);
                      }}
                      size="sm"
                      variant="outline"
                    >
                      {linking ? 'جاري الربط...' : 'ربط / Link'}
                    </Button>
                  )}
                </div>
                {hasGoogleAccount && !canDisconnectGoogle && (
                  <p className="text-xs text-muted-foreground">
                    يجب الإبقاء على وسيلة دخول واحدة على الأقل. أضف بريدًا وكلمة
                    مرور قبل فصل Google.
                  </p>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {hasEmailAccount && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>تغيير كلمة المرور / Change Password</CardTitle>
              <CardDescription>
                استخدم كلمة مرور قوية ومميزة لحماية سجلات العيادة
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  handleChangePassword(e).catch(() => null);
                }}
              >
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">
                    كلمة المرور الحالية / Current Password
                  </Label>
                  <Input
                    id="currentPassword"
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="أدخل كلمة المرور الحالية"
                    type="password"
                    value={currentPassword}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">
                    كلمة المرور الجديدة / New Password
                  </Label>
                  <Input
                    id="newPassword"
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="8 أحرف على الأقل"
                    type="password"
                    value={newPassword}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">
                    تأكيد كلمة المرور الجديدة / Confirm Password
                  </Label>
                  <Input
                    id="confirmPassword"
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="أعد إدخال كلمة المرور الجديدة"
                    type="password"
                    value={confirmPassword}
                  />
                </div>
                <Button
                  disabled={
                    isChangingPassword ||
                    currentPassword === '' ||
                    newPassword === '' ||
                    confirmPassword === ''
                  }
                  type="submit"
                >
                  {isChangingPassword ? 'جاري الحفظ...' : 'تحديث كلمة المرور'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>تغيير البريد الإلكتروني / Change Email</CardTitle>
              <CardDescription>
                أدخل عنوان البريد الإلكتروني الجديد
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  handleChangeEmail(e).catch(() => null);
                }}
              >
                <div className="space-y-2">
                  <Label htmlFor="newEmail">
                    البريد الإلكتروني الجديد / New Email
                  </Label>
                  <Input
                    id="newEmail"
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="doctor@smartclinic.eg"
                    type="email"
                    value={newEmail}
                  />
                </div>
                <Button
                  disabled={isChangingEmail || newEmail === ''}
                  type="submit"
                >
                  {isChangingEmail ? 'جاري الحفظ...' : 'تحديث البريد الإلكتروني'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </>
      )}

      <CommunityCard />
    </div>
  );
}
