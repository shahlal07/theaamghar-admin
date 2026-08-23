/**
 * Pure, offline reply-draft generator — no LLM/API call. Picks a template
 * band by star rating and fills in the reviewer's first name and the
 * product name. Deliberately varies which template within a band gets
 * picked (hashed from the review id) so replies don't look copy-pasted
 * across reviews of the same rating.
 */

type Band = 'positive' | 'neutral' | 'negative';

function bandForRating(rating: number): Band {
  if (rating >= 4) return 'positive';
  if (rating === 3) return 'neutral';
  return 'negative';
}

function firstName(name: string | null): string {
  if (!name) return 'there';
  return name.trim().split(/\s+/)[0];
}

function pick<T>(items: T[], seed: string): T {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return items[hash % items.length];
}

const POSITIVE_TEMPLATES = (name: string, product: string) => [
  `Thank you so much, ${name}! We're thrilled you enjoyed the ${product} — reviews like this make our day. Looking forward to serving you again soon! 🎉`,
  `${name}, this really made us smile! Thank you for taking the time to share your experience with the ${product}. We can't wait to have you order again.`,
  `We're so glad the ${product} hit the spot, ${name}! Thanks for the kind words — it means a lot to our small team.`,
];

const NEUTRAL_TEMPLATES = (name: string, product: string) => [
  `Thanks for the honest feedback, ${name}. We'd love to know what would've made the ${product} a 5-star experience for you — feel free to reach out on WhatsApp anytime.`,
  `${name}, thank you for sharing your thoughts on the ${product}. We're always working to improve, and your feedback genuinely helps. Let us know if there's anything specific we can do better next time.`,
];

const NEGATIVE_TEMPLATES = (name: string, product: string) => [
  `${name}, we're sorry to hear the ${product} didn't meet your expectations — that's not the experience we want for you. Please reach out to us on WhatsApp so we can make this right.`,
  `We're really sorry, ${name}. This isn't the standard we aim for with the ${product}. Please contact us directly so we can look into this and make it up to you.`,
  `Thank you for letting us know, ${name} — we take this seriously. Please message us on WhatsApp with your order number so we can resolve this for you as quickly as possible.`,
];

export function generateReviewReplyDraft(input: {
  reviewId: string;
  rating: number;
  reviewerName: string | null;
  productName: string;
}): string {
  const band = bandForRating(input.rating);
  const name = firstName(input.reviewerName);
  const product = input.productName;

  const templates =
    band === 'positive'
      ? POSITIVE_TEMPLATES(name, product)
      : band === 'neutral'
        ? NEUTRAL_TEMPLATES(name, product)
        : NEGATIVE_TEMPLATES(name, product);

  return pick(templates, input.reviewId);
}
