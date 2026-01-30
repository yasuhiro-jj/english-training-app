/**
 * 日本語をローマ字に変換するユーティリティ
 * 英語テキスト内の日本語名をローマ字読みに変換して、TTSで正しく発音できるようにする
 */

// 基本的なひらがな→ローマ字変換テーブル
const hiraganaToRomaji: Record<string, string> = {
    'あ': 'a', 'い': 'i', 'う': 'u', 'え': 'e', 'お': 'o',
    'か': 'ka', 'き': 'ki', 'く': 'ku', 'け': 'ke', 'こ': 'ko',
    'さ': 'sa', 'し': 'shi', 'す': 'su', 'せ': 'se', 'そ': 'so',
    'た': 'ta', 'ち': 'chi', 'つ': 'tsu', 'て': 'te', 'と': 'to',
    'な': 'na', 'に': 'ni', 'ぬ': 'nu', 'ね': 'ne', 'の': 'no',
    'は': 'ha', 'ひ': 'hi', 'ふ': 'fu', 'へ': 'he', 'ほ': 'ho',
    'ま': 'ma', 'み': 'mi', 'む': 'mu', 'め': 'me', 'も': 'mo',
    'や': 'ya', 'ゆ': 'yu', 'よ': 'yo',
    'ら': 'ra', 'り': 'ri', 'る': 'ru', 'れ': 're', 'ろ': 'ro',
    'わ': 'wa', 'を': 'wo', 'ん': 'n',
    'が': 'ga', 'ぎ': 'gi', 'ぐ': 'gu', 'げ': 'ge', 'ご': 'go',
    'ざ': 'za', 'じ': 'ji', 'ず': 'zu', 'ぜ': 'ze', 'ぞ': 'zo',
    'だ': 'da', 'ぢ': 'ji', 'づ': 'zu', 'で': 'de', 'ど': 'do',
    'ば': 'ba', 'び': 'bi', 'ぶ': 'bu', 'べ': 'be', 'ぼ': 'bo',
    'ぱ': 'pa', 'ぴ': 'pi', 'ぷ': 'pu', 'ぺ': 'pe', 'ぽ': 'po',
    'きゃ': 'kya', 'きゅ': 'kyu', 'きょ': 'kyo',
    'しゃ': 'sha', 'しゅ': 'shu', 'しょ': 'sho',
    'ちゃ': 'cha', 'ちゅ': 'chu', 'ちょ': 'cho',
    'にゃ': 'nya', 'にゅ': 'nyu', 'にょ': 'nyo',
    'ひゃ': 'hya', 'ひゅ': 'hyu', 'ひょ': 'hyo',
    'みゃ': 'mya', 'みゅ': 'myu', 'みょ': 'myo',
    'りゃ': 'rya', 'りゅ': 'ryu', 'りょ': 'ryo',
    'ぎゃ': 'gya', 'ぎゅ': 'gyu', 'ぎょ': 'gyo',
    'じゃ': 'ja', 'じゅ': 'ju', 'じょ': 'jo',
    'びゃ': 'bya', 'びゅ': 'byu', 'びょ': 'byo',
    'ぴゃ': 'pya', 'ぴゅ': 'pyu', 'ぴょ': 'pyo',
};

