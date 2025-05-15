import "../lib/stub-svelte-runes.ts";
import type { ServerWebSocket, Server as WebServer } from "bun";
import * as v from "valibot";
import { readdir } from "node:fs/promises";
import { Game } from "../lib/game.svelte.ts";
import { Board } from "../lib/board.svelte.ts";
import { Player, PlayerChange } from "../lib/player.svelte.ts";
import {
  createNetwork,
  type Network,
  type ServerToClientPacketSchema,
} from "../lib/network.ts";
import { Endpoint, type AuthorityEndpoint } from "../lib/endpoint.ts";
import { puzzleBank } from "./puzzle-bank.ts";
import type { Puzzle } from "../lib/puzzle.ts";

interface WebSocketData {
  playerId: string;
}

class ClientError extends Error {
  readonly code: "INVALID_PACKET" | "GAME_NOT_IN_LOBBY" | "UNKNOWN";

  constructor(
    code: ClientError["code"],
    message: string,
    options?: ErrorOptions
  ) {
    super(`${code}: ${message}`, options);
    this.code = code;
  }
}

async function getRandomPuzzle(exceptIndex?: number) {
  let puzzleIndex;
  do {
    puzzleIndex = Math.floor(Math.random() * puzzleBank.length);
  } while (puzzleIndex === exceptIndex);

  return { puzzleIndex, puzzle: puzzleBank[puzzleIndex] };
}

const playerCurrentPuzzleIndices = new Map<string, number>();

