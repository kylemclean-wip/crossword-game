import * as v from "valibot";
import { Board, boardStateSchema } from "./board.svelte.ts";
import type { Game } from "./game.svelte.ts";
import type { AnnounceOptions } from "./endpoint.ts";
import type { Network } from "./network.ts";

export class Player {
  readonly game: Game;
  readonly id: string;
  private _board: Board | null = $state(null);
  get board() {
    return this._board;
  }

  private _maxHealth = $state(100);
  get maxHealth() {
    return this._maxHealth;
  }
  private set maxHealth(newMaxHealth: number) {
    this._maxHealth = newMaxHealth;
    this.health = this.health;
  }

  private _health = $state(100);
  get health() {
    return this._health;
  }
  private set health(newHealth: number) {
    this._health = Math.min(this.maxHealth, newHealth);
  }

  private _ready = $state(false);
  get ready() {
    return this._ready;
  }

  static fromPlayerState(playerState: PlayerState, game: Game) {
    const player = new Player({ game, id: playerState.id });
    player.change(
      new PlayerChange({
        board: playerState.boardState
          ? Board.fromBoardState(playerState.boardState)
          : null,
      }),
      { allow: "all", announce: false }
    );
    return player;
  }

  constructor({ game, id }: { game: Game; id: string }) {
    this.game = game;
    this.id = id;
  }

  playerState(options: { includeAnswers: boolean }): PlayerState {
    return {
      id: this.id,
      boardState: this.board?.boardState(options) ?? null,
      health: this.health,
      maxHealth: this.maxHealth,
      ready: this.ready,
    };
  }

  change(
    playerChange: PlayerChange,
    {
      allow,
      announce,
      callHandlers = true,
    }: {
      allow: "all" | (keyof PlayerChange["changes"])[];
      announce: boolean | AnnounceOptions;
      callHandlers?: boolean;
    }
  ) {
    if (allow !== "all") {
      for (const key of Object.keys(
        playerChange.changes
      ) as (keyof PlayerChange["changes"])[]) {
        if (
          playerChange.changes[key] !== undefined &&
          !allow.includes(key as keyof PlayerChange["changes"])
        ) {
          throw new Error(`Cannot change ${key}`);
        }
      }
    }

    const newBoard = playerChange.changes.board;
    if (newBoard !== undefined) {
      if (this._board) this._board._playerThisIsBoardOf = null;

      if (
        newBoard?._playerThisIsBoardOf &&
        newBoard._playerThisIsBoardOf !== this
      ) {
        throw new Error("New board already has a different player");
      }

      this._board = newBoard;
      if (newBoard) newBoard._playerThisIsBoardOf = this;
    }

    if (playerChange.changes.health !== undefined)
      this.health = playerChange.changes.health;

    if (playerChange.changes.maxHealth !== undefined)
      this.maxHealth = playerChange.changes.maxHealth;

    if (playerChange.changes.ready !== undefined)
      this._ready = playerChange.changes.ready;

    if (announce) {
      this.game.endpoint.announce(
        {
          type: "playerChange",
          playerId: this.id,
          playerChange: playerChange.serialize(),
        },
        typeof announce === "object" ? announce : {}
      );
    }

    if (callHandlers) this.game.onPlayerChange(this, playerChange);
  }
}

export const playerStateSchema = v.object({
  id: v.string(),
  boardState: v.nullable(boardStateSchema),
  health: v.number(),
  maxHealth: v.number(),
  ready: v.boolean(),
});
export type PlayerState = v.InferOutput<typeof playerStateSchema>;

export class PlayerChange {
  readonly changes;

  constructor(
    changes: Partial<{
      board: Board | null;
      health: number;
      maxHealth: number;
      ready: boolean;
    }>
  ) {
    this.changes = changes;
  }

  serialize(): v.InferInput<Network["_schemas"]["playerChangeSchema"]> {
    return {
      board: this.changes.board
        ? this.changes.board.boardState({ includeAnswers: false })
        : this.changes.board,
      health: this.changes.health,
      maxHealth: this.changes.maxHealth,
      ready: this.changes.ready,
    };
  }
}
