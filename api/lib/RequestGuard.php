<?php

declare(strict_types=1);

final class RequestGuard
{
    private array $config;

    public function __construct(array $config)
    {
        $this->config = $config;
    }

    public function enforcePostOnly(): void
    {
        if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
            $this->jsonError('Method not allowed.', 405);
        }
    }

    public function enforceOrigin(): void
    {
        $allowed = $this->config['allowed_origins'] ?? [];
        if ($allowed === []) {
            return;
        }

        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
        if ($origin !== '' && in_array($origin, $allowed, true)) {
            return;
        }

        $referer = $_SERVER['HTTP_REFERER'] ?? '';
        if ($referer !== '') {
            $refererHost = parse_url($referer, PHP_URL_SCHEME) . '://' . parse_url($referer, PHP_URL_HOST);
            $refererPort = parse_url($referer, PHP_URL_PORT);
            if ($refererPort) {
                $refererHost .= ':' . $refererPort;
            }
            if (in_array($refererHost, $allowed, true)) {
                return;
            }
        }

        $this->jsonError('Request not allowed.', 403);
    }

    public function applyCorsHeaders(): void
    {
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
        $allowed = $this->config['allowed_origins'] ?? [];

        if ($origin !== '' && in_array($origin, $allowed, true)) {
            header('Access-Control-Allow-Origin: ' . $origin);
            header('Vary: Origin');
        }

        header('Access-Control-Allow-Methods: POST, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Accept');
    }

    public function handlePreflight(): void
    {
        if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
            http_response_code(204);
            exit;
        }
    }

    public function enforceRateLimit(): void
    {
        $max = (int) ($this->config['rate_limit_max'] ?? 5);
        $window = (int) ($this->config['rate_limit_window'] ?? 3600);
        $ip = $this->clientIp();
        $key = hash('sha256', $ip);
        $dir = dirname(__DIR__) . '/storage/rate-limits';
        $file = $dir . '/' . $key . '.json';

        if (!is_dir($dir)) {
            mkdir($dir, 0750, true);
        }

        $now = time();
        $data = ['count' => 0, 'reset_at' => $now + $window];

        if (is_file($file)) {
            $raw = file_get_contents($file);
            $decoded = json_decode($raw ?: '', true);
            if (is_array($decoded)) {
                $data = $decoded;
            }
        }

        if (($data['reset_at'] ?? 0) <= $now) {
            $data = ['count' => 0, 'reset_at' => $now + $window];
        }

        if (($data['count'] ?? 0) >= $max) {
            $this->jsonError('Too many requests. Please try again later.', 429);
        }

        $data['count'] = (int) ($data['count'] ?? 0) + 1;
        file_put_contents($file, json_encode($data), LOCK_EX);
    }

    public function readJsonBody(): array
    {
        $contentType = $_SERVER['CONTENT_TYPE'] ?? $_SERVER['HTTP_CONTENT_TYPE'] ?? '';
        if (stripos($contentType, 'application/json') === false) {
            $this->jsonError('Invalid content type.', 415);
        }

        $raw = file_get_contents('php://input');
        if ($raw === false || trim($raw) === '') {
            $this->jsonError('Empty request body.', 400);
        }

        $data = json_decode($raw, true);
        if (!is_array($data)) {
            $this->jsonError('Invalid JSON payload.', 400);
        }

        return $data;
    }

    public function isHoneypotTriggered(array $data): bool
    {
        $honeypot = trim((string) ($data['website'] ?? ''));
        return $honeypot !== '';
    }

    public function jsonSuccess(string $message = 'Appointment request sent successfully.'): void
    {
        header('Content-Type: application/json; charset=utf-8');
        http_response_code(200);
        echo json_encode(['ok' => true, 'message' => $message]);
        exit;
    }

    public function jsonError(string $message, int $status = 400): void
    {
        header('Content-Type: application/json; charset=utf-8');
        http_response_code($status);
        echo json_encode(['ok' => false, 'message' => $message]);
        exit;
    }

    private function clientIp(): string
    {
        $candidates = [
            $_SERVER['HTTP_CF_CONNECTING_IP'] ?? null,
            $_SERVER['HTTP_X_FORWARDED_FOR'] ?? null,
            $_SERVER['REMOTE_ADDR'] ?? null,
        ];

        foreach ($candidates as $value) {
            if (!$value) {
                continue;
            }
            $ip = trim(explode(',', (string) $value)[0]);
            if (filter_var($ip, FILTER_VALIDATE_IP)) {
                return $ip;
            }
        }

        return 'unknown';
    }
}
