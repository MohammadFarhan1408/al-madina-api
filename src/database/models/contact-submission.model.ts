import { Schema, model, type Document, type Types } from 'mongoose';
import { baseSchemaOptions } from './base';

export interface IContactSubmission extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  message: string;
  createdAt: Date;
  updatedAt: Date;
}

const contactSubmissionSchema = new Schema<IContactSubmission>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    message: { type: String, required: true },
  },
  baseSchemaOptions,
);

contactSubmissionSchema.index({ createdAt: -1 });

export const ContactSubmission = model<IContactSubmission>(
  'ContactSubmission',
  contactSubmissionSchema,
);
