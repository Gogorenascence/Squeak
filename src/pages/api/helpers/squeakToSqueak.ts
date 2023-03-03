import { type Server } from "socket.io";
import { type ICard } from "../../../utils/generateDeckAndSqueakCards";
import { type IGameData } from "../socket";
import { drawFromSqueakDeck } from "./drawFromSqueakDeck";

interface ISqueakToSqueak {
  gameData: IGameData;
  card: ICard;
  playerID: string;
  roomCode: string;
  io: Server;
  squeakStartLocation: number;
  squeakEndLocation: number;
}

export function squeakToSqueak({
  gameData,
  card,
  playerID,
  roomCode,
  io,
  squeakStartLocation,
  squeakEndLocation,
}: ISqueakToSqueak) {
  const player = gameData[roomCode]?.players?.[playerID];
  const startSqueakStack = player?.squeakHand[squeakStartLocation];

  const endSqueakStack = player?.squeakHand[squeakEndLocation];

  const indexOfCardInStartStack = startSqueakStack?.findIndex(
    (c) => c.value === card.value && c.suit === card.suit
  );

  if (
    !startSqueakStack ||
    !endSqueakStack ||
    indexOfCardInStartStack === undefined
  )
    return;

  const cardsToMove = startSqueakStack?.splice(indexOfCardInStartStack);

  // automatically draw a card if the squeak stack is empty
  if (startSqueakStack?.length === 0) {
    setTimeout(() => {
      drawFromSqueakDeck({
        indexToDrawTo: squeakStartLocation,
        playerID,
        roomCode,
        gameData,
        io,
      });
    }, 350);
  }

  // moving all child cards below the card being moved to the new stack
  // not sure how to do this without "!"s
  gameData[roomCode]!.players[playerID]!.squeakHand[squeakEndLocation] =
    endSqueakStack.concat(cardsToMove);

  const indexWithinSqueakStack = gameData[roomCode]!.players[
    playerID
  ]!.squeakHand[squeakEndLocation]!.findIndex(
    (squeakCard) =>
      squeakCard.value === card.value && squeakCard.suit === card.suit
  );

  const squeakStackLength =
    gameData[roomCode]!.players[playerID]!.squeakHand[squeakEndLocation]!
      .length;

  io.in(roomCode).emit("cardDropApproved", {
    card,
    squeakEndCoords: {
      offsetHeight: indexWithinSqueakStack * (20 - squeakStackLength),
      stackOfCardsMoved: cardsToMove,
    },
    endID: `${playerID}squeakHand${squeakEndLocation}`,
    // updatedBoard: gameData[roomCode]?.board, // ideally shouldn't have to send this
    newPlayerCards: player,
    playerID,
  });
}
