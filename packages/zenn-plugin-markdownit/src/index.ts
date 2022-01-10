import markdownIt from 'markdown-it';
import crypto from 'crypto';

// plugins
import {
  containerDetailsOptions,
  containerMessageOptions,
} from './utils/md-container';
import { mdRendererFence } from './utils/md-renderer-fence';
import { mdRendererImage } from './utils/md-renderer-image';
import { mdLinkifyToCard } from './utils/md-linkify-to-card';
import { mdKatex } from './utils/md-katex';
import { mdBr } from './utils/md-br';
import { mdCustomBlock } from './utils/md-custom-block';
import markdownItImSize from '@steelydylan/markdown-it-imsize';
import markdownItAnchor from 'markdown-it-anchor';

const mdContainer = require('markdown-it-container');
const mdFootnote = require('markdown-it-footnote');
const mdTaskLists = require('markdown-it-task-lists');
const mdInlineComments = require('markdown-it-inline-comments');
const mdLinkAttributes = require('markdown-it-link-attributes');


const zenn_plugin = (md: markdownIt, options: markdownIt.Options) => {

  // docIdは複数のコメントが1ページに指定されたときに脚注のリンク先が重複しないように指定する
  // 1ページの中で重複しなければ問題ないため、ごく短いランダムな文字列とする
  // - https://github.com/zenn-dev/zenn-community/issues/356
  // - https://github.com/markdown-it/markdown-it-footnote/pull/8
  const docId = crypto.randomBytes(2).toString('hex');
  const zennOpts = {
    docId,
    breaks: true,
    linkify: true,
  }

  md.utils.assign(options, zennOpts)
  md.linkify.set({ fuzzyLink: false });

  md.use(mdBr)
    .use(mdRendererFence)
    .use(mdRendererImage)
    .use(markdownItImSize)
    .use(mdCustomBlock)
    .use(mdContainer, 'details', containerDetailsOptions)
    .use(mdContainer, 'message', containerMessageOptions)
    .use(mdFootnote)
    .use(mdTaskLists, { enabled: true })
    .use(mdInlineComments)
    .use(mdLinkAttributes, {
      pattern: /^(?!https:\/\/zenn\.dev\/)/,
      attrs: {
        rel: 'nofollow',
      },
    })
    .use(markdownItAnchor, {
      level: [1, 2, 3, 4],
      permalink: markdownItAnchor.permalink.ariaHidden({
        placement: 'before',
        class: 'header-anchor-link',
        symbol: '',
      }),
      tabIndex: false,
    })
    .use(mdKatex)
    .use(mdLinkifyToCard);

  // custom footnote
  md.renderer.rules.footnote_block_open = () =>
    '<section class="footnotes">\n' +
    '<div class="footnotes-title">脚注</div>\n' +
    '<ol class="footnotes-list">\n';
}

export default zenn_plugin;
