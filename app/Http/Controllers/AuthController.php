<?php

namespace App\Http\Controllers;

use App\Models\Country;
use App\Models\User;
use App\Services\AnafService;
use App\Services\ViesService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class AuthController extends Controller
{
    /**
     * Check if email is available (unique).
     */
    public function checkEmail(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'email' => ['required', 'email'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'available' => false,
                'message' => 'Invalid email format',
            ], 422);
        }

        $email = $request->input('email');
        $exists = User::where('email', $email)->exists();

        return response()->json([
            'available' => !$exists,
            'message' => $exists ? 'Email already exists' : 'Email is available',
        ]);
    }

    /**
     * Validate CUI via VIES (only validation, no data).
     */
    public function validateCui(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'cui' => ['required', 'string'],
                'country_code' => ['nullable', 'string', 'size:2'],
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'valid' => false,
                    'message' => 'CUI is required',
                ], 422);
            }

            $cui = $request->input('cui');
            $countryCode = $request->input('country_code', 'RO');
            
            $viesService = app(ViesService::class);
            $result = $viesService->validate($cui, $countryCode);

            if ($result['valid']) {
                return response()->json([
                    'valid' => true,
                ]);
            }

            return response()->json([
                'valid' => false,
                'message' => $result['message'] ?? 'CUI is invalid or not found in VIES system',
            ], 422);
        } catch (\Exception $e) {
            // Log the error for debugging
            \App\Services\LoggingService::logError($request, $e, [
                'service' => 'vies',
                'cui' => $request->input('cui'),
                'country_code' => $request->input('country_code', 'RO'),
            ]);

            return response()->json([
                'valid' => false,
                'message' => 'Error validating CUI. Please try again.',
            ], 500);
        }
    }

    /**
     * Get company data from ANAF for Romanian companies only.
     */
    public function getCompanyData(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'cui' => ['required', 'string'],
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'CUI is required',
                ], 422);
            }

            $cui = $request->input('cui');
            
            // Only allow autofill for Romanian companies
            $anafService = app(AnafService::class);
            $companyData = $anafService->getCompanyData($cui);

            if ($companyData) {
                return response()->json([
                    'success' => true,
                    'data' => $companyData,
                ]);
            }

            // Log for debugging
            \App\Services\LoggingService::logBusinessEvent($request, 'anaf.company_not_found', [
                'cui' => $cui,
            ], 'warning');

            return response()->json([
                'success' => false,
                'message' => 'Company data not found in ANAF system',
            ], 404);
        } catch (\Exception $e) {
            // Log the error for debugging
            \App\Services\LoggingService::logError($request, $e, [
                'service' => 'anaf',
                'cui' => $request->input('cui'),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error fetching company data. Please try again.',
            ], 500);
        }
    }
}

