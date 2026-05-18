/**
 * Appointment form handling (no-backend via Formspree).
 *
 * IMPORTANT:
 * 1) Create a Formspree form with doctor email: sharmaaakash7475@gmail.com
 * 2) Replace FORMSPREE_ENDPOINT with your real endpoint.
 */
(function () {
  "use strict";

  const FORMSPREE_ENDPOINT = "https://formspree.io/f/xnjwlvqp";

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
    return { valid: errors.length === 0, emailValue, phoneDigits, countryCode: countryCode?.value || "" };
  }

  async function submitToFormspree(form, payload) {
    const response = await fetch(FORMSPREE_ENDPOINT, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Request failed with ${response.status}`);
    }

    const data = await response.json().catch(() => ({}));
    if (data && data.ok === false) {
      throw new Error("Form service rejected request.");
    }
  }

  function buildPayload(form, extras) {
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    return {
      _subject: "New Appointment Request - Goel's Dental Clinic",
      _replyto: extras.emailValue,
      ...data,
      fullPhone: `${extras.countryCode} ${extras.phoneDigits}`.trim()
    };
  }

  function bindAppointmentForm(form) {
    const phoneInput = form.querySelector('[name="phone"]');
    if (phoneInput) {
      phoneInput.addEventListener("input", () => {
        phoneInput.value = onlyDigits(phoneInput.value);
      });
    }

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      setStatus(form, "", "");

      if (FORMSPREE_ENDPOINT.includes("your_form_id")) {
        setStatus(
          form,
          "error",
          "Form service is not configured yet. Please add your Formspree endpoint in js/appointment-form.js."
        );
        return;
      }

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
        await submitToFormspree(form, payload);
        setStatus(form, "success", "Appointment request sent successfully. We will contact you soon.");
        form.reset();
      } catch (error) {
        setStatus(
          form,
          "error",
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
