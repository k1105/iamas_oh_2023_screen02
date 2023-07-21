export const calcTriangleCorner = (edgeList: number[]) => {
  const edgeInformation = [
    { id: 0, edge: edgeList[0] },
    { id: 1, edge: edgeList[1] },
    { id: 2, edge: edgeList[2] },
  ];
  const sortedEdgeList = edgeList.concat();
  sortedEdgeList.sort((a, b) => b - a);

  const s = (edgeList[0] + edgeList[1] + edgeList[2]) / 2;
  const S = Math.sqrt(
    s * (s - edgeList[0]) * (s - edgeList[1]) * (s - edgeList[2])
  );
  const h = (2 * S) / sortedEdgeList[0];
  const secondCorner = Math.asin(h / sortedEdgeList[2]);
  const thirdCorner = Math.asin(h / sortedEdgeList[1]);
  const sortedCornerList = [
    Math.PI - secondCorner - thirdCorner,
    secondCorner,
    thirdCorner,
  ];
  const cornerList = [0, 0, 0];
  for (let i = 0; i < sortedEdgeList.length; i++) {
    for (let j = 0; j < 3; j++) {
      if (edgeInformation[i].edge === sortedEdgeList[j]) {
        cornerList[edgeInformation[i].id] = sortedCornerList[j];
        break;
      }
    }
  }
  return cornerList;
};
