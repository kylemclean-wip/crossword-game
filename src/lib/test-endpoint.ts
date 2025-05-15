import "./stub-svelte-runes.ts";
import * as v from "valibot";
import {
  Endpoint,
  type AnnounceOptions,
  type AuthorityEndpoint,
} from "./endpoint.ts";
import type { Game } from "./game.svelte.ts";
import type { ServerToClientPacketSchema } from "./network.ts";

export class TestEndpoint
  extends Endpoint<ServerToClientPacketSchema>
  implements AuthorityEndpoint
{
  readonly announcements: { data: unknown; options: AnnounceOptions }[] = [];

  override announce(
    data: v.InferInput<ServerToClientPacketSchema>,
    options: AnnounceOptions
  ) {
    this.announcements.push({ data, options });
  }

  override get game(): Game {
    throw new Error("Method not implemented.");
  }

  startGame(): void {
    throw new Error("Method not implemented.");
  }
}
