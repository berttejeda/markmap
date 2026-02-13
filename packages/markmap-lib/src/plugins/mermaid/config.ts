import { buildJSItem, JSItem } from 'markmap-common';

export const name = 'mermaid';

const preloadScripts = [
  `mermaid@${__define__.MERMAID_VERSION}/dist/mermaid.min.js`,
].map((path) => buildJSItem(path));

export const config = {
  versions: {
    mermaid: __define__.MERMAID_VERSION || '',
  },
  preloadScripts,
  scripts: [
    // Include mermaid.js in scripts so it gets fetched for offline use
    ...preloadScripts,
    {
      type: 'iife',
      data: {
        fn: () => {
          const styleId = 'markmap-mermaid-css';
          if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = `
.mermaid {
  transform: scale(0.8);
  transform-origin: top left;
}
.mermaid svg {
  max-width: 100%;
  height: auto;
}
`;
            document.head.appendChild(style);
          }

          const runMermaid = () => {
            const { mermaid } = window as any;
            if (!mermaid) return;

            // Initialize mermaid if not already initialized
            try {
              if (!mermaid.initialized) {
                mermaid.initialize({
                  startOnLoad: false,
                  theme: 'default',
                });
                mermaid.initialized = true;
              }
            } catch (e) {
              console.debug('Mermaid initialization:', e);
            }

            const svg = document.querySelector('svg#mindmap');
            if (!svg) return;

            const mermaidDivs = Array.from(svg.querySelectorAll('.mermaid'));
            mermaidDivs.forEach((div: Element) => {
              if (div.textContent && !div.querySelector('svg')) {
                // Only render if not already rendered
                if (typeof mermaid.render === 'function') {
                  // mermaid v10+ render API
                  // We need a unique ID for each diagram
                  const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                  mermaid
                    .render(id, div.textContent)
                    .then(({ svg }) => {
                      div.innerHTML = svg;
                    })
                    .catch((err: any) => {
                      console.warn('Mermaid rendering error:', err);
                    });
                } else if (typeof mermaid.run === 'function') {
                  // mermaid v10+ run API
                  mermaid
                    .run({
                      querySelector: null,
                      nodes: [div],
                    })
                    .catch((err: any) => {
                      console.warn('Mermaid rendering error:', err);
                    });
                } else if (typeof mermaid.init === 'function') {
                  // Older API
                  mermaid.init(undefined, div);
                }
              }
            });
          };

          const setupObserver = () => {
            const svg = document.querySelector('svg#mindmap');
            if (!svg) return;

            const observer = new MutationObserver((mutationsList) => {
              let shouldRender = false;
              for (const mutation of mutationsList) {
                if (
                  mutation.type === 'childList' &&
                  mutation.addedNodes.length > 0
                ) {
                  for (let i = 0; i < mutation.addedNodes.length; i++) {
                    const node = mutation.addedNodes[i];
                    if (node.nodeType === 1) {
                      // Element
                      const el = node as Element;
                      if (
                        el.classList?.contains('mermaid') ||
                        el.querySelector?.('.mermaid')
                      ) {
                        shouldRender = true;
                        break;
                      }
                    }
                  }
                }
                if (shouldRender) break;
              }

              if (shouldRender) {
                runMermaid();
              }
            });

            observer.observe(svg, { childList: true, subtree: true });
          };

          // Wait for both mermaid and markmap to be ready
          const checkReady = () => {
            const { mermaid } = window as any;
            const svg = document.querySelector('svg#mindmap');
            if (mermaid && svg) {
              runMermaid();
              setupObserver();
            } else {
              setTimeout(checkReady, 100);
            }
          };

          checkReady();
        },
        getParams({ getMarkmap }) {
          return [getMarkmap];
        },
      },
    },
  ] as JSItem[],
};
