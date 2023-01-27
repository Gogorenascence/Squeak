import { Server, type Socket } from "socket.io";
import { type IRoomConfig } from "../../components/CreateRoom/CreateRoom";
import {
  type IPlayerCards,
  type ICard,
} from "../../utils/generateDeckAndSqueakCards";
import generateDeckAndSqueakCards from "../../utils/generateDeckAndSqueakCards";
import { drawFromDeckHandler } from "./handlers/drawFromDeckHandler";
import { drawFromSqueakDeckHandler } from "./handlers/drawFromSqueakDeckHandler";
import { proposedCardDropHandler } from "./handlers/proposedCardDropHandler";
import { gameStuckHandler } from "./handlers/gameStuckHandler";
import { drawFromSqueakDeck } from "./helpers/drawFromSqueakDeck";
import { roundOverHandler } from "./handlers/roundOverHandler";
import { resetGameHandler } from "./handlers/resetGameHandler";

export interface IRoomData {
  [code: string]: IRoomMetadata;
}

interface IRoomMetadata {
  roomConfig: IRoomConfig;
  players: IRoomPlayersMetadata;
}

// TODO: is there a better way to type these?
// if not at least find a better name for them + swap IGameData and IGameMetadata
// for consistency

export interface IGameData {
  [code: string]: IGameMetadata;
}

export interface IGameMetadata {
  board: (ICard | null)[][];
  players: IPlayerCardsMetadata;
  currentRound: number;
}

export interface IPlayerCardsMetadata {
  [code: string]: IPlayer;
}

export interface IRoomPlayersMetadata {
  [code: string]: IRoomPlayer;
}

export interface IRoomPlayer {
  username: string;
  avatarPath: string;
  color: string;
  deckHueRotation: number;
}

export interface ICardDropProposal {
  card: ICard;
  deckStart?: boolean;
  squeakStartLocation?: number;
  boardEndLocation?: { row: number; col: number };
  squeakEndLocation?: number;
  updatedBoard?: (ICard | null)[][];
  updatedPlayerCards?: IPlayerCardsMetadata;
  playerID: string;
  roomCode: string;
}

export interface IDrawFromSqueakDeck {
  roomCode: string;
  indexToDrawTo: number;
  playerID: string;
  newCard?: ICard;
  updatedBoard?: (ICard | null)[][];
  updatedPlayerCards?: IPlayerCardsMetadata;
}

export interface IDrawFromDeck {
  nextTopCardInDeck: ICard | null;
  topCardsInDeck: (ICard | null)[];
  playerID: string;
  roomCode: string;
  updatedBoard: (ICard | null)[][];
  updatedPlayerCards: IPlayerCardsMetadata;
}

export interface IPlayer extends IPlayerCards {
  totalPoints: number;
  rankInRoom: number;
}

interface IStartGame {
  roomCode: string;
  firstRound: boolean;
}

interface IJoinRoomConfig {
  code: string;
  username: string;
  userID: string;
  avatarPath: string;
  color: string;
  deckHueRotation: number;
}

const roomData: IRoomData = {};
const gameData: IGameData = {};
let numberOfPlayersReady = 0;
let gameStuckInterval: ReturnType<typeof setTimeout>;

