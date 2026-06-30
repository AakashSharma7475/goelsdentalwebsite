<?php

declare(strict_types=1);

use PHPMailer\PHPMailer\Exception as MailerException;
use PHPMailer\PHPMailer\PHPMailer;

final class AppointmentMailer
{
    private array $config;

    private const LOCATION_LABELS = [
        'panipat' => 'Panipat Clinic',
        'safidon' => 'Safidon Clinic',
    ];

    private const TIME_SLOT_LABELS = [
        'morning' => 'Morning (10 AM - 1 PM)',
        'afternoon' => 'Afternoon (1 PM - 5 PM)',
        'evening' => 'Evening (5 PM - 11 PM)',
    ];

    private const TREATMENT_LABELS = [
        'implants' => 'Dental Implants',
        'rct' => 'Root Canal Treatment',
        'smile-design' => 'Smile Designing',
        'whitening' => 'Teeth Whitening',
        'braces' => 'Braces & Aligners',
        'crown-bridge' => 'Crown & Bridge',
        'pediatric' => 'Pediatric Dentistry',
        'cosmetic' => 'Cosmetic Dentistry',
        'emergency' => 'Emergency Dental Care',
    ];

    public function __construct(array $config)
    {
        $this->config = $config;
    }

    public function send(array $appointment): void
    {
        $mail = new PHPMailer(true);

        try {
            $mail->isSMTP();
            $mail->Host = (string) $this->config['smtp_host'];
            $mail->Port = (int) $this->config['smtp_port'];
            $mail->SMTPAuth = true;
            $mail->Username = (string) $this->config['smtp_username'];
            $mail->Password = (string) $this->config['smtp_password'];

            $encryption = strtolower((string) ($this->config['smtp_encryption'] ?? 'tls'));
            if ($encryption === 'ssl') {
                $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
            } else {
                $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
            }

            $mail->CharSet = 'UTF-8';
            $mail->setFrom(
                (string) $this->config['from_email'],
                (string) $this->config['from_name']
            );

            $doctorEmail = (string) $this->config['doctor_email'];
            $mail->addAddress($doctorEmail);
            $mail->addReplyTo($appointment['email'], $appointment['fullName']);

            $formType = $appointment['formType'] ?? 'website';
            $mail->Subject = "New Appointment Request - Goel's Dental Clinic ({$formType})";
            $mail->isHTML(true);
            $mail->Body = $this->buildHtmlBody($appointment);
            $mail->AltBody = $this->buildTextBody($appointment);

            $mail->send();
        } catch (MailerException $exception) {
            error_log('Appointment mail failed: ' . $exception->getMessage());
            throw new RuntimeException('Unable to send appointment email.');
        }
    }

    private function buildHtmlBody(array $a): string
    {
        $location = self::LOCATION_LABELS[$a['location']] ?? $a['location'];
        $timeSlot = self::TIME_SLOT_LABELS[$a['timeSlot']] ?? $a['timeSlot'];
        $treatment = self::TREATMENT_LABELS[$a['treatment']] ?? $a['treatment'];
        $message = nl2br(htmlspecialchars($a['message'] !== '' ? $a['message'] : '—', ENT_QUOTES, 'UTF-8'));

        return <<<HTML
<h2>New Appointment Request</h2>
<table cellpadding="6" cellspacing="0" border="0">
  <tr><td><strong>Full Name</strong></td><td>{$this->e($a['fullName'])}</td></tr>
  <tr><td><strong>Email</strong></td><td>{$this->e($a['email'])}</td></tr>
  <tr><td><strong>Phone</strong></td><td>{$this->e($a['fullPhone'])}</td></tr>
  <tr><td><strong>Clinic</strong></td><td>{$this->e($location)}</td></tr>
  <tr><td><strong>Treatment</strong></td><td>{$this->e($treatment)}</td></tr>
  <tr><td><strong>Preferred Date</strong></td><td>{$this->e($a['date'])}</td></tr>
  <tr><td><strong>Time Slot</strong></td><td>{$this->e($timeSlot)}</td></tr>
  <tr><td><strong>Form Source</strong></td><td>{$this->e($a['formType'])}</td></tr>
  <tr><td valign="top"><strong>Message</strong></td><td>{$message}</td></tr>
</table>
HTML;
    }

    private function buildTextBody(array $a): string
    {
        $location = self::LOCATION_LABELS[$a['location']] ?? $a['location'];
        $timeSlot = self::TIME_SLOT_LABELS[$a['timeSlot']] ?? $a['timeSlot'];
        $treatment = self::TREATMENT_LABELS[$a['treatment']] ?? $a['treatment'];
        $message = $a['message'] !== '' ? $a['message'] : '—';

        return implode("\n", [
            "New Appointment Request",
            '-----------------------',
            'Full Name: ' . $a['fullName'],
            'Email: ' . $a['email'],
            'Phone: ' . $a['fullPhone'],
            'Clinic: ' . $location,
            'Treatment: ' . $treatment,
            'Preferred Date: ' . $a['date'],
            'Time Slot: ' . $timeSlot,
            'Form Source: ' . $a['formType'],
            'Message: ' . $message,
        ]);
    }

    private function e(string $value): string
    {
        return htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
    }
}
