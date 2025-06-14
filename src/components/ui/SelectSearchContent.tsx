
import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  SelectScrollUpButton,
  SelectScrollDownButton,
  SelectItem,
} from "./SelectBase";

// Detect mobile: true for iPhone, iPad, Android, etc.
const isMobileDevice = () =>
  typeof window !== "undefined" &&
  /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

// Props (almost the same as former SelectContent, but focused on search)
interface SelectSearchContentProps
  extends React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content> {
  items?: { id?: string; code?: string; name?: string; value: string; label: string }[];
  searchable?: boolean;
  position?: "popper" | "item-aligned";
}

export const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  SelectSearchContentProps
>(({ className, children, position = "popper", items, searchable = true, ...props }, ref) => {
  const [search, setSearch] = React.useState("");
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  const showSearch = searchable && items && items.length > 0;

  // Focus the input on open—use a timer for reliability
  React.useEffect(() => {
    if (showSearch && searchInputRef.current) {
      // Especially important for mobile, but also helps desktop UX
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
        // Optionally scroll input into view for mobile
        if (isMobileDevice()) {
          searchInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 90);
      return () => clearTimeout(timer);
    }
  }, [showSearch]);

  const filteredItems = React.useMemo(() => {
    if (!showSearch) return null;
    return items
      .filter(
        (item) =>
          item.label?.toLowerCase().includes(search.toLowerCase()) ||
          item.code?.toLowerCase().includes(search.toLowerCase()) ||
          item.name?.toLowerCase().includes(search.toLowerCase())
      )
      .map((item) => (
        <SelectItem key={item.id ?? item.value} value={item.value}>
          {item.label}
        </SelectItem>
      ));
  }, [items, search, showSearch]);

  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        ref={ref}
        className={cn(
          // Add a high z-index for dropdown to always show above
          "relative z-[1150] min-w-[16rem] max-h-[75vh] overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-xl animate-in fade-in-0 zoom-in-95 flex flex-col",
          className
        )}
        position={position}
        {...props}
      >
        {showSearch && (
          <div className="flex-shrink-0 bg-popover border-b px-4 py-2">
            <div className="relative">
              {/* Use a larger icon for easier tapping on mobile */}
              <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground pointer-events-none" />
              <input
                ref={searchInputRef}
                // Mobile-friendly search input!
                type="search"
                inputMode="text"
                autoComplete="off"
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Type to search..."
                className="w-full pl-11 pr-2 py-3 text-base rounded bg-background border border-input focus:outline-none focus:ring-2 focus:ring-primary"
                onKeyDown={(e) => e.stopPropagation()}
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
});
SelectContent.displayName = "SelectContent";
