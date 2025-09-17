<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PdfDocument extends Model
{
    use HasFactory;

    protected $fillable = [
        'filename',
        'file_path',
        'slack_date',
        'raw_content',
        'summary'
    ];

    protected $casts = [
        'slack_date' => 'date'
    ];

    public function sections()
    {
        return $this->hasMany(PdfSection::class);
    }
}