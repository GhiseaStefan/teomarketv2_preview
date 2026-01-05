<?php

namespace App\Services;

use Exception;
use SoapClient;
use SoapFault;

class ViesService
{
    private const VIES_WSDL = 'http://ec.europa.eu/taxation_customs/vies/checkVatService.wsdl';
    
    private ?SoapClient $client = null;

    /**
     * Get SOAP client instance.
     *
     * @return SoapClient
     * @throws Exception
     */
    private function getClient(): SoapClient
    {
        if ($this->client === null) {
            try {
                $this->client = new SoapClient(self::VIES_WSDL, [
                    'soap_version' => SOAP_1_1,
                    'exceptions' => true,
                    'cache_wsdl' => WSDL_CACHE_BOTH,
                    'connection_timeout' => 10,
                ]);
            } catch (SoapFault $e) {
                throw new Exception('Failed to connect to VIES service: ' . $e->getMessage());
            }
        }

        return $this->client;
    }

    /**
     * Validate VAT number (CUI) via VIES.
     * Only validates existence, does not return company data.
     *
     * @param string $vatNumber VAT number without country code (e.g., "12345678")
     * @param string $countryCode Two-letter country code (default: "RO")
     * @return array Contains 'valid' boolean and optional 'message'
     */
    public function validate(string $vatNumber, string $countryCode = 'RO'): array
    {
        // Clean VAT number (remove spaces, country prefix if present)
        $vatNumber = preg_replace('/[^A-Z0-9]/', '', strtoupper($vatNumber));
        $countryCode = strtoupper($countryCode);

        // Remove country code from VAT number if present
        if (strpos($vatNumber, $countryCode) === 0) {
            $vatNumber = substr($vatNumber, strlen($countryCode));
        }

        try {
            $client = $this->getClient();
            
            $result = $client->checkVat([
                'countryCode' => $countryCode,
                'vatNumber' => $vatNumber,
            ]);

            if (isset($result->valid) && $result->valid) {
                return [
                    'valid' => true,
                ];
            }

            return [
                'valid' => false,
                'message' => 'VAT number is not valid in VIES system',
            ];
        } catch (SoapFault $e) {
            // VIES service errors (e.g., MS_UNAVAILABLE, SERVICE_UNAVAILABLE, TIMEOUT)
            return [
                'valid' => false,
                'message' => 'VIES service is temporarily unavailable. Please try again later.',
                'error_code' => $e->getCode(),
            ];
        } catch (Exception $e) {
            return [
                'valid' => false,
                'message' => 'Error validating VAT number: ' . $e->getMessage(),
            ];
        }
    }
}

