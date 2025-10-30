/**
 * Unit tests for metadata validation functions (T008)
 *
 * Tests validateMetadataName, isDuplicateName, and normalizeName
 * from src/lib/validation.ts
 *
 * Feature: 020-component-metadata-editing
 * User Story: US-001 (Create New Metadata Entries)
 */

import { describe, it, expect } from 'vitest';
import {
  validateMetadataName,
  isDuplicateName,
  normalizeName,
} from '@/lib/validation';

describe('validateMetadataName', () => {
  describe('Valid Names', () => {
    it('returns valid for unique name', () => {
      const result = validateMetadataName('Area A', ['Area B', 'Area C']);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('returns valid for first entry (empty existing names)', () => {
      const result = validateMetadataName('Area A', []);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('returns valid for name with special characters', () => {
      const result = validateMetadataName('Area-A (North)', ['Area B']);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('returns valid for name with numbers', () => {
      const result = validateMetadataName('Area 123', ['Area 456']);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('returns valid for name with unicode characters', () => {
      const result = validateMetadataName('Área A', ['Area B']);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe('Empty/Whitespace Validation', () => {
    it('returns error for empty string', () => {
      const result = validateMetadataName('', ['Area A']);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Name cannot be empty');
    });

    it('returns error for whitespace-only string', () => {
      const result = validateMetadataName('   ', ['Area A']);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Name cannot be empty');
    });

    it('returns error for tab-only string', () => {
      const result = validateMetadataName('\t\t', ['Area A']);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Name cannot be empty');
    });

    it('returns error for newline-only string', () => {
      const result = validateMetadataName('\n\n', ['Area A']);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Name cannot be empty');
    });

    it('returns error for mixed whitespace string', () => {
      const result = validateMetadataName(' \t\n ', ['Area A']);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Name cannot be empty');
    });
  });

  describe('Duplicate Detection', () => {
    it('returns error for exact duplicate', () => {
      const result = validateMetadataName('Area A', ['Area A', 'Area B']);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('A metadata entry named "Area A" already exists');
    });

    it('returns error for case-insensitive duplicate (lowercase)', () => {
      const result = validateMetadataName('area a', ['Area A', 'Area B']);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('A metadata entry named "area a" already exists');
    });

    it('returns error for case-insensitive duplicate (uppercase)', () => {
      const result = validateMetadataName('AREA A', ['Area A', 'Area B']);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('A metadata entry named "AREA A" already exists');
    });

    it('returns error for case-insensitive duplicate (mixed case)', () => {
      const result = validateMetadataName('ArEa A', ['Area A', 'Area B']);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('A metadata entry named "ArEa A" already exists');
    });

    it('returns error for duplicate with leading whitespace in input', () => {
      const result = validateMetadataName('  Area A', ['Area A', 'Area B']);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('A metadata entry named "Area A" already exists');
    });

    it('returns error for duplicate with trailing whitespace in input', () => {
      const result = validateMetadataName('Area A  ', ['Area A', 'Area B']);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('A metadata entry named "Area A" already exists');
    });

    it('returns error for duplicate with leading/trailing whitespace in input', () => {
      const result = validateMetadataName('  Area A  ', ['Area A', 'Area B']);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('A metadata entry named "Area A" already exists');
    });

    it('returns error for duplicate with whitespace in existing names', () => {
      const result = validateMetadataName('Area A', ['  Area A  ', 'Area B']);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('A metadata entry named "Area A" already exists');
    });

    it('returns error for duplicate with mixed case and whitespace', () => {
      const result = validateMetadataName('  area a  ', ['Area A', 'Area B']);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('A metadata entry named "area a" already exists');
    });
  });

  describe('Trimming Behavior', () => {
    it('trims leading whitespace before validation', () => {
      const result = validateMetadataName('  Area C', ['Area A', 'Area B']);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('trims trailing whitespace before validation', () => {
      const result = validateMetadataName('Area C  ', ['Area A', 'Area B']);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('trims both leading and trailing whitespace', () => {
      const result = validateMetadataName('  Area C  ', ['Area A', 'Area B']);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('preserves internal whitespace', () => {
      const result = validateMetadataName('Area  C', ['Area A']);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty existing names array', () => {
      const result = validateMetadataName('Area A', []);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('handles very long name (>100 characters)', () => {
      const longName = 'A'.repeat(150);
      const result = validateMetadataName(longName, ['Area B']);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('handles single character name', () => {
      const result = validateMetadataName('A', ['B', 'C']);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('handles names with only special characters', () => {
      const result = validateMetadataName('!!!', ['###']);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('handles names with emoji characters', () => {
      const result = validateMetadataName('Area 🚀', ['Area B']);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('handles duplicate with emoji in existing names', () => {
      const result = validateMetadataName('Area 🚀', ['Area 🚀', 'Area B']);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('A metadata entry named "Area 🚀" already exists');
    });
  });
});

describe('isDuplicateName', () => {
  describe('Duplicate Detection', () => {
    it('returns true for exact duplicate', () => {
      const result = isDuplicateName('Area A', ['Area A', 'Area B']);
      expect(result).toBe(true);
    });

    it('returns true for case-insensitive duplicate (lowercase)', () => {
      const result = isDuplicateName('area a', ['Area A', 'Area B']);
      expect(result).toBe(true);
    });

    it('returns true for case-insensitive duplicate (uppercase)', () => {
      const result = isDuplicateName('AREA A', ['Area A', 'Area B']);
      expect(result).toBe(true);
    });

    it('returns true for case-insensitive duplicate (mixed case)', () => {
      const result = isDuplicateName('ArEa A', ['Area A', 'Area B']);
      expect(result).toBe(true);
    });

    it('returns false for unique name', () => {
      const result = isDuplicateName('Area C', ['Area A', 'Area B']);
      expect(result).toBe(false);
    });

    it('returns false for empty existing names array', () => {
      const result = isDuplicateName('Area A', []);
      expect(result).toBe(false);
    });
  });

  describe('Whitespace Handling', () => {
    it('handles leading whitespace in input', () => {
      const result = isDuplicateName('  Area A', ['Area A', 'Area B']);
      expect(result).toBe(true);
    });

    it('handles trailing whitespace in input', () => {
      const result = isDuplicateName('Area A  ', ['Area A', 'Area B']);
      expect(result).toBe(true);
    });

    it('handles leading/trailing whitespace in input', () => {
      const result = isDuplicateName('  Area A  ', ['Area A', 'Area B']);
      expect(result).toBe(true);
    });

    it('handles whitespace in existing names', () => {
      const result = isDuplicateName('Area A', ['  Area A  ', 'Area B']);
      expect(result).toBe(true);
    });

    it('handles whitespace in both input and existing names', () => {
      const result = isDuplicateName('  Area A  ', ['  Area A  ', 'Area B']);
      expect(result).toBe(true);
    });

    it('handles mixed case and whitespace', () => {
      const result = isDuplicateName('  area a  ', ['Area A', 'Area B']);
      expect(result).toBe(true);
    });

    it('returns false for different names with whitespace', () => {
      const result = isDuplicateName('  Area C  ', ['Area A', 'Area B']);
      expect(result).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('handles empty string input', () => {
      const result = isDuplicateName('', ['Area A', 'Area B']);
      expect(result).toBe(false);
    });

    it('handles whitespace-only string', () => {
      const result = isDuplicateName('   ', ['Area A', 'Area B']);
      expect(result).toBe(false);
    });

    it('handles empty string in existing names', () => {
      const result = isDuplicateName('', ['', 'Area A']);
      expect(result).toBe(true);
    });

    it('handles single character comparison', () => {
      const result = isDuplicateName('A', ['A', 'B']);
      expect(result).toBe(true);
    });

    it('handles unicode characters', () => {
      const result = isDuplicateName('Área A', ['Área A', 'Area B']);
      expect(result).toBe(true);
    });

    it('handles emoji characters', () => {
      const result = isDuplicateName('Area 🚀', ['Area 🚀', 'Area B']);
      expect(result).toBe(true);
    });

    it('returns false for case-insensitive unique unicode', () => {
      const result = isDuplicateName('área b', ['Área A', 'Area C']);
      expect(result).toBe(false);
    });
  });
});

describe('normalizeName', () => {
  describe('Basic Normalization', () => {
    it('converts to lowercase', () => {
      const result = normalizeName('Area A');
      expect(result).toBe('area a');
    });

    it('trims whitespace', () => {
      const result = normalizeName('  Area A  ');
      expect(result).toBe('area a');
    });

    it('converts to lowercase and trims whitespace', () => {
      const result = normalizeName('  AREA A  ');
      expect(result).toBe('area a');
    });

    it('handles already-normalized names', () => {
      const result = normalizeName('area a');
      expect(result).toBe('area a');
    });

    it('handles mixed case', () => {
      const result = normalizeName('ArEa A');
      expect(result).toBe('area a');
    });
  });

  describe('Whitespace Handling', () => {
    it('trims leading whitespace only', () => {
      const result = normalizeName('  Area A');
      expect(result).toBe('area a');
    });

    it('trims trailing whitespace only', () => {
      const result = normalizeName('Area A  ');
      expect(result).toBe('area a');
    });

    it('preserves internal whitespace', () => {
      const result = normalizeName('Area  A');
      expect(result).toBe('area  a');
    });

    it('handles tab characters', () => {
      const result = normalizeName('\tArea A\t');
      expect(result).toBe('area a');
    });

    it('handles newline characters', () => {
      const result = normalizeName('\nArea A\n');
      expect(result).toBe('area a');
    });

    it('handles mixed whitespace', () => {
      const result = normalizeName(' \t\nArea A\n\t ');
      expect(result).toBe('area a');
    });
  });

  describe('Edge Cases', () => {
    it('handles empty string', () => {
      const result = normalizeName('');
      expect(result).toBe('');
    });

    it('handles whitespace-only string', () => {
      const result = normalizeName('   ');
      expect(result).toBe('');
    });

    it('handles single character', () => {
      const result = normalizeName('A');
      expect(result).toBe('a');
    });

    it('handles single character with whitespace', () => {
      const result = normalizeName('  A  ');
      expect(result).toBe('a');
    });

    it('handles numbers', () => {
      const result = normalizeName('123');
      expect(result).toBe('123');
    });

    it('handles special characters', () => {
      const result = normalizeName('!@#$%');
      expect(result).toBe('!@#$%');
    });

    it('handles unicode characters', () => {
      const result = normalizeName('Área A');
      expect(result).toBe('área a');
    });

    it('handles emoji characters', () => {
      const result = normalizeName('Area 🚀');
      expect(result).toBe('area 🚀');
    });

    it('handles very long strings', () => {
      const longName = 'A'.repeat(150);
      const result = normalizeName(longName);
      expect(result).toBe('a'.repeat(150));
    });

    it('handles strings with only special characters', () => {
      const result = normalizeName('!!!');
      expect(result).toBe('!!!');
    });

    it('preserves internal special characters', () => {
      const result = normalizeName('Area-A (North)');
      expect(result).toBe('area-a (north)');
    });
  });
});
