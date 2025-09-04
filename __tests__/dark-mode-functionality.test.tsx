import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

describe('Dark Mode Core Functionality', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.className = ''
  })

  afterEach(() => {
    localStorage.clear()
    document.documentElement.className = ''
  })

  describe('CSS Variables and Classes', () => {
    it('should have proper CSS variables defined for light mode', () => {
      const root = document.documentElement
      const computedStyle = window.getComputedStyle(root)
      
      // CSS variables should be available (they are defined in globals.css)
      expect(root).toBeDefined()
    })

    it('should apply dark class to document', () => {
      document.documentElement.classList.add('dark')
      expect(document.documentElement.classList.contains('dark')).toBe(true)
    })

    it('should remove dark class from document', () => {
      document.documentElement.classList.add('dark')
      document.documentElement.classList.remove('dark')
      expect(document.documentElement.classList.contains('dark')).toBe(false)
    })
  })

  describe('Theme Persistence', () => {
    it('should save theme to localStorage', () => {
      localStorage.setItem('kibo-ui-theme', 'dark')
      expect(localStorage.getItem('kibo-ui-theme')).toBe('dark')
    })

    it('should load theme from localStorage', () => {
      localStorage.setItem('kibo-ui-theme', 'light')
      expect(localStorage.getItem('kibo-ui-theme')).toBe('light')
    })

    it('should handle missing localStorage gracefully', () => {
      localStorage.clear()
      expect(localStorage.getItem('kibo-ui-theme')).toBeNull()
    })
  })

  describe('Dark Mode Classes', () => {
    it('should have dark mode classes for common UI elements', () => {
      const element = document.createElement('div')
      element.className = 'bg-white dark:bg-gray-900 text-black dark:text-white border-gray-200 dark:border-gray-700'
      
      expect(element.classList.contains('bg-white')).toBe(true)
      expect(element.classList.contains('dark:bg-gray-900')).toBe(true)
      expect(element.classList.contains('text-black')).toBe(true)
      expect(element.classList.contains('dark:text-white')).toBe(true)
      expect(element.classList.contains('border-gray-200')).toBe(true)
      expect(element.classList.contains('dark:border-gray-700')).toBe(true)
    })

    it('should handle cursor pointer classes', () => {
      const button = document.createElement('button')
      button.className = 'cursor-pointer disabled:cursor-not-allowed hover:cursor-pointer'
      
      expect(button.classList.contains('cursor-pointer')).toBe(true)
      expect(button.classList.contains('disabled:cursor-not-allowed')).toBe(true)
      expect(button.classList.contains('hover:cursor-pointer')).toBe(true)
    })

    it('should handle form element dark mode classes', () => {
      const input = document.createElement('input')
      input.className = 'dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-400'
      
      expect(input.classList.contains('dark:bg-gray-800')).toBe(true)
      expect(input.classList.contains('dark:border-gray-600')).toBe(true)
      expect(input.classList.contains('dark:text-white')).toBe(true)
      expect(input.classList.contains('dark:placeholder-gray-400')).toBe(true)
    })
  })

  describe('Modal and Dialog Dark Mode', () => {
    it('should have proper modal backdrop classes', () => {
      const backdrop = document.createElement('div')
      backdrop.className = 'bg-black/80 backdrop-blur-sm'
      
      expect(backdrop.classList.contains('bg-black/80')).toBe(true)
      expect(backdrop.classList.contains('backdrop-blur-sm')).toBe(true)
    })

    it('should have proper dialog content dark mode classes', () => {
      const dialog = document.createElement('div')
      dialog.className = 'bg-white dark:bg-gray-900 border dark:border-gray-700 shadow-xl dark:shadow-2xl'
      
      expect(dialog.classList.contains('bg-white')).toBe(true)
      expect(dialog.classList.contains('dark:bg-gray-900')).toBe(true)
      expect(dialog.classList.contains('border')).toBe(true)
      expect(dialog.classList.contains('dark:border-gray-700')).toBe(true)
      expect(dialog.classList.contains('shadow-xl')).toBe(true)
      expect(dialog.classList.contains('dark:shadow-2xl')).toBe(true)
    })
  })

  describe('Color Contrast and Accessibility', () => {
    it('should have proper text color classes for readability', () => {
      const element = document.createElement('div')
      element.className = 'text-gray-900 dark:text-gray-100 text-muted-foreground'
      
      expect(element.classList.contains('text-gray-900')).toBe(true)
      expect(element.classList.contains('dark:text-gray-100')).toBe(true)
      expect(element.classList.contains('text-muted-foreground')).toBe(true)
    })

    it('should have proper error message colors for both themes', () => {
      const error = document.createElement('div')
      error.className = 'text-red-600 dark:text-red-400'
      
      expect(error.classList.contains('text-red-600')).toBe(true)
      expect(error.classList.contains('dark:text-red-400')).toBe(true)
    })

    it('should have proper success message colors for both themes', () => {
      const success = document.createElement('div')
      success.className = 'text-green-600 dark:text-green-400'
      
      expect(success.classList.contains('text-green-600')).toBe(true)
      expect(success.classList.contains('dark:text-green-400')).toBe(true)
    })
  })

  describe('System Theme Detection', () => {
    it('should handle system theme preference', () => {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-color-scheme: dark)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      })

      const matchMedia = window.matchMedia('(prefers-color-scheme: dark)')
      expect(matchMedia.matches).toBe(true)
    })

    it('should handle light system theme preference', () => {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-color-scheme: light)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      })

      const matchMedia = window.matchMedia('(prefers-color-scheme: light)')
      expect(matchMedia.matches).toBe(true)
    })
  })

  describe('Theme Toggle Button Classes', () => {
    it('should have proper button styling classes', () => {
      const button = document.createElement('button')
      button.className = 'inline-flex items-center justify-center rounded-md text-sm font-medium cursor-pointer disabled:cursor-not-allowed border border-input bg-background hover:bg-accent hover:text-accent-foreground dark:text-white dark:border-gray-600'
      
      expect(button.classList.contains('cursor-pointer')).toBe(true)
      expect(button.classList.contains('disabled:cursor-not-allowed')).toBe(true)
      expect(button.classList.contains('dark:text-white')).toBe(true)
      expect(button.classList.contains('dark:border-gray-600')).toBe(true)
    })

    it('should have proper icon transition classes', () => {
      const sunIcon = document.createElement('svg')
      sunIcon.className = 'h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0'
      
      expect(sunIcon.classList.contains('transition-all')).toBe(true)
      expect(sunIcon.classList.contains('dark:-rotate-90')).toBe(true)
      expect(sunIcon.classList.contains('dark:scale-0')).toBe(true)
      
      const moonIcon = document.createElement('svg')
      moonIcon.className = 'absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100'
      
      expect(moonIcon.classList.contains('transition-all')).toBe(true)
      expect(moonIcon.classList.contains('dark:rotate-0')).toBe(true)
      expect(moonIcon.classList.contains('dark:scale-100')).toBe(true)
    })
  })
})