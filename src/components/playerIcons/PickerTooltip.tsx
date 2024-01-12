import { useEffect, useRef, useState } from "react";
import { useUserIDContext } from "../../context/UserIDContext";
import { useRoomContext } from "../../context/RoomContext";
import { socket } from "../../pages";
import Card from "../Play/Card";
import PlayerIcon from "./PlayerIcon";
import { avatarPaths } from "../../utils/avatarPaths";
import { deckHueRotations } from "../../utils/deckHueRotations";
import { hslToDeckHueRotations } from "../../utils/hslToDeckHueRotations";
import {
  type IRoomPlayersMetadata,
  type IRoomPlayer,
  type IUpdatePlayerMetadata,
} from "../../pages/api/socket";
import useOnClickOutside from "../../hooks/useOnClickOutside";
import { motion } from "framer-motion";
import classes from "./PickerTooltip.module.css";
import { type ILocalPlayerSettings } from "../modals/SettingsAndStats/UserSettingsAndStatsModal";

interface IPickerTooltip {
  type: "avatar" | "color" | "cardFront";
  localPlayerMetadata?: IRoomPlayersMetadata;
  setLocalPlayerMetadata?: React.Dispatch<
    React.SetStateAction<IRoomPlayersMetadata>
  >;
  setLocalPlayerSettings?: React.Dispatch<
    React.SetStateAction<ILocalPlayerSettings>
  >;
  openAbove?: boolean;
}

