/**
 * Transform applied on serialization so every document exposes a string `id`
 * (the spec's API contracts use `id`, not Mongo's `_id`) and hides internal
 * fields. Sensitive paths are deleted defensively per-model where needed.
 */
function transform(_doc: unknown, ret: Record<string, unknown>): Record<string, unknown> {
  ret.id = ret._id?.toString();
  delete ret._id;
  delete ret.__v;
  return ret;
}

/**
 * Default schema options shared by all models:
 * - automatic createdAt/updatedAt timestamps
 * - `id` virtual on toJSON / toObject with the transform above
 *
 * Intentionally left un-annotated (no `SchemaOptions` type) so it stays
 * structurally compatible with every model's specific generic parameters.
 */
export const baseSchemaOptions = {
  timestamps: true,
  toJSON: { virtuals: true, versionKey: false, transform },
  toObject: { virtuals: true, versionKey: false, transform },
} as const;
