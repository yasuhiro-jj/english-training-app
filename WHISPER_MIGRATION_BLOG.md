# 🎤 Web Speech APIからWhisper APIへ：音声認識の精度を向上させた移行の記録

**公開日**: 2026年2月3日  
**カテゴリ**: 技術ブログ, 開発日記, AI/機械学習

---

## 📝 はじめに

英語学習アプリを開発している中で、音声認識の精度向上が大きな課題となっていました。当初はブラウザのWeb Speech APIを使用していましたが、ユーザーからのフィードバックや実際の使用を通じて、その限界を感じるようになりました。

今日、OpenAIのWhisper APIへの移行を完了しました。この記事では、なぜ移行を決めたのか、どのような課題があったのか、そしてどのように実装したのかを記録として残したいと思います。

---

## 🔍 移行前の状況：Web Speech APIの課題

### 1. 端末依存の問題

Web Speech APIはブラウザのネイティブ機能を使用するため、**端末やブラウザによって精度が大きく異なる**という問題がありました。

- **Chrome**: 比較的高精度だが、環境によってばらつきがある
- **Safari**: iOSでは精度が低く、特に英語学習には不十分
- **Firefox**: サポートが限定的
- **モバイル端末**: PCと比べて精度が大幅に低下

### 2. 一貫性の欠如

同じユーザーが同じ発音をしても、**ブラウザや端末が変わると認識結果が異なる**という問題がありました。これは英語学習アプリにとって致命的な問題です。ユーザーが「自分の発音が正しいのか、それとも認識エラーなのか」を判断できなくなってしまうからです。

### 3. オフライン依存

Web Speech APIは端末の音声認識エンジンに依存するため、**ネットワーク接続に関係なく動作する**という利点はありましたが、逆に言えば**サーバー側で精度を制御できない**という制約がありました。

### 4. リアルタイム認識の限界

Web Speech APIはリアルタイムで認識結果を返しますが、**途中で認識が切れたり、誤認識がそのまま確定してしまう**という問題がありました。特に長い文章を話す際に、途中で認識が止まってしまうことが頻繁に発生していました。

---

## 💡 移行を決めた理由

### 1. 精度の向上

Whisper APIは、**OpenAIが開発した高精度な音声認識モデル**です。Web Speech APIと比べて、圧倒的に高い精度で音声を文字起こしできます。特に英語学習アプリでは、正確な認識が学習効果に直結するため、これは大きなメリットでした。

### 2. 一貫性の確保

Whisper APIは**クラウドベースのサービス**のため、どの端末からアクセスしても**同じ精度で認識**されます。これにより、ユーザーは自分の発音の正確さを信頼できるようになります。

### 3. サーバー側での制御

Whisper APIを使用することで、**サーバー側で使用量を管理**し、**プランに応じた制限を設ける**ことができます。これにより、無料体験ユーザーには制限を設けつつ、有料プランユーザーには無制限で提供するという、ビジネスモデルに沿った実装が可能になりました。

### 4. 将来の拡張性

Whisper APIは**多言語対応**や**カスタマイズ**の可能性があり、将来的に他の言語の学習にも対応できるという点も魅力的でした。

---

## 🏗️ 実装の経緯

### フェーズ1: 計画と設計（1月30日）

まず、実装計画を立てました。主な要件は以下の通りです：

- **無料体験ユーザー**: Whisper APIを20分まで使用可能
- **有料プランユーザー**: Whisper APIを無制限で使用可能
- **20分超過後**: 自動的に端末STT（Web Speech API）にフォールバック
- **使用量の追跡**: Notionデータベースで使用量を管理

### フェーズ2: バックエンド実装（2月1日〜2日）

#### WhisperServiceの実装

```python
class WhisperService:
    """OpenAI Whisper API統合サービス"""
    
    async def transcribe_audio_with_duration(
        self,
        audio_base64: str,
        duration_seconds: float,
        user_email: str,
        is_trial: bool = False
    ) -> Dict:
        # base64デコード
        audio_bytes = base64.b64decode(audio_base64)
        audio_file = io.BytesIO(audio_bytes)
        audio_file.name = "recording.webm"
        
        # Whisper API呼び出し
        response = await self.client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file,
            language="en"  # 英語に固定
        )
        
        transcript = response.text
        usage_minutes = duration_seconds / 60.0
        
        return {
            "transcript": transcript,
            "duration_seconds": duration_seconds,
            "usage_minutes": usage_minutes,
            "remaining_minutes": None
        }
```

