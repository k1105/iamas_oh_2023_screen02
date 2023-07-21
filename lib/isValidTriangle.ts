export const isValidTriangle = (edgeList: number[]) => {
  //validate
  const longestEdge = Math.max(...edgeList);
  const target = edgeList.indexOf(longestEdge);
  edgeList.splice(target, 1);

  return longestEdge < edgeList[0] + edgeList[1];
};
