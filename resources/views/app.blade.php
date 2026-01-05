<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">

    <title inertia>{{ config('app.name', 'Teomarket') }}</title>

    @php
        $isAdminRoute = request()->is('admin*') || request()->routeIs('admin.*');
        $faviconPrefix = $isAdminRoute ? 'favicon-admin' : 'favicon';
        $appleTouchIcon = $isAdminRoute ? 'apple-touch-icon-admin.png' : 'apple-touch-icon.png';
    @endphp

    <!-- Favicons -->
    <link rel="icon" type="image/png" sizes="16x16" href="/{{ $faviconPrefix }}-16x16.png">
    <link rel="icon" type="image/png" sizes="32x32" href="/{{ $faviconPrefix }}-32x32.png">
    <link rel="icon" type="image/png" sizes="48x48" href="/{{ $faviconPrefix }}-48x48.png">
    <link rel="icon" type="image/png" sizes="96x96" href="/{{ $faviconPrefix }}-96x96.png">
    <link rel="icon" type="image/png" sizes="192x192" href="/{{ $faviconPrefix }}-192x192.png">
    <link rel="icon" type="image/png" sizes="512x512" href="/{{ $faviconPrefix }}-512x512.png">
    <link rel="icon" href="/{{ $faviconPrefix }}.ico" sizes="any">
    @if (!$isAdminRoute)
        <link rel="icon" href="/favicon.svg" type="image/svg+xml">
    @endif
    <link rel="apple-touch-icon" sizes="180x180" href="/{{ $appleTouchIcon }}">

    <!-- Web App Manifest -->
    <link rel="manifest" href="/site.webmanifest">

    <!-- Theme Color -->
    <meta name="theme-color" content="{{ $isAdminRoute ? '#4682FF' : '#ffffff' }}">

    <link rel="preconnect" href="https://fonts.bunny.net">
    <link href="https://fonts.bunny.net/css?family=instrument-sans:400,500,600" rel="stylesheet" />

    @viteReactRefresh
    @vite(['resources/css/app.css', 'resources/js/app.tsx'])
    @inertiaHead
</head>

<body class="font-sans antialiased">
    @inertia
</body>

</html>
