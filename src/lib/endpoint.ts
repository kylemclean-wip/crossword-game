import type { Game } from "./game.svelte";
import type { PacketSchema } from "./network";
import * as v from "valibot";

export interface AuthorityEndpoint {
  startGame(): void;
}

export abstract class Endpoint<T extends PacketSchema = PacketSchema> {
  abstract announce(
    data: v.InferInput<T>,
    options: { exceptPlayerId?: string }
  ): void;

  isAuthority(): this is AuthorityEndpoint {
    return false;
  }

  abstract get game(): Game | null;

  requireGame() {
    const game = this.game;
    if (!game) throw new Error("No game");
    return game;
  }
}

export type AnnounceOptions = Parameters<Endpoint["announce"]>[1];
