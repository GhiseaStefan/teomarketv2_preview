<?php

namespace App\Console\Commands;

use App\Services\CurrencyService;
use Illuminate\Console\Command;

class UpdateExchangeRates extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'currency:update-rates';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Update exchange rates from BNR (National Bank of Romania) API';

    /**
     * Execute the console command.
     */
    public function handle(CurrencyService $currencyService): int
    {
        $this->info('Fetching exchange rates from BNR...');

        $result = $currencyService->updateExchangeRates();

        if ($result['success']) {
            $this->info($result['message']);
            if (isset($result['date'])) {
                $this->line("Exchange rates date: {$result['date']}");
            }
            if (isset($result['updated_count'])) {
                $this->line("Updated currencies: {$result['updated_count']}");
            }
            return Command::SUCCESS;
        }

        $this->error($result['message']);
        return Command::FAILURE;
    }
}
