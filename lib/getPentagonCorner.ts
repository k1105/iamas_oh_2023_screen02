import { calcTriangleCorner } from "./calculator/calcTriangleCorner";

type Props = {
  distanceList: number[];
  l1: number;
  l2: number;
};

export const getPentagonCorner = ({ distanceList, l1, l2 }: Props) => {
  // get corner of pentagon
  const cornerSeg1 = calcTriangleCorner([distanceList[0], distanceList[1], l1]);
  const cornerSeg2 = calcTriangleCorner([l1, distanceList[2], l2]);
  const cornerSeg3 = calcTriangleCorner([l2, distanceList[3], distanceList[4]]);

  const pentagonCorner: number[] = [
    cornerSeg1[2],
    cornerSeg1[0] + cornerSeg2[2],
    cornerSeg2[0] + cornerSeg3[2],
    cornerSeg3[0],
    cornerSeg3[1] + cornerSeg1[1] + cornerSeg2[1],
  ];

  return pentagonCorner;
};
