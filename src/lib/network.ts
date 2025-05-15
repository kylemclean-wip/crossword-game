import * as v from "valibot";
import { cellStateSchema } from "./cell.svelte.ts";
import { gameStateSchema } from "./game.svelte.ts";
import { positionSchema } from "./position.ts";
import { PlayerChange, playerStateSchema } from "./player.svelte.ts";
import {
  Board,
  boardStateSchema,
  selectionStateSchema,
} from "./board.svelte.ts";
import type { Endpoint } from "./endpoint.ts";

export type PacketDirection = "clientToServer" | "serverToClient";

interface ParseContext {
  sender: { type: "player"; playerId: string } | { type: "server" };
}

export function createNetwork({ endpoint }: { endpoint: Endpoint<any> }) {
  let parseContext!: ParseContext;

  const gameChangeSchema = v.partial(v.pick(gameStateSchema, ["status"]));

  const playerChangeSchema = v.pipe(
    v.partial(
      v.object({
        board: v.nullable(boardStateSchema),
        health: v.number(),
        maxHealth: v.number(),
        ready: v.boolean(),
      })
    ),
    v.transform(
      (data) =>
        new PlayerChange({
          board: data.board ? Board.fromBoardState(data.board) : data.board,
          health: data.health,
          maxHealth: data.maxHealth,
          ready: data.ready,
        })
    )
  );

  const selectionChangeSchema = v.nullable(
    v.partial(v.unwrap(selectionStateSchema))
  );

  const cellChangeSchema = v.partial(cellStateSchema);

  const bidirectionalPackets = {
    playerChangePacket: v.object({
      type: v.literal("playerChange"),
      playerId: v.string(),
      playerChange: playerChangeSchema,
    }),

    selectionChangePacket: v.object({
      type: v.literal("selectionChange"),
      boardId: v.string(),
      selectionChange: selectionChangeSchema,
    }),

    cellChangePacket: v.pipe(
      v.object({
        type: v.literal("cellChange"),
        boardId: v.string(),
        cellPosition: positionSchema,
        cellChange: cellChangeSchema,
      }),
      v.transform((data) => {
        const board = endpoint.requireGame().getBoardById(data.boardId);

        if (!board) throw new Error(`No board with id ${data.boardId}`);

        return {
          type: "cellChange",
          cell: board.cellAt(data.cellPosition.x, data.cellPosition.y),
          cellChange: data.cellChange,
        } as const;
      })
    ),
  };

  const serverToClientPackets = {
    ...bidirectionalPackets,

    initPacket: v.object({
      type: v.literal("init"),
      playerId: v.string(),
      gameState: gameStateSchema,
    }),

    gameChangePacket: v.object({
      type: v.literal("gameChange"),
      gameChange: gameChangeSchema,
    }),

    playerJoinPacket: v.object({
      type: v.literal("playerJoin"),
      playerState: playerStateSchema,
    }),

    playerLeavePacket: v.object({
      type: v.literal("playerLeave"),
      playerId: v.string(),
    }),
  };
  const serverToClientPacketSchema = v.variant(
    "type",
    Object.values(serverToClientPackets)
  );

  const clientToServerPackets = {
    ...bidirectionalPackets,

    ready: v.pipe(
      v.object({
        type: v.literal("ready"),
        playerId: v.string(),
      }),
      v.transform((data) => {
        const player = endpoint.requireGame().players.get(data.playerId);

        if (!player) throw new Error(`No player with id ${data.playerId}`);

        return {
          type: "ready",
          player,
        } as const;
      })
    ),

    requestNewBoardPacket: v.object({
      type: v.literal("requestNewBoard"),
      playerId: v.string(),
    }),
  };
  const clientToServerPacketSchema = v.variant(
    "type",
    Object.values(clientToServerPackets)
  );

  function parsePacket<
    T extends
      | typeof serverToClientPacketSchema
      | typeof clientToServerPacketSchema
  >(schema: T, packetData: string, parseContextForThisParse: ParseContext) {
    try {
      if (parseContext) throw new Error("parseContext is not undefined");
      parseContext = parseContextForThisParse;

      const packet = v.parse(schema, packetData);
      return packet;
    } finally {
      parseContext = undefined!;
    }
  }

  return {
    parseClientToServerPacket(
      packetData: string,
      parseContextForThisParse: ParseContext
    ) {
      return parsePacket(
        clientToServerPacketSchema,
        packetData,
        parseContextForThisParse
      );
    },

    parseServerToClientPacket(
      packetData: string,
      parseContextForThisParse: ParseContext
    ) {
      return parsePacket(
        serverToClientPacketSchema,
        packetData,
        parseContextForThisParse
      );
    },

    _schemas: {
      gameChangeSchema,
      playerChangeSchema,
      selectionChangeSchema,
      cellChangeSchema,
    },
    _packets: {
      serverToClient: serverToClientPackets,
      clientToServer: clientToServerPackets,
    },
  };
}

export type Network = ReturnType<typeof createNetwork>;

export type GameChange = v.InferOutput<Network["_schemas"]["gameChangeSchema"]>;
export type SelectionChange = v.InferOutput<
  Network["_schemas"]["selectionChangeSchema"]
>;
export type CellChange = v.InferOutput<Network["_schemas"]["cellChangeSchema"]>;

type PacketSchemaInDirection<T extends PacketDirection> =
  Network["_packets"][T][keyof Network["_packets"][T]];
export type ClientToServerPacketSchema =
  PacketSchemaInDirection<"clientToServer">;
export type ServerToClientPacketSchema =
  PacketSchemaInDirection<"serverToClient">;
export type PacketSchema =
  | ClientToServerPacketSchema
  | ServerToClientPacketSchema;
