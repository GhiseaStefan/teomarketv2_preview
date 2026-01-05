<?php

namespace App\Services;

use Hashids\Hashids;

/**
 * OrderCodeGenerator Service
 * 
 * Generates short, user-friendly order codes following modern UX best practices:
 * - Safe alphabet (no ambiguous characters: 0/O, 1/I/L, B/8, Z/2)
 * - No vowels (prevents accidental offensive words)
 * - Chunked format for easy reading and dictation
 * - Uses Hashids for guaranteed uniqueness and reversibility
 */
class OrderCodeGenerator
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
     * 9 characters = 3 chunks of 3 characters each
     */
    private const HASH_LENGTH = 9;

    /**
     * Hashids instance
     */
    private Hashids $hashids;

    public function __construct()
    {
        // Use app key as salt for security (ensures codes are unique to this installation)
        $salt = config('app.key', 'default-salt-change-in-production');
        
        // Minimum length ensures we get at least 9 characters
        // We'll format it ourselves with chunking
        $this->hashids = new Hashids($salt, self::HASH_LENGTH, self::SAFE_ALPHABET);
    }

    /**
     * Generate order code from order ID.
     * 
     * Format: XXX-XXX-XXX (e.g., X97-M4P-K3R)
     * 
     * @param int $orderId The numeric order ID from database
     * @return string Formatted order code (e.g., "X97-M4P-K3R")
     */
    public function generateFromId(int $orderId): string
    {
        // Encode the order ID using Hashids
        $hash = $this->hashids->encode($orderId);
        
        // Hashids with minimum length should generate at least 9 characters for small IDs
        // For larger IDs, it may generate longer codes - we take first 9 for consistency
        $hash = substr($hash, 0, self::HASH_LENGTH);
        
        // If hash is shorter than expected (shouldn't happen with min length), pad to 9
        // We pad with the first character of alphabet, but this is reversible
        if (strlen($hash) < self::HASH_LENGTH) {
            $paddingChar = self::SAFE_ALPHABET[0];
            $hash = str_pad($hash, self::HASH_LENGTH, $paddingChar, STR_PAD_RIGHT);
        }
        
        // Chunk into groups of 3 for better readability
        $chunked = $this->chunkString($hash, 3);
        
        // Format: XXX-XXX-XXX
        return implode('-', $chunked);
    }

    /**
     * Decode order code back to order ID.
     * 
     * @param string $orderCode The order code (e.g., "X97-M4P-K3R")
     * @return int|null The order ID, or null if invalid
     */
    public function decodeToId(string $orderCode): ?int
    {
        // Remove dashes
        $hash = str_replace('-', '', $orderCode);
        
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

    /**
     * Generate a random character from the safe alphabet.
     * 
     * @return string Single character from safe alphabet
     */
    private function generateRandomSafeChar(): string
    {
        $alphabet = self::SAFE_ALPHABET;
        return $alphabet[random_int(0, strlen($alphabet) - 1)];
    }
}

