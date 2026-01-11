<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class CategoriesController extends Controller
{
    /**
     * Calculate the level of a category in the hierarchy.
     */
    private function calculateLevel($category): int
    {
        $level = 1;
        $current = $category;

        while ($current && $current->parent_id) {
            if ($current->relationLoaded('parent') && $current->parent) {
                $current = $current->parent;
            } else {
                $current = Category::find($current->parent_id);
            }
            $level++;
        }

        return $level;
    }

    /**
     * Get category IDs at a specific level using recursive query.
     */
    private function getCategoryIdsAtLevel(int $targetLevel): array
    {
        if ($targetLevel <= 1) {
            return Category::whereNull('parent_id')->pluck('id')->toArray();
        }

        // Use recursive approach: start from level 1 and go down
        $currentLevelIds = Category::whereNull('parent_id')->pluck('id')->toArray();

        for ($currentLevel = 2; $currentLevel <= $targetLevel; $currentLevel++) {
            if (empty($currentLevelIds)) {
                break; // No more categories at deeper levels
            }

            $currentLevelIds = Category::whereIn('parent_id', $currentLevelIds)
                ->pluck('id')
                ->toArray();
        }

        return $currentLevelIds;
    }

    /**
     * Display a listing of categories.
     */
    public function index(Request $request): Response
    {
        $search = $request->get('search', '');
        $level = $request->get('level'); // null = all, 1 = level 1, 2 = level 2, etc.

        $query = Category::with([
            'parent',
            'products' => function ($query) {
                $query->select('products.id');
            }
        ])->withCount('products');

        // Filter by level if specified
        if ($level !== null && $level !== '') {
            $level = (int) $level;
            if ($level === 1) {
                // Level 1: categories without parent
                $query->whereNull('parent_id');
            } else {
                // For level > 1, use recursive CTE to find categories at specific depth
                // Build query to find categories at level N
                $categoryIdsAtLevel = $this->getCategoryIdsAtLevel($level);

                if (empty($categoryIdsAtLevel)) {
                    // No categories at this level, return empty result
                    $query->whereRaw('1 = 0');
                } else {
                    $query->whereIn('id', $categoryIdsAtLevel);
                }
            }
        }

        // Apply search
        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('slug', 'like', "%{$search}%")
                    ->orWhereHas('parent', function ($parentQuery) use ($search) {
                        $parentQuery->where('name', 'like', "%{$search}%");
                    });
            });
        }

        $categories = $query->orderBy('created_at', 'desc')->paginate(50)->appends($request->only(['search', 'level']));

        // Calculate max level in the system
        $allCategoriesForLevels = Category::with('parent')->get();
        $maxLevel = 1;
        foreach ($allCategoriesForLevels as $cat) {
            $catLevel = $this->calculateLevel($cat);
            if ($catLevel > $maxLevel) {
                $maxLevel = $catLevel;
            }
        }

        // Format categories for frontend
        $formattedCategories = $categories->getCollection()->map(function ($category) {
            return [
                'id' => $category->id,
                'name' => $category->name,
                'slug' => $category->slug,
                'parent_name' => $category->parent?->name ?? '-',
                'status' => $category->status,
                'products_count' => $category->products_count ?? 0,
                'created_at' => $category->created_at ? $category->created_at->format('d.m.Y') : null,
            ];
        });

        return Inertia::render('admin/categories', [
            'categories' => $formattedCategories,
            'pagination' => [
                'current_page' => $categories->currentPage(),
                'last_page' => $categories->lastPage(),
                'per_page' => $categories->perPage(),
                'total' => $categories->total(),
            ],
            'filters' => [
                'search' => $search,
                'level' => $level,
            ],
            'maxLevel' => $maxLevel,
        ]);
    }

    /**
     * Deactivate selected categories.
     */
    public function deactivate(Request $request)
    {
        $request->validate([
            'category_ids' => 'required|array',
            'category_ids.*' => 'required|integer|exists:categories,id',
        ]);

        $categoryIds = $request->input('category_ids');

        Category::whereIn('id', $categoryIds)->update(['status' => false]);

        return redirect()->back()->with('success', 'Selected categories have been deactivated.');
    }

    /**
     * Activate selected categories.
     */
    public function activate(Request $request)
    {
        $request->validate([
            'category_ids' => 'required|array',
            'category_ids.*' => 'required|integer|exists:categories,id',
        ]);

        $categoryIds = $request->input('category_ids');

        Category::whereIn('id', $categoryIds)->update(['status' => true]);

        return redirect()->back()->with('success', 'Selected categories have been activated.');
    }

    /**
     * Get all descendant category IDs (to prevent circular references).
     */
    private function getDescendantIds(int $categoryId): array
    {
        $descendantIds = [$categoryId];
        $children = Category::where('parent_id', $categoryId)->pluck('id')->toArray();

        foreach ($children as $childId) {
            $descendantIds = array_merge($descendantIds, $this->getDescendantIds($childId));
        }

        return $descendantIds;
    }

    /**
     * Display the specified category.
     */
    public function show(int $id): Response
    {
        $category = Category::with([
            'parent',
            'children' => function ($query) {
                $query->orderBy('name');
            },
            'products' => function ($query) {
                $query->orderBy('name')->limit(20)->with([
                    'brand',
                    'images' => function ($imgQuery) {
                        $imgQuery->orderBy('sort_order')->limit(1);
                    }
                ]);
            }
        ])->withCount(['products', 'children'])->findOrFail($id);

        // Calculate level
        $level = $this->calculateLevel($category);

        // Build breadcrumb path from root to current category
        $breadcrumb = [];
        $current = $category;

        while ($current) {
            array_unshift($breadcrumb, [
                'id' => $current->id,
                'name' => $current->name,
                'slug' => $current->slug,
            ]);

            if ($current->parent_id) {
                if (!$current->relationLoaded('parent') || !$current->parent) {
                    $current = Category::find($current->parent_id);
                } else {
                    $current = $current->parent;
                }
            } else {
                $current = null;
            }
        }

        // Get all categories for parent selection
        // Only show categories from the level above (level - 1)
        // If current category is level 1, show only null parent (top level)
        // If current category is level 2, show only level 1 categories
        // etc.
        $excludedIds = $this->getDescendantIds($category->id);
        $targetParentLevel = $level - 1;

        $availableParentsQuery = Category::whereNotIn('id', $excludedIds);

        if ($targetParentLevel <= 0) {
            // Current category is level 1, so parent must be null (top level)
            $availableParentsQuery->whereNull('parent_id');
        } else {
            // Get all categories and filter by level
            $allCategories = Category::with('parent')->get();
            $categoryIdsAtTargetLevel = [];

            foreach ($allCategories as $cat) {
                $catLevel = $this->calculateLevel($cat);
                if ($catLevel === $targetParentLevel && !in_array($cat->id, $excludedIds)) {
                    $categoryIdsAtTargetLevel[] = $cat->id;
                }
            }

            if (empty($categoryIdsAtTargetLevel)) {
                // No categories at target level, return empty
                $availableParentsQuery->whereRaw('1 = 0');
            } else {
                $availableParentsQuery->whereIn('id', $categoryIdsAtTargetLevel);
            }
        }

        $availableParents = $availableParentsQuery
            ->orderBy('name')
            ->get()
            ->map(function ($cat) {
                return [
                    'id' => $cat->id,
                    'name' => $cat->name,
                ];
            });

        // Format category for frontend
        $formattedCategory = [
            'id' => $category->id,
            'name' => $category->name,
            'slug' => $category->slug,
            'status' => $category->status,
            'image_url' => $category->image_url,
            'parent_id' => $category->parent_id,
            'parent' => $category->parent ? [
                'id' => $category->parent->id,
                'name' => $category->parent->name,
                'slug' => $category->parent->slug,
            ] : null,
            'breadcrumb' => $breadcrumb,
            'children' => $category->children->map(function ($child) {
                return [
                    'id' => $child->id,
                    'name' => $child->name,
                    'slug' => $child->slug,
                    'status' => $child->status,
                    'products_count' => $child->products()->count(),
                ];
            }),
            'products' => $category->products->map(function ($product) {
                $imageUrl = $product->main_image_url;
                if (!$imageUrl && $product->images && $product->images->count() > 0) {
                    $imageUrl = $product->images->first()->image_url;
                }
                
                return [
                    'id' => $product->id,
                    'name' => $product->name,
                    'model' => $product->model,
                    'sku' => $product->sku,
                    'brand_name' => $product->brand?->name ?? 'N/A',
                    'price_ron' => number_format($product->price_ron ?? 0, 2, '.', ''),
                    'stock_quantity' => $product->stock_quantity ?? 0,
                    'status' => $product->status,
                    'image_url' => $imageUrl,
                    'created_at' => $product->created_at ? $product->created_at->format('Y-m-d H:i:s') : null,
                    'created_at_formatted' => $product->created_at ? $product->created_at->format('d.m.Y H:i') : null,
                ];
            }),
            'products_count' => $category->products_count,
            'children_count' => $category->children_count,
            'level' => $level,
            'created_at' => $category->created_at ? $category->created_at->format('d.m.Y H:i') : null,
            'updated_at' => $category->updated_at ? $category->updated_at->format('d.m.Y H:i') : null,
        ];

        return Inertia::render('admin/categories/show', [
            'category' => $formattedCategory,
            'availableParents' => $availableParents,
        ]);
    }

    /**
     * Update the specified category.
     */
    public function update(Request $request, int $id)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['required', 'string', 'max:255', 'unique:categories,slug,' . $id],
            'status' => ['required', 'boolean'],
            'parent_id' => ['nullable', 'integer', 'exists:categories,id'],
            'image_url' => ['nullable', 'string', 'max:2048', 'url'],
        ]);

        $category = Category::findOrFail($id);

        // Prevent circular reference: check if parent_id is a descendant of current category
        if ($validated['parent_id']) {
            $descendantIds = $this->getDescendantIds($category->id);
            if (in_array($validated['parent_id'], $descendantIds)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot set a descendant category as parent (would create circular reference)',
                ], 422);
            }
        }

        // Update category
        $category->name = $validated['name'];
        $category->slug = $validated['slug'];
        $category->status = $validated['status'];
        $category->parent_id = $validated['parent_id'] ?? null;
        $category->image_url = $validated['image_url'] ?? null;
        $category->save();

        return response()->json([
            'success' => true,
            'message' => 'Category updated successfully',
        ]);
    }

    /**
     * Delete the specified category.
     */
    public function destroy(int $id)
    {
        $category = Category::findOrFail($id);

        // Check if category has children
        if ($category->children()->count() > 0) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete category with subcategories',
            ], 422);
        }

        // Check if category has products
        if ($category->products()->count() > 0) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete category with products',
            ], 422);
        }

        $category->delete();

        return response()->json([
            'success' => true,
            'message' => 'Category deleted successfully',
        ]);
    }
}
