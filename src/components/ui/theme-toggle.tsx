'use client'

import { useTheme } from '../providers/ThemeProvider'
import { Button } from './button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './dropdown-menu'
import { Moon, Sun, Monitor } from 'lucide-react'

export function ThemeToggle() {
  const { setTheme, theme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Button variant="outline" size="icon">
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">テーマを切り替え</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onAction={() => setTheme('light')}>
          <Sun className="mr-2 h-4 w-4" />
          <span>ライト</span>
        </DropdownMenuItem>
        <DropdownMenuItem onAction={() => setTheme('dark')}>
          <Moon className="mr-2 h-4 w-4" />
          <span>ダーク</span>
        </DropdownMenuItem>
        <DropdownMenuItem onAction={() => setTheme('system')}>
          <Monitor className="mr-2 h-4 w-4" />
          <span>システム</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
