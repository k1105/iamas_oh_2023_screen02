import dynamic from "next/dynamic";
import p5Types from "p5";
import { MutableRefObject, useRef, Dispatch, SetStateAction } from "react";
import { Hand } from "@tensorflow-models/hand-pose-detection";
import { getSmoothedHandpose } from "../lib/getSmoothedHandpose";
import { updateHandposeHistory } from "../lib/updateHandposeHistory";
import { Keypoint } from "@tensorflow-models/hand-pose-detection";
import { convertHandToHandpose } from "../lib/converter/convertHandToHandpose";
import { dotHand } from "../lib/p5/dotHand";
import { isFront } from "../lib/calculator/isFront";
import { Monitor } from "../components/Monitor";
import { detectThumbUpDown } from "../lib/calculator/detectThumbUpDown";

type Props = {
  handpose: MutableRefObject<Hand[]>;
  setConsented: Dispatch<SetStateAction<boolean>>;
};

let leftHand: Keypoint[] = [];
let rightHand: Keypoint[] = [];
let leftHandOpacity: number = 0;
let rightHandOpacity: number = 0;
let answerCount: number = 0;
let isAnswered: boolean = false;
let isLeftApproved: boolean | null = null;
let isRightApproved: boolean | null = null;
let isApproved: boolean = false;

type Handpose = Keypoint[];

const Sketch = dynamic(import("react-p5"), {
  loading: () => <></>,
  ssr: false,
});

export const ConsentForm = ({ handpose, setConsented }: Props) => {
  let handposeHistory: {
    left: Handpose[];
    right: Handpose[];
  } = { left: [], right: [] };

  const debugLog = useRef<{ label: string; value: any }[]>([]);

  const preload = (p5: p5Types) => {
    // 画像などのロードを行う
  };

  const setup = (p5: p5Types, canvasParentRef: Element) => {
    answerCount = 0;
    p5.createCanvas(p5.windowWidth, p5.windowHeight).parent(canvasParentRef);
    p5.stroke(220);
    p5.fill(255);
    p5.strokeWeight(10);
  };

  const draw = (p5: p5Types) => {
    const rawHands: {
      left: Handpose;
      right: Handpose;
    } = convertHandToHandpose(handpose.current);
    handposeHistory = updateHandposeHistory(rawHands, handposeHistory); //handposeHistoryの更新
    const hands: {
      left: Handpose;
      right: Handpose;
    } = getSmoothedHandpose(rawHands, handposeHistory); //平滑化された手指の動きを取得する

    // logとしてmonitorに表示する
    debugLog.current = [];
    for (const hand of handpose.current) {
      debugLog.current.push({
        label: hand.handedness + " accuracy",
        value: hand.score,
      });
      debugLog.current.push({
        label: hand.handedness + " is front",
        //@ts-ignore
        value: isFront(hand.keypoints, hand.handedness.toLowerCase()),
      });
    }

    p5.clear();
    if (hands.left.length > 0) {
      leftHand = hands.left;
      leftHandOpacity = Math.min(255, leftHandOpacity + 255 / 10);
    } else {
      leftHandOpacity = Math.max(0, leftHandOpacity - 255 / 10);
    }

    if (leftHand.length > 0) {
      p5.push();
      const res = detectThumbUpDown(leftHand);
      if (res == "up") {
        //thumb up
        isLeftApproved = true;
        p5.fill(100, 255, 100, leftHandOpacity);
      } else if (res == "down") {
        //thumb down
        isLeftApproved = false;
        p5.fill(255, 100, 100, leftHandOpacity);
      } else {
        isLeftApproved = null;
        p5.fill(255, leftHandOpacity);
      }
      p5.translate(p5.width / 2 - 300, p5.height / 2 + 50);
      dotHand({
        p5,
        hand: leftHand,
        dotSize: 10,
      });
      p5.noStroke();
      p5.textSize(20);
      p5.text("L", 0, 80);
      p5.pop();
    }

    if (hands.right.length > 0) {
      rightHand = hands.right;
      rightHandOpacity = Math.min(255, rightHandOpacity + 255 / 10);
    } else {
      rightHandOpacity = Math.max(0, rightHandOpacity - 255 / 10);
    }

    if (rightHand.length > 0) {
      p5.push();
      const res = detectThumbUpDown(rightHand);
      if (res == "up") {
        //thumb up
        isRightApproved = true;
        p5.fill(100, 255, 100, rightHandOpacity);
      } else if (res == "down") {
        //thumb down
        isRightApproved = false;
        p5.fill(255, 100, 100, rightHandOpacity);
      } else {
        isRightApproved = null;
        p5.fill(255, rightHandOpacity);
      }
      p5.translate(p5.width / 2 + 300, p5.height / 2 + 50);
      dotHand({
        p5,
        hand: rightHand,
        dotSize: 10,
      });
      p5.noStroke();
      p5.textSize(20);
      p5.text("R", 0, 80);
      p5.pop();
    }

    debugLog.current.push({ label: "isRightApproved", value: isRightApproved });
    debugLog.current.push({ label: "isLeftApproved", value: isLeftApproved });
    debugLog.current.push({ label: "isAnswered", value: isAnswered });

    if (
      (typeof isRightApproved == "boolean" && isLeftApproved == null) ||
      (typeof isLeftApproved == "boolean" && isRightApproved == null) ||
      (typeof isRightApproved == "boolean" && isRightApproved == isLeftApproved)
    ) {
      if (isRightApproved || isLeftApproved) {
        isApproved = true;
      } else {
        isApproved = false;
      }
      if (!isAnswered) {
        isAnswered = true;
      }
    } else {
      isAnswered = false;
    }

    if (!isAnswered) {
      answerCount = 0;
    }

    debugLog.current.push({ label: "isAnswered", value: isAnswered });
    debugLog.current.push({ label: "answerCount", value: answerCount });
    p5.push();
    p5.translate(p5.width / 2, p5.height / 2 + 50);
    p5.noStroke();
    if (isAnswered) {
      answerCount += p5.deltaTime;
      p5.textAlign(p5.CENTER);
      if (isApproved) {
        p5.text("承認する", 0, 70);
      } else {
        p5.text("承認しない", 0, 70);
      }
      p5.arc(
        0,
        0,
        50,
        50,
        0,
        Math.min((answerCount / 1000 / 2) * 2 * Math.PI, 2 * Math.PI)
      );
      if (answerCount > 2000) {
        //一周したら
        setConsented(true);
      }
    }

    p5.pop();
  };

  const windowResized = (p5: p5Types) => {
    p5.resizeCanvas(p5.windowWidth, p5.windowHeight);
  };

  return (
    <>
      <div
        style={{
          textAlign: "center",
          lineHeight: "1.5rem",
          fontFamily: "monospace",
          position: "absolute",
          top: "20vh",
          width: "100vw",
        }}
      >
        <p>
          研究を目的とし、体験中の手指の動きを動画で記録してもよろしいですか？
          <br />
          ご協力いただける場合、記録した動画は分析のみに使用し、一般公開は一切行いません。
          <br />
          記録することを承諾していただける場合は「👍」、承諾していただけない場合は「👎」のジェスチャーをしてください。
        </p>
      </div>

      {/* <Monitor handpose={handpose} debugLog={debugLog} /> */}
      <Sketch
        preload={preload}
        setup={setup}
        draw={draw}
        windowResized={windowResized}
      />
    </>
  );
};
