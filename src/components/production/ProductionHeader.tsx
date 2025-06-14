
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Printer, BarChart2 } from 'lucide-react';
import { format } from 'date-fns';

interface ProductionHeaderProps {
  date: Date;
  setDate: (date: Date) => void;
  batchCount: number;
  totalUnits: number;
  showStaffAnalytics: boolean;
  setShowStaffAnalytics: (show: boolean) => void;
  showComparison: boolean;
  setShowComparison: (show: boolean) => void;
  onPrint: () => void;
}

const ProductionHeader = ({
  date,
  setDate,
  batchCount,
  totalUnits,
  showStaffAnalytics,
  setShowStaffAnalytics,
  showComparison,
  setShowComparison,
  onPrint
}: ProductionHeaderProps) => {
  return (
    <>
      {/* Header Section */}
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold">Daily Production Tracking</h1>
        <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full">Production Staff</span>
      </div>
      
      {/* Date Picker and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="justify-start text-left font-normal w-[280px]">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(date, "PPP")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(selectedDate) => selectedDate && setDate(selectedDate)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <div className="text-sm text-gray-600">
            {batchCount} batches | {totalUnits} units
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setShowStaffAnalytics(!showStaffAnalytics)}
            className="flex items-center gap-2"
          >
            <BarChart2 className="h-4 w-4" />
            {showStaffAnalytics ? 'Hide Staff Analytics' : 'Staff Analytics'}
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setShowComparison(!showComparison)}
            className="flex items-center gap-2"
          >
            <BarChart2 className="h-4 w-4" />
            {showComparison ? 'Hide Comparison' : 'Show Comparison'}
          </Button>
          <Button 
            variant="outline" 
            onClick={onPrint}
            className="flex items-center gap-2"
          >
            <Printer className="h-4 w-4" />
            Print Report
          </Button>
        </div>
      </div>
    </>
  );
};

export default ProductionHeader;
