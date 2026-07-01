import { Schema, model, type Document, type Types } from 'mongoose';
import { baseSchemaOptions } from './base';
import { THEME_MODES, type ThemeMode } from '../../constants/business';

export interface IUserPreference extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  themeMode: ThemeMode;
  promosEnabled: boolean;
  orderUpdatesEnabled: boolean;
  currency: string;
  language: string;
  createdAt: Date;
  updatedAt: Date;
}

const userPreferenceSchema = new Schema<IUserPreference>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    themeMode: { type: String, enum: THEME_MODES, default: 'system' },
    promosEnabled: { type: Boolean, default: true },
    orderUpdatesEnabled: { type: Boolean, default: true },
    currency: { type: String, default: 'AED', maxlength: 3 },
    language: { type: String, default: 'en', maxlength: 5 },
  },
  baseSchemaOptions,
);

export const UserPreference = model<IUserPreference>('UserPreference', userPreferenceSchema);
