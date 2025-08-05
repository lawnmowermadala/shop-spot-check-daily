
export const calculateSimilarity = (str1: string, str2: string): number => {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  if (s1 === s2) return 1.0;
  
  // Levenshtein distance
  const matrix = [];
  const n = s1.length;
  const m = s2.length;

  for (let i = 0; i <= n; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= m; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (s1.charAt(i - 1) === s2.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  const distance = matrix[n][m];
  const maxLength = Math.max(s1.length, s2.length);
  return maxLength === 0 ? 1 : 1 - distance / maxLength;
};

export const findSimilarItems = (
  newName: string,
  existingItems: { id: string; name: string; code?: string }[],
  threshold: number = 0.7
) => {
  return existingItems
    .map(item => ({
      ...item,
      similarity: calculateSimilarity(newName, item.name)
    }))
    .filter(item => item.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity);
};

export const findSimilarByCode = (
  newCode: string,
  existingItems: { id: string; name: string; code: string }[]
) => {
  return existingItems.filter(item => 
    item.code.toLowerCase().trim() === newCode.toLowerCase().trim()
  );
};
