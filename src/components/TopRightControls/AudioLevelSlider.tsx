import { useState, useEffect } from "react";
import { Range, getTrackBackground } from "react-range";
import { useRoomContext } from "../../context/RoomContext";
import {
  BsFillVolumeMuteFill,
  BsFillVolumeUpFill,
  BsFillVolumeDownFill,
} from "react-icons/bs";

function AudioLevelSlider() {
  const { setCurrentVolume } = useRoomContext();

  const [values, setValues] = useState([0]);
  const [hovered, setHovered] = useState(false);

  const [initialSetOfVolumeComplete, setInitialSetOfVolumeComplete] =
    useState(false);

  useEffect(() => {
    // setTimeout(() => {
    const volume = localStorage.getItem("volume");
    if (volume) {
      setValues([parseInt(volume)]);
      setInitialSetOfVolumeComplete(true);
    }
    // }, 1000);
  }, []);

  useEffect(() => {
    if (values[0] === undefined || !initialSetOfVolumeComplete) return;

    setCurrentVolume(values[0]);
    localStorage.setItem("volume", values[0].toString());
  }, [values, setCurrentVolume, initialSetOfVolumeComplete]);

  return (
    <div
      style={{
        borderColor: "hsl(120deg 100% 86%)",
        color: "hsl(120deg 100% 86%)",
        backgroundColor: "hsl(120deg 100% 18%)",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="baseFlex h-full w-full !justify-start gap-2 rounded-md border-2  p-2 "
    >
      {hovered && <div>{values[0]}</div>}

      <div
        style={{
          background: getTrackBackground({
            values: values,
            colors: ["hsl(120deg 100% 86%)", "#ccc"],
            min: 0,
            max: 100,
          }),
          display: hovered ? "block" : "none",
        }}
        className="ml-2 mr-2 h-full w-40"
      >
        <Range
          step={1}
          min={0}
          max={100}
          values={values}
          onChange={(values) => setValues(values)}
          renderTrack={({ props, children }) => (
            <div
              {...props}
              style={{
                ...props.style,
                height: "6px",
                width: "10rem",
                // backgroundColor: "#ccc",
              }}
            >
              {children}
            </div>
          )}
          renderThumb={({ props }) => (
            <div
              {...props}
              style={{
                ...props.style,
                height: "16px",
                width: "16px",
                backgroundColor: "hsl(120deg 100% 86%)",
                borderRadius: "0.175rem",
              }}
            />
          )}
        />
      </div>

      {values[0] === 0 && <BsFillVolumeMuteFill size={"1.5rem"} />}
      {values[0] && values[0] > 0 && values[0] < 50 && (
        <BsFillVolumeDownFill size={"1.5rem"} />
      )}
      {values[0] && values[0] >= 50 && <BsFillVolumeUpFill size={"1.5rem"} />}
    </div>
  );
}

export default AudioLevelSlider;