// カタカナ→ひらがな変換
const katakanaToHiragana: Record<string, string> = {
    'ア': 'あ', 'イ': 'い', 'ウ': 'う', 'エ': 'え', 'オ': 'お',
    'カ': 'か', 'キ': 'き', 'ク': 'く', 'ケ': 'け', 'コ': 'こ',
    'サ': 'さ', 'シ': 'し', 'ス': 'す', 'セ': 'せ', 'ソ': 'そ',
    'タ': 'た', 'チ': 'ち', 'ツ': 'つ', 'テ': 'て', 'ト': 'と',
    'ナ': 'な', 'ニ': 'に', 'ヌ': 'ぬ', 'ネ': 'ね', 'ノ': 'の',
    'ハ': 'は', 'ヒ': 'ひ', 'フ': 'ふ', 'ヘ': 'へ', 'ホ': 'ほ',
    'マ': 'ま', 'ミ': 'み', 'ム': 'む', 'メ': 'め', 'モ': 'も',
    'ヤ': 'や', 'ユ': 'ゆ', 'ヨ': 'よ',
    'ラ': 'ら', 'リ': 'り', 'ル': 'る', 'レ': 'れ', 'ロ': 'ろ',
    'ワ': 'わ', 'ヲ': 'を', 'ン': 'ん',
    'ガ': 'が', 'ギ': 'ぎ', 'グ': 'ぐ', 'ゲ': 'げ', 'ゴ': 'ご',
    'ザ': 'ざ', 'ジ': 'じ', 'ズ': 'ず', 'ゼ': 'ぜ', 'ゾ': 'ぞ',
    'ダ': 'だ', 'ヂ': 'ぢ', 'ヅ': 'づ', 'デ': 'で', 'ド': 'ど',
    'バ': 'ば', 'ビ': 'び', 'ブ': 'ぶ', 'ベ': 'べ', 'ボ': 'ぼ',
    'パ': 'ぱ', 'ピ': 'ぴ', 'プ': 'ぷ', 'ペ': 'ぺ', 'ポ': 'ぽ',
    'キャ': 'きゃ', 'キュ': 'きゅ', 'キョ': 'きょ',
    'シャ': 'しゃ', 'シュ': 'しゅ', 'ショ': 'しょ',
    'チャ': 'ちゃ', 'チュ': 'ちゅ', 'チョ': 'ちょ',
    'ニャ': 'にゃ', 'ニュ': 'にゅ', 'ニョ': 'にょ',
    'ヒャ': 'ひゃ', 'ヒュ': 'ひゅ', 'ヒョ': 'ひょ',
    'ミャ': 'みゃ', 'ミュ': 'みゅ', 'ミョ': 'みょ',
    'リャ': 'りゃ', 'リュ': 'りゅ', 'リョ': 'りょ',
    'ギャ': 'ぎゃ', 'ギュ': 'ぎゅ', 'ギョ': 'ぎょ',
    'ジャ': 'じゃ', 'ジュ': 'じゅ', 'ジョ': 'じょ',
    'ビャ': 'びゃ', 'ビュ': 'びゅ', 'ビョ': 'びょ',
    'ピャ': 'ぴゃ', 'ピュ': 'ぴゅ', 'ピョ': 'ぴょ',
    'ー': 'ー', // 長音記号はそのまま
};

/**
 * カタカナをひらがなに変換
 */
function katakanaToHiraganaChar(char: string): string {
    return katakanaToHiragana[char] || char;
}

/**
 * ひらがな1文字をローマ字に変換（拗音対応）
 */
function hiraganaToRomajiChar(text: string, index: number): { romaji: string; length: number } {
    // 小さい「っ」の処理（次の文字の子音を重ねる）
    if (text[index] === 'っ' && index + 1 < text.length) {
        const nextChar = text[index + 1];
        const nextRomaji = hiraganaToRomajiChar(text, index + 1);
        // 次の文字の最初の子音を重ねる
        if (nextRomaji.romaji.length > 0) {
            const firstConsonant = nextRomaji.romaji[0];
            // 子音の場合のみ重ねる
            if (firstConsonant && !['a', 'i', 'u', 'e', 'o'].includes(firstConsonant)) {
                return { romaji: firstConsonant + nextRomaji.romaji, length: 1 + nextRomaji.length };
            }
        }
        return { romaji: 'tsu', length: 1 }; // フォールバック
    }
    
    // 2文字の拗音をチェック
    if (index + 1 < text.length) {
        const twoChar = text.substring(index, index + 2);
        if (hiraganaToRomaji[twoChar]) {
            return { romaji: hiraganaToRomaji[twoChar], length: 2 };
        }
    }
    
    // 1文字の通常音
    const oneChar = text[index];
    if (hiraganaToRomaji[oneChar]) {
        return { romaji: hiraganaToRomaji[oneChar], length: 1 };
    }
    
    // 変換できない文字はそのまま
    return { romaji: oneChar, length: 1 };
}