function PickerTooltip({
  type,
  localPlayerMetadata,
  setLocalPlayerMetadata,
  setLocalPlayerSettings,
  openAbove = false,
}: IPickerTooltip) {
  const userID = useUserIDContext();

  const {
    playerMetadata: storePlayerMetadata,
    setPlayerMetadata: storeSetPlayerMetadata,
    connectedToRoom: storeConnectedToRoom,
    roomConfig,
    prefersSimpleCardAssets,
    setPrefersSimpleCardAssets,
  } = useRoomContext();

  // dynamic values depending on if parent is being used in <Settings /> or not
  const playerMetadata = localPlayerMetadata ?? storePlayerMetadata;
  const setPlayerMetadata = setLocalPlayerMetadata ?? storeSetPlayerMetadata;
  const connectedToRoom = localPlayerMetadata ? false : storeConnectedToRoom;

  const [showTooltip, setShowTooltip] = useState<boolean>(false);
  const [hoveredTooltip, setHoveredTooltip] = useState<
    ["avatar" | "color", number] | null
  >(null);
  const [hoveringOnTooltip, setHoveringOnTooltip] = useState<boolean>(false);
  const [hoveringOnFrontCardTooltip, setHoveringOnFrontCardTooltip] = useState<
    "normal" | "simple" | null
  >(null);

  const [userAvatarIndex, setUserAvatarIndex] = useState<number>(-1);
  const [userDeckIndex, setUserDeckIndex] = useState<number>(-1);

  const [relativeOffset, setRelativeOffset] = useState<{
    left: string;
    top: string;
  }>({ left: "0px", top: "0px" });

  const tooltipRef = useRef<HTMLDivElement>(null);

  useOnClickOutside({ ref: tooltipRef, setShowModal: setShowTooltip });

  useEffect(() => {
    const userMetadata = playerMetadata[userID];

    if (!userMetadata) return;

    const deckIndex = deckHueRotations.findIndex(
      (hueRotation) => hueRotation === userMetadata.deckHueRotation
    );

    const avatarIndex = avatarPaths.findIndex(
      (avatarPath) => avatarPath === userMetadata.avatarPath
    );

    setUserAvatarIndex(avatarIndex);
    setUserDeckIndex(deckIndex);
  }, [playerMetadata, userID]);

  useEffect(() => {
    function handleResize() {
      const isBelowMobileViewport = window.innerWidth <= 768;

      let left = "0px";
      let top = "0px";

      // TODO: these shouldn't be hardcoded
      if (type === "avatar") {
        left = isBelowMobileViewport ? "-118px" : "-135px";

        if (openAbove) {
          top = isBelowMobileViewport ? "-315px" : "-340px";
        } else {
          top = "110px";
        }
      } else if (type === "color") {
        left = isBelowMobileViewport ? "-151px" : "-177px";

        if (openAbove) {
          top = isBelowMobileViewport ? "-375px" : "-310px";
        } else {
          top = "110px";
        }
      } else {
        // TODO: change these
        left = isBelowMobileViewport ? "-118px" : "-96px";

        if (openAbove) {
          top = isBelowMobileViewport ? "-315px" : "-182px";
        } else {
          top = "110px";
        }
      }

      setRelativeOffset({ left, top });
    }

    handleResize();

    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, [type, openAbove]);

  function isTooltipOptionAvailable(
    type: "avatar" | "color",
    index: number
  ): boolean {
    if (type === "avatar") {
      return (
        index !== userAvatarIndex &&
        Object.values(playerMetadata).every(
          (metadata) => metadata.avatarPath !== avatarPaths[index]
        )
      );
    }

    return (
      index !== userDeckIndex &&
      Object.values(playerMetadata).every(
        (metadata) => metadata.deckHueRotation !== deckHueRotations[index]
      )
    );
  }

  function calculateOutline(type: "avatar" | "color", index: number): string {
    if (
      (type === "avatar" && userAvatarIndex === index) ||
      (type === "color" && userDeckIndex === index)
    )
      return "4px solid hsl(120deg 100% 18%)";

    if (!isTooltipOptionAvailable(type, index)) return "4px solid transparent";

    return hoveredTooltip &&
      hoveredTooltip[0] === type &&
      hoveredTooltip[1] === index
      ? "4px solid hsl(120deg 100% 40%)"
      : "4px solid transparent";
  }

  function calculateOutlineCardFront(
    tooltipValue: "normal" | "simple"
  ): string {
    if (
      (prefersSimpleCardAssets && tooltipValue === "simple") ||
      (!prefersSimpleCardAssets && tooltipValue === "normal")
    )
      return "4px solid hsl(120deg 100% 18%)";

    return hoveringOnFrontCardTooltip === tooltipValue
      ? "4px solid hsl(120deg 100% 40%)"
      : "4px solid transparent";
  }

  function getMetadataOfPlayerByAttribute(
    attribute: string,
    type: "avatar" | "color"
  ): string {
    if (type === "avatar") {
      const playersMetadata = Object.values(playerMetadata);

      const playerWithAttribute = playersMetadata.find(
        (metadata) => metadata.avatarPath === attribute
      );

      if (!playerWithAttribute) return "";

      return playerWithAttribute.color;
    } else {
      const playersMetadata = Object.values(playerMetadata);

      const playerWithAttribute = playersMetadata.find(
        (metadata) => metadata.color === attribute
      );

      if (!playerWithAttribute) return "";

      return playerWithAttribute.avatarPath;
    }
  }

  function renderTooltip() {
    if (type === "avatar") {
      return renderAvatarTooltip();
    } else if (type === "color") {
      return renderDeckTooltip();
    }

    return renderCardFrontTooltip();
  }

  function renderAvatarTooltip() {
    return avatarPaths.map((avatarPath, index) => (
      <div
        key={`${avatarPath}-${index}`}
        style={{
          outline: calculateOutline("avatar", index),
          cursor:
            showTooltip && isTooltipOptionAvailable("avatar", index)
              ? "pointer"
              : "auto",
          pointerEvents:
            showTooltip && isTooltipOptionAvailable("avatar", index)
              ? "auto"
              : "none",
        }}
        className="relative rounded-[50%] outline-offset-4 transition-all"
        onMouseEnter={() => setHoveredTooltip(["avatar", index])}
        onMouseLeave={() => setHoveredTooltip(null)}
        onClick={() => {
          // if user is connected to room
          if (connectedToRoom) {
            socket.emit("updatePlayerMetadata", {
              newPlayerMetadata: {
                ...playerMetadata[userID],
                avatarPath,
              },
              playerID: userID,
              roomCode: roomConfig.code,
            } as IUpdatePlayerMetadata);
          }
          // if user is not connected to room
          else {
            setPlayerMetadata({
              ...playerMetadata,
              [userID]: {
                ...playerMetadata[userID],
                avatarPath,
              } as IRoomPlayer,
            });
          }
        }}
      >
        <PlayerIcon
          avatarPath={avatarPath}
          borderColor={"transparent"}
          size="4rem"
        />
        {getMetadataOfPlayerByAttribute(avatarPath, "avatar") !==
          playerMetadata[userID]?.color &&
          getMetadataOfPlayerByAttribute(avatarPath, "avatar") !== "" && (
            <div
              style={{
                backgroundColor: getMetadataOfPlayerByAttribute(
                  avatarPath,
                  "avatar"
                ),
              }}
              className="absolute bottom-[-0.75rem] right-[-0.75rem] h-4 w-4 rounded-[50%]"
            ></div>
          )}
      </div>
    ));
  }

  function renderDeckTooltip() {
    return Object.keys(hslToDeckHueRotations).map((color, index) => (
      <div
        key={`${color}-${index}`}
        style={{
          outline: calculateOutline("color", index),
          cursor:
            showTooltip && isTooltipOptionAvailable("color", index)
              ? "pointer"
              : "auto",
          pointerEvents:
            showTooltip && isTooltipOptionAvailable("color", index)
              ? "auto"
              : "none",
        }}
        className="relative rounded-sm outline-offset-4 transition-all"
        onMouseEnter={() => setHoveredTooltip(["color", index])}
        onMouseLeave={() => setHoveredTooltip(null)}
        onClick={() => {
          // if user is connected to room
          if (connectedToRoom) {
            socket.emit("updatePlayerMetadata", {
              newPlayerMetadata: {
                ...playerMetadata[userID],
                deckHueRotation:
                  hslToDeckHueRotations[
                    color as keyof typeof hslToDeckHueRotations // seems hacky
                  ],
                color,
              },
              playerID: userID,
              roomCode: roomConfig.code,
            } as IUpdatePlayerMetadata);
          }
          // if user is not connected to room
          else {
            setPlayerMetadata({
              ...playerMetadata,
              [userID]: {
                ...playerMetadata[userID],
                color,
                deckHueRotation:
                  hslToDeckHueRotations[
                    color as keyof typeof hslToDeckHueRotations // seems hacky
                  ],
              } as IRoomPlayer,
            });
          }
        }}
      >
        <Card
          showCardBack={true}
          draggable={false}
          rotation={0}
          width={"4rem"}
          height={"5.5rem"}
          hueRotation={
            hslToDeckHueRotations[
              color as keyof typeof hslToDeckHueRotations // seems hacky
            ]
          }
        />
        <div className="absolute bottom-[-0.75rem] right-[-0.75rem] z-[150] h-12 w-12 rounded-[50%]">
          {getMetadataOfPlayerByAttribute(color, "color") !==
            playerMetadata[userID]?.avatarPath &&
            getMetadataOfPlayerByAttribute(color, "color") !== "" && (
              <PlayerIcon
                avatarPath={getMetadataOfPlayerByAttribute(color, "color")}
                borderColor={"transparent"}
                size="3rem"
              />
            )}
        </div>
      </div>
    ));
  }

  function renderCardFrontTooltip() {
    return (
      <>
        <div
          style={{
            outline: calculateOutlineCardFront("normal"),
            cursor: showTooltip && prefersSimpleCardAssets ? "pointer" : "auto",
            pointerEvents:
              showTooltip && prefersSimpleCardAssets ? "auto" : "none",
          }}
          className="relative rounded-sm outline-offset-4 transition-all"
          onMouseEnter={() => setHoveringOnFrontCardTooltip("normal")}
          onMouseLeave={() => setHoveringOnFrontCardTooltip(null)}
          onClick={() => {
            setPrefersSimpleCardAssets(false);

            if (setLocalPlayerSettings === undefined) return;

            setLocalPlayerSettings((localPlayerSettings) => {
              return {
                ...localPlayerSettings,
                prefersSimpleCardAssets: false,
              };
            });
          }}
        >
          <Card
            value={"8"}
            suit={"C"}
            showCardBack={false}
            draggable={false}
            rotation={0}
            width={"4rem"}
            height={"5.5rem"}
            hueRotation={0}
            manuallyShowSpecificCardFront={"normal"}
          />
        </div>
        <div
          style={{
            outline: calculateOutlineCardFront("simple"),
            cursor:
              showTooltip && !prefersSimpleCardAssets ? "pointer" : "auto",
            pointerEvents:
              showTooltip && !prefersSimpleCardAssets ? "auto" : "none",
          }}
          className="relative rounded-sm outline-offset-4 transition-all"
          onMouseEnter={() => setHoveringOnFrontCardTooltip("simple")}
          onMouseLeave={() => setHoveringOnFrontCardTooltip(null)}
          onClick={() => {
            setPrefersSimpleCardAssets(true);

            if (setLocalPlayerSettings === undefined) return;

            setLocalPlayerSettings((localPlayerSettings) => {
              return {
                ...localPlayerSettings,
                prefersSimpleCardAssets: true,
              };
            });
          }}
        >
          <Card
            value={"8"}
            suit={"C"}
            showCardBack={false}
            draggable={false}
            rotation={0}
            width={"4rem"}
            height={"5.5rem"}
            hueRotation={0}
            manuallyShowSpecificCardFront={"simple"}
          />
        </div>
      </>
    );
  }

  function renderTooltipPreview() {
    if (type === "avatar") {
      return (
        <>
          <PlayerIcon
            avatarPath={
              playerMetadata[userID]?.avatarPath || "/avatars/rabbit.svg"
            }
            borderColor={playerMetadata[userID]?.color || "#000000"}
            size="3.25rem" // hopefully doesn't mess up positioning near player container on play
            style={{
              marginTop: type === "avatar" ? "0.35rem" : "0px",
            }}
          />
          <p className="mt-[0.9rem]">Avatar</p>
        </>
      );
    } else if (type === "color") {
      return (
        <>
          <Card
            draggable={false}
            rotation={0}
            showCardBack={true}
            ownerID={userID}
            width={"3rem"} // roughly correct for ratio of a card
            height={"4rem"}
            hueRotation={playerMetadata[userID]?.deckHueRotation || 0}
          />
          <p>Back</p>
        </>
      );
    }

    return (
      <>
        <Card
          draggable={false}
          rotation={0}
          showCardBack={false}
          ownerID={userID}
          suit={"C"}
          value={"8"}
          width={"3rem"} // roughly correct for ratio of a card
          height={"4rem"}
          hueRotation={playerMetadata[userID]?.deckHueRotation || 0}
          manuallyShowSpecificCardFront={
            prefersSimpleCardAssets ? "simple" : "normal"
          }
        />
        <p>Front</p>
      </>
    );
  }

  return (
    <>
      {userID && (
        <div className="relative">
          {/* picker tooltip */}
          <div
            ref={tooltipRef}
            style={{
              left: relativeOffset.left,
              top: relativeOffset.top,
              opacity: showTooltip ? 1 : 0,
              pointerEvents: showTooltip ? "auto" : "none",
            }}
            className={`${
              openAbove ? classes.toolTipAbove : classes.toolTipBelow
            } 
              ${
                type === "avatar"
                  ? "h-[18rem] w-[18rem] grid-cols-3 grid-rows-3 md:h-[20rem] md:w-[20rem]"
                  : type === "color"
                  ? "h-[22rem] w-[22rem] grid-cols-3 grid-rows-3 md:h-[18rem] md:w-[25rem] md:grid-cols-4 md:grid-rows-2"
                  : "h-[10rem] w-[15rem] grid-cols-2 grid-rows-1"
              }
              grid place-items-center rounded-md bg-white p-4 shadow-lg transition-all`}
          >
            {renderTooltip()}
          </div>

          {/* preview */}
          {playerMetadata && (
            <motion.div
              key={`${type}-pickerTooltip`}
              initial={{ opacity: 0, scale: 0.75 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.75 }}
              transition={{ duration: 0.15 }}
              style={{
                color: "hsl(120deg 100% 86%)",
                filter: `brightness(${hoveringOnTooltip ? 0.75 : 1})`,
              }}
              className="baseVertFlex h-[96px] cursor-pointer transition-[filter]"
              onMouseEnter={() => setHoveringOnTooltip(true)}
              onMouseLeave={() => setHoveringOnTooltip(false)}
              onClick={() => setShowTooltip(true)}
            >
              {renderTooltipPreview()}
            </motion.div>
          )}
        </div>
      )}
    </>
  );
}

export default PickerTooltip;
