<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\Review;
use App\Services\ReviewService;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class ReviewController extends Controller
{
    protected ReviewService $reviewService;

    public function __construct(ReviewService $reviewService)
    {
        $this->reviewService = $reviewService;
    }

    /**
     * Store a new review.
     */
    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();
        if (!$user || !$user->customer) {
            return back()->withErrors(['error' => 'You must be logged in to submit a review.']);
        }

        $validated = $request->validate([
            'product_id' => ['required', 'exists:products,id'],
            'rating' => ['required', 'integer', 'min:1', 'max:5'],
            'comment' => ['nullable', 'string', 'max:2000'],
        ]);

        $product = Product::findOrFail($validated['product_id']);

        try {
            $review = $this->reviewService->createReview(
                $user->customer,
                $product,
                [
                    'rating' => $validated['rating'],
                    'comment' => $validated['comment'] ?? null,
                ]
            );

            return back()->with('status', 'Review submitted successfully.');
        } catch (\Exception $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    /**
     * Get reviews for a product (API endpoint).
     */
    public function getProductReviews(Request $request, int $productId)
    {
        $product = Product::findOrFail($productId);
        $reviews = $this->reviewService->getProductReviews($product, 20);
        $stats = $this->reviewService->getProductReviewStats($product);

        $user = $request->user();
        $customer = $user && $user->customer ? $user->customer : null;

        return response()->json([
            'reviews' => $reviews->map(function ($review) use ($customer) {
                $reviewCustomer = $review->customer;
                $reviewUser = $reviewCustomer && $reviewCustomer->relationLoaded('users') 
                    ? $reviewCustomer->users->first() 
                    : ($reviewCustomer ? $reviewCustomer->users()->first() : null);
                
                $hasMarkedUseful = $customer ? $this->reviewService->hasCustomerMarkedAsUseful($review, $customer) : false;
                
                return [
                    'id' => $review->id,
                    'rating' => $review->rating,
                    'comment' => $review->comment,
                    'is_verified_purchase' => $review->is_verified_purchase,
                    'useful_count' => $review->useful_count,
                    'has_marked_useful' => $hasMarkedUseful,
                    'created_at' => $review->created_at->format('Y-m-d H:i:s'),
                    'customer_name' => $reviewUser ? ($reviewUser->first_name . ' ' . $reviewUser->last_name) : 'Anonymous',
                ];
            }),
            'stats' => $stats,
        ]);
    }

    /**
     * Mark a review as useful.
     */
    public function markUseful(Request $request, int $reviewId)
    {
        $user = $request->user();
        if (!$user || !$user->customer) {
            return response()->json([
                'success' => false,
                'message' => 'You must be logged in to mark a review as useful.',
            ], 401);
        }

        $review = Review::findOrFail($reviewId);
        $result = $this->reviewService->markReviewAsUseful($review, $user->customer);

        return response()->json($result, $result['success'] ? 200 : 400);
    }

    /**
     * Show customer's reviews page.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        if (!$user || !$user->customer) {
            return redirect()->route('login');
        }

        $reviews = $this->reviewService->getCustomerReviews($user->customer);

        return Inertia::render('reviews/index', [
            'reviews' => $reviews->map(function ($review) {
                return [
                    'id' => $review->id,
                    'rating' => $review->rating,
                    'comment' => $review->comment,
                    'is_verified_purchase' => $review->is_verified_purchase,
                    'useful_count' => $review->useful_count,
                    'created_at' => $review->created_at->format('Y-m-d H:i:s'),
                    'product' => $review->product ? [
                        'id' => $review->product->id,
                        'name' => $review->product->name,
                        'slug' => $review->product->slug,
                        'main_image_url' => $review->product->main_image_url,
                    ] : null,
                ];
            }),
        ]);
    }
}
