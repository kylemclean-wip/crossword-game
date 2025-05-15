import * as v from "valibot";
import { Game } from "./game.svelte.ts";
import { Player, PlayerChange } from "./player.svelte.ts";
import {
  createNetwork,
  type ClientToServerPacketSchema,
  type Network,
} from "./network.ts";
import { Endpoint, type AnnounceOptions } from "./endpoint.ts";

type Connection =
  | { status: "connecting" }
  | { status: "connected" }
  | { status: "inGame"; game: Game; playerId: string }
  | { status: "disconnected"; reason: { error: string } };

export class Client extends Endpoint<ClientToServerPacketSchema> {
  private readonly network: Network;
  private socket: WebSocket;

  private _connection: Connection = $state({ status: "connecting" });
  get connection() {
    return this._connection as Readonly<Connection>;
  }
  private set connection(newConnection) {
    this._connection = newConnection;
  }

  constructor(url: string) {
    super();

    this.network = createNetwork({ endpoint: this });
    this.socket = new WebSocket(url);

    this.socket.addEventListener("open", () => {
      console.log("Connected to the server");
      this.connection = { status: "connected" };
    });

    this.socket.addEventListener("message", (event) => {
      const packetJson = this.getJsonFromPacketRawData(event.data);
      console.log("received packet", packetJson);

      const packet = this.network.parseServerToClientPacket(packetJson, {
        sender: { type: "server" },
      });

      if (this.connection.status === "connected") {
        if (packet.type === "init") {
          this.connection = {
            status: "inGame",
            game: Game.fromGameState(packet.gameState, this),
            playerId: packet.playerId,
          };

          return;
        }
      }

      if (this.connection.status === "inGame") {
        if (packet.type === "playerJoin") {
          if (packet.playerState.id === this.connection.playerId) return;

          const player = Player.fromPlayerState(
            packet.playerState,
            this.connection.game
          );
          this.connection.game.players.set(player.id, player);

          return;
        }

        if (packet.type === "playerLeave") {
          this.connection.game.players.delete(packet.playerId);

          return;
        }

        if (packet.type === "gameChange") {
          this.connection.game.change(packet.gameChange, {
            announce: false,
          });

          return;
        }

        if (packet.type === "selectionChange") {
          const board = this.connection.game.getBoardById(packet.boardId);
          if (!board)
            throw new Error(`No board with id ${packet.boardId} found`);

          board.changeSelection(packet.selectionChange, {
            announce: false,
            throwOnFailure: true,
          });

          return;
        }

        if (packet.type === "cellChange") {
          packet.cell.change(packet.cellChange, { announce: false });

          return;
        }

        if (packet.type === "playerChange") {
          const player = this.connection.game.players.get(packet.playerId);
          if (!player)
            throw new Error(`No player with id ${packet.playerId} found`);

          player.change(packet.playerChange, { allow: "all", announce: false });

          return;
        }
      }

      throw new Error(
        `Unexpected packet ${packet.type} when connection is ${this.connection.status}`
      );
    });

    this.socket.addEventListener("close", (event) => {
      console.log("Disconnected from the server", event);

      let reason;
      if (event.code === 1001) {
        reason = { error: "USER_DISCONNECTED" };
      } else {
        try {
          reason = JSON.parse(event.reason);
        } catch {
          console.error("Failed to parse close reason", event.reason);
          reason = { error: "UNKNOWN" };
        }
      }

      this.connection = { status: "disconnected", reason };
    });

    this.socket.addEventListener("error", (event) => {
      console.error(event);
    });
  }

  private getJsonFromPacketRawData(packetRawData: unknown) {
    if (typeof packetRawData !== "string") {
      throw new Error(
        `Packet raw data is ${typeof packetRawData}, expected string`
      );
    }

    return JSON.parse(packetRawData);
  }

  get inGameConnection() {
    return this.connection.status === "inGame" ? this.connection : null;
  }

  get game() {
    return this.inGameConnection?.game ?? null;
  }

  get thisPlayer() {
    const connection = this.inGameConnection;
    return connection?.game?.players?.get(connection.playerId) ?? null;
  }

  get allPlayers() {
    return this.game ? [...this.game.players.values()] : [];
  }

  get otherPlayers() {
    const connection =
      this.connection.status === "inGame" ? this.connection : null;
    return connection
      ? [...connection.game.players.values()].filter(
          (player) => player.id !== connection.playerId
        )
      : [];
  }

  private sendToServer<T extends v.InferInput<ClientToServerPacketSchema>>(
    data: T
  ) {
    this.socket.send(JSON.stringify(data));
  }

  override announce<T extends v.InferInput<ClientToServerPacketSchema>>(
    data: T,
    options: AnnounceOptions
  ) {
    if (options.exceptPlayerId !== undefined) {
      throw new Error(
        "exceptPlayerId should not be specified for Client.announce"
      );
    }

    this.sendToServer(data);
  }

  toggleReady() {
    if (!this.thisPlayer) throw new Error("No player");

    this.thisPlayer.change(
      new PlayerChange({ ready: !this.thisPlayer.ready }),
      {
        allow: "all",
        announce: true,
      }
    );
  }

  requestNewBoard() {
    if (this.connection.status !== "inGame") throw new Error("Not in game");

    this.sendToServer({
      type: "requestNewBoard",
      playerId: this.connection.playerId,
    });
  }
}
