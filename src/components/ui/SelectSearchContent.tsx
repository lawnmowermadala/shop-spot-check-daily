
import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  SelectScrollUpButton,
  SelectScrollDownButton,
  SelectItem,
} from "./SelectBase";

// Simple mobile device detection
const isMobileDevice = () =>
  typeof window !== "undefined" &&
  /iPhone|iPad|iPod|Android|webOS|BlackBerry|Windows Phone/i.test(navigator.userAgent);

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
    const isMobile = isMobileDevice();

    React.useEffect(() => {
      if (showSearch) {
        // A short delay is needed to allow the component to be rendered and animated
        // before we can focus it, which helps trigger the mobile keyboard.
        const timer = setTimeout(() => {
          searchInputRef.current?.focus();
        }, 100);
        return () => clearTimeout(timer);
      }
    }, [showSearch]);

    const filteredItems = React.useMemo(() => {
      if (!showSearch) return null;
      const searchLower = search.toLowerCase();
      return items
        .filter((item) => {
          const searchableText = [
            item.label?.toLowerCase(),
            item.code?.toLowerCase(),
            item.name?.toLowerCase(),
            item.searchTerms?.toLowerCase(),
          ].filter(Boolean).join(" ");
          return searchableText.includes(searchLower);
        })
        .map((item) => (
          <SelectItem key={item.id ?? item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ));
    }, [items, search, showSearch]);

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearch(e.target.value);
    };

    return (
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          ref={ref}
          className={cn(
            "relative z-[1150] min-w-[16rem] max-h-[75vh] overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-xl animate-in fade-in-0 zoom-in-95 flex flex-col",
            className
          )}
          position={position}
          {...props}
        >
          {showSearch && (
            <div className="flex-shrink-0 bg-popover border-b px-4 py-2 z-50">
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
                    "w-full pl-11 pr-2 py-3 text-base rounded bg-background border border-input focus:outline-none focus:ring-2 focus:ring-primary",
                    isMobile && "min-h-[40px] text-lg"
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
