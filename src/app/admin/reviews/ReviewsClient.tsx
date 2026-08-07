'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useActionState } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import type { Review } from '@/lib/queries/reviews';
import { replyToReview, removeReply, deleteReview, uploadReplyImage, generateAIReply } from './actions';

const inputClass =
  'w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--mango-orange)]';

function Stars({ rating }: { rating: number }) {
  return (
    <span className="text-[var(--mango-orange)]" aria-label={`${rating} out of 5 stars`}>
      {'★'.repeat(rating)}
      <span className="text-[var(--border-subtle)]">{'★'.repeat(5 - rating)}</span>
    </span>
  );
}

function ImageThumbs({ urls }: { urls: string[] }) {
  if (urls.length === 0) return null;
  return (
    <div className="mt-2 flex gap-2">
      {urls.map((url) => (
        <div
          key={url}
          className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-[var(--surface-sunken)]"
        >
          <Image src={url} alt="" fill sizes="64px" className="object-cover" unoptimized />
        </div>
      ))}
    </div>
  );
}

function ReplyForm({ review, onDone }: { review: Review; onDone: () => void }) {
  const [body, setBody] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [state, formAction, pending] = useActionState(replyToReview, undefined);

  async function handleAISuggest() {
    setGeneratingAI(true);
    const fd = new FormData();
    fd.set('reviewId', review.id);
    fd.set('rating', String(review.rating));
    fd.set('reviewerName', review.customer_name);
    fd.set('productName', review.product_name);
    fd.set('reviewBody', review.body);

    const result = await generateAIReply(undefined, fd);
    setGeneratingAI(false);

    if (result?.error) {
      toast.error(result.error);
      return;
    }
    if (result?.draft) setBody(result.draft);
  }

  useEffect(() => {
    if (state?.success) {
      toast.success('Reply posted');
      onDone();
    }
    if (state?.error) toast.error(state.error);
    // onDone is stable (defined inline in the parent per render is fine here
    // since it only flips a boolean) — omitting to avoid re-running on every
    // parent re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const fd = new FormData();
    for (const f of Array.from(files)) fd.append('files', f);
    fd.set('reviewId', review.id);

    const result = await uploadReplyImage(undefined, fd);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';

    if (result?.error) {
      toast.error(result.error);
      return;
    }
    if (result?.urls) {
      setImages((prev) => [...prev, ...result.urls!].slice(0, 4));
      toast.success(`${result.urls.length} image(s) uploaded`);
    }
  }

  return (
    <form
      action={(fd) => {
        fd.set('reviewId', review.id);
        fd.set('body', body);
        fd.set('images', JSON.stringify(images));
        formAction(fd);
      }}
      className="mt-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-sunken)] p-3"
    >
      <div className="mb-1 flex items-center justify-between">
        <label className="block text-xs font-medium uppercase tracking-wide text-[var(--text-light)]">
          Reply as TheAamGhar
        </label>
        <button
          type="button"
          onClick={handleAISuggest}
          disabled={generatingAI}
          className="rounded-full border border-[var(--mango-orange)] px-3 py-1 text-xs font-semibold text-[var(--mango-orange)] transition hover:bg-[var(--mango-orange)]/10 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {generatingAI ? 'Thinking…' : '✨ AI Suggest Reply'}
        </button>
      </div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        maxLength={2000}
        placeholder="Thank the customer, address their concern, or correct the record… or click AI Suggest Reply above."
        className={inputClass}
      />
      <div className="mt-2 flex items-center gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={handleFileChange}
          disabled={uploading || images.length >= 4}
          className="text-xs text-[var(--text-light)]"
        />
        {uploading && <span className="text-xs text-[var(--text-light)]">Uploading…</span>}
      </div>
      <ImageThumbs urls={images} />
      <div className="mt-3 flex gap-2">
        <button
          type="submit"
          disabled={pending || !body.trim()}
          className="rounded-lg bg-[var(--mango-orange)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--mango-deep)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? 'Posting…' : 'Post Reply'}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded-lg border border-[var(--border-subtle)] px-4 py-2 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--surface)]"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function ReviewRow({ review }: { review: Review }) {
  const [replying, setReplying] = useState(false);
  const [removeState, removeAction, removePending] = useActionState(removeReply, undefined);
  const [deleteState, deleteAction, deletePending] = useActionState(deleteReview, undefined);

  useEffect(() => {
    if (removeState?.success) toast.success('Reply removed');
    if (removeState?.error) toast.error(removeState.error);
  }, [removeState]);

  useEffect(() => {
    if (deleteState?.success) toast.success('Review deleted');
    if (deleteState?.error) toast.error(deleteState.error);
  }, [deleteState]);

  const hasReply = Boolean(review.admin_reply_body);

  return (
    <div className="border-b border-[var(--border-subtle)] py-4 last:border-b-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Stars rating={review.rating} />
            {review.verified_purchase && (
              <span className="rounded-full bg-[var(--orchard-green)]/15 px-2 py-0.5 text-xs font-medium text-[var(--orchard-green)]">
                Verified Purchase
              </span>
            )}
          </div>
          <p className="mt-1 text-sm font-semibold text-[var(--text)]">{review.product_name}</p>
          {review.title && <p className="text-sm font-medium text-[var(--text)]">{review.title}</p>}
          <p className="text-sm text-[var(--text-light)]">{review.body}</p>
          <ImageThumbs urls={review.images} />
          <p className="mt-2 text-xs text-[var(--text-light)]">
            {review.customer_name} ·{' '}
            {new Date(review.created_at).toLocaleDateString('en-PK', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          {!hasReply && !replying && (
            <button
              onClick={() => setReplying(true)}
              className="rounded-lg border border-[var(--border-subtle)] px-3 py-1.5 text-xs font-semibold text-[var(--text)] transition hover:bg-[var(--surface-sunken)]"
            >
              Reply
            </button>
          )}
          <form
            action={(fd) => {
              if (!window.confirm('Delete this review permanently? This cannot be undone.')) {
                return;
              }
              deleteAction(fd);
            }}
          >
            <input type="hidden" name="reviewId" value={review.id} />
            <button
              type="submit"
              disabled={deletePending}
              className="rounded-lg border border-[var(--error)] px-3 py-1.5 text-xs font-semibold text-[var(--error)] transition hover:bg-[var(--error)]/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Delete Review
            </button>
          </form>
        </div>
      </div>

      {replying && <ReplyForm review={review} onDone={() => setReplying(false)} />}

      {hasReply && !replying && (
        <div className="mt-3 rounded-lg bg-[var(--mango-orange)]/10 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--mango-orange)]">
            Your reply
          </p>
          <p className="mt-1 text-sm text-[var(--text)]">{review.admin_reply_body}</p>
          <ImageThumbs urls={review.admin_reply_images} />
          <p className="mt-2 text-xs text-[var(--text-light)]">
            {review.admin_reply_at &&
              new Date(review.admin_reply_at).toLocaleDateString('en-PK', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
          </p>
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => setReplying(true)}
              className="rounded-lg border border-[var(--border-subtle)] px-3 py-1.5 text-xs font-semibold text-[var(--text)] transition hover:bg-[var(--surface)]"
            >
              Edit reply
            </button>
            <form action={removeAction}>
              <input type="hidden" name="reviewId" value={review.id} />
              <button
                type="submit"
                disabled={removePending}
                className="rounded-lg border border-[var(--border-subtle)] px-3 py-1.5 text-xs font-semibold text-[var(--text)] transition hover:bg-[var(--surface)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Remove reply
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export function ReviewsClient({ reviews }: { reviews: Review[] }) {
  const [ratingFilter, setRatingFilter] = useState<string>('any');
  const [unrepliedOnly, setUnrepliedOnly] = useState(false);

  const filtered = useMemo(() => {
    return reviews.filter((r) => {
      if (ratingFilter !== 'any' && r.rating !== Number(ratingFilter)) return false;
      if (unrepliedOnly && r.admin_reply_body) return false;
      return true;
    });
  }, [reviews, ratingFilter, unrepliedOnly]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select
          value={ratingFilter}
          onChange={(e) => setRatingFilter(e.target.value)}
          className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-1.5 text-sm text-[var(--text)]"
        >
          <option value="any">All ratings</option>
          <option value="1">1 star</option>
          <option value="2">2 stars</option>
          <option value="3">3 stars</option>
          <option value="4">4 stars</option>
          <option value="5">5 stars</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-[var(--text-light)]">
          <input
            type="checkbox"
            checked={unrepliedOnly}
            onChange={(e) => setUnrepliedOnly(e.target.checked)}
          />
          Unreplied only
        </label>
        <span className="text-xs text-[var(--text-light)]">
          {filtered.length} of {reviews.length}
        </span>
      </div>

      {reviews.length === 0 ? (
        <p className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 text-sm text-[var(--text-light)] shadow-sm">
          No reviews yet.
        </p>
      ) : filtered.length === 0 ? (
        <p className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 text-sm text-[var(--text-light)] shadow-sm">
          No reviews match this filter.
        </p>
      ) : (
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-sm">
          {filtered.map((r) => (
            <ReviewRow key={r.id} review={r} />
          ))}
        </div>
      )}
    </div>
  );
}
