import {useForm} from "@tanstack/react-form";
import {Link, useNavigate} from "@tanstack/react-router";
import {toast} from "sonner";
import z from "zod";
import {Button} from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from "@/components/ui/card";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {PasswordInput} from "@/components/ui/PasswordInput";
import {env} from "@/env/web";
import {authClient} from "@/lib/auth-client";
import {AnalyticsEvent, trackUmamiEvent} from "@/lib/web/umami";

import Loader from "./loader";

interface SignInFormProps {
	lang?: "ar" | "en";
	redirectTo?: string;
}

export default function SignInForm({
	lang = "ar",
	redirectTo
}: SignInFormProps = {}) {
	const navigate = useNavigate({
		from: "/login"
	});
	const { isPending } = authClient.useSession();
	const isAr = lang === "ar";

	const form = useForm({
		defaultValues: {
			email: "",
			password: ""
		},
		onSubmit: async ({ value }) => {
			await authClient.signIn.email(
				{
					email: value.email,
					password: value.password
				},
				{
					onSuccess: () => {
						trackUmamiEvent(AnalyticsEvent.SIGN_IN);
						navigate({ to: redirectTo || "/dashboard" });
						toast.success(
							isAr ? "تم تسجيل الدخول بنجاح" : "Sign in successful"
						);
					},
					onError: error => {
						const msg = error.error.message || error.error.statusText;
						toast.error(
							msg || (isAr ? "فشل تسجيل الدخول" : "Failed to sign in")
						);
					}
				}
			);
		},
		validators: {
			onSubmit: z.object({
				email: z
					.string()
					.email(isAr ? "بريد إلكتروني غير صالح" : "Invalid email address"),
				password: z
					.string()
					.min(
						8,
						isAr
							? "كلمة المرور يجب أن لا تقل عن 8 خانات"
							: "Password must be at least 8 characters"
					)
			})
		}
	});

	const handleGoogleSignIn = async () => {
		await authClient.signIn.social(
			{
				provider: "google",
				callbackURL: `${env.VITE_SITE_URL}${redirectTo || "/dashboard"}`
			},
			{
				onSuccess: () => {
					trackUmamiEvent(AnalyticsEvent.SIGN_IN);
				}
			}
		);
	};

	if (isPending) {
		return <Loader />;
	}

	return (
		<Card className='border-muted mx-auto w-full max-w-md rounded-xl shadow-lg'>
			<CardHeader className='space-y-1 text-center'>
				<CardTitle className='text-2xl font-bold tracking-tight'>
					{isAr ? "دخول العيادة والطاقم الطبي" : "Clinic & Staff Login"}
				</CardTitle>
				<CardDescription>
					{isAr
						? "سجل الدخول بحساب العيادة للوصول إلى لوحة المتابعة والفرز"
						: "Sign in with your clinic credentials to access the clinic workspace"}
				</CardDescription>
			</CardHeader>
			<CardContent className='space-y-6'>
				<Button
					className='w-full rounded-[var(--radius-lg)]'
					onClick={handleGoogleSignIn}
					size='icon-lg'
					type='button'
					variant='outline'
				>
					<svg
						aria-hidden='true'
						className='me-2 h-4 w-4'
						viewBox='0 0 24 24'
					>
						<path
							d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z'
							fill='#4285F4'
						/>
						<path
							d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z'
							fill='#34A853'
						/>
						<path
							d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z'
							fill='#FBBC05'
						/>
						<path
							d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z'
							fill='#EA4335'
						/>
					</svg>
					{isAr ? "الدخول باستخدام Google" : "Sign in with Google"}
				</Button>

				<div className='relative'>
					<div className='absolute inset-0 flex items-center'>
						<span className='w-full border-t' />
					</div>
					<div className='relative flex justify-center text-xs uppercase'>
						<span className='bg-card text-muted-foreground px-2'>
							{isAr ? "أو بالبريد الإلكتروني" : "Or with email"}
						</span>
					</div>
				</div>

				<form
					className='space-y-4'
					onSubmit={e => {
						e.preventDefault();
						e.stopPropagation();
						form.handleSubmit();
					}}
				>
					<div>
						<form.Field name='email'>
							{field => (
								<div className='space-y-2'>
									<Label htmlFor={field.name}>
										{isAr ? "البريد الإلكتروني" : "Email"}
									</Label>
									<Input
										className='h-11 rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)] bg-[var(--pure-white)]'
										id={field.name}
										name={field.name}
										onBlur={field.handleBlur}
										onChange={e => field.handleChange(e.target.value)}
										placeholder='doctor@clinic.com'
										type='email'
										value={field.state.value}
									/>
									{field.state.meta.errors.map(error => (
										<p
											className='text-sm text-red-500'
											key={error?.message}
										>
											{error?.message}
										</p>
									))}
								</div>
							)}
						</form.Field>
					</div>

					<div>
						<form.Field name='password'>
							{field => (
								<div className='space-y-2'>
									<div className='flex items-center justify-between'>
										<Label htmlFor={field.name}>
											{isAr ? "كلمة المرور" : "Password"}
										</Label>
										<Link
											className='text-muted-foreground hover:text-primary text-xs'
											to='/forgot-password'
										>
											{isAr ? "نسيت كلمة المرور؟" : "Forgot password?"}
										</Link>
									</div>
									<PasswordInput
										autoComplete='current-password'
										id={field.name}
										lang={lang}
										name={field.name}
										onBlur={field.handleBlur}
										onChange={field.handleChange}
										value={field.state.value}
									/>
									{field.state.meta.errors.map(error => (
										<p
											className='text-sm text-red-500'
											key={error?.message}
										>
											{error?.message}
										</p>
									))}
								</div>
							)}
						</form.Field>
					</div>

					<form.Subscribe
						selector={state => [state.canSubmit, state.isSubmitting]}
					>
						{([canSubmit, isSubmitting]) => (
							<Button
								className='w-full rounded-[var(--radius-lg)]'
								disabled={!canSubmit || isSubmitting}
								size='icon-lg'
								type='submit'
							>
								{isSubmitting
									? isAr
										? "جاري الدخول..."
										: "Signing in..."
									: isAr
										? "تسجيل الدخول"
										: "Sign In"}
							</Button>
						)}
					</form.Subscribe>
				</form>
			</CardContent>
		</Card>
	);
}
