<?php

namespace App\Services;

use App\Services\LoggingService;
use Exception;
use Pristavu\Anaf\Facades\Anaf;

class AnafService
{
    /**
     * Get company data from ANAF by CUI.
     *
     * @param string $cui Company CUI (without RO prefix)
     * @return array|null Company data if found, null otherwise
     */
    public function getCompanyData(string $cui): ?array
    {
        // Clean CUI (remove spaces and non-numeric characters)
        $cui = preg_replace('/[^0-9]/', '', $cui);
        
        if (empty($cui) || strlen($cui) < 2) {
            return null;
        }

        try {
            $connector = Anaf::taxPayer();
            $response = $connector->vatStatus(cif: (int) $cui);
            
            // Log response for debugging
            if (request()) {
                LoggingService::addContext(request(), [
                    'anaf_response_raw' => [
                        'type' => gettype($response),
                        'is_array' => is_array($response),
                        'is_object' => is_object($response),
                    ],
                ]);
            }
            
            // Handle response structure - vatStatus returns array|object
            // Based on VatStatusRequest::createDtoFromResponse, it should return:
            // ['success' => true/false, 'data' => array]
            
            // Convert to array if object
            if (is_object($response)) {
                $response = (array) $response;
            }
            
            if (!is_array($response)) {
                if (request()) {
                    LoggingService::logBusinessEvent(request(), 'anaf.error', [
                        'error_type' => 'invalid_response_format',
                        'response_type' => gettype($response),
                        'cui' => $cui,
                    ], 'error');
                }
                return null;
            }
            
            // Check if request was successful
            if (isset($response['success']) && $response['success'] === false) {
                $error = $response['error'] ?? 'Unknown error';
                if (request()) {
                    LoggingService::logBusinessEvent(request(), 'anaf.error', [
                        'error_type' => 'request_failed',
                        'error_message' => $error,
                        'cui' => $cui,
                    ], 'error');
                }
                return null;
            }
            
            // Extract data - should be in 'data' key based on VatStatusRequest::createDtoFromResponse
            // The 'data' key contains the company information from found[0]
            $data = $response['data'] ?? null;
            
            // If 'data' key doesn't exist but 'success' exists, try using response directly
            // (might be a different response format)
            if ($data === null && isset($response['success'])) {
                // Remove 'success' key and use rest as data
                unset($response['success']);
                if (!empty($response) && (isset($response['denumire']) || isset($response['cui']))) {
                    $data = $response;
                }
            }
            
            if (empty($data)) {
                if (request()) {
                    LoggingService::logBusinessEvent(request(), 'anaf.error', [
                        'error_type' => 'empty_response_data',
                        'response_keys' => array_keys($response),
                        'cui' => $cui,
                    ], 'error');
                }
                return null;
            }
            
            // Convert to array if it's an object
            if (is_object($data)) {
                $data = (array) $data;
            }
            
            // Log data structure for debugging
            if (request()) {
                LoggingService::addContext(request(), [
                    'anaf_data_extracted' => [
                        'data_keys' => array_keys($data),
                        'has_date_generale' => isset($data['date_generale']),
                    ],
                ]);
            }
            
            // ANAF API v9 returns data in nested structure: data['date_generale'] contains main company info
            $dateGenerale = $data['date_generale'] ?? null;
            
            if (empty($dateGenerale) || !is_array($dateGenerale)) {
                if (request()) {
                    LoggingService::logBusinessEvent(request(), 'anaf.error', [
                        'error_type' => 'missing_date_generale',
                        'data_keys' => array_keys($data),
                        'cui' => $cui,
                    ], 'error');
                }
                return null;
            }
            
            // Extract company information from date_generale
            $companyName = $dateGenerale['denumire'] ?? '';
            $companyCui = $dateGenerale['cui'] ?? $cui;
            $regNumber = $dateGenerale['nrRegCom'] ?? null;
            $address = $dateGenerale['adresa'] ?? '';
            $zipCode = $dateGenerale['codPostal'] ?? '';
            
            if (empty($companyName)) {
                if (request()) {
                    LoggingService::logBusinessEvent(request(), 'anaf.error', [
                        'error_type' => 'missing_company_name',
                        'cui' => $cui,
                    ], 'error');
                }
                return null;
            }
            
            // Try to get more detailed address from adresa_sediu_social if available
            $adresaSediu = $data['adresa_sediu_social'] ?? null;
            $detailedAddress = $address;
            
            if (is_array($adresaSediu) && !empty($adresaSediu)) {
                // Build address from structured data
                $streetParts = [];
                if (!empty($adresaSediu['sdenumire_Strada'])) {
                    $streetParts[] = $adresaSediu['sdenumire_Strada'];
                }
                if (!empty($adresaSediu['snumar_Strada'])) {
                    $streetParts[] = 'Nr. ' . $adresaSediu['snumar_Strada'];
                }
                if (!empty($streetParts)) {
                    $detailedAddress = implode(' ', $streetParts);
                    if (!empty($adresaSediu['sdetalii_Adresa'])) {
                        $detailedAddress .= ', ' . $adresaSediu['sdetalii_Adresa'];
                    }
                }
                
                // Use structured address data if available
                if (!empty($adresaSediu['sdenumire_Localitate'])) {
                    $city = $adresaSediu['sdenumire_Localitate'];
                } else {
                    $city = $this->extractCity($address);
                }
                
                if (!empty($adresaSediu['sdenumire_Judet'])) {
                    $county = $adresaSediu['sdenumire_Judet'];
                } else {
                    $county = $this->extractCounty($address);
                }
                
                if (!empty($adresaSediu['scod_Postal'])) {
                    $zipCode = $adresaSediu['scod_Postal'];
                }
            } else {
                // Fallback to parsing from address string
                $city = $this->extractCity($address);
                $county = $this->extractCounty($address);
                if (empty($zipCode)) {
                    $zipCode = $this->extractZipCode($address);
                }
            }

            // Extract county code from adresa_sediu_social for matching with State dropdown
            $countyCode = null;
            if (is_array($adresaSediu) && !empty($adresaSediu['scod_JudetAuto'])) {
                $countyCode = strtoupper($adresaSediu['scod_JudetAuto']);
            }

            return [
                'name' => $this->sanitizeName($companyName),
                'cui' => $companyCui,
                'reg_number' => $regNumber,
                'address' => $this->sanitizeAddress($detailedAddress),
                'city' => $this->sanitizeName($city),
                'county' => $this->sanitizeName($county),
                'county_code' => $countyCode,
                'zip_code' => $zipCode,
            ];
        } catch (Exception $e) {
            // Log full error for debugging
            if (request()) {
                LoggingService::logError(request(), $e, [
                    'service' => 'anaf',
                    'cui' => $cui,
                ]);
            }
            return null;
        }
    }

