<?php

declare(strict_types=1);

require_once __DIR__ . '/../vendor/phpmailer/src/Exception.php';
require_once __DIR__ . '/../vendor/phpmailer/src/PHPMailer.php';
require_once __DIR__ . '/../vendor/phpmailer/src/SMTP.php';
require_once __DIR__ . '/lib/RequestGuard.php';
require_once __DIR__ . '/lib/AppointmentValidator.php';
require_once __DIR__ . '/lib/AppointmentMailer.php';

$configPath = dirname(__DIR__) . '/config/email.config.php';
if (!is_file($configPath)) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'ok' => false,
        'message' => 'Email service is not configured on the server.',
    ]);
    exit;
}

$config = require $configPath;
$guard = new RequestGuard($config);

$guard->applyCorsHeaders();
$guard->handlePreflight();
$guard->enforcePostOnly();
$guard->enforceOrigin();

$data = $guard->readJsonBody();

if ($guard->isHoneypotTriggered($data)) {
    $guard->jsonSuccess();
}

$guard->enforceRateLimit();

$validator = new AppointmentValidator();
$result = $validator->validate($data);

if (!$result['valid']) {
    $guard->jsonError($result['message'], 422);
}

try {
    $mailer = new AppointmentMailer($config);
    $mailer->send($result['payload']);
    $guard->jsonSuccess();
} catch (Throwable $exception) {
    error_log('send-appointment.php error: ' . $exception->getMessage());
    $guard->jsonError(
        'Unable to submit right now. Please try again or call the clinic directly.',
        500
    );
}
