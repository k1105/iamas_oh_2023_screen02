import dynamic from "next/dynamic";
import p5Types from "p5";
import { MutableRefObject, useRef, Dispatch, SetStateAction } from "react";
import { Hand } from "@tensorflow-models/hand-pose-detection";
import { getSmoothedHandpose } from "../lib/getSmoothedHandpose";
import { updateHandposeHistory } from "../lib/updateHandposeHistory";
import { Keypoint } from "@tensorflow-models/hand-pose-detection";
import { convertHandToHandpose } from "../lib/converter/convertHandToHandpose";
import { isFront } from "../lib/calculator/isFront";
import Matter from "matter-js";
import { updateLost } from "../lib/updateLost";
import { updateStyleIndex } from "../lib/updateStyleIndex";

type Props = {
  handpose: MutableRefObject<Hand[]>;
  setScene: Dispatch<SetStateAction<number>>;
  scene: number;
};

const distList: Keypoint[] = new Array(12).fill({ x: 0, y: 0 });

type Handpose = Keypoint[];

const Sketch = dynamic(import("react-p5"), {
  loading: () => <></>,
  ssr: false,
});

export const Interaction20 = ({ handpose, scene, setScene }: Props) => {
  let handposeHistory: {
    left: Handpose[];
    right: Handpose[];
  } = { left: [], right: [] };
  let lost: { state: boolean; prev: boolean; at: number } = {
    state: false,
    prev: false,
    at: 0,
  };
  const debugLog = useRef<{ label: string; value: any }[]>([]);

  const circleSize = 80;

  // module aliases
  let Engine = Matter.Engine,
    Bodies = Matter.Bodies,
    Composite = Matter.Composite;
  const floors: Matter.Body[] = [];
  for (let i = 0; i < 11; i++) {
    floors.push(
      Bodies.rectangle(
        (window.innerWidth / 11) * i + window.innerWidth / 11 / 2,
        (window.innerHeight / 3) * 2,
        1,
        10,
        { isStatic: true }
      )
    );
  }
  const circle = Bodies.circle(window.innerWidth / 2, -1000, circleSize);

  // create an engine
  let engine: Matter.Engine;

  const preload = (p5: p5Types) => {
    // 画像などのロードを行う
  };

  const setup = (p5: p5Types, canvasParentRef: Element) => {
    p5.createCanvas(p5.windowWidth, p5.windowHeight).parent(canvasParentRef);
    p5.stroke(220);
    p5.fill(255);
    p5.strokeWeight(10);
    engine = Engine.create();
    Composite.add(engine.world, [circle, ...floors]);
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

    lost = updateLost(handpose.current, lost);
    setScene(updateStyleIndex(lost, scene, 2));

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

    p5.noStroke();
    //base circle
    p5.circle(0, (p5.height / 3) * 2, 10);
    for (let i = 0; i < 11; i++) {
      p5.circle((i * p5.width) / 11, (p5.height / 3) * 2, 10);
    }
    p5.circle(p5.width, (p5.height / 3) * 2, 10);
    //base circle

    if (hands.left.length > 0) {
      for (let i = 0; i < 5; i++) {
        distList[6 - (i + 1)] = {
          x: hands.left[4 * i + 4].x - hands.left[4 * i + 1].x,
          y: hands.left[4 * i + 4].y - hands.left[4 * i + 1].y,
        };
      }
    }
    if (hands.right.length > 0) {
      for (let i = 0; i < 5; i++) {
        distList[i + 6] = {
          x: hands.right[4 * i + 4].x - hands.right[4 * i + 1].x,
          y: hands.right[4 * i + 4].y - hands.right[4 * i + 1].y,
        };
      }
    }

    for (let i = 1; i < 12; i++) {
      p5.push();
      p5.fill(200);
      p5.translate((i * p5.width) / 11, (p5.height / 3) * 2);
      p5.circle(distList[i].x, distList[i].y, 10);
      p5.stroke(200);
      p5.noFill();
      p5.strokeWeight(2);
      p5.line(0, 0, distList[i].x, distList[i].y);
      //p5.circle(0, 0, 2 * Math.sqrt(distList[i].x ** 2 + distList[i].y ** 2));
      p5.pop();
    }

    p5.push();
    p5.noFill();
    p5.stroke(200);
    p5.rectMode(p5.CENTER);
    for (let i = 0; i < 12; i++) {
      if (i < 11) {
        const currentWidth = floors[i].bounds.max.x - floors[i].bounds.min.x;
        const targetWidth = 100;
        Matter.Body.scale(floors[i], targetWidth / currentWidth, 1);
        const dist = p5.dist(
          distList[i + 1].x + p5.width / 11,
          distList[i + 1].y,
          distList[i].x,
          distList[i].y
        );
        const angle = Math.atan2(
          distList[i + 1].y - distList[i].y,
          distList[i + 1].x + p5.width / 11 - distList[i].x
        );
        Matter.Body.setPosition(
          floors[i],
          {
            x:
              (distList[i].x + distList[i + 1].x + p5.width / 11) / 2 +
              (i * p5.width) / 11,
            y: (distList[i].y + distList[i + 1].y) / 2 + (p5.height / 3) * 2,
          }, //@ts-ignore
          true
        );
        Matter.Body.setAngle(
          floors[i],
          angle, //@ts-ignore
          true
        );
        p5.push();
        p5.noFill();
        p5.strokeWeight(1);
        p5.translate(
          (distList[i].x + distList[i + 1].x + p5.width / 11) / 2 +
            (i * p5.width) / 11,
          (distList[i].y + distList[i + 1].y) / 2 + (p5.height / 3) * 2
        );
        p5.rotate(angle);
        p5.rect(0, 0, dist, 10);
        p5.pop();
        // p5.push();
        // p5.noFill();
        // p5.strokeWeight(1);
        // p5.translate(floors[i].position.x, floors[i].position.y);
        // p5.rotate(floors[i].angle);
        // const [w, h] = [
        //   floors[i].bounds.max.x - floors[i].bounds.min.x,
        //   floors[i].bounds.max.y - floors[i].bounds.min.y,
        // ];
        // p5.rect(0, 0, w, h);
        // p5.pop();
      }
    }
    p5.pop();

    if (circle.position.y > 3000) {
      Matter.Body.setPosition(circle, { x: window.innerWidth / 2, y: -1000 });
    }

    Engine.update(engine);
    p5.circle(circle.position.x, circle.position.y, circleSize * 2);

    p5.rectMode(p5.CENTER);
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
