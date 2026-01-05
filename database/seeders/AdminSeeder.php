<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Admin Seeder
 * 
 * Production Seeder - Creates admin user
 * 
 * This seeder creates a production admin user with a randomly generated password.
 * The password is displayed in the terminal for security purposes.
 * 
 * Run with: php artisan db:seed --class=AdminSeeder
 */
class AdminSeeder extends Seeder
{
    /**
     * Seed the application's database with admin user.
     */
    public function run(): void
    {
        $this->command->info('🔐 Creating admin user...');

        $email = 'admin@teomarket.ro';

        // Generate a secure random password
        $password = Str::random(16);

        // Check if admin user already exists
        $existingUser = User::where('email', $email)->first();

        if ($existingUser) {
            // Update existing user to ensure it's an admin
            $existingUser->update([
                'role' => UserRole::ADMIN,
                'password' => Hash::make($password),
                'is_active' => true,
            ]);

            $this->command->warn("⚠️  Admin user already exists. Password has been updated.");
        } else {
            // Create new admin user
            User::create([
                'email' => $email,
                'password' => Hash::make($password),
                'first_name' => 'Admin',
                'last_name' => 'User',
                'role' => UserRole::ADMIN,
                'is_active' => true,
                'email_verified_at' => now(),
            ]);

            $this->command->info('✓ Admin user created successfully');
        }

        // Display credentials in terminal
        $this->command->newLine();
        $this->command->line('═══════════════════════════════════════════════════════════');
        $this->command->line('                    ADMIN CREDENTIALS');
        $this->command->line('═══════════════════════════════════════════════════════════');
        $this->command->newLine();
        $this->command->line("📧 Email:    {$email}");
        $this->command->line("🔑 Password: {$password}");
        $this->command->newLine();
        $this->command->warn('⚠️  IMPORTANT: Save this password securely! It will not be shown again.');
        $this->command->newLine();
        $this->command->line('═══════════════════════════════════════════════════════════');
    }
}
