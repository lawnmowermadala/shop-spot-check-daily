
import { useState } from 'react';
import { findSimilarItems, findSimilarByCode } from '@/utils/similarityCheck';

interface SimilarItem {
  id: string;
  name: string;
  similarity?: number;
  code?: string;
  exactMatch?: boolean;
}

export const useSimilarityCheck = () => {
  const [showSimilarityWarning, setShowSimilarityWarning] = useState(false);
  const [similarItems, setSimilarItems] = useState<SimilarItem[]>([]);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const checkSimilarity = (
    newName: string,
    newCode: string | undefined,
    existingItems: { id: string; name: string; code?: string }[],
    onProceed: () => void,
    threshold: number = 0.7
  ) => {
    const similarByName = findSimilarItems(newName, existingItems, threshold);
    let similarByCode: any[] = [];
    
    if (newCode) {
      similarByCode = findSimilarByCode(newCode, existingItems as { id: string; name: string; code: string }[])
        .map(item => ({ ...item, exactMatch: true }));
    }
    
    const allSimilar = [...similarByCode, ...similarByName.filter(
      nameItem => !similarByCode.some(codeItem => codeItem.id === nameItem.id)
    )];
    
    if (allSimilar.length > 0) {
      setSimilarItems(allSimilar);
      setPendingAction(() => onProceed);
      setShowSimilarityWarning(true);
      return false; // Don't proceed yet
    }
    
    return true; // No similar items found, proceed
  };

  const proceedWithAction = () => {
    if (pendingAction) {
      pendingAction();
    }
    resetSimilarityCheck();
  };

  const resetSimilarityCheck = () => {
    setShowSimilarityWarning(false);
    setSimilarItems([]);
    setPendingAction(null);
  };

  return {
    showSimilarityWarning,
    similarItems,
    checkSimilarity,
    proceedWithAction,
    resetSimilarityCheck
  };
};
