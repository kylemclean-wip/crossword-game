import * as v from "valibot";

export const directionSchema = v.picklist(["across", "down"]);
export type Direction = v.InferOutput<typeof directionSchema>;
