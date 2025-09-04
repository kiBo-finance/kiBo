import React from 'react'
import { render, screen } from '@testing-library/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ThemeProvider } from '@/components/providers/ThemeProvider'

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <ThemeProvider>
      {component}
    </ThemeProvider>
  )
}

describe('Cursor Pointer Styles', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.className = ''
  })

  afterEach(() => {
    localStorage.clear()
    document.documentElement.className = ''
  })

  describe('Button Component', () => {
    it('should have cursor-pointer class', () => {
      renderWithProviders(
        <Button data-testid="button">Test Button</Button>
      )
      
      const button = screen.getByTestId('button')
      expect(button).toHaveClass('cursor-pointer')
    })

    it('should have cursor-not-allowed when disabled', () => {
      renderWithProviders(
        <Button disabled data-testid="disabled-button">
          Disabled Button
        </Button>
      )
      
      const button = screen.getByTestId('disabled-button')
      expect(button).toHaveClass('disabled:cursor-not-allowed')
    })

    it('should maintain cursor-pointer in different variants', () => {
      const variants = ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'] as const
      
      variants.forEach(variant => {
        renderWithProviders(
          <Button variant={variant} data-testid={`button-${variant}`}>
            {variant} Button
          </Button>
        )
        
        const button = screen.getByTestId(`button-${variant}`)
        expect(button).toHaveClass('cursor-pointer')
      })
    })

    it('should maintain cursor styles in different sizes', () => {
      const sizes = ['default', 'sm', 'lg', 'icon'] as const
      
      sizes.forEach(size => {
        renderWithProviders(
          <Button size={size} data-testid={`button-${size}`}>
            {size === 'icon' ? '🎉' : `${size} Button`}
          </Button>
        )
        
        const button = screen.getByTestId(`button-${size}`)
        expect(button).toHaveClass('cursor-pointer')
      })
    })
  })

  describe('Select Component', () => {
    it('should have cursor-pointer on select trigger', () => {
      renderWithProviders(
        <Select>
          <SelectTrigger data-testid="select-trigger">
            <SelectValue placeholder="Select option" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="option1">Option 1</SelectItem>
          </SelectContent>
        </Select>
      )
      
      const selectTrigger = screen.getByTestId('select-trigger')
      expect(selectTrigger).toHaveClass('cursor-pointer')
    })

    it('should have cursor-not-allowed when disabled', () => {
      renderWithProviders(
        <Select disabled>
          <SelectTrigger data-testid="disabled-select">
            <SelectValue placeholder="Disabled select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="option1">Option 1</SelectItem>
          </SelectContent>
        </Select>
      )
      
      const selectTrigger = screen.getByTestId('disabled-select')
      expect(selectTrigger).toHaveClass('disabled:cursor-not-allowed')
    })
  })

  describe('Interactive Elements', () => {
    it('should apply cursor-pointer to clickable links', () => {
      renderWithProviders(
        <a href="/test" className="text-primary hover:underline cursor-pointer" data-testid="link">
          Test Link
        </a>
      )
      
      const link = screen.getByTestId('link')
      expect(link).toHaveClass('cursor-pointer')
    })

    it('should apply appropriate cursor styles to form elements', () => {
      renderWithProviders(
        <div>
          <Input 
            type="text" 
            placeholder="Text input"
            data-testid="text-input"
          />
          <Input 
            type="checkbox" 
            className="cursor-pointer"
            data-testid="checkbox-input"
          />
          <Input 
            type="radio" 
            className="cursor-pointer"
            data-testid="radio-input"
          />
        </div>
      )
      
      const textInput = screen.getByTestId('text-input')
      expect(textInput).toHaveClass('cursor-text')
      
      const checkboxInput = screen.getByTestId('checkbox-input')
      expect(checkboxInput).toHaveClass('cursor-pointer')
      
      const radioInput = screen.getByTestId('radio-input')
      expect(radioInput).toHaveClass('cursor-pointer')
    })
  })

  describe('Dark Mode Cursor Styles', () => {
    it('should maintain cursor styles in dark mode', () => {
      document.documentElement.classList.add('dark')
      
      renderWithProviders(
        <div>
          <Button data-testid="dark-button">Dark Button</Button>
          <Select>
            <SelectTrigger data-testid="dark-select">
              <SelectValue placeholder="Dark select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="option1">Option 1</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )
      
      const button = screen.getByTestId('dark-button')
      expect(button).toHaveClass('cursor-pointer')
      
      const selectTrigger = screen.getByTestId('dark-select')
      expect(selectTrigger).toHaveClass('cursor-pointer')
    })

    it('should maintain disabled cursor styles in dark mode', () => {
      document.documentElement.classList.add('dark')
      
      renderWithProviders(
        <div>
          <Button disabled data-testid="dark-disabled-button">
            Dark Disabled Button
          </Button>
          <Select disabled>
            <SelectTrigger data-testid="dark-disabled-select">
              <SelectValue placeholder="Dark disabled select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="option1">Option 1</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )
      
      const button = screen.getByTestId('dark-disabled-button')
      expect(button).toHaveClass('disabled:cursor-not-allowed')
      
      const selectTrigger = screen.getByTestId('dark-disabled-select')
      expect(selectTrigger).toHaveClass('disabled:cursor-not-allowed')
    })
  })

  describe('Hover States', () => {
    it('should maintain cursor-pointer on hover states', () => {
      renderWithProviders(
        <Button className="hover:bg-gray-100" data-testid="hover-button">
          Hover Button
        </Button>
      )
      
      const button = screen.getByTestId('hover-button')
      expect(button).toHaveClass('cursor-pointer')
      expect(button).toHaveClass('hover:bg-gray-100')
    })

    it('should maintain cursor styles with focus states', () => {
      renderWithProviders(
        <Button className="focus:ring-2 focus:ring-blue-500" data-testid="focus-button">
          Focus Button
        </Button>
      )
      
      const button = screen.getByTestId('focus-button')
      expect(button).toHaveClass('cursor-pointer')
      expect(button).toHaveClass('focus:ring-2')
    })
  })

  describe('Accessibility', () => {
    it('should maintain cursor styles with proper ARIA attributes', () => {
      renderWithProviders(
        <div>
          <Button 
            aria-label="Accessible button"
            data-testid="aria-button"
          >
            Accessible Button
          </Button>
          <Select>
            <SelectTrigger 
              aria-label="Accessible select"
              data-testid="aria-select"
            >
              <SelectValue placeholder="Accessible select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="option1">Option 1</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )
      
      const button = screen.getByTestId('aria-button')
      expect(button).toHaveClass('cursor-pointer')
      expect(button).toHaveAttribute('aria-label', 'Accessible button')
      
      const selectTrigger = screen.getByTestId('aria-select')
      expect(selectTrigger).toHaveClass('cursor-pointer')
      expect(selectTrigger).toHaveAttribute('aria-label', 'Accessible select')
    })
  })
})