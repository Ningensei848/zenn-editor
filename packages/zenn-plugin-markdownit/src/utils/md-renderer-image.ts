import MarkdownIt from 'markdown-it';
import Renderer from 'markdown-it/lib/renderer';

function isUrl(text: string): boolean {
    try {
        return new URL(text) && true;
    } catch {
        return false;
    }
}

export function mdRendererImage(md: MarkdownIt) {
    const defaultRender = md.renderer.rules.image as Renderer.RenderRule

    md.renderer.rules.image = function (tokens, idx, options, env, self) {
        const token = tokens[idx];
        const src = token.attrGet('src')

        // srcがURLの場合はチェックしない
        if (src == null || isUrl(src)) return defaultRender(tokens, idx, options, env, self);

        // 要件１：先頭が `/images/` であること
        if (!/^\/images\//.test(src)) {
            return `<p style="color: var(--c-error); font-weight: 700"><code>${src}</code>を表示できません。ローカルの画像を読み込むには相対パスではなく<code>/images/example.png</code>のように<code>/images/</code>から始まるパスを指定してください。</p>`;
        }
        // 要件２：拡張子が png,jpg,jpeg,gif であること
        if (!src.match(/(.png|.jpg|.jpeg|.gif)$/)) {
            return `<p style="color: var(--c-error); font-weight: 700"><code>${src}</code>を表示できません。対応している画像の拡張子は <code>png, jpg, jpeg, gif</code> です。</p>`;
        }
        // pass token to default renderer.
        return defaultRender(tokens, idx, options, env, self);
    };
}

/*
markdown-it design principles
cf. https://github.com/markdown-it/markdown-it/blob/master/docs/architecture.md#renderer

URL() - Web API | MDN
cf. https://developer.mozilla.org/ja/docs/Web/API/URL/URL
*/