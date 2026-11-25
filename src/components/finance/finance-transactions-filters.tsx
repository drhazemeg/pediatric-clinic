// apps/web/src/components/finance/FinanceTransactionsFilters.tsx
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MaterialIcon } from '@/components/ui/material-icon';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface FinanceTransactionsFiltersProps {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  kindFilter: 'all' | 'revenue' | 'expense';
  onKindFilterChange?: (kind: 'all' | 'revenue' | 'expense') => void;
  categoryFilter: string;
  onCategoryFilterChange: (category: string) => void;
  categories: Array<string>;
  canExport: boolean;
  onExportCsv: () => void;
}

const isKindFilter = (value: string): value is 'all' | 'revenue' | 'expense' =>
  value === 'all' || value === 'revenue' || value === 'expense';

export const FinanceTransactionsFilters = ({
  searchQuery,
  onSearchQueryChange,
  kindFilter,
  onKindFilterChange,
  categoryFilter,
  onCategoryFilterChange,
  categories,
  canExport,
  onExportCsv,
}: FinanceTransactionsFiltersProps) => (
  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <div className="flex flex-1 flex-wrap items-center gap-2">
      <div className="flex min-w-[200px] flex-1 items-center gap-2 sm:max-w-xs">
        <span className="inline-flex text-base text-muted-foreground">
          <MaterialIcon name="search" />
        </span>
        <Input
          onChange={(e) => onSearchQueryChange(e.target.value)}
          placeholder="Search note, category, or amount..."
          value={searchQuery}
        />
      </div>

      {onKindFilterChange && (
        <Select
          onValueChange={(v) => {
            if (isKindFilter(v)) {
              onKindFilterChange(v);
            }
          }}
          value={kindFilter}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="revenue">Revenue</SelectItem>
            <SelectItem value="expense">Expense</SelectItem>
          </SelectContent>
        </Select>
      )}

      <Select
        onValueChange={(v) => v && onCategoryFilterChange(v)}
        value={categoryFilter}
      >
        <SelectTrigger className="w-36">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Categories</SelectItem>
          {categories.map((cat) => (
            <SelectItem key={cat} value={cat}>
              {cat}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>

    <div className="flex items-center gap-2">
      <Button
        disabled={!canExport}
        onClick={onExportCsv}
        size="sm"
        type="button"
        variant="outline"
      >
        <span className="me-1.5 inline-flex text-sm">
          <MaterialIcon name="download" />
        </span>
        <span>Export CSV</span>
      </Button>
    </div>
  </div>
);