    /**
     * Sanitize company name - remove diacritics for Romanian.
     *
     * @param string $name
     * @return string
     */
    private function sanitizeName(string $name): string
    {
        $name = trim($name);
        
        // Remove diacritics (Romanian rule: no diacritics)
        $name = str_replace(
            ['ă', 'â', 'î', 'ș', 'ț', 'Ă', 'Â', 'Î', 'Ș', 'Ț'],
            ['a', 'a', 'i', 's', 't', 'A', 'A', 'I', 'S', 'T'],
            $name
        );

        return $name;
    }

    /**
     * Sanitize address - remove diacritics for Romanian.
     *
     * @param string $address
     * @return string
     */
    private function sanitizeAddress(string $address): string
    {
        $address = trim($address);
        
        // Remove diacritics (Romanian rule: no diacritics)
        $address = str_replace(
            ['ă', 'â', 'î', 'ș', 'ț', 'Ă', 'Â', 'Î', 'Ș', 'Ț'],
            ['a', 'a', 'i', 's', 't', 'A', 'A', 'I', 'S', 'T'],
            $address
        );

        return $address;
    }

    /**
     * Extract city from address string.
     *
     * @param string $address
     * @return string
     */
    private function extractCity(string $address): string
    {
        // Simple extraction - usually city is before county
        // This is a basic implementation, may need refinement
        $parts = array_filter(array_map('trim', explode(',', $address)));
        
        if (count($parts) >= 2) {
            // Usually format: "street, city, county, zip"
            return $parts[count($parts) - 2] ?? '';
        }
        
        return '';
    }

    /**
     * Extract county from address string.
     *
     * @param string $address
     * @return string
     */
    private function extractCounty(string $address): string
    {
        // Simple extraction - usually county is before zip code
        // This is a basic implementation, may need refinement
        $parts = array_filter(array_map('trim', explode(',', $address)));
        
        if (count($parts) >= 1) {
            // Usually last part before zip
            return $parts[count($parts) - 1] ?? '';
        }
        
        return '';
    }

    /**
     * Extract ZIP code from address string.
     *
     * @param string $address
     * @return string
     */
    private function extractZipCode(string $address): string
    {
        // Extract 6-digit postal code (Romanian format)
        if (preg_match('/\b([0-9]{6})\b/', $address, $matches)) {
            return $matches[1];
        }
        
        return '';
    }
}

