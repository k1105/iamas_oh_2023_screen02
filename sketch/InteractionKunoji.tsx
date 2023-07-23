import dynamic from "next/dynamic";
import p5Types from "p5";
import { MutableRefObject, Dispatch, SetStateAction } from "react";
import { Hand } from "@tensorflow-models/hand-pose-detection";
import { getSmoothedHandpose } from "../lib/getSmoothedHandpose";
import { updateHandposeHistory } from "../lib/updateHandposeHistory";
import { Keypoint } from "@tensorflow-models/hand-pose-detection";
import { convertHandToHandpose } from "../lib/converter/convertHandToHandpose";
import { updateLost } from "../lib/updateLost";
import { circleIndicator } from "../lib/p5/circleIndicator";

type Props = {
  handpose: MutableRefObject<Hand[]>;
  setScene: Dispatch<SetStateAction<number>>;
  scene: number;
};

type Handpose = Keypoint[];

const Sketch = dynamic(import("react-p5"), {
  loading: () => <></>,
  ssr: false,
});

export const InteractionKunoji = ({ handpose, scene, setScene }: Props) => {
  let handposeHistory: {
    left: Handpose[];
    right: Handpose[];
  } = { left: [], right: [] };
  let lost: { state: boolean; prev: boolean; at: number } = {
    state: false,
    prev: false,
    at: 0,
  };
  const r = 50;
  const offset = 30;
  const fingerNames = [
    "thumb",
    "index finger",
    "middle finger",
    "ring finger",
    "pinky",
  ];
  let detectedOnce = false;

  const preload = (p5: p5Types) => {
    // 画像などのロードを行う
  };

  const setup = (p5: p5Types, canvasParentRef: Element) => {
    p5.createCanvas(p5.windowWidth, p5.windowHeight).parent(canvasParentRef);
    p5.stroke(220);
    p5.fill(255);
    p5.strokeWeight(10);
  };

  const draw = (p5: p5Types) => {
    p5.clear();
    const rawHands: {
      left: Handpose;
      right: Handpose;
    } = convertHandToHandpose(handpose.current);
    handposeHistory = updateHandposeHistory(rawHands, handposeHistory); //handposeHistoryの更新
    const hands: {
      left: Handpose;
      right: Handpose;
    } = getSmoothedHandpose(rawHands, handposeHistory); //平滑化された手指の動きを取得する

    /**
     * handle lost and scene
     **/

    if (handpose.current.length > 0) {
      detectedOnce = true;
    }
    if (detectedOnce) {
      lost = updateLost(handpose.current, lost);
      if (lost.state) {
        p5.push();
        p5.translate(p5.width - 100, 100);
        circleIndicator({
          p5,
          ratio: (new Date().getTime() - lost.at) / 2000,
          text: "きりかわるまで",
        });
        p5.pop();
        if ((new Date().getTime() - lost.at) / 2000 > 1) {
          setScene((scene + 1) % 3);
        }
      }
    }
    /**
     * handle lost and scene
     **/

    let start;
    let end;

    if (hands.left.length + hands.right.length > 0) {
      if (hands.left.length == 0) {
        hands.left = hands.right;
      } else if (hands.right.length == 0) {
        hands.right = hands.left;
      }

      [hands.left, hands.right].forEach((hand, index) => {
        p5.push();
        p5.translate(0, window.innerHeight / 2);

        for (let n = 0; n < 5; n++) {
          if (n === 0) {
            start = 2;
          } else {
            start = 4 * n + 1;
          }
          end = 4 * n + 4;
          p5.push();
          p5.translate((window.innerWidth / 6) * (n + 1), 0);

          p5.push();
          const d = (hand[end].y - hand[start].y) / 1.5;
          if (index === 1) {
            if (r < p5.abs(d)) {
              p5.line(offset, 0, offset, -3 * r);
            } else if (d > 0) {
              p5.line(offset, 0, (3 * r) / 2, 0);
            } else {
              p5.line(
                offset,
                0,
                offset + p5.sqrt(r ** 2 - d ** 2),
                (3 * d) / 2
              );
              p5.line(
                offset + p5.sqrt(r ** 2 - d ** 2),
                (3 * d) / 2,
                offset,
                3 * d
              );
            }
          } else if (d > 0) {
            p5.line(-offset, 0, -(3 * r) / 2, 0);
          } else {
            if (r < p5.abs(d)) {
              p5.line(-offset, 0, -offset, -3 * r);
            } else {
              p5.line(
                -offset,
                0,
                -offset - p5.sqrt(r ** 2 - d ** 2),
                (3 * d) / 2
              );
              p5.line(
                -offset - p5.sqrt(r ** 2 - d ** 2),
                (3 * d) / 2,
                -offset,
                3 * d
              );
            }
          }

          p5.push();
          p5.translate(0, 50);
          p5.noStroke();
          p5.textAlign(p5.CENTER);
          p5.textSize(15);
          p5.fill(255);
          p5.text(fingerNames[n], 0, 0);
          p5.pop();
          p5.pop();
          p5.pop();
        }

        p5.pop();
      });
    }
  };

  const windowResized = (p5: p5Types) => {
    p5.resizeCanvas(p5.windowWidth, p5.windowHeight);
  };

  return (
    <>
      <Sketch
        preload={preload}
        setup={setup}
        draw={draw}
        windowResized={windowResized}
      />
    </>
  );
};
