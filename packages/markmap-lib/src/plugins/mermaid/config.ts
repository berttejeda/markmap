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
        fn: (getMarkmap: () => typeof import('markmap-view')) => {
          const renderMermaidDiagrams = () => {
            const { mermaid } = window as any;
            if (!mermaid) return;

            // Find all mermaid divs in the SVG foreignObjects
            const svg = document.querySelector('svg#mindmap');
            if (!svg) return;

            const mermaidDivs = Array.from(svg.querySelectorAll('.mermaid'));
            if (mermaidDivs.length === 0) return;

            // Initialize mermaid if not already initialized
            try {
              if (!mermaid.initialized) {
                mermaid.initialize({
                  startOnLoad: false,
                  theme: 'default',
                });
              }
            } catch {
              // mermaid might already be initialized
            }

            // Render all mermaid diagrams that haven't been rendered yet
            const renderPromises: Promise<any>[] = [];
            mermaidDivs.forEach((div: Element) => {
              if (div.textContent && !div.querySelector('svg')) {
                // Only render if not already rendered
                if (typeof mermaid.run === 'function') {
                  // mermaid.run() for v10+ - it works on all .mermaid elements by default
                  // or we can pass specific nodes
                  const promise = mermaid
                    .run({
                      querySelector: null,
                      nodes: [div],
                    })
                    .catch((err: any) => {
                      console.warn('Mermaid rendering error:', err);
                    });
                  renderPromises.push(promise);
                } else if (typeof mermaid.contentLoaded === 'function') {
                  // Older API
                  mermaid.contentLoaded();
                } else if (typeof mermaid.init === 'function') {
                  // Even older API
                  mermaid.init(undefined, div);
                }
              }
            });

            if (renderPromises.length > 0) {
              Promise.all(renderPromises).then(() => {
                const markmap = getMarkmap();
                if (markmap && markmap.refreshHook) {
                  markmap.refreshHook.call();
                }
              });
            }
          };

          // Wait for both mermaid and markmap to be ready
          const tryRender = () => {
            const { mermaid } = window as any;
            const svg = document.querySelector('svg#mindmap');
            if (mermaid && svg) {
              // Use requestAnimationFrame to ensure DOM is ready
              requestAnimationFrame(() => {
                setTimeout(renderMermaidDiagrams, 100);
              });
            }
          };

          // Try immediately
          tryRender();

          // Also try after a delay in case scripts load asynchronously
          setTimeout(tryRender, 500);
          setTimeout(tryRender, 1000);

          // Hook into markmap refresh to re-render mermaid diagrams
          // Wait for markmap instance to be created
          const hookIntoMarkmap = () => {
            const markmap = getMarkmap();
            const mm = (window as any).mm;
            if (markmap && markmap.refreshHook) {
              markmap.refreshHook.tap(() => {
                setTimeout(renderMermaidDiagrams, 100);
              });
              // Also render immediately if markmap is already created
              if (mm) {
                setTimeout(renderMermaidDiagrams, 200);
              }
            } else if (mm) {
              // Markmap instance exists, hook into it
              if (mm.refreshHook) {
                mm.refreshHook.tap(() => {
                  setTimeout(renderMermaidDiagrams, 100);
                });
                setTimeout(renderMermaidDiagrams, 200);
              }
            } else {
              // Retry if markmap isn't ready yet
              setTimeout(hookIntoMarkmap, 100);
            }
          };
          hookIntoMarkmap();
        },
        getParams({ getMarkmap }) {
          return [getMarkmap];
        },
      },
    },
  ] as JSItem[],
};