/**
 * 日本語文字列をローマ字に変換
 */
function convertJapaneseToRomaji(japanese: string): string {
    // 漢字が含まれている場合は変換できない（ひらがな・カタカナのみ対応）
    // 漢字の場合はそのまま返す（または空文字を返す）
    const hasKanji = /[\u4E00-\u9FAF]/.test(japanese);
    if (hasKanji) {
        console.warn(`[Romaji] Kanji detected in "${japanese}" - cannot convert. Consider providing romaji manually.`);
        // 漢字を含む場合は、ひらがな・カタカナ部分のみ変換を試みる
        // または、そのまま返してTTSに任せる
        return japanese; // 一旦そのまま返す
    }
    
    // カタカナをひらがなに変換
    let hiragana = '';
    for (let i = 0; i < japanese.length; i++) {
        hiragana += katakanaToHiraganaChar(japanese[i]);
    }
    
    // ひらがなをローマ字に変換
    let romaji = '';
    let i = 0;
    while (i < hiragana.length) {
        // 長音記号の処理
        if (hiragana[i] === 'ー' && i > 0) {
            // 前の文字の母音を延長
            const prev = romaji[romaji.length - 1];
            if (prev === 'a' || prev === 'i' || prev === 'u' || prev === 'e' || prev === 'o') {
                romaji += prev;
            } else {
                romaji += 'ー';
            }
            i++;
            continue;
        }
        
        const result = hiraganaToRomajiChar(hiragana, i);
        romaji += result.romaji;
        i += result.length;
    }
    
    return romaji;
}

/**
 * 一般的な日本語名のローマ字表記パターン（英語STTで誤認識されやすいもの）
 * 英語STTが日本語名を英語っぽく聞き取った結果を、正しいローマ字読みに修正
 * 
 * 優先順位：-san付き → 名字のみ → 名前のみ
 */
