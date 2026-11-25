// apps/web/src/lib/app-images.ts

export interface OptimizedImageData {
  src: string;
  srcset: string;
  width: number;
  height: number;
  altAr: string;
  altEn: string;
}

export const images = {
  hero: {
    src: '/clinic-hero-1200.webp',
    srcset:
      '/clinic-hero-400.webp 400w, /clinic-hero-800.webp 800w, /clinic-hero-1200.webp 1200w, /clinic-hero-1800.webp 1800w',
    width: 1536,
    height: 1024,
    altAr: 'عيادة د. حازم علي لطب الأطفال والرضاعة الطبيعية بالغردقة',
    altEn: 'Dr. Hazem Ali Pediatric and Lactation Clinic in Hurghada',
  },
  logo: {
    src: '/clinic-logo-200.webp',
    srcset:
      '/clinic-logo-100.webp 100w, /clinic-logo-200.webp 200w, /clinic-logo-400.webp 400w',
    width: 408,
    height: 525,
    altAr: 'شعار عيادة د. حازم لطب الأطفال والرضاعة',
    altEn: 'Dr. Hazem Pediatric & Lactation Care emblem',
  },
  doctorAvatar: {
    src: '/dr-hazem-avatar-400.webp',
    srcset:
      '/dr-hazem-avatar-200.webp 200w, /dr-hazem-avatar-400.webp 400w, /dr-hazem-avatar-800.webp 800w',
    width: 512,
    height: 512,
    altAr: 'صورة د. حازم علي استشاري طب الأطفال والرضاعة الطبيعية',
    altEn: 'Portrait of Dr. Hazem Ali, Pediatrician and IBCLC',
  },
  newbornCare: {
    src: '/service-newborn-400.webp',
    srcset:
      '/service-newborn-200.webp 200w, /service-newborn-400.webp 400w, /service-newborn-800.webp 800w',
    width: 537,
    height: 507,
    altAr: 'رعاية حديثي الولادة في الشهر الأول',
    altEn: 'Newborn care for infants in the first month',
  },
  lactationSupport: {
    src: '/service-lactation-400.webp',
    srcset:
      '/service-lactation-200.webp 200w, /service-lactation-400.webp 400w, /service-lactation-800.webp 800w',
    width: 466,
    height: 507,
    altAr: 'استشارات الرضاعة الطبيعية المعتمدة',
    altEn: 'Certified breastfeeding and lactation consultation',
  },
  immunizations: {
    src: '/service-immunizations-400.webp',
    srcset:
      '/service-immunizations-200.webp 200w, /service-immunizations-400.webp 400w, /service-immunizations-800.webp 800w',
    width: 466,
    height: 517,
    altAr: 'متابعة التطعيمات الأساسية والاختيارية للأطفال',
    altEn: 'Routine and catch-up pediatric immunizations',
  },
  sickVisits: {
    src: '/service-sick-visits-400.webp',
    srcset:
      '/service-sick-visits-200.webp 200w, /service-sick-visits-400.webp 400w, /service-sick-visits-800.webp 800w',
    width: 533,
    height: 517,
    altAr: 'كشف الحالات المرضية الحادة ومتابعة الحرارة',
    altEn: 'Acute pediatric sick visits and fever evaluation',
  },
  chronicCare: {
    src: '/service-chronic-care-400.webp',
    srcset:
      '/service-chronic-care-200.webp 200w, /service-chronic-care-400.webp 400w, /service-chronic-care-800.webp 800w',
    width: 537,
    height: 517,
    altAr: 'متابعة الحساسية والربو والحالات المزمنة',
    altEn: 'Allergy, respiratory, and chronic pediatric follow-up',
  },
  growthWellChild: {
    src: '/service-growth-400.webp',
    srcset:
      '/service-growth-200.webp 200w, /service-growth-400.webp 400w, /service-growth-800.webp 800w',
    width: 533,
    height: 507,
    altAr: 'متابعة منحنيات النمو والتطور الحركي للطفل',
    altEn: 'Growth curves and developmental milestone tracking',
  },
  notFound: {
    src: '/not_found-800.webp',
    srcset: '/not_found-400.webp 400w, /not_found-800.webp 800w',
    width: 1200,
    height: 762,
    altAr: 'الصفحة أو السجل الطبي غير موجود',
    altEn: 'Requested clinic page or record not found',
  },
} as const satisfies Record<string, OptimizedImageData>;

export type ClinicImageKey = keyof typeof images;
