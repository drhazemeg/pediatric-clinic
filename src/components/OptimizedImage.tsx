type OptimizedImageProps = {
	src: string;
	alt: string;
	srcset?: string;
	sizes?: string;
	priority?: boolean;
	className?: string;
};

export function OptimizedImage({
	src,
	alt,
	srcset,
	sizes,
	priority,
	className
}: OptimizedImageProps) {
	return (
		<img
			alt={alt}
			className={className}
			decoding='async'
			fetchPriority={priority ? "high" : undefined}
			loading={priority ? "eager" : "lazy"}
			sizes={sizes}
			src={src}
			srcSet={srcset}
		/>
	);
}
