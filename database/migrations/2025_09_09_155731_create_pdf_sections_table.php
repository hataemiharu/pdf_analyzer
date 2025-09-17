<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('pdf_sections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pdf_document_id')->constrained()->onDelete('cascade');
            $table->string('section_type');
            $table->text('content');
            $table->text('summary');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('pdf_sections');
    }
};
