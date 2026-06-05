<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

use App\Services\Reports\TaskReportService;
use App\Services\Reports\MemberPerformanceReportService;
use App\Services\Reports\DivisionPerformanceReportService;
use App\Services\Reports\ProductivityReportService;
use App\Services\Reports\FormReportService;

class ReportController extends Controller
{
    protected $taskReport;
    protected $memberReport;
    protected $divisionReport;
    protected $productivityReport;
    protected $formReport;

    public function __construct(
        TaskReportService $taskReport,
        MemberPerformanceReportService $memberReport,
        DivisionPerformanceReportService $divisionReport,
        ProductivityReportService $productivityReport,
        FormReportService $formReport
    ) {
        $this->taskReport = $taskReport;
        $this->memberReport = $memberReport;
        $this->divisionReport = $divisionReport;
        $this->productivityReport = $productivityReport;
        $this->formReport = $formReport;
    }

    /**
     * TASK REPORT
     */
    public function tasks(Request $request)
    {
        return response()->json(
            $this->taskReport->taskReport($request->all())
        );
    }

    /**
     * MEMBER REPORT
     */
    public function members(Request $request)
    {
        return response()->json(
            $this->memberReport->memberReport($request->all())
        );
    }

    /**
     * DIVISION REPORT
     */
    public function divisions(Request $request)
    {
        return response()->json(
            $this->divisionReport->divisionReport($request->all())
        );
    }

    /**
     * PRODUCTIVITY REPORT
     */
    public function productivity(Request $request)
    {
        return response()->json(
            $this->productivityReport->productivityReport($request->all())
        );
    }

    /**
     * FORM REPORT
     */
    public function forms(Request $request)
    {
        return response()->json(
            $this->formReport->formReport($request->all())
        );
    }
}