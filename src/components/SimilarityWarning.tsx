
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Check, X } from 'lucide-react';

interface SimilarItem {
  id: string;
  name: string;
  similarity: number;
}

interface SimilarityWarningProps {
  newName: string;
  similarItems: SimilarItem[];
  itemType: 'ingredient' | 'product' | 'recipe';
  onProceed: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const SimilarityWarning: React.FC<SimilarityWarningProps> = ({
  newName,
  similarItems,
  itemType,
  onProceed,
  onCancel,
  isLoading = false
}) => {
  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-800">
          <AlertTriangle className="h-5 w-5" />
          Similar {itemType}s Found
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-700">
          We found existing {itemType}s that are similar to "{newName}". 
          Please review them before creating a new {itemType}:
        </p>
        
        <div className="space-y-2">
          {similarItems.map(item => (
            <div 
              key={item.id} 
              className="flex justify-between items-center p-2 bg-white rounded border"
            >
              <span className="font-medium">{item.name}</span>
              <span className="text-sm text-gray-500">
                {Math.round(item.similarity * 100)}% similar
              </span>
            </div>
          ))}
        </div>
        
        <div className="flex gap-2 pt-4">
          <Button
            onClick={onProceed}
            disabled={isLoading}
            className="bg-orange-600 hover:bg-orange-700"
          >
            <Check className="h-4 w-4 mr-2" />
            Create Anyway
          </Button>
          <Button
            onClick={onCancel}
            variant="outline"
            disabled={isLoading}
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SimilarityWarning;