class Server
  extends Endpoint<ServerToClientPacketSchema>
  implements AuthorityEndpoint
{
  readonly game: Game;
  private readonly network: Network;

  private webServer: WebServer;
  private readonly playerSockets: Map<string, ServerWebSocket<WebSocketData>> =
    new Map();

  constructor({ port }: { port: number }) {
    super();

    this.game = new Game({ endpoint: this });
    this.network = createNetwork({ endpoint: this });

    this.webServer = Bun.serve<WebSocketData, {}>({
      fetch(req, server) {
        if (new URL(req.url).pathname !== "/game")
          return new Response(null, { status: 404 });

        if (server.upgrade(req, { data: { playerId: crypto.randomUUID() } }))
          return;

        return Response.json({ error: "UPGRADE_FAILED" }, { status: 500 });
      },
      websocket: {
        open: this.onOpen.bind(this),
        message: this.onMessage.bind(this),
        close: this.onClose.bind(this),
      },
      port,
    });

    console.log("Server running on", this.webServer.url.toString());
  }

  private onOpen(ws: ServerWebSocket<WebSocketData>) {
    console.log("Connection from", ws.remoteAddress);

    if (this.game.status.type !== "lobby") {
      console.log("Disconnecting because game is not in lobby");
      ws.close(1000, JSON.stringify({ error: "GAME_NOT_IN_LOBBY" }));
      return;
    }

    ws.subscribe("game");

    const player = new Player({
      game: this.game,
      id: ws.data.playerId,
    });
    this.game.players.set(player.id, player);
    this.playerSockets.set(player.id, ws);

    this.sendToPlayer(ws, {
      type: "init",
      playerId: player.id,
      gameState: this.game.gameState({ includeAnswers: false }),
    });

    this.broadcastToPlayers({
      type: "playerJoin",
      playerState: player.playerState({ includeAnswers: false }),
    });
  }

  private onMessage(ws: ServerWebSocket<WebSocketData>, message: string) {
    try {
      if (typeof message !== "string")
        throw new ClientError("INVALID_PACKET", "Received non-string message");

      let messageJson;
      try {
        messageJson = JSON.parse(message);
      } catch {
        throw new ClientError("INVALID_PACKET", "Received non-JSON message");
      }

      console.log(
        "Received packet from player id",
        ws.data.playerId,
        messageJson
      );

      let packet;
      try {
        packet = this.network.parseClientToServerPacket(messageJson, {
          sender: { type: "player", playerId: ws.data.playerId },
        });
      } catch {
        console.warn("Received invalid packet", messageJson);
        throw new ClientError("INVALID_PACKET", "Received invalid packet", {
          cause: messageJson,
        });
      }

      const player = this.game.players.get(ws.data.playerId);
      if (!player) throw new Error(`No player with id ${ws.data.playerId}`);

      if (packet.type === "playerChange") {
        if (packet.playerId !== player.id)
          throw new ClientError(
            "INVALID_PACKET",
            `Packet playerId ${packet.playerId} does not match playerId ${player.id}`
          );

        player.change(packet.playerChange, {
          allow: ["ready"],
          announce: { exceptPlayerId: ws.data.playerId },
        });
      } else if (packet.type === "selectionChange") {
        if (!player.board)
          throw new ClientError("INVALID_PACKET", "Player has no board");

        if (packet.boardId !== player.board.id) {
          throw new ClientError(
            "INVALID_PACKET",
            `Packet board id ${packet.boardId} does not match player board id ${player.board.id}`
          );
        }

        player.board.changeSelection(packet.selectionChange, {
          announce: { exceptPlayerId: ws.data.playerId },
        });
      } else if (packet.type === "cellChange") {
        if (!player.board)
          throw new ClientError("INVALID_PACKET", "Player has no board");

        if (packet.cell.board.id !== player.board.id) {
          throw new ClientError(
            "INVALID_PACKET",
            `Packet board id ${packet.cell.board.id} does not match player board id ${player.board.id}`
          );
        }

        packet.cell.change(packet.cellChange, {
          announce: { exceptPlayerId: ws.data.playerId },
        });
      } else if (packet.type === "requestNewBoard") {
        const currentPuzzleIndex = playerCurrentPuzzleIndices.get(
          ws.data.playerId
        );

        getRandomPuzzle(currentPuzzleIndex).then(({ puzzle, puzzleIndex }) => {
          console.log(playerCurrentPuzzleIndices);
          playerCurrentPuzzleIndices.set(ws.data.playerId, puzzleIndex);
          player.change(new PlayerChange({ board: Board.fromPuzzle(puzzle) }), {
            allow: "all",
            announce: true,
          });
        });
      } else {
        throw new Error("Unhandled packet", { cause: packet });
      }
    } catch (e) {
      if (e instanceof ClientError) {
        console.warn(e);
        const reason = { error: e.code };
        ws.close(1000, JSON.stringify(reason));
      } else {
        throw e;
      }
    }
  }

  private onClose(ws: ServerWebSocket<WebSocketData>) {
    console.log("Connection closed from", ws.remoteAddress);
    ws.unsubscribe("game");
    this.game.players.delete(ws.data.playerId);
    this.playerSockets.delete(ws.data.playerId);

    this.broadcastToPlayers({
      type: "playerLeave",
      playerId: ws.data.playerId,
    });
  }

  private sendToPlayer(
    playerSocket: ServerWebSocket<WebSocketData>,
    data: v.InferInput<ServerToClientPacketSchema>
  ) {
    playerSocket.send(JSON.stringify(data));
  }

  private broadcastToPlayers(
    data: v.InferInput<ServerToClientPacketSchema>,
    options?: { except?: ServerWebSocket<WebSocketData> }
  ) {
    (options?.except ?? this.webServer).publish("game", JSON.stringify(data));
  }

  override announce(
    data: v.InferInput<ServerToClientPacketSchema>,
    options: { exceptPlayerId?: string }
  ) {
    this.broadcastToPlayers(data, {
      except: options?.exceptPlayerId
        ? this.playerSockets.get(options.exceptPlayerId)
        : undefined,
    });
  }

  override isAuthority(): this is AuthorityEndpoint {
    return true;
  }

  async startGame() {
    if (this.game.status.type !== "lobby")
      throw new Error("Game is not in lobby");

    await Promise.all(
      this.game.players.values().map(async (player) => {
        const { puzzleIndex, puzzle } = await getRandomPuzzle();
        playerCurrentPuzzleIndices.set(player.id, puzzleIndex);
        player.change(new PlayerChange({ board: Board.fromPuzzle(puzzle) }), {
          allow: "all",
          announce: true,
        });
      })
    );

    this.game.change({ status: { type: "playing" } }, { announce: true });
  }
}

new Server({ port: 2121 });
