import dynamic from "next/dynamic";
import p5Types from "p5";
import { MutableRefObject, Dispatch, SetStateAction } from "react";
import { Hand } from "@tensorflow-models/hand-pose-detection";
import { Keypoint } from "@tensorflow-models/hand-pose-detection";
import { convertHandToHandpose } from "../lib/converter/convertHandToHandpose";
import { isValidTriangle } from "../lib/isValidTriangle";
import { getPentagonCorner } from "../lib/getPentagonCorner";
import { getSmoothedValue } from "../lib/calculator/getSmoothedValue";
import { getSmoothedHandpose } from "../lib/getSmoothedHandpose";
import { updateHandposeHistory } from "../lib/updateHandposeHistory";
import { updateLost } from "../lib/updateLost";
import { updateStyleIndex } from "../lib/updateStyleIndex";
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

export const InteractionCircle = ({ handpose, scene, setScene }: Props) => {
  let handposeHistory: {
    left: Handpose[];
    right: Handpose[];
  } = { left: [], right: [] };
  let leftDistanceListHistory: number[][] = [];
  let leftDistanceList = [0, 0, 0, 0, 0];
  let leftDistanceListRaw = [0, 0, 0, 0, 0];
  let leftCornerList = [0, 0, 0, 0, 0];
  let rightDistanceListHistory: number[][] = [];
  let rightDistanceList = [0, 0, 0, 0, 0];
  let rightDistanceListRaw = [0, 0, 0, 0, 0];
  let rightCornerList = [0, 0, 0, 0, 0];
  const fingerNames = [
    "thumb",
    "index finger",
    "middle finger",
    "ring finger",
    "pinky",
  ];
  let L1: number = 0;
  let L2: number = 0;
  let lost: { state: boolean; prev: boolean; at: number } = {
    state: false,
    prev: false,
    at: 0,
  };
  let detectedOnce = false;

  let distanceListHistory: number[][] = [];

  const preload = (p5: p5Types) => {
    // 画像などのロードを行う
  };

  const setup = (p5: p5Types, canvasParentRef: Element) => {
    p5.createCanvas(p5.windowWidth, p5.windowHeight).parent(canvasParentRef);
    p5.stroke(220);
    p5.fill(255);
    p5.strokeWeight(10);
    p5.textSize(15);
  };

  const draw = (p5: p5Types) => {
    const rawHands: {
      left: Handpose;
      right: Handpose;
    } = convertHandToHandpose(handpose.current); //平滑化されていない手指の動きを使用する
    updateHandposeHistory(rawHands, handposeHistory);
    const hands = getSmoothedHandpose(rawHands, handposeHistory);

    p5.clear();
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

    // --
    // <> pinky
    // <> ring
    // <> middle
    // <> index
    // <> thumb
    // --
    // if one hand is detected, both side of organ is shrink / extend.
    // if two hands are detected, each side of organ changes according to each hand.
    const r = 200; // <の長さ.
    const scale = 2; // 指先と付け根の距離の入力値に対する、出力時に使うスケール比。
    let start: number = 0;
    let end: number = 0;

    if (hands.left.length > 0) {
      p5.push();
      p5.translate(window.innerWidth / 2 - 300, window.innerHeight / 2);

      // p5.fill(220);
      // p5.ellipse(0, 0, 80);

      const tmpDistanceList = [];
      for (let n = 0; n < 5; n++) {
        start = 4 * n + 1;
        end = 4 * n + 4;
        let d =
          Math.sqrt(
            (hands.left[start].x - hands.left[end].x) ** 2 +
              (hands.left[start].y - hands.left[end].y) ** 2
          ) * scale;
        if (r < d) {
          d = r;
        } else if (d < 0) {
          d = 10; //三角形として体をなすように. calcTriangleCornerでのzero division error回避
        }

        tmpDistanceList.push(d);
      }

      //validate
      const l1 =
        Math.max(tmpDistanceList[0], tmpDistanceList[1]) +
        Math.min(tmpDistanceList[0], tmpDistanceList[1]) / 2;
      const l2 =
        Math.max(tmpDistanceList[3], tmpDistanceList[4]) +
        Math.min(tmpDistanceList[3], tmpDistanceList[4]) / 2;

      const edgeList = [l1, l2, tmpDistanceList[2]];

      if (isValidTriangle(edgeList)) {
        leftDistanceListRaw = tmpDistanceList;
      }
      //update leftDistanceListHistory:
      leftDistanceListHistory.push(leftDistanceListRaw);
      if (leftDistanceListHistory.length > 5) {
        leftDistanceListHistory.shift();
      }

      leftDistanceList = getSmoothedValue(leftDistanceListHistory, 5);
      distanceListHistory.push(leftDistanceList);
      if (distanceListHistory.length > 300) {
        console.log(JSON.stringify(distanceListHistory));
        distanceListHistory = [];
      }

      L1 =
        Math.max(leftDistanceList[0], leftDistanceList[1]) +
        Math.min(leftDistanceList[0], leftDistanceList[1]) / 2;
      L2 =
        Math.max(leftDistanceList[3], leftDistanceList[4]) +
        Math.min(leftDistanceList[3], leftDistanceList[4]) / 2;

      leftCornerList = getPentagonCorner({
        distanceList: leftDistanceList,
        l1: L1,
        l2: L2,
      });

      for (let i = 0; i < 5; i++) {
        const d = leftDistanceList[i];
        const sign = -1; //正負の符号
        p5.line(0, 0, (sign * Math.sqrt(r ** 2 - d ** 2)) / 2, -d / 2);
        p5.line((sign * Math.sqrt(r ** 2 - d ** 2)) / 2, -d / 2, 0, -d);
        p5.push();
        p5.noStroke();
        p5.text(fingerNames[i], -100, 0);
        p5.pop();

        //全体座標の回転と高さ方向へのtranslate
        p5.translate(0, -d);
        p5.rotate(Math.PI - leftCornerList[i]);
      }
      p5.pop();
    }

    if (hands.right.length > 0) {
      p5.push();
      p5.translate(window.innerWidth / 2 + 300, window.innerHeight / 2);

      const tmpDistanceList = [];
      for (let n = 0; n < 5; n++) {
        start = 4 * n + 1;
        end = 4 * n + 4;
        let d =
          Math.sqrt(
            (hands.right[start].x - hands.right[end].x) ** 2 +
              (hands.right[start].y - hands.right[end].y) ** 2
          ) * scale;
        if (r < d) {
          d = r;
        } else if (d < 0) {
          d = 10; //三角形として体をなすように. calcTriangleCornerでのzero division error回避
        }

        tmpDistanceList.push(d);
      }

      //validate
      const l1 =
        Math.max(tmpDistanceList[0], tmpDistanceList[1]) +
        Math.min(tmpDistanceList[0], tmpDistanceList[1]) / 2;
      const l2 =
        Math.max(tmpDistanceList[3], tmpDistanceList[4]) +
        Math.min(tmpDistanceList[3], tmpDistanceList[4]) / 2;

      const edgeList = [l1, l2, tmpDistanceList[2]];

      if (isValidTriangle(edgeList)) {
        rightDistanceListRaw = tmpDistanceList;
      }
      //update rightDistanceListHistory:
      rightDistanceListHistory.push(rightDistanceListRaw);
      if (rightDistanceListHistory.length > 5) {
        rightDistanceListHistory.shift();
      }

      rightDistanceList = getSmoothedValue(rightDistanceListHistory, 5);
      distanceListHistory.push(rightDistanceList);
      if (distanceListHistory.length > 300) {
        console.log(JSON.stringify(distanceListHistory));
        distanceListHistory = [];
      }

      L1 =
        Math.max(rightDistanceList[0], rightDistanceList[1]) +
        Math.min(rightDistanceList[0], rightDistanceList[1]) / 2;
      L2 =
        Math.max(rightDistanceList[3], rightDistanceList[4]) +
        Math.min(rightDistanceList[3], rightDistanceList[4]) / 2;

      rightCornerList = getPentagonCorner({
        distanceList: rightDistanceList,
        l1: L1,
        l2: L2,
      });

      for (let i = 0; i < 5; i++) {
        const d = rightDistanceList[i];
        const sign = -1; //正負の符号
        p5.line(0, 0, (sign * Math.sqrt(r ** 2 - d ** 2)) / 2, -d / 2);
        p5.line((sign * Math.sqrt(r ** 2 - d ** 2)) / 2, -d / 2, 0, -d);
        p5.push();
        p5.noStroke();
        p5.text(fingerNames[i], -100, 0);
        p5.pop();

        //全体座標の回転と高さ方向へのtranslate
        p5.translate(0, -d);
        p5.rotate(Math.PI - rightCornerList[i]);
      }
      p5.pop();
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
