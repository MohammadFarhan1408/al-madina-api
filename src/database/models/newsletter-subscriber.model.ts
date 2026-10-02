import { Schema, model, type Document, type Types } from 'mongoose';
import { baseSchemaOptions } from './base';

export interface INewsletterSubscriber extends Document {
  _id: Types.ObjectId;
  email: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const newsletterSubscriberSchema = new Schema<INewsletterSubscriber>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // Soft-unsubscribe flag — no unsubscribe endpoint yet, but keeping the
    // record (rather than deleting it) preserves history and re-subscribe
    // stays a simple flip once that flow exists.
    isActive: { type: Boolean, default: true },
  },
  baseSchemaOptions,
);

export const NewsletterSubscriber = model<INewsletterSubscriber>(
  'NewsletterSubscriber',
  newsletterSubscriberSchema,
);
