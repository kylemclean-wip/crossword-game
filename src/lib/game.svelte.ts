import * as v from "valibot";
import { SvelteMap } from "svelte/reactivity";
import { Player, PlayerChange, playerStateSchema } from "./player.svelte.ts";
import type { AnnounceOptions, Endpoint } from "./endpoint.ts";
import type { Cell } from "./cell.svelte.ts";
import type { GameChange } from "./network.ts";

export class Game {
  readonly endpoint: Endpoint;
  readonly players: SvelteMap<string, Player> = $state(new SvelteMap());

  readonly rules = {
    markCorrectWordsOnFill: true,
    timeHealthDrain: {
      amount: 1,
      period: 3,
    },
  } as const;

  private _status: GameStatus = $state({ type: "lobby" });

  get status() {
    return this._status;
  }

  private set status(newStatus) {
    const oldStatus = this._status;
    if (oldStatus === newStatus) return;

    this._status = newStatus;

    if (newStatus.type === "playing") {
      this.startedPlayingAt = performance.now() / 1000;
      this.lastHealthDrainAt = this.startedPlayingAt;
      setTimeout(() => this.playingUpdate(), 0);
    }
  }

  private startedPlayingAt: number = 0;

  get timePlaying() {
    return this.startedPlayingAt !== undefined
      ? performance.now() / 1000 - this.startedPlayingAt
      : 0;
  }

  private lastHealthDrainAt: number = 0;

  static fromGameState(gameState: GameState, endpoint: Endpoint) {
    const game = new Game({ endpoint });

    for (const playerState of gameState.playerStates) {
      game.players.set(
        playerState.id,
        Player.fromPlayerState(playerState, game)
      );
    }

    return game;
  }

  constructor({ endpoint }: { endpoint: Endpoint }) {
    this.endpoint = endpoint;
  }

  getBoardById(id: string) {
    return (
      this.players.values().find((player) => player.board?.id === id)?.board ??
      undefined
    );
  }

  gameState(options: { includeAnswers: boolean }): GameState {
    return {
      status: this.status,
      playerStates: this.players
        .values()
        .map((player) => player.playerState(options))
        .toArray(),
    };
  }

  onPlayerChange(player: Player, playerChange: PlayerChange) {
    if (!this.endpoint.isAuthority()) return;
    if (this.status.type !== "lobby" || !playerChange.changes.ready) return;

    if (this.players.values().every((player) => player.ready))
      this.endpoint.startGame();
  }

  onCellChange(cell: Cell) {
    if (!this.rules.markCorrectWordsOnFill || !this.endpoint.isAuthority())
      return;

    let allWordsSolved = true;

    for (const word of Object.values(cell.words)) {
      if (!word) continue;

      let allLettersCorrect = true;
      let anyNotKnownCorrectStatus = false;
      const cells = [...word.cells()];

      for (const cell of cells) {
        if (cell.correctLetter?.type !== "known")
          throw new Error("Cell has no known correct letter");

        if (cell.letter !== cell.correctLetter.letter) {
          allLettersCorrect = false;
        }

        if (cell.status !== "knownCorrect") {
          anyNotKnownCorrectStatus = true;
        }
      }

      if (allLettersCorrect && anyNotKnownCorrectStatus) {
        // TODO: announce all cells at once
        for (const cell of cells) {
          cell.change(
            { letter: cell.letter, status: "knownCorrect" },
            { announce: true, callHandlers: false }
          );
        }
      }

      if (!allLettersCorrect) allWordsSolved = false;
    }

    if (allWordsSolved) {
      // TODO
    }
  }

  private playingUpdate() {
    if (this.status.type !== "playing") return;

    if (this.endpoint.isAuthority()) {
      if (
        this.rules.timeHealthDrain.amount > 0 &&
        this.timePlaying >=
          this.lastHealthDrainAt + this.rules.timeHealthDrain.period
      ) {
        this.lastHealthDrainAt = this.timePlaying;

        for (const player of this.players.values()) {
          player.change(
            new PlayerChange({
              health: player.health - this.rules.timeHealthDrain.amount,
            }),
            { allow: "all", announce: true }
          );
        }
      }
    }

    setTimeout(() => this.playingUpdate(), (1 / 60) * 1000);
  }

  change(change: GameChange, options: { announce: boolean | AnnounceOptions }) {
    if (change.status !== undefined) this.status = change.status;

    if (options.announce) {
      this.endpoint.announce(
        {
          type: "gameChange",
          gameChange: change,
        },
        typeof options.announce === "object" ? options.announce : {}
      );
    }
  }
}

const gameStatusSchema = v.variant("type", [
  v.object({ type: v.literal("lobby") }),
  v.object({ type: v.literal("playing") }),
  v.object({ type: v.literal("ended") }),
]);
type GameStatus = v.InferOutput<typeof gameStatusSchema>;

export const gameStateSchema = v.object({
  status: gameStatusSchema,
  playerStates: v.array(playerStateSchema),
});
export type GameState = v.InferOutput<typeof gameStateSchema>;
