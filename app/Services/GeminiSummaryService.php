<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class GeminiSummaryService
{
    private $apiKey;

    public function __construct()
    {
        $this->apiKey = env('GEMINI_API_KEY');
    }

    public function generateSummary($text)
    {
        // 開発環境でOllamaが使える場合
        if (app()->environment('local') && $this->checkOllamaAvailable()) {
            return $this->useOllama($text);
        }

        // Gemini APIを使用
        if ($this->apiKey) {
            return $this->useGemini($text);
        }

        // APIキーがない場合は簡易要約
        return $this->generateBasicSummary($text);
    }

    private function checkOllamaAvailable()
    {
        try {
            $response = Http::timeout(1)->get('http://localhost:11434/api/tags');
            return $response->successful();
        } catch (\Exception $e) {
            return false;
        }
    }

    private function useOllama($text)
    {
        try {
            $response = Http::timeout(30)->post('http://localhost:11434/api/generate', [
                'model' => 'llama3.2:3b',
                'prompt' => $this->createPrompt($text),
                'stream' => false
            ]);

            if ($response->successful()) {
                return $response->json()['response'] ?? $this->generateBasicSummary($text);
            }
        } catch (\Exception $e) {
            Log::warning('Ollama not available, using Gemini: ' . $e->getMessage());
        }

        // Ollamaが使えない場合はGeminiにフォールバック
        return $this->useGemini($text);
    }

    private function useGemini($text)
    {
        if (!$this->apiKey) {
            return $this->generateBasicSummary($text);
        }

        try {
            $url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' . $this->apiKey;

            $response = Http::timeout(30)->post($url, [
                'contents' => [
                    [
                        'parts' => [
                            [
                                'text' => $this->createPrompt(mb_substr($text, 0, 4000))
                            ]
                        ]
                    ]
                ],
                'generationConfig' => [
                    'temperature' => 0.7,
                    'maxOutputTokens' => 1024,
                ]
            ]);

            if ($response->successful()) {
                $result = $response->json();

                if (isset($result['candidates'][0]['content']['parts'][0]['text'])) {
                    return $result['candidates'][0]['content']['parts'][0]['text'];
                }
            } else {
                Log::error('Gemini API error: ' . $response->body());
            }
        } catch (\Exception $e) {
            Log::error('Gemini API exception: ' . $e->getMessage());
        }

        return $this->generateBasicSummary($text);
    }

    private function createPrompt($text)
    {
        return "あなたはSlackの週報を要約する専門家です。以下の形式で要約してください：

■ 今週できたこと・達成できたこと
【1】業務遂行
→ 主な業務の成果や完了したタスクを記載

【2】能力開発
→ 学習や研修、スキル向上に関する内容を記載

【3】生成AI活用
→ AI活用の取り組みや成果を記載

【4】自由アピール
→ その他のアピールポイントを記載

■ 今週できなかったこと・来週以降チャレンジしたいこと
→ 未完了のタスクや今後の課題を記載

■ 業績目標や行動に対する自己評価・所感
→ 全体的な評価や感想を記載

各項目は改行で区切り、内容は簡潔にまとめてください。
該当する内容がない項目は「特になし」と記載してください。

以下のテキストを要約してください：

" . $text;
    }

    private function generateBasicSummary($text)
    {
        $lines = explode("\n", $text);
        $summary = "■ 週報内容（AI要約未実施）\n\n";

        // セクションを抽出
        $sections = [];

        if (preg_match('/【1】.*?業務遂行(.*?)(?=【2】|■|$)/s', $text, $match)) {
            $sections[] = "【1】業務遂行: " . mb_substr(trim($match[1]), 0, 100);
        }

        if (preg_match('/【2】.*?能力開発(.*?)(?=【3】|■|$)/s', $text, $match)) {
            $sections[] = "【2】能力開発: " . mb_substr(trim($match[1]), 0, 100);
        }

        if (!empty($sections)) {
            $summary .= implode("\n\n", $sections);
        } else {
            $excerpt = array_slice($lines, 0, 10);
            $summary .= implode("\n", $excerpt);
        }

        if (count($lines) > 10) {
            $summary .= "\n\n... (全" . count($lines) . "行)";
        }

        return $summary;
    }
}