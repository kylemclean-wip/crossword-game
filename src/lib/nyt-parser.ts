import * as v from "valibot";
import type { Puzzle } from "./puzzle.ts";
import type { Position } from "./position.ts";

const nytSchema = v.pipe(
  v.object({
    body: v.array(
      v.object({
        cells: v.array(
          v.union([
            v.object({
              answer: v.string(),
            }),
            v.object({}),
          ])
        ),
        clues: v.array(
          v.object({
            cells: v.array(v.number()),
            direction: v.picklist(["Across", "Down"]),
            label: v.string(),
            text: v.array(v.object({ plain: v.string() })),
          })
        ),
        dimensions: v.object({ width: v.number(), height: v.number() }),
      })
    ),
  }),
  v.transform((obj) => {
    const dimensions = obj.body[0].dimensions;
    const cellInputs = obj.body[0].cells;
    const cellLetters: string[] = [];

    for (let i = 0; i < dimensions.height; i++) {
      cellLetters.push(
        cellInputs
          .splice(0, dimensions.width)
          .map((input) => ("answer" in input ? input.answer : " "))
          .join("")
      );
    }

    const clues = obj.body[0].clues.map((input) => {
      const startCellIndex = input.cells[0];
      return {
        startCell: {
          x: startCellIndex % dimensions.width,
          y: Math.floor(startCellIndex / dimensions.width),
        } as Position,
        direction: input.direction === "Across" ? "across" : "down",
        text: input.text.map((textInput) => textInput.plain).join("\n"),
      } as const;
    });

    return { cellLetters, clues } satisfies Puzzle;
  })
);

export const parseNyt = (inputJson: unknown) => v.parse(nytSchema, inputJson);
