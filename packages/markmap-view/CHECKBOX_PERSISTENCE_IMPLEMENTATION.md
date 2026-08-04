# Checkbox Persistence Implementation Summary

## Overview

This document summarizes the implementation of the checkbox persistence feature that was incorporated from the `generate-markmap.sh` script into the `markmap-view` package.

## Changes Made

### 1. Type Definitions (`src/types.ts`)

Added `checkboxPersistence` option to both interface definitions:

```typescript
export interface IMarkmapJSONOptions {
  // ... existing properties
  checkboxPersistence: boolean;
}

export interface IMarkmapOptions {
  // ... existing properties
  checkboxPersistence: boolean;
}
```

### 2. New Module (`src/checkbox-persistence.ts`)

Created a comprehensive checkbox persistence module with:

- **Core Functions:**
  - `getCheckboxId(textContent: string)`: Generate unique IDs based on content hash
  - `loadCheckboxStates()`: Load states from localStorage
  - `saveCheckboxStates(states)`: Save states to localStorage
  - `replaceSVGWithCheckbox(svg)`: Replace SVG with HTML input checkbox
  - `processCheckboxes(container)`: Process all checkboxes in a container
  - `clearCheckboxStates()`: Clear all saved states

- **CheckboxPersistenceManager Class:**
  - `init()`: Initialize with retry logic
  - `destroy()`: Clean up and disconnect observer
  - `getStates()`: Get current checkbox states
  - `clearStates()`: Clear all saved states
  - `process()`: Manually trigger checkbox processing
  - Private `setupObserver()`: Set up MutationObserver for dynamic checkboxes

### 3. Constants (`src/constants.ts`)

Added default value for the new option:

```typescript
export const defaultOptions: IMarkmapOptions = {
  // ... existing options
  checkboxPersistence: false,
};
```

### 4. Utility Functions (`src/util.ts`)

Added `checkboxPersistence` to the boolean keys array in `deriveOptions()`:

```typescript
const booleanKeys = ['zoom', 'pan', 'checkboxPersistence'] as const;
```

### 5. Main View Class (`src/view.ts`)

**Added:**
- Import for `CheckboxPersistenceManager`
- Private field: `_checkboxManager?: CheckboxPersistenceManager`
- Private method: `_initCheckboxPersistence()` - Initialize checkbox manager
- Private method: `_destroyCheckboxPersistence()` - Clean up checkbox manager
- Public method: `getCheckboxStates()` - Get current checkbox states
- Public method: `clearCheckboxStates()` - Clear all saved states
- Public method: `processCheckboxes()` - Manually process checkboxes

**Modified:**
- Constructor: Added call to `_initCheckboxPersistence()`
- `setOptions()`: Added logic to handle checkbox persistence enable/disable
- `renderData()`: Added checkbox processing after rendering
- `destroy()`: Added call to `_destroyCheckboxPersistence()`

**Exports:**
Re-exported all checkbox persistence utilities for external use:
```typescript
export {
  CheckboxPersistenceManager,
  CheckboxStates,
  getCheckboxId,
  loadCheckboxStates,
  saveCheckboxStates,
  replaceSVGWithCheckbox,
  processCheckboxes,
  clearCheckboxStates,
} from './checkbox-persistence';
```

## Files Created

1. `src/checkbox-persistence.ts` - Core checkbox persistence module
2. `CHECKBOX_PERSISTENCE.md` - User documentation
3. `example-checkbox-persistence.html` - Example/demo HTML file
4. `CHECKBOX_PERSISTENCE_IMPLEMENTATION.md` - This file

## Files Modified

1. `src/types.ts` - Added checkbox persistence option to interfaces
2. `src/constants.ts` - Added default value for checkbox persistence
3. `src/util.ts` - Added checkbox persistence to boolean keys processing
4. `src/view.ts` - Integrated checkbox persistence into Markmap class

## Key Features

✅ **Automatic Detection**: Finds SVG checkboxes and replaces them with HTML inputs
✅ **Persistent State**: Saves checkbox states to localStorage
✅ **Unique Identification**: Uses content-based hashing for consistent IDs
✅ **Dynamic Observation**: MutationObserver watches for new checkboxes
✅ **Clean API**: Simple enable/disable with `checkboxPersistence` option
✅ **Public Methods**: `getCheckboxStates()`, `clearCheckboxStates()`, `processCheckboxes()`
✅ **Retry Logic**: Attempts to find checkboxes up to 20 times with 250ms delays
✅ **Proper Cleanup**: Disconnect observers and clean up on destroy

## Usage Example

```typescript
import { Markmap } from 'markmap-view';

// Enable checkbox persistence
const mm = Markmap.create(svg, {
  checkboxPersistence: true
});

await mm.setData(data);

// Check states
console.log(mm.getCheckboxStates());

// Clear states
mm.clearCheckboxStates();

// Clean up
mm.destroy();
```

## Comparison with Original Script

| Feature | Original Script | New Implementation |
|---------|----------------|-------------------|
| Checkbox Detection | ✅ | ✅ |
| State Persistence | ✅ | ✅ |
| Content-based ID | ✅ | ✅ |
| MutationObserver | ✅ | ✅ |
| Retry Logic | ✅ (20 attempts, 250ms) | ✅ (20 attempts, 250ms) |
| Public API | Limited (window object) | Rich (class methods) |
| Integration | Script injection | Built-in |
| TypeScript Support | ❌ | ✅ |
| Cleanup | Manual | Automatic |
| Enable/Disable | Always on | Configurable option |

## Benefits Over Script Injection

1. **Type Safety**: Full TypeScript support with proper type definitions
2. **Better Integration**: Built into the library, not injected via script
3. **Lifecycle Management**: Proper initialization and cleanup
4. **API Consistency**: Uses same patterns as other Markmap features
5. **Configuration**: Can be enabled/disabled via options
6. **Maintainability**: Part of the codebase, easier to maintain and test
7. **Bundle Optimization**: Can be tree-shaken if not used

## Testing Considerations

To test the implementation:

1. Build the package: `pnpm build`
2. Create a test HTML file with markmap containing checkboxes
3. Enable checkbox persistence: `{ checkboxPersistence: true }`
4. Interact with checkboxes
5. Reload the page to verify state persistence
6. Test the public API methods
7. Verify cleanup on destroy

## Future Enhancements

Potential improvements for future versions:

- Custom storage key configuration
- Custom ID generation strategy
- State change callbacks/events
- Export/import states functionality
- Integration with other storage backends (sessionStorage, IndexedDB)
- Checkbox state change history/undo
- Bulk state operations

## Compatibility

- **Browser Requirements:**
  - localStorage API
  - MutationObserver API
  - Modern JavaScript (ES6+)

- **Markmap Version:** 
  - Compatible with markmap-view 0.18.x
  - Should be forward compatible with future versions

## Migration Guide

For users migrating from the script-based approach:

**Before:**
```html
<script>
  // 150+ lines of inline script
  (function() {
    'use strict';
    const STORAGE_KEY = 'markmap-checkbox-states';
    // ... rest of script
  })();
</script>
```

**After:**
```typescript
import { Markmap } from 'markmap-view';

const mm = Markmap.create(svg, {
  checkboxPersistence: true
});
```

The functionality is identical, but the implementation is cleaner and more maintainable.

