
import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  SelectScrollUpButton,
  SelectScrollDownButton,
  SelectItem,
} from "./SelectBase";

interface SelectSearchContentProps
  extends React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content> {
  items?: { 
    id?: string; 
    code?: string; 
    name?: string; 
    value: string; 
    label: string;
    searchTerms?: string;
  }[];
  searchable?: boolean;
  position?: "popper" | "item-aligned";
}

export const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  SelectSearchContentProps
>(
  (
    { className, children, position = "popper", items, searchable = true, ...props },
    ref
  ) => {
    const [search, setSearch] = React.useState("");
    const searchInputRef = React.useRef<HTMLInputElement>(null);

    const showSearch = searchable && items && items.length > 0;

    // Focus the input on open
    React.useEffect(() => {
      if (showSearch && searchInputRef.current) {
        const timer = setTimeout(() => {
          searchInputRef.current?.focus();
        }, 100);
        return () => clearTimeout(timer);
      }
    }, [showSearch]);

    const filteredItems = React.useMemo(() => {
      if (!showSearch) return null;
      
      console.log('Search term:', search);
      console.log('Items to filter:', items);
      
      const searchLower = search.toLowerCase();
      const filtered = items
        .filter((item) => {
          // Enhanced filtering - check all possible search fields
          const searchableText = [
            item.label?.toLowerCase(),
            item.code?.toLowerCase(),
            item.name?.toLowerCase(),
            item.searchTerms?.toLowerCase()
          ].filter(Boolean).join(' ');
          
          console.log('Item searchable text:', searchableText);
          console.log('Search matches:', searchableText.includes(searchLower));
          
          return searchableText.includes(searchLower);
        })
        .map((item) => (
          <SelectItem key={item.id ?? item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ));
      
      console.log('Filtered items count:', filtered.length);
      return filtered;
    }, [items, search, showSearch]);

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      console.log('Search input changed to:', value);
      setSearch(value);
    };

    return (
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          ref={ref}
          className={cn(
            // High z-index and popover
            "relative z-[1150] min-w-[16rem] max-h-[75vh] overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-xl animate-in fade-in-0 zoom-in-95 flex flex-col",
            className
          )}
          position={position}
          {...props}
        >
          {showSearch && (
            <div className="flex-shrink-0 bg-popover border-b px-4 py-2">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  autoComplete="off"
                  value={search}
                  onChange={handleSearchChange}
                  placeholder="Type to filter..."
                  className={cn(
                    "w-full pl-11 pr-2 py-3 text-base rounded bg-background border border-input focus:outline-none focus:ring-2 focus:ring-primary"
                  )}
                  onKeyDown={(e) => e.stopPropagation()}
                  aria-label="Search"
                />
              </div>
            </div>
          )}
          <SelectScrollUpButton />
          <SelectPrimitive.Viewport
            className={cn(
              "p-1 flex-grow overflow-y-auto",
              position === "popper" &&
                "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]"
            )}
          >
            {showSearch ? filteredItems : children}
          </SelectPrimitive.Viewport>
          <SelectScrollDownButton />
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    );
  }
);
SelectContent.displayName = "SelectContent";