#### UsageServiceの実装

使用量を管理するサービスを実装しました。Notionデータベースに以下のプロパティを追加：

- `Whisper Usage Minutes (This Month)`: 今月の使用分数
- `Whisper Usage Minutes (Total)`: 累計使用分数
- `Last Whisper Usage Date`: 最後に使用した日

#### APIエンドポイントの追加

`/api/whisper/transcribe` エンドポイントを追加し、以下の処理を実装：

1. 使用可能かチェック（無料体験の20分制限など）
2. Whisper API呼び出し
3. 使用量の記録
4. 残り分数の計算と返却

### フェーズ3: フロントエンド実装（2月2日〜3日）

#### MediaRecorder APIの統合

Web Speech APIからWhisper APIへの移行に伴い、**MediaRecorder API**を使用して音声を録音し、サーバーに送信する方式に変更しました。

```typescript
const stopRecordingWithWhisper = async () => {
    // MediaRecorder停止
    if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
        setStatusMsg('文字起こし中...');
    }
    
    // 録音データを処理（onstopイベントを待つ）
    const processRecording = async () => {
        const blob = new Blob(audioChunksRef.current, { 
            type: mediaRecorderRef.current?.mimeType || 'audio/webm' 
        });
        
        const base64Audio = await blobToBase64(blob);
        
        // Whisper API呼び出し
        const result = await api.transcribeWithWhisper(
            base64Audio,
            sessionId,
            durationSeconds
        );
        
        setTranscript(result.transcript);
        onTranscriptChange(result.transcript);
    };
    
    // MediaRecorderのonstopイベントを待つ
    if (mediaRecorderRef.current) {
        mediaRecorderRef.current.onstop = processRecording;
    }
};
```

#### フォールバック機能の実装

Whisper APIが使用できない場合（制限到達、ネットワークエラーなど）は、自動的に端末STT（Web Speech API）に切り替わるように実装しました。

### フェーズ4: スマホ対応の改善（2月3日）

実装後、スマホでの動作確認を行ったところ、いくつかの問題が発見されました。

#### 発見された問題

1. **MediaRecorder APIのサポート確認不足**
   - iOS SafariではMediaRecorderの対応が限定的（iOS 14.3以降）
   - MediaRecorderがサポートされていない場合のチェックが不十分

2. **MIMEタイプの選択が不適切**
   - iOS Safariでは`audio/mp4`や`audio/aac`を優先する必要がある
   - Android Chromeでは`audio/webm`が推奨

3. **エラーハンドリングの不備**
   - MediaRecorder作成時のエラー処理が不十分
   - 録音データが空の場合の処理が不足

#### 実装した修正

```typescript
// MediaRecorderサポート確認
const supportsMediaRecorder = () => {
    return typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported;
};

// スマホ対応のMIMEタイプ選択
const getOptimalMimeType = () => {
    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua);
    const isAndroid = /Android/.test(ua);
    
    if (isIOS) {
        if (MediaRecorder.isTypeSupported('audio/mp4')) return 'audio/mp4';
        if (MediaRecorder.isTypeSupported('audio/aac')) return 'audio/aac';
    } else if (isAndroid) {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) return 'audio/webm;codecs=opus';
        if (MediaRecorder.isTypeSupported('audio/webm')) return 'audio/webm';
    }
    
    // デフォルト
    if (MediaRecorder.isTypeSupported('audio/webm')) return 'audio/webm';
    return 'audio/mp4';
};
```

これらの修正により、スマホでも正常に動作するようになりました。

---

## 📊 実装結果

### テスト結果（2026年2月3日）

すべてのテストが成功しました：

| テスト項目 | ステータス | 詳細 |
|-----------|----------|------|
| Whisper API | ✅ 成功 | API接続とエラーハンドリング正常 |
| WhisperService | ✅ 成功 | サービス初期化と動作確認完了 |
| UsageService | ✅ 成功 | 使用量管理と制限チェック正常 |
| フロントエンド統合 | ✅ 成功 | MediaRecorder統合とAPI呼び出し正常 |
| スマホ対応 | ✅ 成功 | iOS/Androidでの動作確認完了 |

### 実装完了機能

