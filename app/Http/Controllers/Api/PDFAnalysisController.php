<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\PDFAnalyzerService;
use App\Models\PdfDocument;
use App\Models\PdfSection;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class PDFAnalysisController extends Controller
{
    private $pdfAnalyzer;
    
    public function __construct(PDFAnalyzerService $pdfAnalyzer)
    {
        $this->pdfAnalyzer = $pdfAnalyzer;
    }
    
    public function index(Request $request)
    {
        $perPage = $request->get('per_page', 5);
        $perPage = min($perPage, 20); // 最大20件まで

        $query = PdfDocument::query();

        // 検索キーワードがある場合
        if ($request->filled('search')) {
            $keyword = $request->get('search');
            $query->where(function($q) use ($keyword) {
                $q->where('raw_content', 'LIKE', "%{$keyword}%")
                  ->orWhere('summary', 'LIKE', "%{$keyword}%")
                  ->orWhere('filename', 'LIKE', "%{$keyword}%");
            });
        }

        $documents = $query->latest('created_at')
            ->select('id', 'filename', 'slack_date', 'summary', 'created_at')
            ->paginate($perPage);

        return response()->json($documents);
    }
    
    public function show($id)
    {
        $document = PdfDocument::findOrFail($id);
        return response()->json($document);
    }
    
    public function upload(Request $request)
    {
        $request->validate([
            'pdf_files' => 'required|array',
            'pdf_files.*' => 'required|mimes:pdf|max:10240'
        ]);
        
        $documents = [];
        
        foreach ($request->file('pdf_files') as $file) {
            try {
                $document = $this->pdfAnalyzer->processAndStore($file);
                $documents[] = $document;
            } catch (\Exception $e) {
                return response()->json([
                    'error' => 'ファイルの処理中にエラーが発生しました: ' . $e->getMessage(),
                    'file' => $file->getClientOriginalName()
                ], 500);
            }
        }
        
        return response()->json([
            'message' => count($documents) . '件のPDFファイルを正常に処理しました',
            'documents' => $documents
        ], 201);
    }
    
    public function search(Request $request)
    {
        $request->validate([
            'q' => 'required|string|min:2'
        ]);
        
        $query = $request->get('q');
        
        $documents = PdfDocument::where('raw_content', 'LIKE', '%' . $query . '%')
            ->orWhere('summary', 'LIKE', '%' . $query . '%')
            ->orWhere('filename', 'LIKE', '%' . $query . '%')
            ->select('id', 'filename', 'slack_date', 'summary')
            ->orderBy('slack_date', 'desc')
            ->paginate(20);
        
        return response()->json($documents);
    }
    
    public function destroy($id)
    {
        $document = PdfDocument::findOrFail($id);
        
        if (Storage::exists($document->file_path)) {
            Storage::delete($document->file_path);
        }
        
        $document->delete();
        
        return response()->json([
            'message' => 'PDFドキュメントを削除しました'
        ]);
    }
    
    public function getSectionTypes()
    {
        return response()->json([
            'types' => [
                ['value' => 'important_decisions', 'label' => '重要な決定事項'],
                ['value' => 'action_items', 'label' => 'アクションアイテム'],
                ['value' => 'discussions', 'label' => '議論内容'],
                ['value' => 'announcements', 'label' => 'お知らせ'],
                ['value' => 'other', 'label' => 'その他']
            ]
        ]);
    }
    
    public function getSectionSummary(Request $request)
    {
        $request->validate([
            'pdf_ids' => 'required|array',
            'pdf_ids.*' => 'integer|exists:pdf_documents,id'
        ]);
        
        $pdfIds = $request->get('pdf_ids');
        
        $documents = PdfDocument::with(['sections' => function($query) {
                $query->select('id', 'pdf_document_id', 'section_type', 'summary');
            }])
            ->whereIn('id', $pdfIds)
            ->select('id', 'filename', 'slack_date')
            ->orderBy('slack_date', 'desc')
            ->get();
            
        $sectionTypes = ['business_execution', 'skill_development', 'ai_utilization', 'self_appeal', 'challenges_next_week', 'self_evaluation'];
        
        $result = [];
        foreach ($documents as $document) {
            $row = [
                'id' => $document->id,
                'date' => $document->slack_date,
                'filename' => $document->filename,
                'sections' => []
            ];
            
            foreach ($sectionTypes as $sectionType) {
                $section = $document->sections?->firstWhere('section_type', $sectionType);
                $row['sections'][$sectionType] = $section?->summary ?? '該当なし';
            }
            
            $result[] = $row;
        }
        
        return response()->json($result);
    }
}