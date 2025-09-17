<?php

namespace App\Services;

use App\Models\PdfDocument;
use App\Models\PdfSection;
use Smalot\PdfParser\Parser;
use Carbon\Carbon;

class PDFAnalyzerService
{
    private $parser;
    
    public function __construct()
    {
        $this->parser = new Parser();
    }
    
    public function processAndStore($uploadedFile)
    {
        $pdf = $this->parser->parseFile($uploadedFile->path());
        $text = $pdf->getText();
        
        $sections = $this->extractSections($text);

        $summary = $this->generateSummary($text);

        $document = PdfDocument::create([
            'filename' => $uploadedFile->getClientOriginalName(),
            'file_path' => $uploadedFile->store('pdfs'),
            'slack_date' => Carbon::now(),
            'raw_content' => $text,
            'summary' => $summary,
            'sections' => $sections
        ]);
        
        foreach ($sections as $type => $content) {
            if (!empty($content)) {
                PdfSection::create([
                    'pdf_document_id' => $document->id,
                    'section_type' => $type,
                    'content' => $content,
                    'summary' => $this->generateSummary($content)
                ]);
            }
        }
        
        return $document;
    }

    private function extractSections($text)
    {
        $sections = [
            'business_execution' => '',
            'skill_development' => '',
            'ai_utilization' => '',
            'self_appeal' => '',
            'challenges_next_week' => '',
            'self_evaluation' => ''
        ];
        
        // 【1】業務遂行
        if (preg_match('/【1】\s*業務遂行(.*?)(?=【2】|■|$)/s', $text, $matches)) {
            $sections['business_execution'] = trim($matches[1]);
        }
        
        // 【2】能力開発
        if (preg_match('/【2】\s*能力開発(.*?)(?=【3】|■|$)/s', $text, $matches)) {
            $sections['skill_development'] = trim($matches[1]);
        }
        
        // 【3】生成AI活用
        if (preg_match('/【3】\s*生成AI活用(.*?)(?=【4】|■|$)/s', $text, $matches)) {
            $sections['ai_utilization'] = trim($matches[1]);
        }
        
        // 【4】自由アピール
        if (preg_match('/【4】\s*自由アピール(.*?)(?=■|$)/s', $text, $matches)) {
            $sections['self_appeal'] = trim($matches[1]);
        }
        
        // ■ 今週できなかったこと・来週以降チャレンジしたいこと
        if (preg_match('/■\s*今週できなかったこと・来週以降チャレンジしたいこと(.*?)(?=■|$)/s', $text, $matches)) {
            $sections['challenges_next_week'] = trim($matches[1]);
        }
        
        // ■ 業績目標や行動に対する自己評価・所感
        if (preg_match('/■\s*業績目標や行動に対する自己評価・所感(.*?)(?=■|$)/s', $text, $matches)) {
            $sections['self_evaluation'] = trim($matches[1]);
        }
        
        return $sections;
    }
    
    private function generateSummary($text)
    {
        try {
            $prompt = "あなたはSlackの週報を要約する専門家です。以下の形式で要約してください：

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

各項目は改行で区切り、内容は簡潔にまとめてください。該当する内容がない項目は「特になし」と記載してください。

以下のテキストを要約してください：

" . mb_substr($text, 0, 3000);

            $response = $this->callOllamaAPI($prompt);
            
            return $response;
        } catch (\Exception $e) {
            return 'AI要約の生成に失敗しました: ' . $e->getMessage();
        }
    }
    
    private function callOllamaAPI($prompt)
    {
        $url = 'http://localhost:11434/api/generate';
        $data = [
            'model' => 'llama3.2:3b',
            'prompt' => $prompt,
            'stream' => false
        ];

        $options = [
            'http' => [
                'header'  => "Content-type: application/json\r\n",
                'method'  => 'POST',
                'content' => json_encode($data),
                'timeout' => 300
            ],
        ];

        $context  = stream_context_create($options);

        try {
            $result = file_get_contents($url, false, $context);

            if ($result === FALSE) {
                throw new \Exception('Ollama API request failed');
            }
        } catch (\Exception $e) {
            // Ollamaが利用できない場合はデフォルトの要約を返す
            throw new \Exception('Ollama server is not available. Please start Ollama server or use manual summary.');
        }

        $response = json_decode($result, true);
        
        if (!isset($response['response'])) {
            throw new \Exception('Invalid response from Ollama API');
        }

        return $response['response'];
    }
    
}