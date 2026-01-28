import { noop, wrapFunction } from 'markmap-common';
import { ITransformHooks } from '../../types';
import { definePlugin } from '../base';
import { config, name } from './config';

const plugin = definePlugin({
  name,
  config,
  transform(transformHooks: ITransformHooks) {
    let enableFeature = noop;
    transformHooks.parser.tap((md) => {
      // Wrap the fence renderer to detect mermaid code blocks
      if (md.renderer.rules.fence) {
        md.renderer.rules.fence = wrapFunction(
          md.renderer.rules.fence,
          (render, tokens, idx, ...rest) => {
            const token = tokens[idx];
            if (token.info === 'mermaid') {
              enableFeature();
              // Return a div with class mermaid and the mermaid code as content
              // The content is already plain text from the code fence, no need to escape
              return `<div class="mermaid">${token.content}</div>`;
            }
            return render(tokens, idx, ...rest);
          },
        );
      }
    });
    transformHooks.beforeParse.tap((_, context) => {
      enableFeature = () => {
        context.features[name] = true;
      };
    });
    return {
      scripts: plugin.config?.scripts,
    };
  },
});

export default plugin;
