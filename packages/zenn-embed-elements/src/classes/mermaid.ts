/**
 * original: https://github.com/gitlabhq/gitlabhq/blob/master/app/assets/javascripts/behaviors/markdown/render_mermaid.js
 */

import { loadScript } from '../utils/load-script';

// mermaid.jsのバージョン
const MERMAID_VERSION = '8.13';

// レンダリングする図ごとの最大文字数
const MAX_CHAR_LIMIT = 2000;

// https://mermaid-js.github.io/mermaid/#/flowchart?id=chaining-of-links
// 新しい仕様で
// graph LR
//    a --> b & c--> d
// に対応するが、少ない記述でノード接続が爆発する可能性があるため最大数を制限する
const MAX_CHAINING_OF_LINKS_LIMIT = 10;

// Page values
declare let mermaid: any;
const containerId = 'mermaid-container';

async function initMermaid(): Promise<void> {
  if (typeof mermaid === 'undefined') {
    await loadScript({
      src: `https://cdn.jsdelivr.net/npm/mermaid@${MERMAID_VERSION}/dist/mermaid.min.js`,
      id: 'mermaid-js',
    });
    const theme = 'default';

    // mermaid 本体がロード時に走らないように設定
    // mermaid 本体は使わないのでほかは設定しない

    // eslint-disable-next-line
    mermaid!.initialize({
      mermaid: {
        startOnLoad: false,
      },
    });

    // mermaidAPI の設定
    // eslint-disable-next-line
    mermaid!.mermaidAPI.initialize({
      startOnLoad: false, // レンダリングはこちらでやるので false
      securityLevel: 'strict', // tags in text are encoded, click functionality is disabled
      theme,
      er: {
        useMaxWidth: true,
      },
      flowchart: {
        useMaxWidth: true, // 表示の都合上見切れるのもスクロールするのも嫌なので最大幅を有効にする
        htmlLabels: false, // セキュリティのため、HTMLラベルは許可しない
      },
      sequence: {
        useMaxWidth: true,
      },
      class: {
        useMaxWidth: true,
      },
      journey: {
        useMaxWidth: true,
      },
    });
  }
}

type ErrorContainer = {
  yes: boolean;
  message: string;
};

type PotentialRisk = {
  syntaxError: ErrorContainer;
  charLimitOver: ErrorContainer;
  chainingOfLinksOver: ErrorContainer;
};

function getPotentialPerformanceRisk(source: string): PotentialRisk {
  const cool = (() => {
    try {
      // eslint-disable-next-line
      mermaid!.mermaidAPI.parse(source);
      return true;
    } catch (e) {
      console.log(
        'mermaid.js のレンダリングでシンタックスエラーが発生しました',
        e
      );
      return false;
    }
  })();
  return {
    syntaxError: {
      yes: !cool,
      message: `<li>シンタックスエラーです</li>`,
    },
    charLimitOver: {
      yes: source.length > MAX_CHAR_LIMIT,
      message: `<li>ブロックあたりの文字数上限は${MAX_CHAR_LIMIT}です</li>`,
    },
    chainingOfLinksOver: {
      yes: (source.match(/&/g) || []).length > MAX_CHAINING_OF_LINKS_LIMIT,
      message: `<li>ブロックあたりの<code>&</code>によるチェイン上限は${MAX_CHAINING_OF_LINKS_LIMIT}です</li>`,
    },
  };
}

export class EmbedMermaid extends HTMLElement {
  // mermaid のソース記述
  private readonly _source: string;

  // 描画中の一時的なsvgが格納するdivタグ
  // 描画が終わるとmermaid.jsによって削除される
  // 指定しないと mermaid が body へ一時タグをつける動きになる
  // 予期しない副作用を避けるため、EmbedMermaid に閉じたところにつくる
  // なお、一時コンテナはdivであることが期待されている
  private readonly _tmpContainer: HTMLDivElement;

  // 描画後の svg を格納するdivタグ ここで作る
  private readonly _svgContainer: HTMLDivElement;

  constructor() {
    super();
    // コード記述が格納されている pre タグを取得
    // できるだけコードがちらつかないようにインスタンス変数に入れて削除してしまう
    // パフォーマンスのために削除しているが、「コードをコピペしたい」みたいな話がでてきたときは残してHiddenにする
    const sourceContainer = this.childNodes[0] as HTMLPreElement;
    this._source = sourceContainer.innerText || '';
    sourceContainer.remove();

    // 一時コンテナ
    const tmpContainer = document.createElement('div');
    this.appendChild(tmpContainer);
    this._tmpContainer = tmpContainer;

    // 描画後のSVGを格納する div タグを作成
    const container = document.createElement('div');
    this.appendChild(container);
    this._svgContainer = container;
  }

  async connectedCallback() {
    this.render();
  }

  async render() {
    await initMermaid();

    // Mermaid モジュールの読み込みに失敗したり、レンダリング対象のコンテンツが空の場合は何もせずに終了
    if (!this._source) {
      return;
    }

    // 文法エラーやパフォーマンスリスクが検出された場合、注意書きをレンダリングして終了
    const risk = getPotentialPerformanceRisk(this._source);
    if (
      Object.values(risk)
        .map((r) => r.yes)
        .includes(true)
    ) {
      this.innerHTML = `
       <p>
        <span>mermaidをレンダリングできません。</span>
        <ul>
        ${risk.syntaxError.yes ? risk.syntaxError.message : ''}
        ${risk.charLimitOver.yes ? risk.charLimitOver.message : ''}
        ${risk.chainingOfLinksOver.yes ? risk.chainingOfLinksOver.message : ''}
        </ul>
       </p>
      `;
      return;
    }

    // すべて通過した場合はレンダリングする
    // セキュリティリスクを考慮して bindFunctions は実行しない方針にする
    // 今回は `securityLevel='strict'` にしているのでどのみち実行されない
    // securityLevel='loose'にし、かつ `Interaction` を有効にする場合は
    // https://github.com/mermaidjs/mermaid-gitbook/blob/master/content/usage.md#binding-events
    // ここを参考に追加する
    const insert = (svgCode: string) => {
      this._svgContainer.innerHTML = svgCode;
    };
    mermaid?.mermaidAPI.render(
      `${containerId}-${Date.now().valueOf()}-render`,
      this._source,
      insert,
      this._tmpContainer
    );
  }
}
