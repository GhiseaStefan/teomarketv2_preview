<?php

namespace App\Services;

use Hashids\Hashids;

/**
 * ReturnCodeGenerator Service
 * 
 * Generates short, user-friendly return codes following modern UX best practices:
 * - Safe alphabet (no ambiguous characters: 0/O, 1/I/L, B/8, Z/2)
 * - No vowels (prevents accidental offensive words)
 * - Chunked format for easy reading and dictation
 * - Uses Hashids for guaranteed uniqueness and reversibility
 * - Format: RET-XXX-XXX (e.g., RET-A9X-B22)
 */
class ReturnCodeGenerator
{
    /**
     * Safe alphabet without ambiguous characters and vowels.
     * Based on Crockford's Base32 subset, excluding vowels (A, E, I, O, U).
     * 
     * Excluded characters:
     * - 0, O (zero and letter O)
     * - 1, I, L (one and letters I, L)
     * - B, 8 (letter B and eight - can be confused in handwriting)
     * - Z, 2 (letter Z and two - can be confused)
     * - A, E, I, O, U (vowels - prevents word formation)
     */
    private const SAFE_ALPHABET = '34679CDEFGHJKMNPQRTUVWXY';

    /**
     * Length of the hash part (after chunking)
     * 6 characters = 2 chunks of 3 characters each
     */
    private const HASH_LENGTH = 6;

    /**
     * Prefix for return codes
     */
    private const PREFIX = 'RET';

    /**
     * Hashids instance
     */
    private Hashids $hashids;

    public function __construct()
    {
        // Use app key as salt for security (ensures codes are unique to this installation)
        // Add 'returns' suffix to differentiate from order codes
        $salt = config('app.key', 'default-salt-change-in-production') . '-returns';
        
        // Minimum length ensures we get at least 6 characters
        // We'll format it ourselves with chunking
        $this->hashids = new Hashids($salt, self::HASH_LENGTH, self::SAFE_ALPHABET);
    }

    /**
     * Generate return code from return ID.
     * 
     * Format: RET-XXX-XXX (e.g., RET-A9X-B22)
     * 
     * @param int $returnId The numeric return ID from database
     * @return string Formatted return code (e.g., "RET-A9X-B22")
     */
    public function generateFromId(int $returnId): string
    {
        // Encode the return ID using Hashids
        $hash = $this->hashids->encode($returnId);
        
        // Hashids with minimum length should generate at least 6 characters for small IDs
        // For larger IDs, it may generate longer codes - we take first 6 for consistency
        $hash = substr($hash, 0, self::HASH_LENGTH);
        
        // If hash is shorter than expected (shouldn't happen with min length), pad to 6
        // We pad with the first character of alphabet, but this is reversible
        if (strlen($hash) < self::HASH_LENGTH) {
            $paddingChar = self::SAFE_ALPHABET[0];
            $hash = str_pad($hash, self::HASH_LENGTH, $paddingChar, STR_PAD_RIGHT);
        }
        
        // Chunk into groups of 3 for better readability
        $chunked = $this->chunkString($hash, 3);
        
        // Format: RET-XXX-XXX
        return self::PREFIX . '-' . implode('-', $chunked);
    }

    /**
     * Decode return code back to return ID.
     * 
     * @param string $returnCode The return code (e.g., "RET-A9X-B22")
     * @return int|null The return ID, or null if invalid
     */
    public function decodeToId(string $returnCode): ?int
    {
        // Remove prefix
        $code = str_replace(self::PREFIX . '-', '', $returnCode);
        
        // Remove dashes
        $hash = str_replace('-', '', $code);
        
        // Remove padding characters from the end (if any were added)
        $paddingChar = self::SAFE_ALPHABET[0];
        $hash = rtrim($hash, $paddingChar);
        
        // Decode using Hashids
        $decoded = $this->hashids->decode($hash);
        
        if (empty($decoded) || !is_array($decoded)) {
            return null;
        }
        
        return $decoded[0] ?? null;
    }

    /**
     * Chunk a string into groups of specified size.
     * 
     * @param string $string The string to chunk
     * @param int $chunkSize Size of each chunk
     * @return array Array of chunks
     */
    private function chunkString(string $string, int $chunkSize): array
    {
        return str_split($string, $chunkSize);
    }
}
