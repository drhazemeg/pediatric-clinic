import { MaterialIcon } from './material-icon';

export function StarRating({ value }: { value: number | null }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <MaterialIcon
          className={`text-xl ${(value ?? 0) >= star ? 'text-[var(--lemon-500)]' : 'text-[var(--oat-border)]'}`}
          key={star}
          name={(value ?? 0) >= star ? 'star' : 'star_outline'}
        />
      ))}
    </div>
  );
}
