import { useState, useEffect } from "react";
import { useLocalStorageContext } from "../../context/LocalStorageContext";
import { useRoomContext } from "../../context/RoomContext";
import Board from "./Board";
import PlayerCardContainer from "./PlayerCardContainer";

import classes from "./Play.module.css";

import { socket } from "../../pages";
import OtherPlayersCardContainers from "./OtherPlayersCardContainers";
import Scoreboard from "../modals/Scoreboard/Scoreboard";
import ShufflingCountdownModal from "../modals/ShufflingCountdownModal";

function Play() {
  const roomCtx = useRoomContext();
  const localStorageID = useLocalStorageContext();

  const userID = localStorageID.value; // change to ctx.userID ?? localStorageID.value
  const [gameStarted, setGameStarted] = useState<boolean>(false);

  useEffect(() => {
    if (
      roomCtx.gameData.board === undefined &&
      roomCtx.gameData.players === undefined
    ) {
      socket.emit("playerReadyToReceiveInitGameData", roomCtx.roomConfig.code);

      socket.on("initGameData", (initGameData) => {
        console.log("initGameData: ", initGameData);
        roomCtx.setGameData(initGameData);
        socket.emit("playerFullyReady", roomCtx.roomConfig.code);
      });

      socket.on("gameStarted", () => {
        setGameStarted(true);
      });
    }

    // maybe you need to have a disconnect function that runs
    // when the component unmounts?
  }, [roomCtx]);

  return (
    <>
      <div className={`${classes.fullBoardGrid} relative bg-green-700`}>
        {gameStarted && (
          <>
            <OtherPlayersCardContainers
              orderedClassNames={[
                classes.topPlayerCards,
                classes.leftPlayerCards,
                classes.rightPlayerCards,
              ]}
            />

            <Board boardClass={classes.board} />

            <PlayerCardContainer
              cardContainerClass={classes.currentPlayerCards}
            />
          </>
        )}
      </div>

      <ShufflingCountdownModal />

      <Scoreboard />
    </>
  );
}

export default Play;