#### バックエンド
- ✅ WhisperService実装完了
- ✅ UsageService実装完了
- ✅ APIルート (`/api/whisper/transcribe`) 実装完了
- ✅ エラーハンドリング実装完了
- ✅ Notionデータベース連携完了

#### フロントエンド
- ✅ MediaRecorder API統合完了
- ✅ Whisper API呼び出し機能実装完了
- ✅ 使用量表示とフォールバック機能実装完了
- ✅ スマホ対応（iOS/Android）完了

---

## 💰 コスト試算

Whisper APIのコストは**$0.006/分**（約0.9円/分）です。

### 無料体験（1人あたり）
- **20分** × **$0.006/分** = **$0.12/人**（約18円/人）

### 有料プラン（標準ユーザー）
- **月200分** × **$0.006/分** = **$1.2/月**（約180円/月）
- **月600分** × **$0.006/分** = **$3.6/月**（約540円/月）

### マージン
- Basic ¥2,980/月 - 180円（Whisper） = **約2,800円のマージン**
- Premium ¥4,980/月 - 540円（Whisper） = **約4,440円のマージン**

コストは十分に回収可能な範囲内です。

---

## 🎯 移行による効果

### 1. 精度の向上

Whisper APIへの移行により、**音声認識の精度が大幅に向上**しました。特に英語学習アプリでは、正確な認識が学習効果に直結するため、これは大きな改善です。

### 2. 一貫性の確保

どの端末からアクセスしても**同じ精度で認識**されるようになりました。これにより、ユーザーは自分の発音の正確さを信頼できるようになりました。

### 3. ビジネスモデルへの対応

サーバー側で使用量を管理できるようになったため、**無料体験ユーザーには制限を設けつつ、有料プランユーザーには無制限で提供**するという、ビジネスモデルに沿った実装が可能になりました。

### 4. 将来の拡張性

Whisper APIは**多言語対応**や**カスタマイズ**の可能性があり、将来的に他の言語の学習にも対応できるようになりました。

---

## 🚀 今後の展望

### 1. 多言語対応

現在は英語に固定していますが、将来的には**他の言語にも対応**できるように拡張する予定です。

### 2. カスタマイズ

Whisper APIの**カスタムモデル**を使用することで、英語学習に特化した認識精度をさらに向上させる可能性があります。

### 3. オフライン対応

将来的には、**Whisperのオンデバイス版**を検討することで、オフラインでも高精度な認識を提供できるかもしれません。

### 4. リアルタイム認識

現在は録音後に文字起こしを行っていますが、将来的には**ストリーミングAPI**を使用してリアルタイムで認識結果を表示することも検討しています。

---

## 📚 学んだこと

### 1. 技術選定の重要性

最初は「無料で使えるWeb Speech APIで十分」と考えていましたが、実際に使ってみると精度の問題が顕在化しました。**技術選定は、コストだけでなく、ユーザー体験やビジネスモデルも考慮する必要がある**ことを学びました。

### 2. 段階的な実装

一度にすべてを実装するのではなく、**段階的に実装し、各フェーズでテストを行う**ことで、問題を早期に発見できました。特にスマホ対応の問題は、実際にテストして初めて発見できたものです。

### 3. フォールバック機能の重要性

Whisper APIが使用できない場合でも、**端末STTに自動的に切り替わる**フォールバック機能を実装したことで、ユーザー体験を損なうことなく移行できました。

### 4. 使用量管理の重要性

サーバー側で使用量を管理することで、**ビジネスモデルに沿った実装**が可能になりました。これは、SaaSアプリを運営する上で重要なポイントです。

---

## 🎉 まとめ

Web Speech APIからWhisper APIへの移行は、**技術的な挑戦**でありながら、**ユーザー体験の向上**と**ビジネスモデルの実現**の両方を達成できた、非常に価値のある取り組みでした。

特に、**スマホ対応の改善**や**フォールバック機能の実装**を通じて、実用的なアプリケーションを開発する上で重要なポイントを学ぶことができました。

今後も、ユーザーのフィードバックを大切にしながら、さらに改善を続けていきたいと思います。

---

**関連リンク**:
- [Whisper実装計画書](./WHISPER_IMPLEMENTATION_PLAN.md)
- [Whisperテスト結果](./WHISPER_TEST_RESULTS.md)
- [スマホ対応改善記録](./MOBILE_WHISPER_FIX.md)

---

**作成日**: 2026年2月3日  
**最終更新**: 2026年2月3日
