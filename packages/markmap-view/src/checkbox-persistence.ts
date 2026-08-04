/**
 * Checkbox Persistence Module
 *
 * This module provides functionality to replace SVG checkboxes with HTML input
 * elements and persist their state in localStorage.
 */

const STORAGE_KEY = 'markmap-checkbox-states';
const CHECKBOX_SELECTOR = 'svg[width="16"][height="16"][viewBox="0 -3 24 24"]';

export interface CheckboxStates {
  [key: string]: boolean;
}

/**
 * Generate a unique ID for a checkbox based on its text content
 */
export function getCheckboxId(textContent: string): string {
  let hash = 0;
  for (let i = 0; i < textContent.length; i++) {
    const char = textContent.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return `checkbox-${hash}`;
}

/**
 * Load checkbox states from localStorage
 */
export function loadCheckboxStates(): CheckboxStates {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch (e) {
    console.error('Error loading checkbox states:', e);
    return {};
  }
}

/**
 * Save checkbox states to localStorage
 */
export function saveCheckboxStates(states: CheckboxStates): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(states));
  } catch (e) {
    console.error('Error saving checkbox states:', e);
  }
}

/**
 * Replace an SVG checkbox with an HTML input checkbox
 */
export function replaceSVGWithCheckbox(
  svg: SVGElement,
): HTMLInputElement | null {
  const foreignObject = svg.closest('foreignObject');
  if (!foreignObject) return null;

  const textContent = foreignObject.textContent?.trim() || '';
  const checkboxId = getCheckboxId(textContent);

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.style.cssText =
    'margin-right: 6px; cursor: pointer; width: 16px; height: 16px; vertical-align: middle;';
  checkbox.setAttribute('data-checkbox-id', checkboxId);

  // Restore saved state
  const savedStates = loadCheckboxStates();
  if (Object.prototype.hasOwnProperty.call(savedStates, checkboxId)) {
    checkbox.checked = savedStates[checkboxId];
  }

  // Save state on change
  checkbox.addEventListener('change', function () {
    const states = loadCheckboxStates();
    states[checkboxId] = checkbox.checked;
    saveCheckboxStates(states);
  });

  svg.replaceWith(checkbox);
  return checkbox;
}

/**
 * Process all checkboxes in the document
 */
export function processCheckboxes(container: Element = document.body): number {
  const svgs = container.querySelectorAll<SVGElement>(CHECKBOX_SELECTOR);
  let count = 0;

  svgs.forEach((svg) => {
    if (replaceSVGWithCheckbox(svg)) {
      count++;
    }
  });

  return count;
}

/**
 * Clear all saved checkbox states
 */
export function clearCheckboxStates(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Checkbox Persistence Manager
 */
export class CheckboxPersistenceManager {
  private observer: MutationObserver | null = null;
  private container: Element;
  private initialized = false;

  constructor(container: Element = document.body) {
    this.container = container;
  }

  /**
   * Initialize checkbox persistence with retry logic
   */
  init(): void {
    if (this.initialized) return;

    let attempts = 0;
    const maxAttempts = 20;

    const tryProcess = () => {
      const svgs =
        this.container.querySelectorAll<SVGElement>(CHECKBOX_SELECTOR);

      if (svgs.length > 0) {
        processCheckboxes(this.container);
        this.setupObserver();
        this.initialized = true;
      } else if (attempts < maxAttempts) {
        attempts++;
        setTimeout(tryProcess, 250);
      }
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', tryProcess);
    } else {
      tryProcess();
    }
  }

  /**
   * Setup MutationObserver to watch for dynamically added checkboxes
   */
  private setupObserver(): void {
    if (this.observer) return;

    this.observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            const newSvgs = element.querySelectorAll
              ? element.querySelectorAll<SVGElement>(CHECKBOX_SELECTOR)
              : [];
            newSvgs.forEach(replaceSVGWithCheckbox);
          }
        });
      });
    });

    this.observer.observe(this.container, {
      childList: true,
      subtree: true,
    });
  }

  /**
   * Disconnect the observer and cleanup
   */
  destroy(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.initialized = false;
  }

  /**
   * Get current checkbox states
   */
  getStates(): CheckboxStates {
    return loadCheckboxStates();
  }

  /**
   * Clear all checkbox states
   */
  clearStates(): void {
    clearCheckboxStates();
  }

  /**
   * Manually trigger checkbox processing
   */
  process(): number {
    return processCheckboxes(this.container);
  }
}
