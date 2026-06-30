<?php

declare(strict_types=1);

final class AppointmentValidator
{
    private const PHONE_RULES = [
        'IN' => ['min' => 10, 'max' => 10],
        'US' => ['min' => 10, 'max' => 10],
        'GB' => ['min' => 10, 'max' => 11],
        'AE' => ['min' => 9, 'max' => 9],
        'AU' => ['min' => 9, 'max' => 9],
        'CA' => ['min' => 10, 'max' => 10],
        'DEFAULT' => ['min' => 7, 'max' => 15],
    ];

    private const LOCATIONS = ['panipat', 'safidon'];
    private const TIME_SLOTS = ['morning', 'afternoon', 'evening'];
    private const TREATMENTS = [
        'implants', 'rct', 'smile-design', 'whitening', 'braces',
        'crown-bridge', 'pediatric', 'cosmetic', 'emergency',
    ];

    public function validate(array $data): array
    {
        $errors = [];

        $fullName = $this->clean($data['fullName'] ?? '');
        if (mb_strlen($fullName) < 2) {
            $errors[] = 'Please enter a valid full name.';
        }

        $email = $this->clean($data['email'] ?? '');
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $errors[] = 'Please enter a valid email address.';
        }

        $location = $this->clean($data['location'] ?? ($data['clinicLocation'] ?? ''));
        if (!in_array($location, self::LOCATIONS, true)) {
            $errors[] = 'Please select a clinic location.';
        }

        $timeSlot = $this->clean($data['timeSlot'] ?? '');
        if (!in_array($timeSlot, self::TIME_SLOTS, true)) {
            $errors[] = 'Please select a time slot.';
        }

        $treatment = $this->clean($data['treatment'] ?? '');
        if (!in_array($treatment, self::TREATMENTS, true)) {
            $errors[] = 'Please select a treatment.';
        }

        $countryCode = $this->clean($data['countryCode'] ?? '');
        if (!preg_match('/^\+\d{1,4}$/', $countryCode)) {
            $errors[] = 'Invalid country code.';
        }

        $country = $this->clean($data['country'] ?? 'DEFAULT');
        $phoneDigits = preg_replace('/\D+/', '', (string) ($data['phone'] ?? ''));
        $rule = self::PHONE_RULES[$country] ?? self::PHONE_RULES['DEFAULT'];
        if ($phoneDigits === '') {
            $errors[] = 'Please enter a mobile number.';
        } elseif (strlen($phoneDigits) < $rule['min'] || strlen($phoneDigits) > $rule['max']) {
            $errors[] = 'Mobile number length is invalid for selected country.';
        }

        $date = $this->clean($data['date'] ?? '');
        $dateObj = \DateTime::createFromFormat('Y-m-d', $date);
        $today = new \DateTime('today');
        if (!$dateObj || $dateObj->format('Y-m-d') !== $date) {
            $errors[] = 'Please select a valid date.';
        } elseif ($dateObj < $today) {
            $errors[] = 'Appointment date cannot be in the past.';
        }

        $message = $this->clean($data['message'] ?? '');
        if (mb_strlen($message) > 800) {
            $errors[] = 'Message is too long. Keep it under 800 characters.';
        }

        if ($errors !== []) {
            return ['valid' => false, 'message' => $errors[0]];
        }

        return [
            'valid' => true,
            'payload' => [
                'fullName' => $fullName,
                'email' => $email,
                'location' => $location,
                'timeSlot' => $timeSlot,
                'treatment' => $treatment,
                'countryCode' => $countryCode,
                'phone' => $phoneDigits,
                'fullPhone' => trim($countryCode . ' ' . $phoneDigits),
                'date' => $date,
                'message' => $message,
                'formType' => $this->clean($data['formType'] ?? 'website'),
            ],
        ];
    }

    private function clean(string $value): string
    {
        $value = str_replace("\0", '', $value);
        return trim($value);
    }
}
