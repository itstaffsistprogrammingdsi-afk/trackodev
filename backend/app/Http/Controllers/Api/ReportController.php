<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Services\ReportService;
use App\Services\PdfReportService;
use Maatwebsite\Excel\Facades\Excel;
use App\Exports\ReportExport;

class ReportController extends Controller
{
    public function __construct(
        private ReportService $reportService,
        private PdfReportService $pdfService
    ) {}

    /**
     * SUMMARY REPORT
     */
    public function index(Request $request)
    {
        $data = $this->reportService->generate(
    $request->start_date,
    $request->end_date,
    $request->user_ids,
    $request->division_ids,
    $request->workspace_ids,
    $request->campaign_ids,
    $request->brand_ids,
    $request->label_ids,
    $request->search
        );

        return response()->json([
            'data' => $data
        ]);
    }

    /**
     * PDF EXPORT
     */
    public function pdf(Request $request)
    {
        $data = $this->reportService->generate(
            $request->start_date,
            $request->end_date,
            $request->user_ids,
            $request->division_ids,
            $request->brand_ids,
            $request->label_ids,
            $request->search
        );

        return $this->pdfService->generate(
            $data,
            $request->start_date,
            $request->end_date
        );
    }

    /**
     * EXCEL EXPORT
     */
    public function excel(Request $request)
    {
        $data = $this->reportService->generate(
    $request->start_date,
    $request->end_date,
    $request->user_ids,
    $request->division_ids,
    $request->workspace_ids,
    $request->campaign_ids,
    $request->brand_ids,
    $request->label_ids,
    $request->search
);

        return Excel::download(
            new ReportExport($data),
            'tracko-report.xlsx'
        );
    }

    /**
     * DETAIL REPORT (FOR PDF & EXCEL DETAIL SHEET)
     */
    public function detail(Request $request)
    {
        $data = $this->reportService->generateDetail(
    $request->start_date,
    $request->end_date,
    $request->user_ids,
    $request->division_ids,
    $request->workspace_ids,
    $request->campaign_ids,
    $request->brand_ids,
    $request->label_ids,
    $request->search
);

        return response()->json([
            'data' => $data
        ]);
    }
}
