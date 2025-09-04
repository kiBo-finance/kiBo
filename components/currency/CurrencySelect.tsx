'use client'

import { useState } from 'react'
import { useAtomValue } from 'jotai'
import { Check, ChevronDown, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { activeCurrenciesAtom, recentCurrenciesAtom, currencyMapAtom } from '@/lib/atoms/currency'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

interface CurrencySelectProps {
  value?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  showRecentCurrencies?: boolean
}

export function CurrencySelect({
  value,
  onValueChange,
  placeholder = "通貨を選択",
  className,
  disabled = false,
  showRecentCurrencies = true
}: CurrencySelectProps) {
  const [open, setOpen] = useState(false)
  const activeCurrencies = useAtomValue(activeCurrenciesAtom)
  const recentCurrencies = useAtomValue(recentCurrenciesAtom)
  const currencyMap = useAtomValue(currencyMapAtom)
  
  const selectedCurrency = value ? currencyMap.get(value) : null
  
  // 最近使用した通貨（アクティブなもののみ）
  const recentCurrencyList = showRecentCurrencies
    ? recentCurrencies
        .map(code => currencyMap.get(code))
        .filter((currency): currency is NonNullable<typeof currency> => 
          Boolean(currency && currency.isActive)
        )
        .slice(0, 3)
    : []
  
  // その他の通貨（最近使用した通貨を除く）
  const otherCurrencies = activeCurrencies.filter(currency => 
    !recentCurrencyList.some(recent => recent.code === currency.code)
  )
  
  const handleSelect = (currencyCode: string) => {
    onValueChange?.(currencyCode)
    setOpen(false)
  }
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("justify-between", className)}
          disabled={disabled}
        >
          {selectedCurrency ? (
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm">
                {selectedCurrency.symbol}
              </span>
              <span className="font-medium">
                {selectedCurrency.code}
              </span>
              <span className="text-muted-foreground text-sm">
                {selectedCurrency.name}
              </span>
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0">
        <Command>
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <CommandInput 
              placeholder="通貨を検索..." 
              className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <CommandList>
            <CommandEmpty>通貨が見つかりません</CommandEmpty>
            
            {recentCurrencyList.length > 0 && (
              <CommandGroup heading="最近使用した通貨">
                {recentCurrencyList.map((currency) => (
                  <CommandItem
                    key={currency.code}
                    value={`${currency.code} ${currency.name}`}
                    onSelect={() => handleSelect(currency.code)}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm w-6">
                        {currency.symbol}
                      </span>
                      <span className="font-medium w-10">
                        {currency.code}
                      </span>
                      <span className="text-muted-foreground">
                        {currency.name}
                      </span>
                    </div>
                    <Check
                      className={cn(
                        "h-4 w-4",
                        value === currency.code ? "opacity-100" : "opacity-0"
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            
            <CommandGroup heading={recentCurrencyList.length > 0 ? "その他の通貨" : "通貨"}>
              {otherCurrencies.map((currency) => (
                <CommandItem
                  key={currency.code}
                  value={`${currency.code} ${currency.name}`}
                  onSelect={() => handleSelect(currency.code)}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm w-6">
                      {currency.symbol}
                    </span>
                    <span className="font-medium w-10">
                      {currency.code}
                    </span>
                    <span className="text-muted-foreground">
                      {currency.name}
                    </span>
                  </div>
                  <Check
                    className={cn(
                      "h-4 w-4",
                      value === currency.code ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}