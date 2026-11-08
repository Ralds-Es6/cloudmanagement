/**
 * Cloudflare Turnstile Server Verification Service
 * Validates cf-turnstile-response tokens directly against Cloudflare's siteverify endpoint.
 */

export const verifyTurnstileToken = async (token, remoteIp = null) => {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;

  // If secret key is not configured, bypass in development
  if (!secretKey) {
    console.warn('[Turnstile Warning] TURNSTILE_SECRET_KEY is not defined. Skipping verification.');
    return { success: true };
  }

  // Token is mandatory when Turnstile is active
  if (!token) {
    return {
      success: false,
      message: 'Please complete the Cloudflare security verification challenge.',
    };
  }

  try {
    const formData = new URLSearchParams();
    formData.append('secret', secretKey);
    formData.append('response', token);
    if (remoteIp) {
      formData.append('remoteip', remoteIp);
    }

    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const data = await response.json();

    if (data.success) {
      return { success: true, data };
    }

    console.warn('[Turnstile Failed]', data['error-codes']);
    return {
      success: false,
      message: 'Security verification failed or expired. Please check the verification box and try again.',
      errors: data['error-codes'],
    };
  } catch (error) {
    console.error('[Turnstile Error]', error.message);
    return {
      success: false,
      message: 'Unable to reach security verification servers. Please try again.',
    };
  }
};