const commonJapaneseNamePatterns: Array<{ pattern: RegExp; replacement: string | ((match: string) => string) }> = [
    // よくある名字パターン（-san付きを先に処理）
    { pattern: /\btanakasan\b/gi, replacement: 'Tanaka-san' },
    { pattern: /\byamadasan\b/gi, replacement: 'Yamada-san' },
    { pattern: /\bsuzukisan\b/gi, replacement: 'Suzuki-san' },
    { pattern: /\bsatousan\b/gi, replacement: 'Sato-san' },
    { pattern: /\bwatanabesan\b/gi, replacement: 'Watanabe-san' },
    { pattern: /\bitosan\b/gi, replacement: 'Ito-san' },
    { pattern: /\bkobayashisan\b/gi, replacement: 'Kobayashi-san' },
    { pattern: /\bkawasakisan\b/gi, replacement: 'Kawasaki-san' },
    { pattern: /\bsaitosan\b/gi, replacement: 'Saito-san' },
    { pattern: /\byamamotosan\b/gi, replacement: 'Yamamoto-san' },
    { pattern: /\bmatsudasan\b/gi, replacement: 'Matsuda-san' },
    { pattern: /\binouesan\b/gi, replacement: 'Inoue-san' },
    { pattern: /\bkimurasan\b/gi, replacement: 'Kimura-san' },
    { pattern: /\bhashimotosan\b/gi, replacement: 'Hashimoto-san' },
    { pattern: /\byoshidasan\b/gi, replacement: 'Yoshida-san' },
    { pattern: /\bishidasan\b/gi, replacement: 'Ishida-san' },
    { pattern: /\bfujisan\b/gi, replacement: 'Fuji-san' },
    { pattern: /\bnakamurasan\b/gi, replacement: 'Nakamura-san' },
    { pattern: /\bokadasan\b/gi, replacement: 'Okada-san' },
    { pattern: /\bgotosan\b/gi, replacement: 'Goto-san' },
    { pattern: /\bhondasan\b/gi, replacement: 'Honda-san' },
    { pattern: /\bmorisan\b/gi, replacement: 'Mori-san' },
    { pattern: /\buedasan\b/gi, replacement: 'Ueda-san' },
    { pattern: /\bogawasan\b/gi, replacement: 'Ogawa-san' },
    { pattern: /\bkondosan\b/gi, replacement: 'Kondo-san' },
    { pattern: /\bishikawasan\b/gi, replacement: 'Ishikawa-san' },
    { pattern: /\bmaedasan\b/gi, replacement: 'Maeda-san' },
    { pattern: /\bfujitasan\b/gi, replacement: 'Fujita-san' },
    { pattern: /\bsakamotosan\b/gi, replacement: 'Sakamoto-san' },
    { pattern: /\bendosan\b/gi, replacement: 'Endo-san' },
    { pattern: /\baokisan\b/gi, replacement: 'Aoki-san' },
    { pattern: /\bfukudasan\b/gi, replacement: 'Fukuda-san' },
    { pattern: /\bnishidasan\b/gi, replacement: 'Nishida-san' },
    { pattern: /\bmiurasan\b/gi, replacement: 'Miura-san' },
    { pattern: /\bfukuisan\b/gi, replacement: 'Fukui-san' },
    { pattern: /\bokamotosan\b/gi, replacement: 'Okamoto-san' },
    { pattern: /\bmatsumotosan\b/gi, replacement: 'Matsumoto-san' },
    { pattern: /\bonoesan\b/gi, replacement: 'Ono-san' },
    { pattern: /\bharasan\b/gi, replacement: 'Hara-san' },
    { pattern: /\bshimizusan\b/gi, replacement: 'Shimizu-san' },
    { pattern: /\byamashitasan\b/gi, replacement: 'Yamashita-san' },
    { pattern: /\bikedasan\b/gi, replacement: 'Ikeda-san' },
    { pattern: /\btsuchiyasan\b/gi, replacement: 'Tsuchiya-san' },
    { pattern: /\buedasan\b/gi, replacement: 'Ueda-san' },
    { pattern: /\bsugiyamasan\b/gi, replacement: 'Sugiyama-san' },
    { pattern: /\bmurakamisan\b/gi, replacement: 'Murakami-san' },
    { pattern: /\bimaisan\b/gi, replacement: 'Imai-san' },
    { pattern: /\btakagisan\b/gi, replacement: 'Takagi-san' },
    { pattern: /\bwatanabesan\b/gi, replacement: 'Watanabe-san' },
    
    // 名字のみ（-sanなし）
    { pattern: /\btanaka\b/gi, replacement: 'Tanaka' },
    { pattern: /\byamada\b/gi, replacement: 'Yamada' },
    { pattern: /\bsuzuki\b/gi, replacement: 'Suzuki' },
    { pattern: /\bsato\b/gi, replacement: 'Sato' },
    { pattern: /\bwatanabe\b/gi, replacement: 'Watanabe' },
    { pattern: /\bito\b/gi, replacement: 'Ito' },
    { pattern: /\bkobayashi\b/gi, replacement: 'Kobayashi' },
    { pattern: /\bkawasaki\b/gi, replacement: 'Kawasaki' },
    { pattern: /\bsaito\b/gi, replacement: 'Saito' },
    { pattern: /\byamamoto\b/gi, replacement: 'Yamamoto' },
    { pattern: /\bmatsuda\b/gi, replacement: 'Matsuda' },
    { pattern: /\binoue\b/gi, replacement: 'Inoue' },
    { pattern: /\bkimura\b/gi, replacement: 'Kimura' },
    { pattern: /\bhashimoto\b/gi, replacement: 'Hashimoto' },
    { pattern: /\byoshida\b/gi, replacement: 'Yoshida' },
    { pattern: /\bishida\b/gi, replacement: 'Ishida' },
    { pattern: /\bfuji\b/gi, replacement: 'Fuji' },
    { pattern: /\bnakamura\b/gi, replacement: 'Nakamura' },
    { pattern: /\bokada\b/gi, replacement: 'Okada' },
    { pattern: /\bgoto\b/gi, replacement: 'Goto' },
    { pattern: /\bhonda\b/gi, replacement: 'Honda' },
    { pattern: /\bmori\b/gi, replacement: 'Mori' },
    { pattern: /\bueda\b/gi, replacement: 'Ueda' },
    { pattern: /\bogawa\b/gi, replacement: 'Ogawa' },
    { pattern: /\bkondo\b/gi, replacement: 'Kondo' },
    { pattern: /\bishikawa\b/gi, replacement: 'Ishikawa' },
    { pattern: /\bmaeda\b/gi, replacement: 'Maeda' },
    { pattern: /\bfujita\b/gi, replacement: 'Fujita' },
    { pattern: /\bsakamoto\b/gi, replacement: 'Sakamoto' },
    { pattern: /\bendo\b/gi, replacement: 'Endo' },
    { pattern: /\baoki\b/gi, replacement: 'Aoki' },
    { pattern: /\bfukuda\b/gi, replacement: 'Fukuda' },
    { pattern: /\bnishida\b/gi, replacement: 'Nishida' },
    { pattern: /\bmiura\b/gi, replacement: 'Miura' },
    { pattern: /\bfukui\b/gi, replacement: 'Fukui' },
    { pattern: /\bokamoto\b/gi, replacement: 'Okamoto' },
    { pattern: /\bmatsumoto\b/gi, replacement: 'Matsumoto' },
    { pattern: /\bono\b/gi, replacement: 'Ono' },
    { pattern: /\bhara\b/gi, replacement: 'Hara' },
    { pattern: /\bshimizu\b/gi, replacement: 'Shimizu' },
    { pattern: /\byamashita\b/gi, replacement: 'Yamashita' },
    { pattern: /\bikeda\b/gi, replacement: 'Ikeda' },
    { pattern: /\btsuchiya\b/gi, replacement: 'Tsuchiya' },
    { pattern: /\bsugiyama\b/gi, replacement: 'Sugiyama' },
    { pattern: /\bmurakami\b/gi, replacement: 'Murakami' },
    { pattern: /\bimai\b/gi, replacement: 'Imai' },
    { pattern: /\btakagi\b/gi, replacement: 'Takagi' },
    
    // よくある名前（個人名）
    { pattern: /\bhiroshisan\b/gi, replacement: 'Hiroshi-san' },
    { pattern: /\bhiroshi\b/gi, replacement: 'Hiroshi' },
    { pattern: /\btakeshisan\b/gi, replacement: 'Takeshi-san' },
    { pattern: /\btakeshi\b/gi, replacement: 'Takeshi' },
    { pattern: /\bkenjisan\b/gi, replacement: 'Kenji-san' },
    { pattern: /\bkenji\b/gi, replacement: 'Kenji' },
    { pattern: /\byukisan\b/gi, replacement: 'Yuki-san' },
    { pattern: /\byuki\b/gi, replacement: 'Yuki' },
    { pattern: /\bakisan\b/gi, replacement: 'Aki-san' },
    { pattern: /\baki\b/gi, replacement: 'Aki' },
    { pattern: /\bsachisan\b/gi, replacement: 'Sachi-san' },
    { pattern: /\bsachi\b/gi, replacement: 'Sachi' },
    { pattern: /\bnaokosan\b/gi, replacement: 'Naoko-san' },
    { pattern: /\bnaoko\b/gi, replacement: 'Naoko' },
    { pattern: /\bemisan\b/gi, replacement: 'Emi-san' },
    { pattern: /\bemi\b/gi, replacement: 'Emi' },
    { pattern: /\bkaorisan\b/gi, replacement: 'Kaori-san' },
    { pattern: /\bkaori\b/gi, replacement: 'Kaori' },
    { pattern: /\bmayusan\b/gi, replacement: 'Mayu-san' },
    { pattern: /\bmayu\b/gi, replacement: 'Mayu' },
    { pattern: /\bsayakasan\b/gi, replacement: 'Sayaka-san' },
    { pattern: /\bsayaka\b/gi, replacement: 'Sayaka' },
    { pattern: /\bryosansan\b/gi, replacement: 'Ryosuke-san' },
    { pattern: /\bryosuke\b/gi, replacement: 'Ryosuke' },
    { pattern: /\bshotasan\b/gi, replacement: 'Shota-san' },
    { pattern: /\bshota\b/gi, replacement: 'Shota' },
    { pattern: /\bdaikisan\b/gi, replacement: 'Daiki-san' },
    { pattern: /\bdaiki\b/gi, replacement: 'Daiki' },
    { pattern: /\byutasan\b/gi, replacement: 'Yuta-san' },
    { pattern: /\byuta\b/gi, replacement: 'Yuta' },
    
    // 一般的なパターン（最後の手段）- より柔軟なマッチング
    // 日本語らしい音韻パターン（子音+母音の繰り返し）で、-sanが付いている場合
    { 
        pattern: /\b([bcdfghjklmnpqrstvwxyz][aeiou]){2,}(san|kun|chan|sama)\b/gi, 
        replacement: (match: string) => {
            // 最後の-sanなどを抽出
            const suffixMatch = match.match(/(san|kun|chan|sama)$/i);
            const suffix = suffixMatch ? suffixMatch[0] : '';
            const name = match.slice(0, -suffix.length);
            // 最初の文字を大文字にして、-sanなどを追加
            const capitalized = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
            return `${capitalized}-${suffix}`;
        }
    },
    // 一般的なパターン（最後の手段）- 単語境界で囲まれた日本語らしい名前
    { 
        pattern: /\b([a-z]{3,})san\b/gi, 
        replacement: (match: string) => {
            // -sanを除去して名前部分を取得
            const name = match.slice(0, -3);
            // 最初の文字を大文字にして、-sanを追加
            const capitalized = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
            return `${capitalized}-san`;
        }
    },
];

