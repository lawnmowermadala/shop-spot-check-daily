
import { useState } from 'react';
import { findSimilarItems } from '@/utils/similarityCheck';

interface SimilarItem {
  id: string;
  name: string;
  similarity: number;
}

export const useSimilarityCheck = () => {
  const [showSimilarityWarning, setShowSimilarityWarning] = useState(false);
  const [similarItems, setSimilarItems] = useState<SimilarItem[]>([]);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const checkSimilarity = (
    newName: string,
    existingItems: { id: string; name: string }[],
    onProceed: () => void,
    threshold: number = 0.7
  ) => {
    const similar = findSimilarItems(newName, existingItems, threshold);
    
    if (similar.length > 0) {
      setSimilarItems(similar);
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
