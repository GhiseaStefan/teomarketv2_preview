<?php

namespace App\Http\Controllers\Admin;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class UsersController extends Controller
{
    public function index(Request $request): Response
    {
        $search = $request->get('search', '');

        $query = User::with('customer')
            ->where('role', '!=', UserRole::CUSTOMER->value);

        // Apply search
        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        $users = $query->orderBy('id', 'asc')->paginate(50)->appends($request->only(['search']));

        // Format users for frontend
        $formattedUsers = $users->getCollection()->map(function ($user) {
            $roleLabel = match ($user->role?->value) {
                'admin' => 'Admin',
                'manager' => 'Manager',
                default => 'Unknown',
            };

            return [
                'id' => $user->id,
                'name' => trim(($user->first_name ?? '') . ' ' . ($user->last_name ?? '')),
                'email' => $user->email,
                'role' => $user->role?->value ?? 'customer',
                'role_label' => $roleLabel,
                'is_active' => $user->is_active,
                'email_verified_at' => $user->email_verified_at?->format('Y-m-d H:i:s'),
                'email_verified_at_formatted' => $user->email_verified_at?->format('d.m.Y H:i'),
                'created_at' => $user->created_at->format('Y-m-d H:i:s'),
                'created_at_formatted' => $user->created_at->format('d.m.Y H:i'),
                'customer_id' => $user->customer_id,
            ];
        });

        return Inertia::render('admin/users', [
            'users' => $formattedUsers,
            'pagination' => [
                'current_page' => $users->currentPage(),
                'last_page' => $users->lastPage(),
                'per_page' => $users->perPage(),
                'total' => $users->total(),
            ],
            'filters' => [
                'search' => $search,
            ],
        ]);
    }

    public function deactivate(Request $request)
    {
        $request->validate([
            'user_ids' => 'required|array',
            'user_ids.*' => 'required|integer|exists:users,id',
        ]);

        $userIds = $request->input('user_ids');
        $currentUser = $request->user();
        $skippedAdmins = [];
        $skippedSelf = false;

        DB::transaction(function () use ($userIds, $currentUser, &$skippedAdmins, &$skippedSelf) {
            $usersToDeactivate = User::whereIn('id', $userIds)
                ->where('role', '!=', UserRole::CUSTOMER->value)
                ->get();

            foreach ($usersToDeactivate as $user) {
                if ($user->id === $currentUser->id) {
                    $skippedSelf = true;
                    continue;
                }
                if ($user->role === UserRole::ADMIN) {
                    $skippedAdmins[] = $user->email;
                    continue;
                }
                $user->update(['is_active' => false]);
            }
        });

        $message = 'Selected accounts have been deactivated.';
        if ($skippedSelf) {
            $message = 'You cannot deactivate your own account. ' . $message;
        }
        if (!empty($skippedAdmins)) {
            $message .= ' Note: Admin accounts cannot be deactivated.';
        }

        return redirect()->back()->with('success', $message);
    }

    public function activate(Request $request)
    {
        $request->validate([
            'user_ids' => 'required|array',
            'user_ids.*' => 'required|integer|exists:users,id',
        ]);

        $userIds = $request->input('user_ids');

        DB::transaction(function () use ($userIds) {
            $usersToActivate = User::whereIn('id', $userIds)
                ->where('role', '!=', UserRole::CUSTOMER->value)
                ->get();

            foreach ($usersToActivate as $user) {
                $user->update(['is_active' => true]);
            }
        });

        return redirect()->back()->with('success', 'Selected accounts have been activated.');
    }
}
