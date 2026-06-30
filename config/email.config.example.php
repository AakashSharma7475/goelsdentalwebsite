<?php
/**
 * Copy this file to email.config.php and fill in your real values.
 * NEVER commit email.config.php to git.
 *
 * Hostinger: upload email.config.php to the same config/ folder on the server.
 */

return [
    // SMTP (GoDaddy / secureserver)
    'smtp_host'       => 'smtpout.secureserver.net',
    'smtp_port'       => 587,
    'smtp_encryption' => 'tls', // 'tls' for port 587, 'ssl' for port 465
    'smtp_username'   => 'support@intvice.com',
    'smtp_password'   => 'YOUR_SMTP_PASSWORD_HERE',

    // Sender shown to recipients
    'from_email'      => 'support@intvice.com',
    'from_name'       => "Goel's Dental Clinic",

    // Doctor / clinic inbox — appointment emails are sent here (not from the form)
    'doctor_email'    => 'sharmaaakash7475@gmail.com',

    // Domains allowed to call the API (your live site + local testing)
    'allowed_origins' => [
        'https://goelsdental.com',
        'https://www.goelsdental.com',
        'http://localhost',
    ],

    // Anti-spam: max submissions per IP within the window
    'rate_limit_max'    => 5,
    'rate_limit_window' => 3600, // seconds (1 hour)
];
