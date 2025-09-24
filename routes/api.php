<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\PDFAnalysisController;

Route::prefix('pdf')->group(function () {
    Route::get('/', [PDFAnalysisController::class, 'index']);
    Route::get('/section-types', [PDFAnalysisController::class, 'getSectionTypes']);
    Route::get('/search', [PDFAnalysisController::class, 'search']);
    Route::post('/section-summary', [PDFAnalysisController::class, 'getSectionSummary']);
    Route::get('/{id}', [PDFAnalysisController::class, 'show']);
    Route::post('/upload', [PDFAnalysisController::class, 'upload']);
    Route::delete('/{id}', [PDFAnalysisController::class, 'destroy']);
});