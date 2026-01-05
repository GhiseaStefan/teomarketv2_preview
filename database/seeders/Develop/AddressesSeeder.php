<?php

namespace Database\Seeders\Develop;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Addresses Seeder
 * 
 * Dummy/Test Data - Development Only
 * 
 * Seeds customer addresses for development/testing.
 * 
 * Depends on: CustomersSeeder
 */
class AddressesSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $this->command->info('Seeding addresses...');
        $this->seedAddresses();
        $this->command->info('✓ Addresses seeded successfully');
    }

    private function seedAddresses(): void
    {
        $romaniaId = DB::table('countries')->where('iso_code_2', 'RO')->value('id');

        // Get customer IDs by email
        $customerIds = [];
        $emails = [
            'ion.popescu@example.com',
            'maria.ionescu@example.com',
            'contact@techsolutions.ro',
            'andrei.stoica@example.com',
            'elena.constantinescu@example.com',
            'cristian.munteanu@example.com',
            'ana.radu@example.com',
            'mihai.dumitrescu@example.com',
            'diana.nicolae@example.com',
            'office@digitalmarketing.ro',
            'contact@furnitureplus.ro',
            'alexandru.petrescu@example.com',
            'ioana.stefanescu@example.com',
            'bogdan.ionescu@example.com',
        ];

        foreach ($emails as $email) {
            $user = DB::table('users')->where('email', $email)->first();
            if ($user && $user->customer_id) {
                $customerIds[$email] = $user->customer_id;
            }
        }

        $addresses = [
            [
                'customer_id' => $customerIds['ion.popescu@example.com'] ?? null,
                'first_name' => 'Ion',
                'last_name' => 'Popescu',
                'phone' => '0712345678',
                'address_line_1' => 'Strada Victoriei nr. 45',
                'address_line_2' => 'Bloc A1, Scara 2, Ap. 10',
                'city' => 'Bucuresti',
                'county_name' => 'Bucuresti',
                'county_code' => 'B',
                'country_id' => $romaniaId,
                'zip_code' => '010001',
            ],
            [
                'customer_id' => $customerIds['maria.ionescu@example.com'] ?? null,
                'first_name' => 'Maria',
                'last_name' => 'Ionescu',
                'phone' => '0723456789',
                'address_line_1' => 'Bulevardul Unirii nr. 12',
                'address_line_2' => null,
                'city' => 'Cluj-Napoca',
                'county_name' => 'Cluj',
                'county_code' => 'CJ',
                'country_id' => $romaniaId,
                'zip_code' => '400001',
            ],
            [
                'customer_id' => $customerIds['contact@techsolutions.ro'] ?? null,
                'first_name' => 'Alexandru',
                'last_name' => 'Georgescu',
                'phone' => '0734567890',
                'address_line_1' => 'Calea Floreasca nr. 169',
                'address_line_2' => 'Etaj 3',
                'city' => 'Bucuresti',
                'county_name' => 'Bucuresti',
                'county_code' => 'B',
                'country_id' => $romaniaId,
                'zip_code' => '014462',
            ],
            [
                'customer_id' => $customerIds['andrei.stoica@example.com'] ?? null,
                'first_name' => 'Andrei',
                'last_name' => 'Stoica',
                'phone' => '0745678901',
                'address_line_1' => 'Strada Mihai Eminescu nr. 8',
                'address_line_2' => 'Ap. 5',
                'city' => 'Timisoara',
                'county_name' => 'Timis',
                'county_code' => 'TM',
                'country_id' => $romaniaId,
                'zip_code' => '300001',
            ],
            [
                'customer_id' => $customerIds['elena.constantinescu@example.com'] ?? null,
                'first_name' => 'Elena',
                'last_name' => 'Constantinescu',
                'phone' => '0756789012',
                'address_line_1' => 'Bulevardul Independentei nr. 25',
                'address_line_2' => 'Bloc B, Scara 1, Ap. 12',
                'city' => 'Iasi',
                'county_name' => 'Iasi',
                'county_code' => 'IS',
                'country_id' => $romaniaId,
                'zip_code' => '700001',
            ],
            [
                'customer_id' => $customerIds['cristian.munteanu@example.com'] ?? null,
                'first_name' => 'Cristian',
                'last_name' => 'Munteanu',
                'phone' => '0767890123',
                'address_line_1' => 'Strada Republicii nr. 15',
                'address_line_2' => null,
                'city' => 'Brasov',
                'county_name' => 'Brasov',
                'county_code' => 'BV',
                'country_id' => $romaniaId,
                'zip_code' => '500001',
            ],
            [
                'customer_id' => $customerIds['ana.radu@example.com'] ?? null,
                'first_name' => 'Ana',
                'last_name' => 'Radu',
                'phone' => '0778901234',
                'address_line_1' => 'Calea Dorobantilor nr. 72',
                'address_line_2' => 'Ap. 8',
                'city' => 'Bucuresti',
                'county_name' => 'Bucuresti',
                'county_code' => 'B',
                'country_id' => $romaniaId,
                'zip_code' => '010572',
            ],
            [
                'customer_id' => $customerIds['mihai.dumitrescu@example.com'] ?? null,
                'first_name' => 'Mihai',
                'last_name' => 'Dumitrescu',
                'phone' => '0789012345',
                'address_line_1' => 'Strada Gheorghe Doja nr. 30',
                'address_line_2' => 'Bloc C, Ap. 20',
                'city' => 'Constanta',
                'county_name' => 'Constanta',
                'county_code' => 'CT',
                'country_id' => $romaniaId,
                'zip_code' => '900001',
            ],
            [
                'customer_id' => $customerIds['diana.nicolae@example.com'] ?? null,
                'first_name' => 'Diana',
                'last_name' => 'Nicolae',
                'phone' => '0790123456',
                'address_line_1' => 'Bulevardul Eroilor nr. 18',
                'address_line_2' => null,
                'city' => 'Pitesti',
                'county_name' => 'Arges',
                'county_code' => 'AG',
                'country_id' => $romaniaId,
                'zip_code' => '110001',
            ],
            [
                'customer_id' => $customerIds['office@digitalmarketing.ro'] ?? null,
                'first_name' => 'Stefan',
                'last_name' => 'Vasilescu',
                'phone' => '0701234567',
                'address_line_1' => 'Strada Aviatorilor nr. 40',
                'address_line_2' => 'Etaj 2',
                'city' => 'Bucuresti',
                'county_name' => 'Bucuresti',
                'county_code' => 'B',
                'country_id' => $romaniaId,
                'zip_code' => '011853',
            ],
            [
                'customer_id' => $customerIds['contact@furnitureplus.ro'] ?? null,
                'first_name' => 'Radu',
                'last_name' => 'Marinescu',
                'phone' => '0712345679',
                'address_line_1' => 'Calea Mosilor nr. 200',
                'address_line_2' => 'Magazin parter',
                'city' => 'Bucuresti',
                'county_name' => 'Bucuresti',
                'county_code' => 'B',
                'country_id' => $romaniaId,
                'zip_code' => '030000',
            ],
            [
                'customer_id' => $customerIds['alexandru.petrescu@example.com'] ?? null,
                'first_name' => 'Alexandru',
                'last_name' => 'Petrescu',
                'phone' => '0723456780',
                'address_line_1' => 'Strada Stefan cel Mare nr. 5',
                'address_line_2' => 'Ap. 3',
                'city' => 'Suceava',
                'county_name' => 'Suceava',
                'county_code' => 'SV',
                'country_id' => $romaniaId,
                'zip_code' => '720001',
            ],
            [
                'customer_id' => $customerIds['ioana.stefanescu@example.com'] ?? null,
                'first_name' => 'Ioana',
                'last_name' => 'Stefanescu',
                'phone' => '0734567891',
                'address_line_1' => 'Bulevardul Carol I nr. 11',
                'address_line_2' => 'Bloc A, Ap. 7',
                'city' => 'Galati',
                'county_name' => 'Galati',
                'county_code' => 'GL',
                'country_id' => $romaniaId,
                'zip_code' => '800001',
            ],
            [
                'customer_id' => $customerIds['bogdan.ionescu@example.com'] ?? null,
                'first_name' => 'Bogdan',
                'last_name' => 'Ionescu',
                'phone' => '0745678902',
                'address_line_1' => 'Strada Libertatii nr. 22',
                'address_line_2' => null,
                'city' => 'Craiova',
                'county_name' => 'Dolj',
                'county_code' => 'DJ',
                'country_id' => $romaniaId,
                'zip_code' => '200001',
            ],
        ];

        foreach ($addresses as $address) {
            if (!$address['customer_id']) {
                continue; // Skip if customer not found
            }

            DB::table('addresses')->updateOrInsert(
                [
                    'customer_id' => $address['customer_id'],
                    'address_line_1' => $address['address_line_1'],
                    'city' => $address['city'],
                ],
                array_merge($address, [
                    'created_at' => now(),
                    'updated_at' => now(),
                ])
            );
        }
    }
}
