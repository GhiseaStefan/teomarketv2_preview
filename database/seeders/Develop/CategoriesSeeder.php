<?php

namespace Database\Seeders\Develop;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Categories Seeder
 * 
 * Dummy/Test Data - Development Only
 * 
 * Seeds categories, category images, and category paths for development/testing.
 * This seeder handles:
 * - Creating category hierarchy (root, subcategories, sub-subcategories)
 * - Assigning images to categories
 * - Building category paths for navigation
 * 
 * Depends on: None (categories are independent)
 */
class CategoriesSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $this->command->info('Seeding categories...');
        $this->seedCategories();
        
        $this->command->info('Seeding category images...');
        $this->seedCategoryImages();
        
        $this->command->info('Seeding category paths...');
        $this->seedCategoryPath();
        
        $this->command->info('✓ Categories seeded successfully');
    }

    private function seedCategories(): void
    {
        // Root categories
        DB::table('categories')->updateOrInsert(
            ['slug' => 'electronice'],
            [
                'parent_id' => null,
                'name' => 'Electronice',
                'slug' => 'electronice',
                'status' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
        $electronicsId = DB::table('categories')->where('slug', 'electronice')->value('id');

        DB::table('categories')->updateOrInsert(
            ['slug' => 'imbracaminte'],
            [
                'parent_id' => null,
                'name' => 'Imbracaminte',
                'slug' => 'imbracaminte',
                'status' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
        $clothingId = DB::table('categories')->where('slug', 'imbracaminte')->value('id');

        DB::table('categories')->updateOrInsert(
            ['slug' => 'casa-gradina'],
            [
                'parent_id' => null,
                'name' => 'Casa & Gradina',
                'slug' => 'casa-gradina',
                'status' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
        $homeGardenId = DB::table('categories')->where('slug', 'casa-gradina')->value('id');

        DB::table('categories')->updateOrInsert(
            ['slug' => 'sport-fitness'],
            [
                'parent_id' => null,
                'name' => 'Sport & Fitness',
                'slug' => 'sport-fitness',
                'status' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
        $sportsId = DB::table('categories')->where('slug', 'sport-fitness')->value('id');

        DB::table('categories')->updateOrInsert(
            ['slug' => 'jocuri-consola'],
            [
                'parent_id' => null,
                'name' => 'Jocuri & Consola',
                'slug' => 'jocuri-consola',
                'status' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
        $gamesId = DB::table('categories')->where('slug', 'jocuri-consola')->value('id');

        DB::table('categories')->updateOrInsert(
            ['slug' => 'carti'],
            [
                'parent_id' => null,
                'name' => 'Carti',
                'slug' => 'carti',
                'status' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
        $booksId = DB::table('categories')->where('slug', 'carti')->value('id');

        DB::table('categories')->updateOrInsert(
            ['slug' => 'cosmetice-ingrijire'],
            [
                'parent_id' => null,
                'name' => 'Cosmetice & Ingrijire',
                'slug' => 'cosmetice-ingrijire',
                'status' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
        $cosmeticsId = DB::table('categories')->where('slug', 'cosmetice-ingrijire')->value('id');

        DB::table('categories')->updateOrInsert(
            ['slug' => 'auto-moto'],
            [
                'parent_id' => null,
                'name' => 'Auto & Moto',
                'slug' => 'auto-moto',
                'status' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
        $autoMotoId = DB::table('categories')->where('slug', 'auto-moto')->value('id');

        DB::table('categories')->updateOrInsert(
            ['slug' => 'bebeli-copii'],
            [
                'parent_id' => null,
                'name' => 'Bebeli & Copii',
                'slug' => 'bebeli-copii',
                'status' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
        $babyKidsId = DB::table('categories')->where('slug', 'bebeli-copii')->value('id');

        DB::table('categories')->updateOrInsert(
            ['slug' => 'hobby-colectionar'],
            [
                'parent_id' => null,
                'name' => 'Hobby & Colectionar',
                'slug' => 'hobby-colectionar',
                'status' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
        $hobbyId = DB::table('categories')->where('slug', 'hobby-colectionar')->value('id');

        // Electronics subcategories
        DB::table('categories')->updateOrInsert(
            ['slug' => 'laptopuri'],
            [
                'parent_id' => $electronicsId,
                'name' => 'Laptopuri',
                'slug' => 'laptopuri',
                'status' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
        $laptopsId = DB::table('categories')->where('slug', 'laptopuri')->value('id');

        DB::table('categories')->updateOrInsert(
            ['slug' => 'telefoane'],
            [
                'parent_id' => $electronicsId,
                'name' => 'Telefoane',
                'slug' => 'telefoane',
                'status' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
        $phonesId = DB::table('categories')->where('slug', 'telefoane')->value('id');

        DB::table('categories')->updateOrInsert(
            ['slug' => 'tablete'],
            [
                'parent_id' => $electronicsId,
                'name' => 'Tablete',
                'slug' => 'tablete',
                'status' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
        $tabletsId = DB::table('categories')->where('slug', 'tablete')->value('id');

        DB::table('categories')->updateOrInsert(
            ['slug' => 'casti-audio'],
            [
                'parent_id' => $electronicsId,
                'name' => 'Casti & Audio',
                'slug' => 'casti-audio',
                'status' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
        $headphonesId = DB::table('categories')->where('slug', 'casti-audio')->value('id');

        DB::table('categories')->updateOrInsert(
            ['slug' => 'smartwatch-uri'],
            [
                'parent_id' => $electronicsId,
                'name' => 'Smartwatch-uri',
                'slug' => 'smartwatch-uri',
                'status' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
        $smartwatchesId = DB::table('categories')->where('slug', 'smartwatch-uri')->value('id');

        DB::table('categories')->updateOrInsert(
            ['slug' => 'camere-foto'],
            [
                'parent_id' => $electronicsId,
                'name' => 'Camere Foto',
                'slug' => 'camere-foto',
                'status' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
        $camerasId = DB::table('categories')->where('slug', 'camere-foto')->value('id');

        // Laptop subcategories
        DB::table('categories')->updateOrInsert(
            ['slug' => 'laptopuri-gaming'],
            [
                'parent_id' => $laptopsId,
                'name' => 'Laptopuri Gaming',
                'slug' => 'laptopuri-gaming',
                'status' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
        $gamingLaptopsId = DB::table('categories')->where('slug', 'laptopuri-gaming')->value('id');

        DB::table('categories')->updateOrInsert(
            ['slug' => 'laptopuri-business'],
            [
                'parent_id' => $laptopsId,
                'name' => 'Laptopuri Business',
                'slug' => 'laptopuri-business',
                'status' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
        $businessLaptopsId = DB::table('categories')->where('slug', 'laptopuri-business')->value('id');

        // Phone subcategories
        DB::table('categories')->updateOrInsert(
            ['slug' => 'smartphone-uri'],
            [
                'parent_id' => $phonesId,
                'name' => 'Smartphone-uri',
                'slug' => 'smartphone-uri',
                'status' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
        $smartphonesId = DB::table('categories')->where('slug', 'smartphone-uri')->value('id');

        DB::table('categories')->updateOrInsert(
            ['slug' => 'accesorii-telefoane'],
            [
                'parent_id' => $phonesId,
                'name' => 'Accesorii Telefoane',
                'slug' => 'accesorii-telefoane',
                'status' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
        $accessoriesPhonesId = DB::table('categories')->where('slug', 'accesorii-telefoane')->value('id');

        // Sub-subcategories for Tablets
        DB::table('categories')->updateOrInsert(
            ['slug' => 'tablete-android'],
            [
                'parent_id' => $tabletsId,
                'name' => 'Tablete Android',
                'slug' => 'tablete-android',
                'status' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
        $tabletsAndroidId = DB::table('categories')->where('slug', 'tablete-android')->value('id');

        DB::table('categories')->updateOrInsert(
            ['slug' => 'tablete-ipad'],
            [
                'parent_id' => $tabletsId,
                'name' => 'Tablete iPad',
                'slug' => 'tablete-ipad',
                'status' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
        $tabletsIpadId = DB::table('categories')->where('slug', 'tablete-ipad')->value('id');

        // Sub-subcategories for Headphones
        DB::table('categories')->updateOrInsert(
            ['slug' => 'casti-wireless'],
            [
                'parent_id' => $headphonesId,
                'name' => 'Casti Wireless',
                'slug' => 'casti-wireless',
                'status' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
        $headphonesWirelessId = DB::table('categories')->where('slug', 'casti-wireless')->value('id');

        DB::table('categories')->updateOrInsert(
            ['slug' => 'casti-cu-fir'],
            [
                'parent_id' => $headphonesId,
                'name' => 'Casti cu Fir',
                'slug' => 'casti-cu-fir',
                'status' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
        $headphonesWiredId = DB::table('categories')->where('slug', 'casti-cu-fir')->value('id');

        // Sub-subcategories for Smartwatches
        DB::table('categories')->updateOrInsert(
            ['slug' => 'smartwatch-apple'],
            [
                'parent_id' => $smartwatchesId,
                'name' => 'Smartwatch Apple',
                'slug' => 'smartwatch-apple',
                'status' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
        $smartwatchesAppleId = DB::table('categories')->where('slug', 'smartwatch-apple')->value('id');

        DB::table('categories')->updateOrInsert(
            ['slug' => 'smartwatch-android'],
            [
                'parent_id' => $smartwatchesId,
                'name' => 'Smartwatch Android',
                'slug' => 'smartwatch-android',
                'status' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
        $smartwatchesAndroidId = DB::table('categories')->where('slug', 'smartwatch-android')->value('id');

        // Sub-subcategories for Cameras
        DB::table('categories')->updateOrInsert(
            ['slug' => 'camere-dslr'],
            [
                'parent_id' => $camerasId,
                'name' => 'Camere DSLR',
                'slug' => 'camere-dslr',
                'status' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
        $camerasDslrId = DB::table('categories')->where('slug', 'camere-dslr')->value('id');

        DB::table('categories')->updateOrInsert(
            ['slug' => 'camere-mirrorless'],
            [
                'parent_id' => $camerasId,
                'name' => 'Camere Mirrorless',
                'slug' => 'camere-mirrorless',
                'status' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
        $camerasMirrorlessId = DB::table('categories')->where('slug', 'camere-mirrorless')->value('id');

        // Clothing subcategories
        DB::table('categories')->updateOrInsert(
            ['slug' => 'barbati'],
            [
                'parent_id' => $clothingId,
                'name' => 'Barbati',
                'slug' => 'barbati',
                'status' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
        $mensClothingId = DB::table('categories')->where('slug', 'barbati')->value('id');

        DB::table('categories')->updateOrInsert(
            ['slug' => 'femei'],
            [
                'parent_id' => $clothingId,
                'name' => 'Femei',
                'slug' => 'femei',
                'status' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
        $womensClothingId = DB::table('categories')->where('slug', 'femei')->value('id');

        DB::table('categories')->updateOrInsert(
            ['slug' => 'copii'],
            [
                'parent_id' => $clothingId,
                'name' => 'Copii',
                'slug' => 'copii',
                'status' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
        $kidsClothingId = DB::table('categories')->where('slug', 'copii')->value('id');

        // Sub-subcategories for Womens Clothing
        DB::table('categories')->updateOrInsert(
            ['slug' => 'rochii-femei'],
            [
                'parent_id' => $womensClothingId,
                'name' => 'Rochii Femei',
                'slug' => 'rochii-femei',
                'status' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
        $womensDressesId = DB::table('categories')->where('slug', 'rochii-femei')->value('id');

        DB::table('categories')->updateOrInsert(
            ['slug' => 'bluze-femei'],
            [
                'parent_id' => $womensClothingId,
                'name' => 'Bluze Femei',
                'slug' => 'bluze-femei',
                'status' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
        $womensBlousesId = DB::table('categories')->where('slug', 'bluze-femei')->value('id');

        // Sub-subcategories for Kids Clothing
        DB::table('categories')->updateOrInsert(
            ['slug' => 'haine-copii'],
            [
                'parent_id' => $kidsClothingId,
                'name' => 'Haine Copii',
                'slug' => 'haine-copii',
                'status' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
        $kidsClothesId = DB::table('categories')->where('slug', 'haine-copii')->value('id');

        DB::table('categories')->updateOrInsert(
            ['slug' => 'incaltaminte-copii'],
            [
                'parent_id' => $kidsClothingId,
                'name' => 'Incaltaminte Copii',
                'slug' => 'incaltaminte-copii',
                'status' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
        $kidsShoesId = DB::table('categories')->where('slug', 'incaltaminte-copii')->value('id');

        // Mens clothing subcategories
        DB::table('categories')->updateOrInsert(
            ['slug' => 'tricouri-barbati'],
            [
                'parent_id' => $mensClothingId,
                'name' => 'Tricouri Barbati',
                'slug' => 'tricouri-barbati',
                'status' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
        $mensTshirtsId = DB::table('categories')->where('slug', 'tricouri-barbati')->value('id');

        DB::table('categories')->updateOrInsert(
            ['slug' => 'jeans-barbati'],
            [
                'parent_id' => $mensClothingId,
                'name' => 'Jeans Barbati',
                'slug' => 'jeans-barbati',
                'status' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
        $mensJeansId = DB::table('categories')->where('slug', 'jeans-barbati')->value('id');

        // Sub-subcategories for Mens T-shirts
        DB::table('categories')->updateOrInsert(
            ['slug' => 'tricouri-maneca-scurta'],
            [
                'parent_id' => $mensTshirtsId,
                'name' => 'Tricouri Maneca Scurta',
                'slug' => 'tricouri-maneca-scurta',
                'status' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
        $mensTshirtsShortSleeveId = DB::table('categories')->where('slug', 'tricouri-maneca-scurta')->value('id');

        DB::table('categories')->updateOrInsert(
            ['slug' => 'tricouri-maneca-lunga'],
            [
                'parent_id' => $mensTshirtsId,
                'name' => 'Tricouri Maneca Lunga',
                'slug' => 'tricouri-maneca-lunga',
                'status' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
        $mensTshirtsLongSleeveId = DB::table('categories')->where('slug', 'tricouri-maneca-lunga')->value('id');

        // Sub-subcategories for Mens Jeans
        DB::table('categories')->updateOrInsert(
            ['slug' => 'jeans-skinny'],
            [
                'parent_id' => $mensJeansId,
                'name' => 'Jeans Skinny',
                'slug' => 'jeans-skinny',
                'status' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
        $mensJeansSkinnyId = DB::table('categories')->where('slug', 'jeans-skinny')->value('id');

        DB::table('categories')->updateOrInsert(
            ['slug' => 'jeans-regular'],
            [
                'parent_id' => $mensJeansId,
                'name' => 'Jeans Regular',
                'slug' => 'jeans-regular',
                'status' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
        $mensJeansRegularId = DB::table('categories')->where('slug', 'jeans-regular')->value('id');

        // Home & Garden subcategories
        DB::table('categories')->updateOrInsert(
            ['slug' => 'mobilier'],
            [
                'parent_id' => $homeGardenId,
                'name' => 'Mobilier',
                'slug' => 'mobilier',
                'status' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
        $furnitureId = DB::table('categories')->where('slug', 'mobilier')->value('id');

        DB::table('categories')->updateOrInsert(
            ['slug' => 'decoratiuni'],
            [
                'parent_id' => $homeGardenId,
                'name' => 'Decoratiuni',
                'slug' => 'decoratiuni',
                'status' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
        $decorationId = DB::table('categories')->where('slug', 'decoratiuni')->value('id');

        DB::table('categories')->updateOrInsert(
            ['slug' => 'bucatarie'],
            [
                'parent_id' => $homeGardenId,
                'name' => 'Bucatarie',
                'slug' => 'bucatarie',
                'status' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
        $kitchenId = DB::table('categories')->where('slug', 'bucatarie')->value('id');

        // Sub-subcategories for Furniture
        DB::table('categories')->updateOrInsert(
            ['slug' => 'scaune'],
            [
                'parent_id' => $furnitureId,
                'name' => 'Scaune',
                'slug' => 'scaune',
                'status' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
        $furnitureChairsId = DB::table('categories')->where('slug', 'scaune')->value('id');

        DB::table('categories')->updateOrInsert(
            ['slug' => 'mese'],
            [
                'parent_id' => $furnitureId,
                'name' => 'Mese',
                'slug' => 'mese',
                'status' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
        $furnitureTablesId = DB::table('categories')->where('slug', 'mese')->value('id');

        // Sub-subcategories for Decoration
        DB::table('categories')->updateOrInsert(
            ['slug' => 'tablouri'],
            [
                'parent_id' => $decorationId,
                'name' => 'Tablouri',
                'slug' => 'tablouri',
                'status' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
        $decorationPaintingsId = DB::table('categories')->where('slug', 'tablouri')->value('id');

        DB::table('categories')->updateOrInsert(
            ['slug' => 'lumanari'],
            [
                'parent_id' => $decorationId,
                'name' => 'Lumanari',
                'slug' => 'lumanari',
                'status' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
        $decorationCandlesId = DB::table('categories')->where('slug', 'lumanari')->value('id');

        // Sub-subcategories for Kitchen
        DB::table('categories')->updateOrInsert(
            ['slug' => 'ustensile-bucatarie'],
            [
                'parent_id' => $kitchenId,
                'name' => 'Ustensile Bucatarie',
                'slug' => 'ustensile-bucatarie',
                'status' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
        $kitchenUtensilsId = DB::table('categories')->where('slug', 'ustensile-bucatarie')->value('id');

        DB::table('categories')->updateOrInsert(
            ['slug' => 'tigari-bucatarie'],
            [
                'parent_id' => $kitchenId,
                'name' => 'Tigari Bucatarie',
                'slug' => 'tigari-bucatarie',
                'status' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
        $kitchenPansId = DB::table('categories')->where('slug', 'tigari-bucatarie')->value('id');

        // Sports subcategories
        DB::table('categories')->updateOrInsert(
            ['slug' => 'fitness'],
            [
                'parent_id' => $sportsId,
                'name' => 'Fitness',
                'slug' => 'fitness',
                'status' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
        $fitnessId = DB::table('categories')->where('slug', 'fitness')->value('id');

        DB::table('categories')->updateOrInsert(
            ['slug' => 'alergare'],
            [
                'parent_id' => $sportsId,
                'name' => 'Alergare',
                'slug' => 'alergare',
                'status' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
        $runningId = DB::table('categories')->where('slug', 'alergare')->value('id');

        // Sub-subcategories for Fitness
        DB::table('categories')->updateOrInsert(
            ['slug' => 'gantere'],
            [
                'parent_id' => $fitnessId,
                'name' => 'Gantere',
                'slug' => 'gantere',
                'status' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
        $fitnessDumbbellsId = DB::table('categories')->where('slug', 'gantere')->value('id');

        DB::table('categories')->updateOrInsert(
            ['slug' => 'benzi-rezistenta'],
            [
                'parent_id' => $fitnessId,
                'name' => 'Benzi Rezistenta',
                'slug' => 'benzi-rezistenta',
                'status' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
        $fitnessBandsId = DB::table('categories')->where('slug', 'benzi-rezistenta')->value('id');

        // Sub-subcategories for Running
        DB::table('categories')->updateOrInsert(
            ['slug' => 'incaltaminte-alergare'],
            [
                'parent_id' => $runningId,
                'name' => 'Incaltaminte Alergare',
                'slug' => 'incaltaminte-alergare',
                'status' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
        $runningShoesId = DB::table('categories')->where('slug', 'incaltaminte-alergare')->value('id');

        DB::table('categories')->updateOrInsert(
            ['slug' => 'echipament-alergare'],
            [
                'parent_id' => $runningId,
                'name' => 'Echipament Alergare',
                'slug' => 'echipament-alergare',
                'status' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
        $runningGearId = DB::table('categories')->where('slug', 'echipament-alergare')->value('id');

        // Games subcategories
        DB::table('categories')->updateOrInsert(
            ['slug' => 'consola'],
            [
                'parent_id' => $gamesId,
                'name' => 'Consola',
                'slug' => 'consola',
                'status' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
        $consolesId = DB::table('categories')->where('slug', 'consola')->value('id');

        DB::table('categories')->updateOrInsert(
            ['slug' => 'jocuri-video'],
            [
                'parent_id' => $gamesId,
                'name' => 'Jocuri Video',
                'slug' => 'jocuri-video',
                'status' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
        $videogamesId = DB::table('categories')->where('slug', 'jocuri-video')->value('id');

        // Sub-subcategories for Consoles
        DB::table('categories')->updateOrInsert(
            ['slug' => 'playstation'],
            [
                'parent_id' => $consolesId,
                'name' => 'PlayStation',
                'slug' => 'playstation',
                'status' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
        $consolesPlaystationId = DB::table('categories')->where('slug', 'playstation')->value('id');

        DB::table('categories')->updateOrInsert(
            ['slug' => 'xbox'],
            [
                'parent_id' => $consolesId,
                'name' => 'Xbox',
                'slug' => 'xbox',
                'status' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
        $consolesXboxId = DB::table('categories')->where('slug', 'xbox')->value('id');

        // Sub-subcategories for Video Games
        DB::table('categories')->updateOrInsert(
            ['slug' => 'jocuri-action'],
            [
                'parent_id' => $videogamesId,
                'name' => 'Jocuri Action',
                'slug' => 'jocuri-action',
                'status' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
        $videogamesActionId = DB::table('categories')->where('slug', 'jocuri-action')->value('id');

        DB::table('categories')->updateOrInsert(
            ['slug' => 'jocuri-sport'],
            [
                'parent_id' => $videogamesId,
                'name' => 'Jocuri Sport',
                'slug' => 'jocuri-sport',
                'status' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
        $videogamesSportsId = DB::table('categories')->where('slug', 'jocuri-sport')->value('id');

        // Books subcategories
        DB::table('categories')->updateOrInsert(
            ['slug' => 'fictiune'],
            [
                'parent_id' => $booksId,
                'name' => 'Fictiune',
                'slug' => 'fictiune',
                'status' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
        $fictionId = DB::table('categories')->where('slug', 'fictiune')->value('id');

        DB::table('categories')->updateOrInsert(
            ['slug' => 'non-fictiune'],
            [
                'parent_id' => $booksId,
                'name' => 'Non-Fictiune',
                'slug' => 'non-fictiune',
                'status' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
        $nonFictionId = DB::table('categories')->where('slug', 'non-fictiune')->value('id');

        // Sub-subcategories for Fiction
        DB::table('categories')->updateOrInsert(
            ['slug' => 'romane'],
            [
                'parent_id' => $fictionId,
                'name' => 'Romane',
                'slug' => 'romane',
                'status' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
        $fictionNovelsId = DB::table('categories')->where('slug', 'romane')->value('id');

        DB::table('categories')->updateOrInsert(
            ['slug' => 'povestiri'],
            [
                'parent_id' => $fictionId,
                'name' => 'Povestiri',
                'slug' => 'povestiri',
                'status' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
        $fictionStoriesId = DB::table('categories')->where('slug', 'povestiri')->value('id');

        // Sub-subcategories for Non-Fiction
        DB::table('categories')->updateOrInsert(
            ['slug' => 'biografii'],
            [
                'parent_id' => $nonFictionId,
                'name' => 'Biografii',
                'slug' => 'biografii',
                'status' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
        $nonFictionBiographiesId = DB::table('categories')->where('slug', 'biografii')->value('id');

        DB::table('categories')->updateOrInsert(
            ['slug' => 'istorie'],
            [
                'parent_id' => $nonFictionId,
                'name' => 'Istorie',
                'slug' => 'istorie',
                'status' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
        $nonFictionHistoryId = DB::table('categories')->where('slug', 'istorie')->value('id');
    }

    private function seedCategoryImages(): void
    {
        // Map of category slugs to image URLs
        $categoryImages = [
            // Electronics subcategories
            'laptopuri' => 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&h=400&fit=crop',
            'telefoane' => 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&h=400&fit=crop',
            'tablete' => 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=400&h=400&fit=crop',
            'casti-audio' => 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop',
            'smartwatch-uri' => 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop',
            'camere-foto' => 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400&h=400&fit=crop',
            'laptopuri-gaming' => 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=400&h=400&fit=crop',
            'laptopuri-business' => 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&h=400&fit=crop',
            'smartphone-uri' => 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&h=400&fit=crop',
            'accesorii-telefoane' => 'https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?w=400&h=400&fit=crop',

            // Clothing subcategories
            'barbati' => 'https://images.unsplash.com/photo-1617137968427-85924c800a22?w=400&h=400&fit=crop',
            'femei' => 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400&h=400&fit=crop',
            'copii' => 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=400&h=400&fit=crop',
            'tricouri-barbati' => 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop',
            'jeans-barbati' => 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&h=400&fit=crop',
            'tricouri-maneca-scurta' => 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop',
            'tricouri-maneca-lunga' => 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=400&h=400&fit=crop',
            'jeans-skinny' => 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&h=400&fit=crop',
            'jeans-regular' => 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=400&h=400&fit=crop',

            // Electronics sub-subcategories
            'tablete-android' => 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=400&h=400&fit=crop',
            'tablete-ipad' => 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=400&h=400&fit=crop',
            'casti-wireless' => 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop',
            'casti-cu-fir' => 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop',
            'smartwatch-apple' => 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop',
            'smartwatch-android' => 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop',
            'camere-dslr' => 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400&h=400&fit=crop',
            'camere-mirrorless' => 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400&h=400&fit=crop',

            // Clothing sub-subcategories
            'rochii-femei' => 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400&h=400&fit=crop',
            'bluze-femei' => 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400&h=400&fit=crop',
            'haine-copii' => 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=400&h=400&fit=crop',
            'incaltaminte-copii' => 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop',

            // Home & Garden sub-subcategories
            'scaune' => 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&h=400&fit=crop',
            'mese' => 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&h=400&fit=crop',
            'tablouri' => 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=400&fit=crop',
            'lumanari' => 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=400&fit=crop',
            'ustensile-bucatarie' => 'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=400&h=400&fit=crop',
            'tigari-bucatarie' => 'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=400&h=400&fit=crop',

            // Sports sub-subcategories
            'gantere' => 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&h=400&fit=crop',
            'benzi-rezistenta' => 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&h=400&fit=crop',
            'incaltaminte-alergare' => 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop',
            'echipament-alergare' => 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop',

            // Games sub-subcategories
            'playstation' => 'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=400&h=400&fit=crop',
            'xbox' => 'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=400&h=400&fit=crop',
            'jocuri-action' => 'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?w=400&h=400&fit=crop',
            'jocuri-sport' => 'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?w=400&h=400&fit=crop',

            // Books sub-subcategories
            'romane' => 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&h=400&fit=crop',
            'povestiri' => 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&h=400&fit=crop',
            'biografii' => 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop',
            'istorie' => 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop',

            // Home & Garden subcategories
            'mobilier' => 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&h=400&fit=crop',
            'decoratiuni' => 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=400&fit=crop',
            'bucatarie' => 'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=400&h=400&fit=crop',

            // Sports subcategories
            'fitness' => 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&h=400&fit=crop',
            'alergare' => 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop',

            // Games subcategories
            'consola' => 'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=400&h=400&fit=crop',
            'jocuri-video' => 'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?w=400&h=400&fit=crop',

            // Books subcategories
            'fictiune' => 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&h=400&fit=crop',
            'non-fictiune' => 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop',
        ];

        // Update categories with images
        foreach ($categoryImages as $slug => $imageUrl) {
            DB::table('categories')
                ->where('slug', $slug)
                ->update([
                    'image_url' => $imageUrl,
                    'updated_at' => now(),
                ]);
        }
    }

    private function seedCategoryPath(): void
    {
        // Clear existing paths first
        DB::table('category_path')->truncate();

        // For each category, create path entries
        $categories = DB::table('categories')->get();

        foreach ($categories as $category) {
            $path = [];
            $currentCategory = $category;

            // Build path from root to current category
            while ($currentCategory) {
                array_unshift($path, $currentCategory->id);
                $parentId = $currentCategory->parent_id;
                $currentCategory = $parentId ? DB::table('categories')->find($parentId) : null;
            }

            // Insert path entries
            foreach ($path as $level => $pathId) {
                DB::table('category_path')->updateOrInsert(
                    [
                        'category_id' => $category->id,
                        'path_id' => $pathId,
                    ],
                    [
                        'level' => $level,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]
                );
            }
        }
    }
}
