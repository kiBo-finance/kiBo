'use client'

import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Calendar as CalendarComponent } from '../ui/calendar'
import { Card, CardContent } from '../ui/card'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'
import {
  transactionFiltersAtom,
  transactionSearchAtom,
  transactionDateRangeAtom,
} from '../../lib/atoms/transactions'
import { cn } from '../../lib/utils'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { useAtom } from 'jotai'
import { Search, Filter, Calendar, X } from 'lucide-react'
import { useState } from 'react'

export function TransactionFilters() {
  const [filters, setFilters] = useAtom(transactionFiltersAtom)
  const [search, setSearch] = useAtom(transactionSearchAtom)
  const [dateRange, setDateRange] = useAtom(transactionDateRangeAtom)

  const [showAdvanced, setShowAdvanced] = useState(false)
  const [startDatePopoverOpen, setStartDatePopoverOpen] = useState(false)
  const [endDatePopoverOpen, setEndDatePopoverOpen] = useState(false)

  const handleSearchChange = (value: string) => {
    setSearch(value)
  }

  const handleTypeChange = (value: string) => {
    setFilters({
      ...filters,
      type: value === 'ALL' ? undefined : (value as 'INCOME' | 'EXPENSE' | 'TRANSFER'),
    })
  }

  const handleStartDateChange = (date: Date | undefined) => {
    setDateRange({
      ...dateRange,
      startDate: date?.toISOString(),
    })
    setStartDatePopoverOpen(false)
  }

  const handleEndDateChange = (date: Date | undefined) => {
    setDateRange({
      ...dateRange,
      endDate: date?.toISOString(),
    })
    setEndDatePopoverOpen(false)
  }

  const handleClearFilters = () => {
    setFilters({
      page: 1,
      limit: 20,
    })
    setSearch('')
    setDateRange({})
  }

  const hasActiveFilters =
    search ||
    filters.type ||
    filters.accountId ||
    filters.categoryId ||
    dateRange.startDate ||
    dateRange.endDate

  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* 基本フィルター */}
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-muted-foreground" />
                <Input
                  placeholder="取引を検索..."
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={filters.type || 'ALL'} onValueChange={handleTypeChange}>
              <SelectTrigger className="w-full cursor-pointer sm:w-[150px]">
                <SelectValue placeholder="種類" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">すべて</SelectItem>
                <SelectItem value="INCOME">収入</SelectItem>
                <SelectItem value="EXPENSE">支出</SelectItem>
                <SelectItem value="TRANSFER">振替</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="cursor-pointer"
            >
              <Filter className="mr-2 h-4 w-4" />
              詳細フィルター
            </Button>
          </div>

          {/* 詳細フィルター */}
          {showAdvanced && (
            <div className="grid grid-cols-1 gap-4 border-t pt-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* 開始日 */}
              <div>
                <Label>開始日</Label>
                <Popover open={startDatePopoverOpen} onOpenChange={setStartDatePopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal cursor-pointer',
                        !dateRange.startDate && 'text-muted-foreground'
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {dateRange.startDate ? (
                        format(new Date(dateRange.startDate), 'PPP', { locale: ja })
                      ) : (
                        <span>開始日を選択</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={dateRange.startDate ? new Date(dateRange.startDate) : undefined}
                      onSelect={handleStartDateChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* 終了日 */}
              <div>
                <Label>終了日</Label>
                <Popover open={endDatePopoverOpen} onOpenChange={setEndDatePopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal cursor-pointer',
                        !dateRange.endDate && 'text-muted-foreground'
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {dateRange.endDate ? (
                        format(new Date(dateRange.endDate), 'PPP', { locale: ja })
                      ) : (
                        <span>終了日を選択</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={dateRange.endDate ? new Date(dateRange.endDate) : undefined}
                      onSelect={handleEndDateChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* クイック期間選択 */}
              <div>
                <Label>クイック選択</Label>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const today = new Date()
                      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
                      setDateRange({
                        startDate: startOfMonth.toISOString(),
                        endDate: today.toISOString(),
                      })
                    }}
                    className="cursor-pointer"
                  >
                    今月
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const today = new Date()
                      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
                      const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0)
                      setDateRange({
                        startDate: lastMonth.toISOString(),
                        endDate: endOfLastMonth.toISOString(),
                      })
                    }}
                    className="cursor-pointer"
                  >
                    先月
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const today = new Date()
                      const startOfYear = new Date(today.getFullYear(), 0, 1)
                      setDateRange({
                        startDate: startOfYear.toISOString(),
                        endDate: today.toISOString(),
                      })
                    }}
                    className="cursor-pointer"
                  >
                    今年
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* アクティブフィルター表示 */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">フィルター:</span>

              {search && (
                <Badge variant="secondary">
                  検索: {search}
                  <button onClick={() => setSearch('')} className="ml-1 hover:text-red-600">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}

              {filters.type && (
                <Badge variant="secondary">
                  種類:{' '}
                  {filters.type === 'INCOME'
                    ? '収入'
                    : filters.type === 'EXPENSE'
                      ? '支出'
                      : filters.type === 'TRANSFER'
                        ? '振替'
                        : ''}
                  <button
                    onClick={() => setFilters({ ...filters, type: undefined })}
                    className="ml-1 hover:text-red-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}

              {dateRange.startDate && (
                <Badge variant="secondary">
                  開始: {format(new Date(dateRange.startDate), 'yyyy/MM/dd', { locale: ja })}
                  <button
                    onClick={() => setDateRange({ ...dateRange, startDate: undefined })}
                    className="ml-1 hover:text-red-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}

              {dateRange.endDate && (
                <Badge variant="secondary">
                  終了: {format(new Date(dateRange.endDate), 'yyyy/MM/dd', { locale: ja })}
                  <button
                    onClick={() => setDateRange({ ...dateRange, endDate: undefined })}
                    className="ml-1 hover:text-red-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="cursor-pointer"
              >
                すべてクリア
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
