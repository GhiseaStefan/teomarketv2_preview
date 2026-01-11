<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\Admin\DashboardService;
use Illuminate\Http\JsonResponse;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    protected DashboardService $dashboardService;

    public function __construct(DashboardService $dashboardService)
    {
        $this->dashboardService = $dashboardService;
    }

    /**
     * Display the admin dashboard.
     */
    public function index(): Response
    {
        // Get initial dashboard stats
        $stats = $this->dashboardService->getDashboardStats();

        return Inertia::render('admin/dashboard', [
            'initialStats' => $stats,
        ]);
    }

    /**
     * Get dashboard statistics (API endpoint).
     */
    public function stats(): JsonResponse
    {
        $stats = $this->dashboardService->getDashboardStats();

        return response()->json($stats);
    }
}
