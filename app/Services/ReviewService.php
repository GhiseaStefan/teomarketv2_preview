<?php

namespace App\Services;

use App\Models\Review;
use App\Models\Product;
use App\Models\Customer;
use App\Models\Order;
use App\Models\OrderProduct;

class ReviewService
{
    /**
     * Create a new review for a product.
     *
     * @param Customer $customer
     * @param Product $product
     * @param array $data
     * @return Review
     */
    public function createReview(Customer $customer, Product $product, array $data): Review
    {
        // Check if customer already reviewed this product
        $existingReview = Review::where('customer_id', $customer->id)
            ->where('product_id', $product->id)
            ->first();

        if ($existingReview) {
            throw new \Exception('You have already reviewed this product.');
        }

        // Check if this is a verified purchase (customer has ordered this product)
        $isVerifiedPurchase = $this->isVerifiedPurchase($customer, $product);
        $orderId = null;

        if ($isVerifiedPurchase) {
            // Get the most recent order containing this product
            $orderProduct = OrderProduct::whereHas('order', function ($query) use ($customer) {
                $query->where('customer_id', $customer->id);
            })
                ->where('product_id', $product->id)
                ->orderBy('created_at', 'desc')
                ->first();

            if ($orderProduct) {
                $orderId = $orderProduct->order_id;
            }
        }

        $review = Review::create([
            'customer_id' => $customer->id,
            'product_id' => $product->id,
            'order_id' => $orderId,
            'rating' => $data['rating'],
            'comment' => $data['comment'] ?? null,
            'is_verified_purchase' => $isVerifiedPurchase,
            'is_approved' => true, // Auto-approve for now, can be changed to require moderation
        ]);

        return $review;
    }

    /**
     * Check if customer has purchased this product (verified purchase).
     *
     * @param Customer $customer
     * @param Product $product
     * @return bool
     */
    public function isVerifiedPurchase(Customer $customer, Product $product): bool
    {
        return OrderProduct::whereHas('order', function ($query) use ($customer) {
            $query->where('customer_id', $customer->id);
        })
            ->where('product_id', $product->id)
            ->exists();
    }

    /**
     * Get reviews for a product.
     *
     * @param Product $product
     * @param int $limit
     * @return \Illuminate\Database\Eloquent\Collection
     */
    public function getProductReviews(Product $product, int $limit = 10)
    {
        return Review::where('product_id', $product->id)
            ->where('is_approved', true)
            ->with(['customer' => function ($query) {
                $query->with(['users' => function ($query) {
                    $query->select('id', 'customer_id', 'first_name', 'last_name');
                }]);
            }])
            ->with('usefulByCustomers')
            ->orderBy('created_at', 'desc')
            ->limit($limit)
            ->get();
    }

    /**
     * Get review statistics for a product.
     *
     * @param Product $product
     * @return array
     */
    public function getProductReviewStats(Product $product): array
    {
        $reviews = Review::where('product_id', $product->id)
            ->where('is_approved', true)
            ->get();

        $totalReviews = $reviews->count();
        $averageRating = $totalReviews > 0 ? $reviews->avg('rating') : 0;
        $ratingDistribution = [
            5 => $reviews->where('rating', 5)->count(),
            4 => $reviews->where('rating', 4)->count(),
            3 => $reviews->where('rating', 3)->count(),
            2 => $reviews->where('rating', 2)->count(),
            1 => $reviews->where('rating', 1)->count(),
        ];

        return [
            'total_reviews' => $totalReviews,
            'average_rating' => round($averageRating, 1),
            'rating_distribution' => $ratingDistribution,
        ];
    }

    /**
     * Get reviews for a customer.
     *
     * @param Customer $customer
     * @return \Illuminate\Database\Eloquent\Collection
     */
    public function getCustomerReviews(Customer $customer)
    {
        return Review::where('customer_id', $customer->id)
            ->with(['product' => function ($query) {
                $query->select('id', 'name', 'slug', 'main_image_url');
            }])
            ->orderBy('created_at', 'desc')
            ->get();
    }

    /**
     * Get count of reviews for a customer.
     *
     * @param Customer $customer
     * @return int
     */
    public function getCustomerReviewCount(Customer $customer): int
    {
        return Review::where('customer_id', $customer->id)->count();
    }

    /**
     * Get count of useful reviews for a customer (reviews with useful_count > 0).
     *
     * @param Customer $customer
     * @return int
     */
    public function getCustomerUsefulReviewCount(Customer $customer): int
    {
        return Review::where('customer_id', $customer->id)
            ->where('useful_count', '>', 0)
            ->count();
    }

    /**
     * Mark a review as useful by a customer.
     *
     * @param Review $review
     * @param Customer $customer
     * @return array Returns ['success' => bool, 'message' => string, 'useful_count' => int]
     */
    public function markReviewAsUseful(Review $review, Customer $customer): array
    {
        // Check if customer already marked this review as useful
        $alreadyMarked = $review->usefulByCustomers()->where('customer_id', $customer->id)->exists();

        if ($alreadyMarked) {
            return [
                'success' => false,
                'message' => 'You have already marked this review as useful.',
                'useful_count' => $review->useful_count,
            ];
        }

        // Attach customer to review_useful table
        $review->usefulByCustomers()->attach($customer->id);

        // Update useful_count
        $review->increment('useful_count');

        return [
            'success' => true,
            'message' => 'Review marked as useful.',
            'useful_count' => $review->fresh()->useful_count,
        ];
    }

    /**
     * Check if a customer has marked a review as useful.
     *
     * @param Review $review
     * @param Customer|null $customer
     * @return bool
     */
    public function hasCustomerMarkedAsUseful(Review $review, ?Customer $customer): bool
    {
        if (!$customer) {
            return false;
        }

        return $review->usefulByCustomers()->where('customer_id', $customer->id)->exists();
    }
}

