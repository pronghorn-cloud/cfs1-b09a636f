/**
 * Configuration Presets — Unit Tests
 *
 * Validates preset retrieval, structure, and .env file generation.
 * Presets are pure data objects with no external dependencies.
 */

import { describe, it, expect } from 'vitest'
import {
  getPreset,
  generateEnvFile,
  internalPreset,
  externalPreset,
  developmentPreset,
} from './presets.js'

describe('getPreset', () => {
  it('should return the internal (Entra ID) preset', () => {
    const preset = getPreset('internal')
    expect(preset).toBe(internalPreset)
    expect(preset.variables.AUTH_DRIVER).toBe('entra-id')
  })

  it('should return the external (SAML) preset', () => {
    const preset = getPreset('external')
    expect(preset).toBe(externalPreset)
    expect(preset.variables.AUTH_DRIVER).toBe('saml')
  })

  it('should return the development (Mock) preset', () => {
    const preset = getPreset('development')
    expect(preset).toBe(developmentPreset)
    expect(preset.variables.AUTH_DRIVER).toBe('mock')
  })

  it('should throw for an unknown preset name', () => {
    // @ts-expect-error — testing invalid input
    expect(() => getPreset('unknown')).toThrow('Unknown preset')
  })
})

describe('generateEnvFile', () => {
  it('should include comment header when includeComments is true', () => {
    const output = generateEnvFile(developmentPreset, true)

    // Header lines
    expect(output).toContain('# =====')
    expect(output).toContain(`# ${developmentPreset.name}`)
    expect(output).toContain(`# ${developmentPreset.description}`)
  })

  it('should omit comment header when includeComments is false', () => {
    const output = generateEnvFile(developmentPreset, false)

    expect(output).not.toContain('#')
  })

  it('should contain every preset variable as KEY=value', () => {
    const output = generateEnvFile(developmentPreset, false)

    for (const [key, value] of Object.entries(developmentPreset.variables)) {
      expect(output).toContain(`${key}=${value}`)
    }
  })

  it('should produce different output for each preset', () => {
    const internal = generateEnvFile(internalPreset, false)
    const external = generateEnvFile(externalPreset, false)

    expect(internal).toContain('AUTH_DRIVER=entra-id')
    expect(external).toContain('AUTH_DRIVER=saml')
    expect(internal).not.toEqual(external)
  })
})

describe('preset structure', () => {
  it.each([internalPreset, externalPreset, developmentPreset])(
    'should have name, description, and variables ($name)',
    (preset) => {
      expect(preset.name).toBeTruthy()
      expect(preset.description).toBeTruthy()
      expect(Object.keys(preset.variables).length).toBeGreaterThan(0)
    }
  )

  it('should set NODE_ENV=production for internal and external presets', () => {
    expect(internalPreset.variables.NODE_ENV).toBe('production')
    expect(externalPreset.variables.NODE_ENV).toBe('production')
  })

  it('should set NODE_ENV=development for development preset', () => {
    expect(developmentPreset.variables.NODE_ENV).toBe('development')
  })
})
