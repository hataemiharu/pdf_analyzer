<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 古いセクション名を新しいセクション名にマッピング
        $sectionMapping = [
            'important_decisions' => 'business_execution',
            'action_items' => 'skill_development',
            'discussions' => 'ai_utilization',
            'announcements' => 'self_appeal',
            'other' => 'challenges_next_week',
            // 既存の新しいセクション名はそのまま保持
            'business_execution' => 'business_execution',
            'skill_development' => 'skill_development',
            'ai_utilization' => 'ai_utilization',
            'self_appeal' => 'self_appeal',
            'challenges_next_week' => 'challenges_next_week',
            'self_evaluation' => 'self_evaluation'
        ];

        foreach ($sectionMapping as $oldType => $newType) {
            DB::table('pdf_sections')
                ->where('section_type', $oldType)
                ->update(['section_type' => $newType]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // ロールバック用のマッピング
        $reverseSectionMapping = [
            'business_execution' => 'important_decisions',
            'skill_development' => 'action_items',
            'ai_utilization' => 'discussions',
            'self_appeal' => 'announcements',
            'challenges_next_week' => 'other'
        ];

        foreach ($reverseSectionMapping as $newType => $oldType) {
            DB::table('pdf_sections')
                ->where('section_type', $newType)
                ->update(['section_type' => $oldType]);
        }
    }
};
