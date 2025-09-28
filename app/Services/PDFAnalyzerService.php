<?php

namespace App\Services;

use App\Models\PdfDocument;
use App\Models\PdfSection;
use Smalot\PdfParser\Parser;
use Carbon\Carbon;
use App\Services\GeminiSummaryService;

class PDFAnalyzerService
{
    private $parser;
    private $summaryService;
    
    public function __construct()
    {
        $this->parser = new Parser();
        $this->summaryService = new GeminiSummaryService();
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
        return $this->summaryService->generateSummary($text);
    }
    
}