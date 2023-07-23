import p5Types from "p5";

type Props = {
  p5: p5Types;
  ratio: number;
  text: string;
};

export const circleIndicator = ({ p5, ratio, text }: Props) => {
  p5.push();
  p5.textAlign(p5.CENTER);
  p5.noStroke();
  p5.text(text, 0, 60);
  p5.arc(0, 0, 50, 50, 0, Math.min(ratio, 1) * Math.PI * 2);
  p5.pop();
};