/**
 * 英語STTで誤認識された日本語名を正しいローマ字読みに修正
 * 例: "tanakasan" → "Tanaka-san"
 */
function fixMisrecognizedJapaneseNames(text: string): string {
    let result = text;
    
    // 一般的な名前パターンを順番に適用
    for (const { pattern, replacement } of commonJapaneseNamePatterns) {
        if (typeof replacement === 'string') {
            result = result.replace(pattern, replacement);
        } else {
            result = result.replace(pattern, replacement);
        }
    }
    
    return result;
}

/**
 * テキスト内の日本語部分を検出してローマ字に変換
 * 英語テキスト内に日本語が含まれている場合、それをローマ字読みに変換する
 */
export function convertJapaneseNamesInText(text: string): string {
    // まず、英語STTで誤認識された日本語名を修正
    let result = fixMisrecognizedJapaneseNames(text);
    
    // 次に、日本語文字（ひらがな、カタカナ、漢字）を検出してローマ字に変換
    const japaneseRegex = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+/g;
    
    result = result.replace(japaneseRegex, (match) => {
        // 日本語部分をローマ字に変換
        const romaji = convertJapaneseToRomaji(match);
        // NOTE: モバイルでは大量ログがUIフリーズの原因になるため、常時ログは出さない
        if (process.env.NODE_ENV === 'development') {
            // eslint-disable-next-line no-console
            console.debug(`[Romaji] Converting "${match}" → "${romaji}"`);
        }
        // スペースを追加して単語として認識されやすくする
        return ` ${romaji} `;
    }).replace(/\s+/g, ' ').trim(); // 余分なスペースを整理
    
    if (process.env.NODE_ENV === 'development' && result !== text) {
        // eslint-disable-next-line no-console
        console.debug(`[Romaji] Original: "${text.substring(0, 100)}..."`);
        // eslint-disable-next-line no-console
        console.debug(`[Romaji] Converted: "${result.substring(0, 100)}..."`);
    }
    
    return result;
}
