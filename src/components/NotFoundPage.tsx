// apps/web/src/components/NotFoundPage.tsx

import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { images } from "@/lib/web//app-images";

export function NotFoundPage() {
	const [imgSrc, setImgSrc] = useState<string>(images.notFound.src);
	const [hideImg, setHideImg] = useState(false);

	const handleImageError = () => {
		if (imgSrc !== images.logo.src) {
			setImgSrc(images.logo.src);
		} else {
			setHideImg(true);
		}
	};

	return (
		<div className='flex min-h-screen flex-col items-center justify-center bg-[var(--warm-cream)] px-6 py-12'>
			{!hideImg && (
				<img
					alt={images.notFound.altEn}
					className='mb-8 h-auto w-full max-w-sm object-contain'
					loading='lazy'
					onError={handleImageError}
					src={imgSrc}
				/>
			)}
			<div className='max-w-md text-center'>
				<h1 className='font-headline mb-3 text-3xl font-bold text-[var(--clay-black)]'>
					الصفحة غير موجودة / Page Not Found
				</h1>
				<p className='mb-8 text-base text-[var(--warm-charcoal)]'>
					الرابط أو السجل المطلوب غير متاح. / The requested page or clinic
					record could not be found.
				</p>
				<div className='flex flex-col justify-center gap-3 sm:flex-row'>
					<Button
						className='h-12 rounded-[var(--radius-lg)] bg-[var(--clay-black)] px-8 text-[var(--pure-white)] hover:bg-[var(--warm-charcoal)]'
						render={<Link to='/' />}
					>
						الرئيسية / Home
					</Button>
					<Button
						className='h-12 rounded-[var(--radius-lg)] border-2 border-[var(--oat-border)] bg-[var(--pure-white)] px-8'
						render={<Link to='/login' />}
						variant='outline'
					>
						دخول العيادة / Sign In
					</Button>
				</div>
			</div>
		</div>
	);
}
