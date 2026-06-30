/**
 * Appointment form handling via Hostinger PHP API (SMTP).
 *
 * Server endpoint: /api/send-appointment.php
 * Configure SMTP in config/email.config.php on the server.
 */
(function () {
  "use strict";

  const APPOINTMENT_ENDPOINT = "/api/send-appointment.php";

  const PHONE_RULES = {
    IN: { min: 10, max: 10 },
    US: { min: 10, max: 10 },
    GB: { min: 10, max: 11 },
    AE: { min: 9, max: 9 },
    AU: { min: 9, max: 9 },
    CA: { min: 10, max: 10 },
    DEFAULT: { min: 7, max: 15 }
  };

  function ready(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
      return;
    }
    fn();
  }

  function onlyDigits(value) {
    return (value || "").replace(/\D/g, "");
  }

  function getPhoneRule(country) {
    return PHONE_RULES[country] || PHONE_RULES.DEFAULT;
  }

  function setFieldError(form, fieldName, message) {
    const field = form.querySelector(`[name="${fieldName}"]`);
    const errorEl = form.querySelector(`[data-error-for="${fieldName}"]`);
    if (field) {
      field.classList.add("is-invalid");
      field.setAttribute("aria-invalid", "true");
    }
    if (errorEl) {
      errorEl.textContent = message || "";
    }
  }

  function clearFieldError(form, fieldName) {
    const field = form.querySelector(`[name="${fieldName}"]`);
    const errorEl = form.querySelector(`[data-error-for="${fieldName}"]`);
    if (field) {
      field.classList.remove("is-invalid");
      field.removeAttribute("aria-invalid");
    }
    if (errorEl) {
      errorEl.textContent = "";
    }
  }

  function setStatus(form, type, text) {
    const box = form.querySelector(".form-status-message");
    if (!box) return;
    box.classList.remove("success", "error", "show");
    box.textContent = text || "";
    if (!text) return;
    box.classList.add(type, "show");
  }

  function validate(form) {
    const errors = [];
    const fullName = form.querySelector('[name="fullName"]');
    const email = form.querySelector('[name="email"]');
    const countryCode = form.querySelector('[name="countryCode"]');
    const phone = form.querySelector('[name="phone"]');
    const date = form.querySelector('[name="date"]');
    const message = form.querySelector('[name="message"]');
    const location = form.querySelector('[name="location"], [name="clinicLocation"]');
    const timeSlot = form.querySelector('[name="timeSlot"]');
    const treatment = form.querySelector('[name="treatment"]');

    [
      "fullName",
      "email",
      "phone",
      "countryCode",
      "date",
      "message",
      "location",
      "clinicLocation",
      "timeSlot",
      "treatment"
    ].forEach((name) => clearFieldError(form, name));

    const fullNameValue = (fullName?.value || "").trim();
    if (!fullNameValue || fullNameValue.length < 2) {
      errors.push({ field: "fullName", message: "Please enter a valid full name." });
    }

    const emailValue = (email?.value || "").trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!emailRegex.test(emailValue)) {
      errors.push({ field: "email", message: "Please enter a valid email address." });
    }

    const locationValue = (location?.value || "").trim();
    if (!locationValue) {
      const locFieldName = location?.getAttribute("name") || "location";
      errors.push({ field: locFieldName, message: "Please select a clinic location." });
    }

    if (!timeSlot?.value) {
      errors.push({ field: "timeSlot", message: "Please select a time slot." });
    }

    if (treatment && !treatment.value) {
      errors.push({ field: "treatment", message: "Please select a treatment." });
    }

    const countryOpt = countryCode?.selectedOptions?.[0];
    const country = countryOpt?.dataset?.country || "DEFAULT";
    const rule = getPhoneRule(country);
    const phoneDigits = onlyDigits(phone?.value);
    if (!phoneDigits) {
      errors.push({ field: "phone", message: "Please enter a mobile number." });
    } else if (phoneDigits.length < rule.min || phoneDigits.length > rule.max) {
      errors.push({
        field: "phone",
        message: `Mobile number should be ${rule.min === rule.max ? rule.min : `${rule.min}-${rule.max}`} digits for selected country.`
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = date?.value ? new Date(date.value) : null;
    if (!selectedDate || Number.isNaN(selectedDate.getTime())) {
      errors.push({ field: "date", message: "Please select a valid date." });
    } else if (selectedDate < today) {
      errors.push({ field: "date", message: "Appointment date cannot be in the past." });
    }

    const messageValue = (message?.value || "").trim();
    if (messageValue.length > 800) {
      errors.push({ field: "message", message: "Message is too long. Keep it under 800 characters." });
    }

    errors.forEach((e) => setFieldError(form, e.field, e.message));
    return {
      valid: errors.length === 0,
      emailValue,
      phoneDigits,
      countryCode: countryCode?.value || "",
      country
    };
  }

  async function submitAppointment(payload) {
    const response = await fetch(APPOINTMENT_ENDPOINT, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || data.ok === false) {
      const message =
        data.message ||
        "Unable to submit right now. Please try again or call the clinic directly.";
      throw new Error(message);
    }
  }

  function buildPayload(form, extras) {
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    const locationField = form.querySelector('[name="location"], [name="clinicLocation"]');
    const locationName = locationField?.getAttribute("name") || "location";

    return {
      fullName: (data.fullName || "").trim(),
      email: extras.emailValue,
      phone: extras.phoneDigits,
      countryCode: extras.countryCode,
      country: extras.country,
      date: data.date || "",
      timeSlot: data.timeSlot || "",
      treatment: data.treatment || "",
      message: (data.message || "").trim(),
      formType: form.dataset.formType || "website",
      website: data.website || "",
      [locationName]: data[locationName] || ""
    };
  }

  function ensureHoneypot(form) {
    if (form.querySelector('[name="website"]')) return;

    const honeypot = document.createElement("input");
    honeypot.type = "text";
    honeypot.name = "website";
    honeypot.tabIndex = -1;
    honeypot.autocomplete = "off";
    honeypot.setAttribute("aria-hidden", "true");
    honeypot.style.cssText = "position:absolute;left:-9999px;width:1px;height:1px;opacity:0;";
    form.appendChild(honeypot);
  }

  function bindAppointmentForm(form) {
    ensureHoneypot(form);

    const phoneInput = form.querySelector('[name="phone"]');
    if (phoneInput) {
      phoneInput.addEventListener("input", () => {
        phoneInput.value = onlyDigits(phoneInput.value);
      });
    }

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      setStatus(form, "", "");

      const result = validate(form);
      if (!result.valid) {
        setStatus(form, "error", "Please fix the highlighted fields and try again.");
        return;
      }

      const submitButton = form.querySelector('button[type="submit"]');
      const originalText = submitButton?.querySelector("span")?.textContent || "";
      if (submitButton) {
        submitButton.disabled = true;
        const span = submitButton.querySelector("span");
        if (span) span.textContent = "Submitting...";
      }

      try {
        const payload = buildPayload(form, result);
        await submitAppointment(payload);
        setStatus(form, "success", "Appointment request sent successfully. We will contact you soon.");

        // Auto-select location from URL if ?loc=panipat or ?loc=safidon
        const urlParams = new URLSearchParams(window.location.search);
        const locParam = urlParams.get("loc");
        if (locParam) {
          forms.forEach(form => {
            const locationSelect = form.querySelector('[name="location"], [name="clinicLocation"]');
            if (locationSelect) {
              Array.from(locationSelect.options).forEach(opt => {
                if (opt.value.toLowerCase().includes(locParam.toLowerCase())) {
                  locationSelect.value = opt.value;
                }
              });
            }
          });
        }
        form.reset();
      } catch (error) {
        setStatus(
          form,
          "error",
          error.message ||
          "Unable to submit right now. Please try again or call the clinic directly."
        );
      } finally {
        if (submitButton) {
          submitButton.disabled = false;
          const span = submitButton.querySelector("span");
          if (span) span.textContent = originalText || "Submit";
        }
      }
    });
  }

  ready(function () {
    const forms = document.querySelectorAll(".js-appointment-form");
    if (!forms.length) return;
    forms.forEach(bindAppointmentForm);
  });
})();
