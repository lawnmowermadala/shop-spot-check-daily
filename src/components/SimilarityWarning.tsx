
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Check, X } from 'lucide-react';

interface SimilarItem {
  id: string;
  name: string;
  similarity?: number;
  code?: string;
  exactMatch?: boolean;
}

interface SimilarityWarningProps {
  newName: string;
  newCode?: string;
  similarItems: SimilarItem[];
  itemType: 'ingredient' | 'product' | 'recipe';
  onProceed: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const SimilarityWarning: React.FC<SimilarityWarningProps> = ({
  newName,
  newCode,
  similarItems,
  itemType,
  onProceed,
  onCancel,
  isLoading = false
}) => {
  const hasExactMatches = similarItems.some(item => item.exactMatch);
  
  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-800">
          <AlertTriangle className="h-5 w-5" />
          {hasExactMatches ? 'Exact Match Found!' : `Similar ${itemType}s Found`}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-700">
          {hasExactMatches 
            ? `An exact match was found for "${newName}"${newCode ? ` with code "${newCode}"` : ''}. Please review before creating a duplicate:`
            : `We found existing ${itemType}s that are similar to "${newName}". Please review them before creating a new ${itemType}:`
          }
        </p>
        
        <div className="space-y-2">
          {similarItems.map(item => (
            <div 
              key={item.id} 
              className={`flex justify-between items-center p-2 rounded border ${
                item.exactMatch ? 'bg-red-100 border-red-300' : 'bg-white'
              }`}
            >
              <div>
                <span className="font-medium">{item.name}</span>
                {item.code && <span className="text-sm text-gray-500 ml-2">({item.code})</span>}
              </div>
              <span className={`text-sm px-2 py-1 rounded ${
                item.exactMatch 
                  ? 'bg-red-200 text-red-800 font-bold' 
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {item.exactMatch ? 'EXACT MATCH' : `${Math.round((item.similarity || 0) * 100)}% similar`}
              </span>
            </div>
          ))}
        </div>
        
        <div className="flex gap-2 pt-4">
          <Button
            onClick={onProceed}
            disabled={isLoading}
            className={hasExactMatches 
              ? "bg-red-600 hover:bg-red-700" 
              : "bg-orange-600 hover:bg-orange-700"
            }
          >
            <Check className="h-4 w-4 mr-2" />
            {hasExactMatches ? 'Create Duplicate Anyway' : 'Create Anyway'}
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
