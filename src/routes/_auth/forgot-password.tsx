import {createFileRoute, Link} from "@tanstack/react-router";
import {useState} from "react";
import {toast} from "sonner";
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
import {images} from "@/lib/web/app-images";
import {authClient} from "@/lib/auth-client";
import {routeShell} from "@/lib/web/route-shell";

export const Route = createFileRoute("/_auth/forgot-password")({
	staticData: routeShell.public,
	component: RouteComponent
});

function RouteComponent() {
	const [email, setEmail] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [sent, setSent] = useState(false);

	const handleSubmit = async (e: React.ChangeEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (!email.trim()) return;

		setIsSubmitting(true);
		try {
			await authClient.$fetch("/request-password-reset", {
				method: "POST",
				body: {
					email: email.trim(),
					redirectTo: "/login"
				}
			});
			setSent(true);
			toast.success("تم إرسال رابط إعادة التعيين إلى بريدك الإلكتروني");
		} catch (err: unknown) {
			const msg =
				err instanceof Error ? err.message : "Failed to request password reset";
			toast.error("خطأ في الطلب", { description: msg });
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className='bg-muted/30 flex min-h-screen w-full items-center justify-center p-4'>
			<div className='flex w-full max-w-md flex-col items-center'>
				<img
					alt='Smart Clinic Logo'
					className='mb-6 h-16 w-auto'
					src={images.logo.src}
				/>

				<Card className='w-full shadow-lg'>
					<CardHeader className='space-y-1 text-center'>
						<CardTitle className='text-xl font-bold'>
							إعادة تعيين كلمة المرور / Reset Password
						</CardTitle>
						<CardDescription>
							{sent
								? "تم إرسال تعليمات إعادة التعيين إلى البريد الإلكتروني"
								: "أدخل بريدك الإلكتروني لتلقي رابط إعادة تعيين كلمة المرور"}
						</CardDescription>
					</CardHeader>
					<CardContent>
						{sent ? (
							<div className='space-y-4 text-center'>
								<p className='text-muted-foreground text-sm'>
									يرجى فحص صندوق الوارد لعنوان <strong>{email}</strong> واتباع
									التعليمات.
								</p>
								<Link to='/login'>
									<Button className='w-full'>
										العودة لتسجيل الدخول / Back to Login
									</Button>
								</Link>
							</div>
						) : (
							<form
								className='space-y-4'
								onSubmit={handleSubmit}
							>
								<div className='space-y-2'>
									<Label htmlFor='email'>البريد الإلكتروني / Email</Label>
									<Input
										id='email'
										onChange={e => setEmail(e.target.value)}
										placeholder='doctor@clinic.com'
										required
										type='email'
										value={email}
									/>
								</div>

								<Button
									className='w-full'
									disabled={isSubmitting || !email}
									type='submit'
								>
									{isSubmitting
										? "جاري الإرسال..."
										: "إرسال رابط التعيين / Send Reset Link"}
								</Button>

								<div className='text-center'>
									<Link
										className='text-primary text-sm hover:underline'
										to='/login'
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
	);
}
