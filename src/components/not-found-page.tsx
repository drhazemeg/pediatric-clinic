// apps/web/src/components/NotFoundPage.tsx

import { Link } from '@tanstack/react-router';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { images } from '@/lib/web/app-images';

const HOME_LINK = <Link to="/" />;
const LOGIN_LINK = <Link to="/login" />;

export const NotFoundPage = () => {
  const [imgSrc, setImgSrc] = useState<string>(images.notFound.src);
  const [hideImg, setHideImg] = useState(false);

  const handleImageError = () => {
    if (imgSrc === images.logo.src) {
      setHideImg(true);
    } else {
      setImgSrc(images.logo.src);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-12">
      {!hideImg && (
        <img
          alt={images.notFound.altEn}
          className="mb-8 h-auto w-full max-w-sm object-contain"
          loading="lazy"
          onError={handleImageError}
          src={imgSrc}
        />
      )}
      <div className="max-w-md text-center">
        <h1 className="mb-3 font-heading text-3xl font-bold text-foreground">
          الصفحة غير موجودة / Page Not Found
        </h1>
        <p className="mb-8 text-base text-muted-foreground">
          الرابط أو السجل المطلوب غير متاح. / The requested page or clinic
          record could not be found.
        </p>
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Button render={HOME_LINK} size="lg">
            الرئيسية / Home
          </Button>
          <Button render={LOGIN_LINK} size="lg" variant="outline">
            دخول العيادة / Sign In
          </Button>
        </div>
      </div>
    </div>
  );
};
