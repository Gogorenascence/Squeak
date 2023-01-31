import { socket } from "../../pages";
import { useUserIDContext } from "../../context/UserIDContext";
import { useRoomContext } from "../../context/RoomContext";
import Card from "./Card";

interface IBoard {
  boardClass: string | undefined;
}

export interface IGetBoxShadowStyles {
  id: string;
  rowIdx?: number;
  colIdx?: number;
  squeakStackIdx?: number;
}

function Board({ boardClass }: IBoard) {
  const {
    gameData,
    holdingADeckCard,
    holdingASqueakCard,
    proposedCardBoxShadow,
    hoveredCell,
    setHoveredCell,
  } = useRoomContext();
  const { value: userID } = useUserIDContext();

  // interface to accept id, rowIdx, colIdx, squeakStackIdx

  function getBoxShadowStyles({
    id,
    rowIdx,
    colIdx,
  }: IGetBoxShadowStyles): string {
    if (holdingADeckCard || holdingASqueakCard) {
      return `0px 0px 10px ${
        hoveredCell?.[0] === rowIdx && hoveredCell?.[1] === colIdx
          ? "5px"
          : "3px"
      } rgba(184,184,184,1)`;
    } else if (proposedCardBoxShadow?.id === id) {
      return proposedCardBoxShadow.boxShadowValue;
    }

    return "none";
  }

  return (
    <div className={`${boardClass} grid w-full grid-cols-5 gap-1`}>
      {gameData?.board.map((row, rowIdx) => (
        <>
          {row.map((cell, colIdx) => (
            <div
              id={`cell${rowIdx}${colIdx}`}
              key={`board${rowIdx}${colIdx}`}
              style={{
                boxShadow: getBoxShadowStyles({
                  id: `cell${rowIdx}${colIdx}`,
                  rowIdx,
                  colIdx,
                }),
                opacity:
                  hoveredCell?.[0] === rowIdx &&
                  hoveredCell?.[1] === colIdx &&
                  (holdingADeckCard || holdingASqueakCard)
                    ? 0.35 // worst case you leave it like this (was prev 0.75)
                    : 1,
              }}
              className="baseFlex relative z-[600] h-[80px] min-h-fit w-[60px] min-w-fit rounded-lg p-1 transition-all"
              onMouseEnter={() => setHoveredCell([rowIdx, colIdx])}
              onMouseLeave={() => setHoveredCell(null)}
            >
              <Card
                value={cell?.value}
                suit={cell?.suit}
                showCardBack={false}
                draggable={false}
                rotation={0}
              />
            </div>
          ))}
        </>
      ))}
    </div>
  );
}

export default Board;
