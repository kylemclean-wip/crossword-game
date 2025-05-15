import * as v from "valibot";

export const positionSchema = v.pipe(
  v.object({ x: v.number(), y: v.number() }),
  v.brand("Position")
);
export type Position = v.InferOutput<typeof positionSchema>;
