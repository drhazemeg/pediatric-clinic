interface OptimizedImageProps {
  src: string;
  alt: string;
  srcset?: string;
  sizes?: string;
  priority?: boolean;
  className?: string;
}

export function OptimizedImage({
  src,
  alt,
  srcset,
  sizes,
  priority,
  className,
}: OptimizedImageProps) {
  return (
    <img
      alt={alt}
      className={className}
      decoding="async"
      fetchPriority={priority === true ? 'high' : undefined}
      loading={priority === true ? 'eager' : 'lazy'}
      sizes={sizes}
      src={src}
      srcSet={srcset}
    />
  );
}
