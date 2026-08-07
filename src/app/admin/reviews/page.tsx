import { getReviews } from '@/lib/queries/reviews';
import { ReviewsClient } from './ReviewsClient';

export const dynamic = 'force-dynamic';

export default async function ReviewsPage() {
  const reviews = await getReviews();

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-[var(--text)]">Reviews</h1>
      <p className="mb-6 text-sm text-[var(--text-light)]">
        Reply to customer reviews with a public response, or remove reviews that are dishonest
        or abusive.
      </p>
      <ReviewsClient reviews={reviews} />
    </div>
  );
}
