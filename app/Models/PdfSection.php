<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PdfSection extends Model
{
    use HasFactory;

    protected $fillable = [
        'pdf_document_id',
        'section_type',
        'content',
        'summary'
    ];

    public function pdfDocument()
    {
        return $this->belongsTo(PdfDocument::class);
    }
}