// @ts-expect-error sdf
export default function SocketHandler(req, res) {
  // means that socket server was already initialised
  if (res.socket.server.io) {
    res.end();
    return;
  }

  const io = new Server(res.socket.server);
  res.socket.server.io = io;

  const onConnection = (socket: Socket) => {
    // room logic
    socket.on(
      "createRoom",
      (
        roomConfig: IRoomConfig,
        hostAvatarPath: string,
        hostColor: string,
        hostDeckHueRotation: number
      ) => {
        socket.join(roomConfig.code);

        roomData[roomConfig.code] = {
          roomConfig,
          players: {
            [roomConfig.hostUserID]: {
              username: roomConfig.hostUsername,
              avatarPath: hostAvatarPath,
              color: hostColor,
              deckHueRotation: hostDeckHueRotation,
            },
          },
        };
        io.in(roomConfig.code).emit("roomWasCreated");
      }
    );

    socket.on(
      "joinRoom",
      ({
        code,
        username,
        userID,
        avatarPath,
        color,
        deckHueRotation,
      }: IJoinRoomConfig) => {
        const players = roomData[code]?.players;

        if (!players) return;

        socket.join(code);

        players[userID] = {
          username,
          avatarPath,
          color,
          deckHueRotation,
        };

        io.in(code).emit("connectedUsersChanged", roomData[code]?.players);

        // how to not have to extract it like this
        const currentPlayersInRoom = roomData[code]?.roomConfig?.playersInRoom;

        const updatedRoomConfig = {
          ...roomData[code]?.roomConfig,

          playersInRoom: currentPlayersInRoom ? currentPlayersInRoom + 1 : 1,
        };

        io.in(code).emit("roomConfigUpdated", updatedRoomConfig);
      }
    );

    socket.on("updateRoomConfig", (roomConfig: IRoomConfig) => {
      const room = roomData[roomConfig.code];
      if (!room) return;
      room.roomConfig = roomConfig;
      io.in(roomConfig.code).emit("roomConfigUpdated", roomConfig);
    });

    socket.on("startGame", ({ roomCode, firstRound }: IStartGame) => {
      if (firstRound) {
        io.in(roomCode).emit("navigateToPlayScreen");
      }

      // loop through all players and flip their squeak deck cards
      const currentRoomPlayers = roomData[roomCode]?.players;
      if (!currentRoomPlayers) return;

      for (const playerID of Object.keys(currentRoomPlayers)) {
        setTimeout(() => {
          drawFromSqueakDeck({
            indexToDrawTo: 0,
            playerID,
            roomCode,
            gameData,
            io,
          });
        }, 250);

        setTimeout(() => {
          drawFromSqueakDeck({
            indexToDrawTo: 1,
            playerID,
            roomCode,
            gameData,
            io,
          });
        }, 750);

        setTimeout(() => {
          drawFromSqueakDeck({
            indexToDrawTo: 2,
            playerID,
            roomCode,
            gameData,
            io,
          });
        }, 1250);

        setTimeout(() => {
          drawFromSqueakDeck({
            indexToDrawTo: 3,
            playerID,
            roomCode,
            gameData,
            io,
          });
        }, 1750);
      }

      // start interval that checks + handles if game is stuck
      // (no player has a valid move available)
      gameStuckInterval = setInterval(() => {
        gameStuckHandler(io, gameData, roomCode);
      }, 15000);
    });

    // game logic
    socket.on("playerReadyToReceiveInitGameData", (roomCode) => {
      numberOfPlayersReady++;

      const players = roomData[roomCode]?.players;

      if (!players || numberOfPlayersReady !== Object.keys(players).length)
        return;

      const board = Array.from({ length: 4 }, () =>
        Array.from({ length: 5 }, () => null)
      );

      const playerCards: IPlayerCardsMetadata = {};
      // loop through players and create + get their cards
      for (const playerID of Object.keys(players)) {
        playerCards[playerID] = {
          ...generateDeckAndSqueakCards(),
          totalPoints: 0,
          rankInRoom: -1,
        };
      }

      gameData[roomCode] = {
        board,
        players: playerCards,
        currentRound: 1,
      };

      io.in(roomCode).emit("initGameData", gameData[roomCode]);
      numberOfPlayersReady = 0;
    });

    socket.on("playerFullyReady", (roomCode) => {
      numberOfPlayersReady++;

      const players = roomData[roomCode]?.players;

      if (players && numberOfPlayersReady === Object.keys(players).length) {
        io.in(roomCode).emit("gameStarted");
        numberOfPlayersReady = 0;
      }
    });

    drawFromDeckHandler(io, socket, gameData);

    drawFromSqueakDeckHandler(io, socket, gameData);

    proposedCardDropHandler(io, socket, gameData);

    roundOverHandler(io, socket, gameData, roomData);

    resetGameHandler(io, socket, gameData, gameStuckInterval);
  };

  // Define actions inside
  io.on("connection", onConnection);

  res.end();
}
